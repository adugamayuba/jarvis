import { Router, Request, Response } from "express";

interface JobIdParams extends Record<string, string> { jobId: string }
import { z } from "zod";
import { scrapeCrunchbaseDirect } from "../services/crunchbase";
import { getDb, COLLECTIONS } from "../services/firebase";
import { Contact, ScrapeJob } from "../types";

const router = Router();

const ScrapeRequestSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  source: z.enum(["crunchbase", "linkedin", "twitter"]).default("crunchbase"),
});

// POST /api/scrape — kick off a scrape job
router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = ScrapeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      });
      return;
    }

    const { url, source } = parsed.data;
    const db = getDb();

    // Create scrape job record
    const jobRef = await db.collection(COLLECTIONS.SCRAPE_JOBS).add({
      url,
      source,
      status: "running",
      createdAt: new Date().toISOString(),
    } satisfies Omit<ScrapeJob, "id">);

    // Run scraping in the background and update job when done
    (async () => {
      try {
        let contacts: Awaited<ReturnType<typeof scrapeCrunchbaseDirect>> = [];

        if (source === "crunchbase") {
          contacts = await scrapeCrunchbaseDirect(url);
        } else {
          throw new Error(`Source '${source}' not yet supported`);
        }

        // Save contacts to Firestore
        const batch = db.batch();
        const savedContacts: Contact[] = [];

        for (const c of contacts) {
          const contactRef = db.collection(COLLECTIONS.CONTACTS).doc();
          const contact: Contact = {
            ...c,
            source,
            emailSent: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          batch.set(contactRef, contact);
          savedContacts.push({ id: contactRef.id, ...contact });
        }

        await batch.commit();

        await jobRef.update({
          status: "completed",
          contactsFound: contacts.length,
          completedAt: new Date().toISOString(),
        });

        console.log(
          `✅ Scrape job ${jobRef.id} completed — ${contacts.length} contacts found`
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        await jobRef.update({ status: "failed", error: message });
        console.error(`❌ Scrape job ${jobRef.id} failed:`, message);
      }
    })();

    res.status(202).json({
      success: true,
      data: { jobId: jobRef.id },
      message: "Scrape job started. Poll /api/scrape/:jobId for status.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/scrape/:jobId — get job status
router.get("/:jobId", async (req: Request<JobIdParams>, res: Response) => {
  try {
    const db = getDb();
    const doc = await db
      .collection(COLLECTIONS.SCRAPE_JOBS)
      .doc(req.params.jobId)
      .get();

    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Job not found" });
      return;
    }

    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/scrape — list all jobs
router.get("/", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snapshot = await db
      .collection(COLLECTIONS.SCRAPE_JOBS)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const jobs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: jobs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
