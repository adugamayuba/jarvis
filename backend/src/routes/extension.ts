import { Router, Request, Response } from "express";
import { findPeopleEmailsOnPage } from "../services/pagePeopleFinder";
import { getDb, COLLECTIONS } from "../services/firebase";
import * as admin from "firebase-admin";

const router = Router();

interface PeopleEmailBody {
  pageUrl: string;
  pageTitle: string;
  pageText: string;
  candidateNames?: string[];
  onPageEmails?: Array<{ name?: string; email: string }>;
}

interface ExtensionContactInput {
  name: string;
  email?: string;
  emails?: string[];
  title?: string;
  company?: string;
}

function normalizeEmails(email?: string, emails?: string[]): string[] {
  const all = [...(emails || []), ...(email ? [email] : [])]
    .map(e => e.trim().toLowerCase())
    .filter(e => e.includes("@"));
  return [...new Set(all)];
}

async function findContactDocByEmail(db: admin.firestore.Firestore, email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return null;

  const byPrimary = await db
    .collection(COLLECTIONS.CONTACTS)
    .where("email", "==", normalized)
    .limit(1)
    .get();
  if (!byPrimary.empty) return byPrimary.docs[0];

  const byEmailsArray = await db
    .collection(COLLECTIONS.CONTACTS)
    .where("emails", "array-contains", normalized)
    .limit(1)
    .get();
  if (!byEmailsArray.empty) return byEmailsArray.docs[0];

  // Legacy docs may store mixed-case email on the primary field
  if (email.trim() !== normalized) {
    const byOriginal = await db
      .collection(COLLECTIONS.CONTACTS)
      .where("email", "==", email.trim())
      .limit(1)
      .get();
    if (!byOriginal.empty) return byOriginal.docs[0];
  }

  return null;
}

async function markContactDocEmailed(
  doc: admin.firestore.DocumentSnapshot,
  sentEmail?: string
): Promise<{ id: string; updated: true }> {
  const data = doc.data() || {};
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    emailSent: true,
    emailSentAt: now,
    updatedAt: now,
  };

  if (sentEmail?.includes("@")) {
    const normalized = sentEmail.trim().toLowerCase();
    const merged = [...new Set([
      ...(Array.isArray(data.emails) ? (data.emails as string[]) : []),
      ...(data.email ? [String(data.email)] : []),
      normalized,
    ])].map(e => e.trim().toLowerCase()).filter(e => e.includes("@"));
    updates.email = merged[0];
    updates.emails = merged;
  }

  await doc.ref.update(updates);
  return { id: doc.id, updated: true };
}

async function upsertExtensionContact(
  input: ExtensionContactInput,
  opts: { pageUrl?: string; company?: string; markEmailed?: boolean }
): Promise<{ id: string; updated: boolean }> {
  const name = input.name?.trim();
  const allEmails = normalizeEmails(input.email, input.emails);
  if (!name || allEmails.length === 0) {
    throw new Error("name and at least one email are required");
  }

  const primaryEmail = allEmails[0];
  const company = input.company?.trim() || opts.company?.trim() || "";
  const title = input.title?.trim() || "";
  const db = getDb();
  const now = new Date().toISOString();

  const existingDoc = await findContactDocByEmail(db, primaryEmail);

  if (existingDoc) {
    const data = existingDoc.data();
    const mergedEmails = [...new Set([
      ...(Array.isArray(data.emails) ? data.emails as string[] : []),
      ...(data.email ? [String(data.email)] : []),
      ...allEmails,
    ])].map(e => e.trim().toLowerCase()).filter(e => e.includes("@"));

    const updates: Record<string, unknown> = {
      email: mergedEmails[0],
      emails: mergedEmails,
      updatedAt: now,
    };
    if (title && !data.title) updates.title = title;
    if (company && !data.company) updates.company = company;
    if (!data.name && name) updates.name = name;
    if (opts.markEmailed) {
      updates.emailSent = true;
      updates.emailSentAt = now;
    }

    await existingDoc.ref.update(updates);
    return { id: existingDoc.id, updated: true };
  }

  const oneLiner = [title, company].filter(Boolean).join(" · ");
  const ref = await db.collection(COLLECTIONS.CONTACTS).add({
    name,
    email: primaryEmail,
    emails: allEmails,
    title,
    company,
    oneLiner,
    source: "extension",
    emailSent: opts.markEmailed === true,
    ...(opts.markEmailed ? { emailSentAt: now } : {}),
    tags: opts.pageUrl ? [`page:${opts.pageUrl}`] : [],
    createdAt: now,
    updatedAt: now,
  });

  return { id: ref.id, updated: false };
}

