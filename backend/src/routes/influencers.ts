import { Router, Request, Response } from "express";
import axios from "axios";
import { getDb } from "../services/firebase";

interface JobIdParams extends Record<string, string> { jobId: string }
interface IdParams extends Record<string, string> { id: string }

const router = Router();

const APIFY_BASE = "https://api.apify.com/v2";
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

interface InfluencerSearchParams {
  niche: string;
  platforms: string[];
  minFollowers?: number;
  maxFollowers?: number;
  location?: string;
  maxResults?: number;
}

async function waitForRun(runId: string, maxAttempts = 60): Promise<boolean> {
  let status = "RUNNING";
  let attempts = 0;
  while ((status === "RUNNING" || status === "READY") && attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const s = await axios.get(`${APIFY_BASE}/actor-runs/${runId}`, {
        params: { token: APIFY_TOKEN },
        timeout: 10_000,
      });
      status = s.data.data.status;
    } catch { /* keep polling */ }
    attempts++;
  }
  return status === "SUCCEEDED";
}

// Search Instagram influencers
async function searchInstagramInfluencers(niche: string, maxResults: number) {
  const runRes = await axios.post(
    `${APIFY_BASE}/acts/apify~instagram-api-scraper/runs`,
    {
      search: niche,
      searchType: "user",
      searchLimit: maxResults,
      resultsType: "users",
    },
    { params: { token: APIFY_TOKEN }, timeout: 30_000 }
  );
  const runId = runRes.data.data.id;
  const datasetId = runRes.data.data.defaultDatasetId;
  await waitForRun(runId);
  const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
    params: { token: APIFY_TOKEN, format: "json", clean: true, limit: maxResults },
  });
  return (items.data as Array<Record<string, unknown>>).map(p => ({
    platform: "instagram",
    username: (p.username as string) || "",
    name: (p.fullName as string) || (p.username as string) || "",
    bio: (p.biography as string) || "",
    followers: (p.followersCount as number) || 0,
    profileUrl: `https://instagram.com/${p.username}`,
    email: (p.businessEmail as string) || extractEmailFromBio(p.biography as string || ""),
    profilePic: (p.profilePicUrl as string) || "",
  }));
}

// Search Twitter/X influencers
async function searchTwitterInfluencers(niche: string, maxResults: number) {
  const runRes = await axios.post(
    `${APIFY_BASE}/acts/kaitoeasyapi~twitter-x-data-tweet-scraper-pay-per-result-cheapest/runs`,
    {
      searchTerms: [`${niche} influencer`],
      maxItems: maxResults,
      searchMode: "users",
    },
    { params: { token: APIFY_TOKEN }, timeout: 30_000 }
  );
  const runId = runRes.data.data.id;
  const datasetId = runRes.data.data.defaultDatasetId;
  await waitForRun(runId);
  const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
    params: { token: APIFY_TOKEN, format: "json", clean: true, limit: maxResults },
  });
  return (items.data as Array<Record<string, unknown>>).map(p => {
    const author = p.author as Record<string, unknown> | undefined;
    const username = (p.username as string) || (author?.userName as string) || "";
    const name = (p.name as string) || (author?.name as string) || "";
    const bio = (p.description as string) || (author?.description as string) || "";
    const followers = (p.followersCount as number) || (author?.followers as number) || 0;
    return {
      platform: "twitter",
      username,
      name,
      bio,
      followers,
      profileUrl: `https://x.com/${username}`,
      email: extractEmailFromBio(bio),
      profilePic: (p.profilePicUrl as string) || "",
    };
  });
}

// Use Google search to find emails for influencers without one
async function findEmailsViaGoogle(influencers: Array<{ name: string; username: string; platform: string }>) {
  if (!APIFY_TOKEN || influencers.length === 0) return new Map<string, string>();

  const queries = influencers
    .slice(0, 20) // max 20 at once
    .map(i => `"${i.name || i.username}" ${i.platform} influencer email contact`)
    .join("\n");

  try {
    const runRes = await axios.post(
      `${APIFY_BASE}/acts/apify~google-search-scraper/runs`,
      { queries, maxPagesPerQuery: 1, resultsPerPage: 3 },
      { params: { token: APIFY_TOKEN }, timeout: 30_000 }
    );
    const runId = runRes.data.data.id;
    await waitForRun(runId, 24);
    const datasetId = runRes.data.data.defaultDatasetId;
    const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
      params: { token: APIFY_TOKEN, format: "json", clean: true },
    });

    const emailMap = new Map<string, string>();
    const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const SKIP_DOMAINS = ["sentry.io", "example.com", "wix.com", "squarespace.com", "adobe.com"];

    const pages = items.data as Array<{ searchQuery?: { term?: string }; organicResults?: Array<{ title?: string; url?: string; description?: string }> }>;
    for (const page of pages) {
      const term = page.searchQuery?.term || "";
      const nameMatch = term.match(/"([^"]+)"/);
      if (!nameMatch) continue;
      const name = nameMatch[1];

      const allText = (page.organicResults || [])
        .map(r => `${r.title || ""} ${r.description || ""} ${r.url || ""}`)
        .join(" ");

      const emails = (allText.match(EMAIL_REGEX) || [])
        .filter(e => !SKIP_DOMAINS.some(d => e.includes(d)) && e.length < 80);

      if (emails[0]) emailMap.set(name, emails[0]);
    }
    return emailMap;
  } catch {
    return new Map<string, string>();
  }
}

