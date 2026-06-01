import { Router, Request, Response } from "express";
import { findPeopleEmailsOnPage } from "../services/pagePeopleFinder";
import { getDb, COLLECTIONS } from "../services/firebase";

const router = Router();

interface PeopleEmailBody {
  pageUrl: string;
  pageTitle: string;
  pageText: string;
  candidateNames?: string[];
  onPageEmails?: Array<{ name?: string; email: string }>;
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

// POST /api/extension/mark-emailed — add to Jarvis contacts and mark as emailed
router.post("/mark-emailed", async (req: Request, res: Response) => {
  try {
    const { name, email, title, company, pageUrl } = req.body as {
      name?: string;
      email?: string;
      title?: string;
      company?: string;
      pageUrl?: string;
    };

    if (!name?.trim() || !email?.trim()) {
      res.status(400).json({ success: false, error: "name and email are required" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb();
    const now = new Date().toISOString();

    const existing = await db
      .collection(COLLECTIONS.CONTACTS)
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (!existing.empty) {
      const doc = existing.docs[0];
      const data = doc.data();
      const updates: Record<string, unknown> = {
        emailSent: true,
        emailSentAt: now,
        updatedAt: now,
      };
      if (title && !data.title) updates.title = title;
      if (company && !data.company) updates.company = company;
      if (!data.name && name.trim()) updates.name = name.trim();

      await doc.ref.update(updates);
      res.json({
        success: true,
        data: { id: doc.id, updated: true },
        message: `${name} marked as emailed in contacts`,
      });
      return;
    }

    const oneLiner = [title, company].filter(Boolean).join(" · ");
    const ref = await db.collection(COLLECTIONS.CONTACTS).add({
      name: name.trim(),
      email: normalizedEmail,
      title: title || "",
      company: company || "",
      oneLiner,
      source: "extension",
      emailSent: true,
      emailSentAt: now,
      tags: pageUrl ? [`page:${pageUrl}`] : [],
      createdAt: now,
      updatedAt: now,
    });

    res.json({
      success: true,
      data: { id: ref.id, updated: false },
      message: `${name} added to contacts and marked as emailed`,
    });
  } catch (err) {
    console.error("Extension mark-emailed error:", err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
