import { Router, Request, Response } from "express";
import { z } from "zod";
import { getDb, COLLECTIONS } from "../services/firebase";

const router = Router();

interface IdParams extends Record<string, string> { id: string }

const InvestorSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  company: z.string().optional().default(""),
  title: z.string().optional().default(""),
  location: z.string().optional().default(""),
  status: z.enum(["prospect", "contacted", "interested", "verbal", "committed", "closed", "passed"]).default("prospect"),
  amount: z.number().optional().default(0),
  notes: z.string().optional().default(""),
  source: z.string().optional().default(""),
  linkedinUrl: z.string().optional().default(""),
  twitterUrl: z.string().optional().default(""),
  checkSize: z.string().optional().default(""),
  round: z.string().optional().default("seed"),
});

// GET /api/investors
router.get("/", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.INVESTORS)
      .orderBy("createdAt", "desc").get();
    const investors = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: investors });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

// POST /api/investors
router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = InvestorSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues.map(e => e.message).join(", ") });
      return;
    }
    const db = getDb();
    const ref = await db.collection(COLLECTIONS.INVESTORS).add({
      ...parsed.data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    res.status(201).json({ success: true, data: { id: ref.id, ...parsed.data } });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

// PATCH /api/investors/:id
router.patch("/:id", async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    const ref = db.collection(COLLECTIONS.INVESTORS).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) { res.status(404).json({ success: false, error: "Not found" }); return; }
    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    await ref.update(updates);
    res.json({ success: true, data: { id: req.params.id, ...doc.data(), ...updates } });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

// DELETE /api/investors/:id
router.delete("/:id", async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    await db.collection(COLLECTIONS.INVESTORS).doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

// GET /api/investors/stats
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.INVESTORS).get();
    const investors = snap.docs.map(d => d.data());

    const total = investors.reduce((s, i) => s + (i.amount || 0), 0);
    const committed = investors.filter(i => ["verbal", "committed", "closed"].includes(i.status))
      .reduce((s, i) => s + (i.amount || 0), 0);
    const byStatus: Record<string, number> = {};
    investors.forEach(i => { byStatus[i.status] = (byStatus[i.status] || 0) + 1; });

    res.json({ success: true, data: { total, committed, count: investors.length, byStatus } });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

export default router;