// POST /api/extension/people-emails — extract people from page + find emails via Google
router.post("/people-emails", async (req: Request, res: Response) => {
  try {
    const { pageUrl, pageTitle, pageText, candidateNames, onPageEmails } = req.body as PeopleEmailBody;

    if (!pageUrl || !pageText) {
      res.status(400).json({ success: false, error: "pageUrl and pageText are required" });
      return;
    }

    if (!process.env.APIFY_API_TOKEN) {
      res.status(500).json({ success: false, error: "APIFY_API_TOKEN not configured on backend" });
      return;
    }

    console.log(`🔍 Extension people-email scan: ${pageUrl} (${candidateNames?.length || 0} candidates)`);

    const result = await findPeopleEmailsOnPage({
      pageUrl,
      pageTitle: pageTitle || "",
      pageText,
      candidateNames,
      onPageEmails,
    });

    const found = result.people.filter(p => p.email).length;
    res.json({
      success: true,
      data: result,
      message: `Found ${found}/${result.people.length} emails for ${result.company || "this page"}`,
    });
  } catch (err) {
    console.error("Extension people-emails error:", err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/extension/mark-emailed — mark contact as emailed (by id or email lookup)
router.post("/mark-emailed", async (req: Request, res: Response) => {
  try {
    const { id, name, email, emails, title, company, pageUrl } = req.body as ExtensionContactInput & {
      id?: string;
      pageUrl?: string;
    };

    const db = getDb();
    const allEmails = normalizeEmails(email, emails);
    const sentEmail = allEmails[0] || email?.trim().toLowerCase();

    // Prefer direct contact id from outreach queue — most reliable
    if (id?.trim()) {
      const ref = db.collection(COLLECTIONS.CONTACTS).doc(id.trim());
      const doc = await ref.get();
      if (!doc.exists) {
        res.status(404).json({ success: false, error: "Contact not found" });
        return;
      }

      const result = await markContactDocEmailed(doc, sentEmail);
      const contactName = String(doc.data()?.name || name?.trim() || sentEmail || "Contact");
      res.json({
        success: true,
        data: result,
        message: `${contactName} marked as emailed`,
      });
      return;
    }

    if (!name?.trim() || !sentEmail) {
      res.status(400).json({ success: false, error: "name and email are required" });
      return;
    }

    const existingDoc = await findContactDocByEmail(db, sentEmail);
    if (existingDoc) {
      const result = await markContactDocEmailed(existingDoc, sentEmail);
      res.json({
        success: true,
        data: result,
        message: `${name.trim()} marked as emailed`,
      });
      return;
    }

    const result = await upsertExtensionContact(
      { name, email: sentEmail, emails: allEmails, title, company },
      { pageUrl, company, markEmailed: true }
    );

    res.json({
      success: true,
      data: result,
      message: `${name.trim()} added to contacts and marked as emailed`,
    });
  } catch (err) {
    console.error("Extension mark-emailed error:", err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/extension/add-contacts — bulk add team page people to Contacts (not marked sent)
router.post("/add-contacts", async (req: Request, res: Response) => {
  try {
    const { contacts, pageUrl, company } = req.body as {
      contacts?: ExtensionContactInput[];
      pageUrl?: string;
      company?: string;
    };

    if (!Array.isArray(contacts) || contacts.length === 0) {
      res.status(400).json({ success: false, error: "contacts array required" });
      return;
    }

    let added = 0;
    let updated = 0;
    let skipped = 0;

    for (const contact of contacts) {
      const allEmails = normalizeEmails(contact.email, contact.emails);
      if (!contact.name?.trim() || allEmails.length === 0) {
        skipped++;
        continue;
      }

      try {
        const result = await upsertExtensionContact(
          { ...contact, email: allEmails[0], emails: allEmails },
          { pageUrl, company: contact.company || company, markEmailed: false }
        );
        if (result.updated) updated++;
        else added++;
      } catch (err) {
        console.error(`Add contact failed for ${contact.name}:`, err);
        skipped++;
      }
    }

    res.json({
      success: true,
      data: { added, updated, skipped, total: contacts.length },
      message: `Added ${added} contacts, updated ${updated}${skipped ? `, skipped ${skipped}` : ""}`,
    });
  } catch (err) {
    console.error("Extension add-contacts error:", err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/extension/outreach-queue — Jarvis contacts with email, not yet sent
router.get("/outreach-queue", async (req: Request, res: Response) => {
  try {
    const audience = typeof req.query.audience === "string" ? req.query.audience : "investor";
    const db = getDb();
    const contactSnap = await db.collection(COLLECTIONS.CONTACTS).limit(2000).get();

    function getEmail(data: Record<string, unknown>): string {
      const email = data.email as string | undefined;
      if (email?.includes("@")) return email.trim().toLowerCase();
      const emails = data.emails as string[] | undefined;
      const found = emails?.find(e => e?.includes("@"));
      return found ? found.trim().toLowerCase() : "";
    }

    function isJournalist(data: Record<string, unknown>): boolean {
      const tags = (data.tags as string[] | undefined) || [];
      return data.source === "techcrunch" || tags.includes("journalist");
    }

    const recipients: Array<{
      id: string;
      type: "contact";
      name: string;
      email: string;
      company?: string;
      title?: string;
    }> = [];

    for (const doc of contactSnap.docs) {
      const data = doc.data() as Record<string, unknown>;
      if (data.emailSent === true) continue;

      const journalist = isJournalist(data);
      if (audience === "journalist" && !journalist) continue;
      if (audience === "investor" && journalist) continue;

      const email = getEmail(data);
      if (!email) continue;

      recipients.push({
        id: doc.id,
        type: "contact",
        name: (data.name as string) || email.split("@")[0],
        email,
        company: (data.company as string) || "",
        title: (data.title as string) || "",
      });
    }

    recipients.sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      success: true,
      data: { recipients, total: recipients.length, audience },
    });
  } catch (err) {
    console.error("Outreach queue error:", err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/extension/mark-investor-contacted
router.post("/mark-investor-contacted", async (req: Request, res: Response) => {
  try {
    const { id } = req.body as { id?: string };
    if (!id) {
      res.status(400).json({ success: false, error: "id required" });
      return;
    }

    const db = getDb();
    const ref = db.collection(COLLECTIONS.INVESTORS).doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Investor not found" });
      return;
    }

    const now = new Date().toISOString();
    await ref.update({ status: "contacted", updatedAt: now, contactedAt: now });
    res.json({ success: true, message: "Investor marked as contacted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
