import { Router, Request, Response } from "express";
import axios from "axios";
import { getDb, COLLECTIONS } from "../services/firebase";
import { findEmailsForAllContacts } from "../services/emailFinder";
import { apolloMatchPerson, apolloTestConnection } from "../services/apollo";
import { hunterTestConnection } from "../services/hunter";
import { findLinkedInUrls } from "../services/linkedinFinder";

interface IdParams extends Record<string, string> { jobId: string }

const router = Router();

function formatJobError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: { message?: string } | string } | undefined;
    if (typeof data?.error === "string") return data.error;
    if (data?.error && typeof data.error === "object" && data.error.message) {
      return data.error.message;
    }
    return err.message || `HTTP ${err.response?.status ?? "error"}`;
  }
  return String(err ?? "Unknown error");
}

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
    // Create document first so the job can update it safely
    await jobRef.set({ status: "pending", total: 0, processed: 0, found: 0, startedAt: new Date().toISOString() });
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

// POST /api/import/find-emails/:jobId/cancel
router.post("/find-emails/:jobId/cancel", async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    await db.collection("emailFinderJobs").doc(req.params.jobId).update({
      status: "cancelled", updatedAt: new Date().toISOString(),
    });
    res.json({ success: true });
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

// GET /api/import/hunter-test
router.get("/hunter-test", async (_req: Request, res: Response) => {
  try {
    const result = await hunterTestConnection();
    res.json({ success: result.ok, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/import/apollo-test — verify API key works
router.get("/apollo-test", async (_req: Request, res: Response) => {
  try {
    const result = await apolloTestConnection();
    res.json({ success: result.ok, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/import/apollo-enrich — run Apollo enrichment on all contacts
router.post("/apollo-enrich", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const jobRef = db.collection("apolloJobs").doc();

    // Create the document FIRST so update() calls don't fail
    await jobRef.set({
      status: "pending",
      total: 0,
      processed: 0,
      found: 0,
      startedAt: new Date().toISOString(),
    });

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
          crunchbaseUrl: (d.data().crunchbaseUrl as string) || "",
          linkedinUrl: (d.data().linkedinUrl as string) || "",
          location: (d.data().location as string) || "",
        })).filter(c => c.name);

        await jobRef.update({
          status: "finding_linkedin",
          total: contacts.length,
        });

        // Phase 1: Batch-find LinkedIn URLs for contacts that don't have one
        const needsLinkedIn = contacts.filter(c => !c.linkedinUrl);
        console.log(`🔍 Finding LinkedIn URLs for ${needsLinkedIn.length} contacts...`);

        const LINKEDIN_BATCH = 10; // 10 names per Apify Google Search run (more reliable)
        let linkedinProcessed = 0;
        let linkedinFound = 0;

        for (let i = 0; i < needsLinkedIn.length; i += LINKEDIN_BATCH) {
          const batch = needsLinkedIn.slice(i, i + LINKEDIN_BATCH);
          const linkedinMap = await findLinkedInUrls(batch.map(c => c.name));

          // Save LinkedIn URLs — skip commit if batch is empty (empty batch throws)
          const firestoreBatch = db.batch();
          let writes = 0;
          for (const c of batch) {
            const linkedinUrl = linkedinMap.get(c.name);
            if (linkedinUrl) {
              c.linkedinUrl = linkedinUrl;
              firestoreBatch.update(db.collection(COLLECTIONS.CONTACTS).doc(c.id), {
                linkedinUrl, updatedAt: new Date().toISOString(),
              });
              writes++;
              linkedinFound++;
            }
          }
          if (writes > 0) {
            await firestoreBatch.commit();
          }

          linkedinProcessed += batch.length;
          const batchNum = Math.floor(i / LINKEDIN_BATCH) + 1;
          const totalBatches = Math.ceil(needsLinkedIn.length / LINKEDIN_BATCH);
          console.log(`LinkedIn batch ${batchNum}/${totalBatches}: found ${linkedinMap.size}/${batch.length} URLs`);

          await jobRef.update({
            processed: linkedinProcessed,
            found: linkedinFound,
            progress: Math.round((linkedinProcessed / needsLinkedIn.length) * 50),
          });

          await new Promise(r => setTimeout(r, 1500));
        }

        await jobRef.update({ status: "running" });

        let processed = 0;
        let found = 0;

        for (const contact of contacts) {
          try {
            const org = contact.company || undefined;
            const linkedin = contact.linkedinUrl || undefined;
            const result = await apolloMatchPerson(contact.name, org, linkedin);
            processed++;

            if (result?.emails && result.emails.length > 0) {
              // Merge with any existing emails from Google search
              const existingEmail = contact.existingEmail || "";
              const apolloEmails = result.emails;
              const merged = [...new Set([
                ...(existingEmail ? [existingEmail] : []),
                ...apolloEmails,
              ])].filter(Boolean);

              const primaryEmail = apolloEmails[0]; // Apollo's best is primary

              await db.collection(COLLECTIONS.CONTACTS).doc(contact.id).update({
                email: primaryEmail,
                emails: merged,           // all known emails
                apolloEmails: apolloEmails,
                title: result.title || undefined,
                linkedinUrl: result.linkedin || undefined,
                apolloEnriched: true,
                updatedAt: new Date().toISOString(),
              });
              found++;
              console.log(`✅ Apollo: ${contact.name} → ${merged.join(", ")}`);
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
        const error = formatJobError(err);
        console.error("Apollo enrichment job failed:", error);
        await jobRef.update({ status: "failed", error, completedAt: new Date().toISOString() });
      }
    })();

    res.status(202).json({ success: true, data: { jobId: jobRef.id }, message: "Apollo enrichment started" });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/import/apollo-enrich/:jobId/cancel — mark stuck job as cancelled
router.post("/apollo-enrich/:jobId/cancel", async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    await db.collection("apolloJobs").doc(req.params.jobId).update({
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    });
    res.json({ success: true });
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
