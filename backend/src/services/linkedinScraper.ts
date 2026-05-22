import axios from "axios";
import { ScrapedContact } from "./apify";

const APIFY_BASE = "https://api.apify.com/v2";
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
// linkedin-profile-search-by-services: cheaper, no rate limits, large scale
// linkedin-profile-search: supports more filters but hits LinkedIn rate limits
const ACTOR = "harvestapi~linkedin-profile-search";

export interface LinkedInSearchOptions {
  searchQuery: string;
  locations?: string[];
  jobTitles?: string[];
  maxItems?: number;
  includeEmailSearch?: boolean; // $0.01/profile extra
}

// Parse LinkedIn search URL to extract keywords and location
export function parseLinkedInSearchUrl(url: string): LinkedInSearchOptions {
  try {
    const parsed = new URL(url);
    const keywords = parsed.searchParams.get("keywords") || "";
    const geoUrn = parsed.searchParams.get("geoUrn") || "";

    // Map common geoUrns to location names
    const geoMap: Record<string, string> = {
      "103644278": "United States",
      "101165590": "United Kingdom",
      "102454443": "Australia",
      "101452733": "Canada",
      "105646813": "India",
      "90009549": "New York",
      "102095887": "California",
      "100473105": "Texas",
      "100364837": "Singapore",
    };

    const locations: string[] = [];
    const geoIds = geoUrn.replace(/[\[\]"]/g, "").split(",").filter(Boolean);
    for (const id of geoIds) {
      if (geoMap[id.trim()]) locations.push(geoMap[id.trim()]);
    }

    // If the keyword is "angel investor", use job title filter instead (more results)
    const angelTerms = ["angel investor", "angel", "angel investing"];
    if (angelTerms.some(t => keywords.toLowerCase().includes(t))) {
      return {
        searchQuery: "",
        jobTitles: ["Angel Investor", "Angel Investor & Advisor", "Angel", "Angel Investor and Advisor", "Startup Investor"],
        locations: locations.length > 0 ? locations : undefined,
      };
    }

    return { searchQuery: keywords, locations: locations.length > 0 ? locations : undefined };
  } catch {
    return { searchQuery: url };
  }
}

async function waitForRun(runId: string): Promise<boolean> {
  let status = "RUNNING";
  let attempts = 0;
  while ((status === "RUNNING" || status === "READY") && attempts < 240) { // 20 min max
    await new Promise(r => setTimeout(r, 5000));
    try {
      const s = await axios.get(`${APIFY_BASE}/actor-runs/${runId}`, { params: { token: APIFY_TOKEN } });
      status = s.data.data.status;
    } catch { /* keep polling */ }
    attempts++;
    if (attempts % 6 === 0) {
      console.log(`LinkedIn scrape: ${status} (${attempts * 5}s elapsed)`);
    }
  }
  return status === "SUCCEEDED";
}

export async function scrapeLinkedInSearch(options: LinkedInSearchOptions): Promise<ScrapedContact[]> {
  if (!APIFY_TOKEN) throw new Error("APIFY_API_TOKEN not set");

  const maxItems = options.maxItems || 1000;
  const takePages = Math.min(Math.ceil(maxItems / 25), 100);

  const input: Record<string, unknown> = {
    profileScraperMode: "Short",
    takePages,
    startPage: 1,
    maxItems,
  };

  // Use job title filter for angel investors — more targeted than keyword search
  if (options.jobTitles && options.jobTitles.length > 0) {
    input.currentJobTitles = options.jobTitles;
  } else if (options.searchQuery) {
    input.searchQuery = options.searchQuery;
  }

  if (options.locations && options.locations.length > 0) {
    input.locations = options.locations;
  }

  console.log(`🔍 LinkedIn scrape input:`, JSON.stringify(input, null, 2));

  const runRes = await axios.post(
    `${APIFY_BASE}/acts/${ACTOR}/runs`,
    input,
    { params: { token: APIFY_TOKEN }, timeout: 30_000 }
  );

  const runId: string = runRes.data.data.id;
  const datasetId: string = runRes.data.data.defaultDatasetId;
  console.log(`LinkedIn actor started: ${runId}`);

  const succeeded = await waitForRun(runId);
  if (!succeeded) throw new Error("LinkedIn scrape actor failed or timed out");

  // Log run stats to diagnose page count
  try {
    const runStats = await axios.get(`${APIFY_BASE}/actor-runs/${runId}`, { params: { token: APIFY_TOKEN } });
    const stats = runStats.data?.data?.stats;
    console.log(`LinkedIn run stats: requests=${stats?.requestsTotal}, items=${stats?.datasetItems}, computeUnits=${stats?.computeUnits}`);
  } catch { /* ignore */ }

  const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
    params: { token: APIFY_TOKEN, format: "json", clean: true, limit: 10000 },
  });

  let profiles = items.data as Array<Record<string, unknown>>;
  console.log(`LinkedIn scrape complete: ${profiles.length} profiles in dataset (expected up to ${maxItems})`);

  // If only 1 page returned despite requesting more, paginate manually
  if (profiles.length <= 25 && takePages > 1) {
    console.log(`Only 1 page returned — running paginated fallback for ${takePages} pages...`);
    const allProfiles: Array<Record<string, unknown>> = [...profiles];

    for (let page = 2; page <= Math.min(takePages, 10); page++) {
      try {
        const pageInput = { ...input, startPage: page, takePages: 1, maxItems: 25 };
        const pageRun = await axios.post(
          `${APIFY_BASE}/acts/${ACTOR}/runs`,
          pageInput,
          { params: { token: APIFY_TOKEN }, timeout: 30_000 }
        );
        const pageRunId: string = pageRun.data.data.id;
        const pageDatasetId: string = pageRun.data.data.defaultDatasetId;
        const pageSucceeded = await waitForRun(pageRunId);
        if (!pageSucceeded) break;

        const pageItems = await axios.get(`${APIFY_BASE}/datasets/${pageDatasetId}/items`, {
          params: { token: APIFY_TOKEN, format: "json", clean: true, limit: 50 },
        });
        const pageProfiles = pageItems.data as Array<Record<string, unknown>>;
        if (pageProfiles.length === 0) break; // no more results
        allProfiles.push(...pageProfiles);
        console.log(`Page ${page}: ${pageProfiles.length} profiles (total: ${allProfiles.length})`);
        await new Promise(r => setTimeout(r, 2000)); // small delay between runs
      } catch (err) {
        console.error(`Page ${page} failed:`, err instanceof Error ? err.message : err);
        break;
      }
    }
    profiles = allProfiles;
    console.log(`Paginated total: ${profiles.length} profiles`);
  }

  return profiles.map(p => {
    const firstName = (p.firstName as string) || "";
    const lastName = (p.lastName as string) || "";
    const currentPos = (p.currentPosition as Array<{ companyName?: string }>) || [];
    const company = currentPos[0]?.companyName || "";

    return {
      name: [firstName, lastName].filter(Boolean).join(" ") || "Unknown",
      email: (p.email as string) || "",
      oneLiner: (p.headline as string) || "",
      title: (p.headline as string) || "",
      company,
      linkedinUrl: (p.linkedinUrl as string) || "",
      crunchbaseUrl: "",
      profileImageUrl: (p.photo as string) || (p.profilePicture as Record<string, string>)?.url || "",
    };
  });
}