function extractEmailFromBio(bio: string): string {
  const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = bio.match(EMAIL_REGEX);
  return match ? match[0] : "";
}

// POST /api/influencers/search — start a search job
router.post("/search", async (req: Request, res: Response) => {
  try {
    if (!APIFY_TOKEN) {
      res.status(500).json({ success: false, error: "APIFY_API_TOKEN not set" });
      return;
    }

    const { niche, platforms, minFollowers, maxFollowers, maxResults = 50 } = req.body as InfluencerSearchParams;

    if (!niche) {
      res.status(400).json({ success: false, error: "niche is required" });
      return;
    }

    const db = getDb();
    const jobRef = db.collection("influencerJobs").doc();
    await jobRef.set({
      niche,
      platforms: platforms || ["instagram", "twitter"],
      status: "running",
      total: 0,
      found: 0,
      startedAt: new Date().toISOString(),
    });

    // Fire and forget
    (async () => {
      try {
        const allInfluencers: Array<Record<string, unknown>> = [];
        const platformList = platforms || ["instagram", "twitter"];

        for (const platform of platformList) {
          try {
            let results: Array<Record<string, unknown>> = [];
            if (platform === "instagram") {
              results = await searchInstagramInfluencers(niche, Math.ceil(maxResults / platformList.length));
            } else if (platform === "twitter") {
              results = await searchTwitterInfluencers(niche, Math.ceil(maxResults / platformList.length));
            }

            // Filter by follower count
            const filtered = results.filter(r => {
              const f = r.followers as number || 0;
              if (minFollowers && f < minFollowers) return false;
              if (maxFollowers && f > maxFollowers) return false;
              return true;
            });

            allInfluencers.push(...filtered);
          } catch (err) {
            console.error(`${platform} search failed:`, err instanceof Error ? err.message : err);
          }
        }

        await jobRef.update({ status: "finding_emails", total: allInfluencers.length });

        // Find emails for those without one
        const needsEmail = allInfluencers
          .filter(i => !i.email)
          .map(i => ({ name: i.name as string, username: i.username as string, platform: i.platform as string }));

        if (needsEmail.length > 0) {
          const emailMap = await findEmailsViaGoogle(needsEmail);
          for (const inf of allInfluencers) {
            if (!inf.email) {
              const found = emailMap.get(inf.name as string);
              if (found) inf.email = found;
            }
          }
        }

        // Save to Firestore
        const batch = db.batch();
        for (const inf of allInfluencers) {
          const docRef = db.collection("influencers").doc();
          batch.set(docRef, {
            ...inf,
            niche,
            createdAt: new Date().toISOString(),
          });
        }
        await batch.commit();

        const withEmails = allInfluencers.filter(i => i.email).length;
        await jobRef.update({
          status: "completed",
          total: allInfluencers.length,
          found: withEmails,
          completedAt: new Date().toISOString(),
        });

        console.log(`Influencer search done: ${allInfluencers.length} found, ${withEmails} with emails`);
      } catch (err) {
        await jobRef.update({ status: "failed", error: err instanceof Error ? err.message : String(err) });
      }
    })();

    res.status(202).json({ success: true, data: { jobId: jobRef.id }, message: "Influencer search started" });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/influencers/jobs/:jobId
router.get("/jobs/:jobId", async (req: Request<JobIdParams>, res: Response) => {
  try {
    const db = getDb();
    const doc = await db.collection("influencerJobs").doc(req.params.jobId).get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Job not found" });
      return;
    }
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/influencers — list found influencers
router.get("/", async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const niche = req.query.niche as string | undefined;
    const hasEmail = req.query.hasEmail as string | undefined;

    const snap = await db.collection("influencers").orderBy("followers", "desc").limit(500).get();
    let results = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (niche) results = results.filter((r: Record<string, unknown>) => (r.niche as string)?.toLowerCase().includes(niche.toLowerCase()));
    if (hasEmail === "true") results = results.filter((r: Record<string, unknown>) => !!(r as Record<string, unknown>).email);

    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// DELETE /api/influencers/:id
router.delete("/:id", async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    await db.collection("influencers").doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
