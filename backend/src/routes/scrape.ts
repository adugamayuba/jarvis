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
import {
  scrapePressOutletJournalists,
  scrapeAllPressOutlets,
} from "../services/pressScraper";
import { getDb, COLLECTIONS } from "../services/firebase";
import * as admin from "firebase-admin";
import { Contact, ScrapeJob } from "../types";
import {
  audienceFromScrapeSource,
  upsertContactWithAudience,
  OutreachAudience,
} from "../lib/outreachAudience";
import {
  PRESS_OUTLET_IDS,
  PressOutletId,
  isPressOutletId,
  getPressOutlet,
  listPressOutlets,
} from "../lib/pressOutlets";

const router = Router();

const SocialPlatformSchema = z.enum(["twitter", "instagram", "facebook", "tiktok"]);

const ScrapeSourceSchema = z.enum([
  "crunchbase",
  "linkedin",
  "twitter",
  "social_google",
  "press_all",
  ...PRESS_OUTLET_IDS,
] as [string, ...string[]]);

const ScrapeRequestSchema = z.object({
  source: ScrapeSourceSchema.default("crunchbase"),
  url: z.string().optional(),
  keyword: z.string().optional(),
  platforms: z.array(SocialPlatformSchema).optional(),
  maxPagesPerQuery: z.number().int().min(1).max(5).optional(),
  maxProfiles: z.number().int().min(10).max(500).optional(),
}).superRefine((data, ctx) => {
  if (data.source === "social_google" || isPressOutletId(data.source) || data.source === "press_all") {
    return;
  }
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

function profileDocId(profileUrl: string, prefix: string): string {
  const slug = profileUrl.replace(/[^a-zA-Z0-9]/g, "_").slice(-55);
  return `${prefix}_${slug}`;
}

async function savePressContacts(
  db: admin.firestore.Firestore,
  outletId: PressOutletId,
  contacts: Array<{
    name: string;
    email?: string;
    emails?: string[];
    oneLiner?: string;
    title?: string;
    company?: string;
    profileUrl?: string;
  }>
): Promise<number> {
  const config = getPressOutlet(outletId);
  let saved = 0;

  for (const c of contacts) {
    const docId = c.profileUrl ? profileDocId(c.profileUrl, config.docPrefix) : undefined;
    const tags = ["journalist", `outlet:${outletId}`];
    if (c.profileUrl) tags.push(`profile:${c.profileUrl}`);

    const payload: Record<string, unknown> = {
      name: c.name,
      email: (c.email || "").trim().toLowerCase(),
      oneLiner: c.oneLiner || "",
      title: c.title || "",
      company: c.company || config.company,
      source: outletId,
      emailSent: false,
    };
    if (c.emails?.length) payload.emails = c.emails.map(e => e.toLowerCase());
    if (c.profileUrl) payload.crunchbaseUrl = c.profileUrl;
    payload.tags = [...new Set(tags)];

    const result = await upsertContactWithAudience(db, {
      docId,
      payload,
      audience: "journalist",
      primaryEmail: c.email,
    });

    if (result.action !== "skipped_conflict") saved++;
  }

  return saved;
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
  let saved = 0;

  for (const c of contacts) {
    const audience: OutreachAudience = audienceFromScrapeSource(c.source);
    const prefix = isPressOutletId(c.source)
      ? getPressOutlet(c.source).docPrefix
      : "social";
    const docId = c.profileUrl ? profileDocId(c.profileUrl, prefix) : undefined;

    const tags = [...(c.tags || [])];
    if (c.profileUrl) tags.push(`profile:${c.profileUrl}`);

    const payload: Record<string, unknown> = {
      name: c.name,
      email: (c.email || "").trim().toLowerCase(),
      oneLiner: c.oneLiner || "",
      title: c.title || "",
      company: c.company || "",
      source: c.source,
      emailSent: false,
    };
    if (c.emails?.length) payload.emails = c.emails.map(e => e.toLowerCase());
    if (c.linkedinUrl) payload.linkedinUrl = c.linkedinUrl;
    if (c.crunchbaseUrl) payload.crunchbaseUrl = c.crunchbaseUrl;
    if (tags.length) payload.tags = [...new Set(tags)];

    const result = await upsertContactWithAudience(db, {
      docId,
      payload,
      audience,
      primaryEmail: c.email,
    });

    if (result.action !== "skipped_conflict") saved++;
  }

  return saved;
}

async function runPressScrapeJob(
  db: admin.firestore.Firestore,
  jobRef: admin.firestore.DocumentReference,
  outletId: PressOutletId,
  url?: string
): Promise<number> {
  const config = getPressOutlet(outletId);
  const scraped = await scrapePressOutletJournalists(outletId, url || config.staffPageUrl);
  return savePressContacts(db, outletId, scraped);
}

// GET /api/scrape/press-outlets — list Reelin press targets
router.get("/press-outlets", (_req: Request, res: Response) => {
  res.json({ success: true, data: listPressOutlets() });
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

    const { source, url, keyword, platforms, maxPagesPerQuery, maxProfiles } = parsed.data;
    const db = getDb();

    const jobLabel =
      source === "social_google"
        ? buildSocialScrapeLabel({ keyword, platforms: platforms as SocialPlatform[] | undefined })
        : source === "press_all"
          ? "All press outlets (Reelin AI)"
          : isPressOutletId(source)
            ? `${getPressOutlet(source).label} journalists`
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
        let pressResults: Record<string, number> | undefined;

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
        } else if (source === "press_all") {
          pressResults = {};
          for (const outletId of PRESS_OUTLET_IDS) {
            try {
              const count = await runPressScrapeJob(db, jobRef, outletId);
              pressResults[outletId] = count;
              savedCount += count;
            } catch (err) {
              console.error(`Press scrape failed for ${outletId}:`, err);
              pressResults[outletId] = 0;
            }
          }
        } else if (isPressOutletId(source)) {
          savedCount = await runPressScrapeJob(db, jobRef, source, url);
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

        await jobRef.update(
          omitUndefined({
            status: "completed",
            contactsFound: savedCount,
            pressResults,
            completedAt: new Date().toISOString(),
          })
        );

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
    press_outlets: PRESS_OUTLET_IDS.length,
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
