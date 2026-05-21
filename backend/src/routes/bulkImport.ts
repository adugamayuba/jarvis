import { Router, Request, Response } from "express";
import { getDb, COLLECTIONS } from "../services/firebase";
import { findEmailsForAllContacts } from "../services/emailFinder";

const router = Router();

interface CsvContact {
  name: string;
  crunchbaseUrl: string;
  location?: string;
  investorType?: string;
  numInvestments?: number;
  numExits?: number;
}

// Extract slug from crunchbase URL — used as stable document ID for dedup
function slugFromUrl(url: string): string {
  const match = url.match(/crunchbase\.com\/person\/([^/?#]+)/);
  if (match) return `cb_${match[1]}`;
  const match2 = url.match(/crunchbase\.com\/organization\/([^/?#]+)/);
  if (match2) return `cb_org_${match2[1]}`;
  return `cb_${url.replace(/[^a-zA-Z0-9]/g, "_").slice(-40)}`;
}

// POST /api/import/contacts
router.post("/contacts", async (req: Request, res: Response) => {
  try {
    const { contacts } = req.body as { contacts: CsvContact[] };

    if (!Array.isArray(contacts) || contacts.length === 0) {
      res.status(400).json({ success: false, error: "contacts array required" });
      return;
    }

    const db = getDb();
    const valid = contacts.filter(c => c.name?.trim() && c.crunchbaseUrl?.trim());

    // Write in Firestore batches of 500 — using slug as doc ID for auto-deduplication
    const BATCH_SIZE = 400;
    let written = 0;

    for (let i = 0; i < valid.length; i += BATCH_SIZE) {
      const chunk = valid.slice(i, i + BATCH_SIZE);
      const batch = db.batch();

      for (const c of chunk) {
        const docId = slugFromUrl(c.crunchbaseUrl);
        const ref = db.collection(COLLECTIONS.CONTACTS).doc(docId);
        // merge: true — won't overwrite email if contact already enriched
        batch.set(ref, {
          name: c.name.trim(),
          crunchbaseUrl: c.crunchbaseUrl,
          location: c.location || "",
          source: "crunchbase",
          title: "Angel Investor",
          investorType: c.investorType || "",
          numInvestments: c.numInvestments || 0,
          numExits: c.numExits || 0,
          createdAt: new Date().toISOString(),
        }, { merge: true });
      }

      await batch.commit();
      written += chunk.length;
    }

    res.json({
      success: true,
      data: { imported: written, skipped: contacts.length - valid.length, total: contacts.length },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Import error:", msg);
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/import/find-emails — start background email finder
router.post("/find-emails", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const jobRef = db.collection("emailFinderJobs").doc();
    // Fire and forget
    findEmailsForAllContacts(jobRef.id).catch(console.error);
    res.status(202).json({
      success: true,
      data: { jobId: jobRef.id },
      message: "Email finder started in background.",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/import/find-emails/:jobId
router.get("/find-emails/:jobId", async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const doc = await db.collection("emailFinderJobs").doc(req.params.jobId).get();
    if (!doc.exists) { res.status(404).json({ success: false, error: "Job not found" }); return; }
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/import/find-emails
router.get("/find-emails", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection("emailFinderJobs").orderBy("startedAt", "desc").limit(10).get();
    res.json({ success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
