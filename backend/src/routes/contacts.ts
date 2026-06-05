import { Router, Request, Response } from "express";
import { z } from "zod";
import * as admin from "firebase-admin";
import { getDb, COLLECTIONS } from "../services/firebase";
import {
  OutreachAudience,
  OUTREACH_AUDIENCES,
  isOutreachAudience,
  inferAudience,
  applyAudienceToPayload,
  upsertContactWithAudience,
  backfillContactAudiences,
  matchesOutreachAudience,
} from "../lib/outreachAudience";

interface IdParams extends Record<string, string> { id: string }

const router = Router();

const AudienceSchema = z.enum([
  "investor",
  "journalist",
  "swiftdroom-b2c",
  "swiftdroom-b2b",
]);

const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().or(z.literal("")),
  oneLiner: z.string().default(""),
  title: z.string().optional(),
  company: z.string().optional(),
  linkedinUrl: z.string().optional(),
  crunchbaseUrl: z.string().optional(),
  profileImageUrl: z.string().optional(),
  source: z
    .enum(["crunchbase", "linkedin", "twitter", "instagram", "facebook", "tiktok", "techcrunch", "manual", "extension"])
    .default("manual"),
  audience: AudienceSchema.optional(),
  tags: z.array(z.string()).optional(),
});

// GET /api/contacts
router.get("/", async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { campaignId, emailSent, source, audience, limit = "5000" } = req.query;

    let query: admin.firestore.Query = db
      .collection(COLLECTIONS.CONTACTS)
      .orderBy("createdAt", "desc")
      .limit(parseInt(limit as string, 10));

    if (source && typeof source === "string") {
      query = query.where("source", "==", source);
    }
    if (campaignId && typeof campaignId === "string") {
      query = query.where("campaignId", "==", campaignId);
    }
    if (emailSent !== undefined) {
      query = query.where("emailSent", "==", emailSent === "true");
    }

    const snapshot = await query.get();
    let contacts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    if (audience && typeof audience === "string" && isOutreachAudience(audience)) {
      contacts = contacts.filter((c) =>
        matchesOutreachAudience(c as Record<string, unknown>, audience)
      );
    }

    res.json({ success: true, data: contacts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/contacts/backfill-audiences — tag existing contacts (must be before /:id)
router.post("/backfill-audiences", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const result = await backfillContactAudiences(db);
    res.json({
      success: true,
      data: result,
      message: `Backfilled ${result.updated} of ${result.scanned} contacts`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// PATCH /api/contacts/bulk-audience — set audience on multiple contacts
router.patch("/bulk-audience", async (req: Request, res: Response) => {
  try {
    const { ids, audience } = req.body as { ids?: string[]; audience?: OutreachAudience };
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: "ids array is required" });
      return;
    }
    if (!audience || !isOutreachAudience(audience)) {
      res.status(400).json({ success: false, error: "Valid audience is required" });
      return;
    }

    const db = getDb();
    const now = new Date().toISOString();
    let updated = 0;
    let conflicts = 0;

    for (const id of ids) {
      const ref = db.collection(COLLECTIONS.CONTACTS).doc(id);
      const doc = await ref.get();
      if (!doc.exists) continue;

      const data = doc.data() as Record<string, unknown>;
      const current = inferAudience(data);
      if (current !== audience) {
        const email = (data.email as string) || "";
        if (email.includes("@")) {
          conflicts++;
          continue;
        }
      }

      const patched = applyAudienceToPayload({ ...data }, audience);
      await ref.update({
        audience: patched.audience,
        tags: patched.tags,
        updatedAt: now,
      });
      updated++;
    }

    res.json({
      success: true,
      data: { updated, conflicts, total: ids.length },
      message: `Updated ${updated} contacts${conflicts ? ` · ${conflicts} skipped (email locked to another audience)` : ""}`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/contacts/:id
router.get("/:id", async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    const doc = await db
      .collection(COLLECTIONS.CONTACTS)
      .doc(req.params.id)
      .get();

    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Contact not found" });
      return;
    }

    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/contacts
router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = ContactSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      });
      return;
    }

    const db = getDb();
    const audience: OutreachAudience =
      parsed.data.audience ||
      (parsed.data.source === "techcrunch" ? "journalist" : "investor");

    const payload: Record<string, unknown> = {
      ...parsed.data,
      emailSent: false,
    };
    delete payload.audience;

    const result = await upsertContactWithAudience(db, {
      payload,
      audience,
      primaryEmail: parsed.data.email || undefined,
    });

    if (result.action === "skipped_conflict") {
      res.status(409).json({ success: false, error: result.reason });
      return;
    }

    const ref = db.collection(COLLECTIONS.CONTACTS).doc(result.id);
    const saved = await ref.get();
    res.status(result.action === "created" ? 201 : 200).json({
      success: true,
      data: { id: result.id, ...saved.data() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// PATCH /api/contacts/:id
router.patch("/:id", async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    const ref = db.collection(COLLECTIONS.CONTACTS).doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Contact not found" });
      return;
    }

    const existing = doc.data() as Record<string, unknown>;
    let updates: Record<string, unknown> = { ...req.body, updatedAt: new Date().toISOString() };

    if (req.body.audience && isOutreachAudience(req.body.audience)) {
      const newAudience = req.body.audience as OutreachAudience;
      const current = inferAudience(existing);
      if (current !== newAudience) {
        const email = (existing.email as string) || (updates.email as string) || "";
        if (email.includes("@")) {
          res.status(409).json({
            success: false,
            error: `Cannot change audience — contact email is locked to "${current}" outreach`,
          });
          return;
        }
      }
      const patched = applyAudienceToPayload({ ...existing, ...updates }, newAudience);
      updates = { ...updates, audience: patched.audience, tags: patched.tags };
    }

    await ref.update(updates);

    res.json({
      success: true,
      data: { id: req.params.id, ...existing, ...updates },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// DELETE /api/contacts/:id
router.delete("/:id", async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    const ref = db.collection(COLLECTIONS.CONTACTS).doc(req.params.id);
    const doc = await ref.get();

    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Contact not found" });
      return;
    }

    await ref.delete();
    res.json({ success: true, message: "Contact deleted" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// DELETE /api/contacts — bulk delete
router.delete("/", async (req: Request, res: Response) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: "ids array is required" });
      return;
    }

    const db = getDb();
    const batch = db.batch();
    for (const id of ids) {
      batch.delete(db.collection(COLLECTIONS.CONTACTS).doc(id));
    }
    await batch.commit();

    res.json({ success: true, message: `Deleted ${ids.length} contacts` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

export { OUTREACH_AUDIENCES };
export default router;
