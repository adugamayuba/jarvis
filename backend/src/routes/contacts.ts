import { Router, Request, Response } from "express";
import { z } from "zod";
import * as admin from "firebase-admin";
import { getDb, COLLECTIONS } from "../services/firebase";
import { Contact } from "../types";

interface IdParams extends Record<string, string> { id: string }

const router = Router();

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
    .enum(["crunchbase", "linkedin", "twitter", "instagram", "facebook", "tiktok", "manual", "extension"])
    .default("manual"),
  tags: z.array(z.string()).optional(),
});

// GET /api/contacts
router.get("/", async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { campaignId, emailSent, source, limit = "5000" } = req.query;

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
    const contacts = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.json({ success: true, data: contacts });
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
    const contact: Contact = {
      ...parsed.data,
      emailSent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ref = await db.collection(COLLECTIONS.CONTACTS).add(contact);
    res.status(201).json({ success: true, data: { id: ref.id, ...contact } });
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

    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    await ref.update(updates);

    res.json({
      success: true,
      data: { id: req.params.id, ...doc.data(), ...updates },
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

export default router;
