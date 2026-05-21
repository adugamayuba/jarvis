import { Router, Request, Response } from "express";
import { getDb, COLLECTIONS } from "../services/firebase";
import { findEmailsForAllContacts } from "../services/emailFinder";
import { apolloMatchPerson } from "../services/apollo";

interface IdParams extends Record<string, string> { jobId: string }

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
          email: "",            // required for email finder query
          oneLiner: "",
          crunchbaseUrl: c.crunchbaseUrl,
          location: c.location || "",
          source: "crunchbase",
          title: "Angel Investor",
          company: "",
          emailSent: false,
          investorType: c.investorType || "",
          numInvestments: c.numInvestments || 0,
          numExits: c.numExits || 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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

// POST /api/import/patch-emails — backfill email:"" on contacts missing the field
router.post("/patch-emails", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.CONTACTS)
      .where("source", "==", "crunchbase")
      .limit(3000)
      .get();

    const needsPatch = snap.docs.filter(d => d.data().email === undefined);
    if (needsPatch.length === 0) {
      res.json({ success: true, data: { patched: 0, message: "All contacts already have email field" } });
      return;
    }

    const BATCH_SIZE = 400;
    let patched = 0;
    for (let i = 0; i < needsPatch.length; i += BATCH_SIZE) {
      const chunk = needsPatch.slice(i, i + BATCH_SIZE);
      const batch = db.batch();
      for (const doc of chunk) {
        batch.update(doc.ref, { email: "", emailSent: false, updatedAt: new Date().toISOString() });
      }
      await batch.commit();
      patched += chunk.length;
    }

    res.json({ success: true, data: { patched, total: snap.size } });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
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
router.get("/find-emails/:jobId", async (req: Request<IdParams>, res: Response) => {
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

// POST /api/import/apollo-enrich — run Apollo enrichment on all contacts
router.post("/apollo-enrich", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const jobRef = db.collection("apolloJobs").doc();

    // Fire and forget
    (async () => {
      try {
        const snap = await db.collection(COLLECTIONS.CONTACTS)
          .where("source", "==", "crunchbase")
          .limit(1500)
          .get();

        const contacts = snap.docs.map(d => ({
          id: d.id,
          name: (d.data().name as string) || "",
          company: (d.data().company as string) || "",
          existingEmail: (d.data().email as string) || "",
        })).filter(c => c.name);

        await jobRef.set({
          status: "running",
          total: contacts.length,
          processed: 0,
          found: 0,
          startedAt: new Date().toISOString(),
        });

        let processed = 0;
        let found = 0;

        for (const contact of contacts) {
          try {
            const result = await apolloMatchPerson(contact.name, contact.company || undefined);
            processed++;

            if (result?.email || (result?.emails && result.emails.length > 0)) {
              const primaryEmail = result.email || result.emails![0];
              const allEmails = result.emails || [primaryEmail];

              await db.collection(COLLECTIONS.CONTACTS).doc(contact.id).update({
                email: primaryEmail,
                apolloEmails: allEmails,
                title: result.title || undefined,
                linkedinUrl: result.linkedin || undefined,
                apolloEnriched: true,
                updatedAt: new Date().toISOString(),
              });
              found++;
              console.log(`✅ Apollo: ${contact.name} → ${primaryEmail}`);
            }

            // Update progress every 10
            if (processed % 10 === 0) {
              await jobRef.update({ processed, found, progress: Math.round((processed / contacts.length) * 100) });
            }

            // Apollo free: 50 req/min = 1.2s between calls
            await new Promise(r => setTimeout(r, 1300));
          } catch (err) {
            processed++;
            console.error(`Apollo error for ${contact.name}:`, err instanceof Error ? err.message : err);
          }
        }

        await jobRef.update({
          status: "completed",
          processed,
          found,
          progress: 100,
          completedAt: new Date().toISOString(),
        });
        console.log(`✅ Apollo enrichment done: ${found}/${contacts.length} emails`);
      } catch (err) {
        await jobRef.update({ status: "failed", error: err instanceof Error ? err.message : String(err) });
      }
    })();

    res.status(202).json({ success: true, data: { jobId: jobRef.id }, message: "Apollo enrichment started" });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/import/apollo-enrich/:jobId
router.get("/apollo-enrich/:jobId", async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    const doc = await db.collection("apolloJobs").doc(req.params.jobId).get();
    if (!doc.exists) { res.status(404).json({ success: false, error: "Not found" }); return; }
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/import/apollo-enrich
router.get("/apollo-enrich", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection("apolloJobs").orderBy("startedAt", "desc").limit(10).get();
    res.json({ success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
