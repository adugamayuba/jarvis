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

// POST /api/import/contacts — bulk import from CSV data
router.post("/contacts", async (req: Request, res: Response) => {
  try {
    const { contacts } = req.body as { contacts: CsvContact[] };

    if (!Array.isArray(contacts) || contacts.length === 0) {
      res.status(400).json({ success: false, error: "contacts array required" });
      return;
    }

    const db = getDb();

    // Check which ones already exist by crunchbaseUrl to avoid duplicates
    const existing = await db.collection(COLLECTIONS.CONTACTS)
      .where("source", "==", "crunchbase")
      .get();
    const existingUrls = new Set(existing.docs.map(d => d.data().crunchbaseUrl as string));

    const toImport = contacts.filter(c => c.name && !existingUrls.has(c.crunchbaseUrl));

    if (toImport.length === 0) {
      res.json({ success: true, data: { imported: 0, skipped: contacts.length, message: "All contacts already imported" } });
      return;
    }

    // Batch write in chunks of 500 (Firestore limit)
    const chunkSize = 500;
    let imported = 0;

    for (let i = 0; i < toImport.length; i += chunkSize) {
      const chunk = toImport.slice(i, i + chunkSize);
      const batch = db.batch();

      for (const c of chunk) {
        const ref = db.collection(COLLECTIONS.CONTACTS).doc();
        batch.set(ref, {
          name: c.name,
          email: "",
          oneLiner: "",
          title: "Angel Investor",
          company: "",
          crunchbaseUrl: c.crunchbaseUrl,
          location: c.location || "",
          source: "crunchbase",
          emailSent: false,
          investorType: c.investorType || "",
          numInvestments: c.numInvestments || 0,
          numExits: c.numExits || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      await batch.commit();
      imported += chunk.length;
    }

    res.json({
      success: true,
      data: {
        imported,
        skipped: contacts.length - toImport.length,
        total: contacts.length,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/import/find-emails — start background email finder job
router.post("/find-emails", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const jobRef = db.collection("emailFinderJobs").doc();

    // Start async — don't await
    findEmailsForAllContacts(jobRef.id).catch(console.error);

    res.status(202).json({
      success: true,
      data: { jobId: jobRef.id },
      message: "Email finder started — running in background. Poll /api/import/find-emails/:jobId for progress.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/import/find-emails/:jobId — poll job progress
router.get("/find-emails/:jobId", async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const doc = await db.collection("emailFinderJobs").doc(req.params.jobId).get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Job not found" });
      return;
    }
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/import/find-emails — list all finder jobs
router.get("/find-emails", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection("emailFinderJobs").orderBy("startedAt", "desc").limit(10).get();
    const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: jobs });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: msg });
  }
});

export default router;
