import { Router, Request, Response } from "express";

interface JobIdParams extends Record<string, string> { jobId: string }
import { z } from "zod";
import { scrapeCrunchbaseDirect } from "../services/crunchbase";
import { scrapeLinkedInSearch, parseLinkedInSearchUrl } from "../services/linkedinScraper";
import {
  scrapeSocialViaGoogle,
  buildSocialScrapeLabel,
  socialPlatformToContactSource,
  SocialPlatform,
} from "../services/socialGoogleScraper";
import { scrapeTechCrunchJournalists } from "../services/techcrunchScraper";
import { getDb, COLLECTIONS } from "../services/firebase";
import * as admin from "firebase-admin";
import { Contact, ScrapeJob } from "../types";

const router = Router();

const SocialPlatformSchema = z.enum(["twitter", "instagram", "facebook", "tiktok"]);

const ScrapeRequestSchema = z.object({
  source: z.enum(["crunchbase", "linkedin", "twitter", "social_google", "techcrunch"]).default("crunchbase"),
  url: z.string().optional(),
  keyword: z.string().optional(),
  platforms: z.array(SocialPlatformSchema).optional(),
  maxPagesPerQuery: z.number().int().min(1).max(5).optional(),
  maxProfiles: z.number().int().min(10).max(500).optional(),
}).superRefine((data, ctx) => {
  if (data.source === "social_google" || data.source === "techcrunch") return;
  if (!data.url?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "url is required for this source", path: ["url"] });
    return;
  }
  try {
    new URL(data.url);
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be a valid URL", path: ["url"] });
  }
});

function omitUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}


function profileDocId(profileUrl: string, prefix = "social"): string {
  const slug = profileUrl.replace(/[^a-zA-Z0-9]/g, "_").slice(-55);
  return `${prefix}_${slug}`;
}

async function saveContacts(
  db: admin.firestore.Firestore,
  contacts: Array<{
    name: string;
    email?: string;
    emails?: string[];
    oneLiner?: string;
    title?: string;
    company?: string;
    linkedinUrl?: string;
    crunchbaseUrl?: string;
    source: Contact["source"];
    profileUrl?: string;
    tags?: string[];
  }>
): Promise<number> {
  const BATCH_SIZE = 400;
  let saved = 0;

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const chunk = contacts.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    const now = new Date().toISOString();

    for (const c of chunk) {
      const prefix = c.source === "techcrunch" ? "tc" : "social";
      const docId = c.profileUrl ? profileDocId(c.profileUrl, prefix) : db.collection(COLLECTIONS.CONTACTS).doc().id;
      const ref = db.collection(COLLECTIONS.CONTACTS).doc(docId);
      const payload: Record<string, unknown> = {
        name: c.name,
        email: (c.email || "").trim().toLowerCase(),
        oneLiner: c.oneLiner || "",
        title: c.title || "",
        company: c.company || "",
        source: c.source,
        emailSent: false,
        updatedAt: now,
      };
      if (c.emails?.length) payload.emails = c.emails.map(e => e.toLowerCase());
      if (c.linkedinUrl) payload.linkedinUrl = c.linkedinUrl;
      if (c.crunchbaseUrl) payload.crunchbaseUrl = c.crunchbaseUrl;
      const tags = [...(c.tags || [])];
      if (c.profileUrl) tags.push(`profile:${c.profileUrl}`);
      if (tags.length) payload.tags = [...new Set(tags)];

      batch.set(ref, { ...payload, createdAt: now }, { merge: true });
      saved++;
    }

    await batch.commit();
  }

  return saved;
}

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

    const { source, url, keyword, platforms, maxPagesPerQuery, maxProfiles } = parsed.data;
    const db = getDb();

    const jobLabel =
      source === "social_google"
        ? buildSocialScrapeLabel({ keyword, platforms: platforms as SocialPlatform[] | undefined })
        : source === "techcrunch"
          ? url || "https://techcrunch.com/about-techcrunch/"
          : url!;

    const jobRef = await db.collection(COLLECTIONS.SCRAPE_JOBS).add(
      omitUndefined({
        url: jobLabel,
        source,
        status: "running",
        keyword,
        platforms,
        createdAt: new Date().toISOString(),
      }) as Omit<ScrapeJob, "id">
    );

    (async () => {
      try {
        let savedCount = 0;

        if (source === "social_google") {
          const scraped = await scrapeSocialViaGoogle({
            keyword: keyword || "angel investor",
            platforms: (platforms as SocialPlatform[] | undefined) || ["twitter", "instagram"],
            maxPagesPerQuery: maxPagesPerQuery || 2,
            maxProfiles: maxProfiles || 150,
          });

          savedCount = await saveContacts(
            db,
            scraped.map(c => ({
              name: c.name,
              email: c.email,
              emails: c.emails,
              oneLiner: c.oneLiner,
              title: c.title,
              company: c.company,
              linkedinUrl: c.linkedinUrl,
              crunchbaseUrl: c.profileUrl,
              profileUrl: c.profileUrl,
              source: socialPlatformToContactSource(c.platform),
            }))
          );
        } else if (source === "techcrunch") {
          const scraped = await scrapeTechCrunchJournalists(
            url || "https://techcrunch.com/about-techcrunch/"
          );
          savedCount = await saveContacts(
            db,
            scraped.map(c => ({
              name: c.name,
              email: c.email,
              emails: c.emails,
              oneLiner: c.oneLiner,
              title: c.title,
              company: c.company || "TechCrunch",
              crunchbaseUrl: c.profileUrl,
              profileUrl: c.profileUrl,
              source: "techcrunch" as const,
              tags: ["journalist"],
            }))
          );
        } else if (source === "crunchbase") {
          const contacts = await scrapeCrunchbaseDirect(url!);
          savedCount = await saveContacts(
            db,
            contacts.map(c => ({ ...c, source: "crunchbase" as const }))
          );
        } else if (source === "linkedin") {
          const options = parseLinkedInSearchUrl(url!);
          options.maxItems = 1000;
          const contacts = await scrapeLinkedInSearch(options);
          savedCount = await saveContacts(
            db,
            contacts.map(c => ({ ...c, source: "linkedin" as const }))
          );
        } else {
          throw new Error(`Source '${source}' not yet supported`);
        }

        await jobRef.update({
          status: "completed",
          contactsFound: savedCount,
          completedAt: new Date().toISOString(),
        });

        console.log(`✅ Scrape job ${jobRef.id} completed — ${savedCount} contacts saved`);
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

// GET /api/scrape/debug — check credentials status (must be before /:jobId)
router.get("/debug", (_req: Request, res: Response) => {
  const cookies = process.env.CRUNCHBASE_COOKIES || "";
  let cookieCount = 0;
  try {
    const arr = JSON.parse(cookies);
    cookieCount = Array.isArray(arr) ? arr.length : 0;
  } catch {
    cookieCount = -1;
  }

  res.json({
    cookies_set: cookies.length > 0,
    cookies_valid_json: cookieCount >= 0,
    cookie_count: cookieCount,
    user_key_set: !!process.env.CRUNCHBASE_USER_KEY,
    user_key_preview: process.env.CRUNCHBASE_USER_KEY?.slice(0, 8) + "...",
    apify_token_set: !!process.env.APIFY_API_TOKEN,
  });
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
