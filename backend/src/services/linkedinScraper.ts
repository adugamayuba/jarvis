import axios from "axios";
import { ScrapedContact } from "./apify";

const APIFY_BASE = "https://api.apify.com/v2";
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const ACTOR = "harvestapi~linkedin-profile-search";
const PROFILES_PER_PAGE = 25;

export interface LinkedInSearchOptions {
  searchQuery: string;
  locations?: string[];
  jobTitles?: string[];
  maxItems?: number;
  includeEmailSearch?: boolean;
}

export function parseLinkedInSearchUrl(url: string): LinkedInSearchOptions {
  try {
    const parsed = new URL(url);
    const keywords = parsed.searchParams.get("keywords") || "";
    const geoUrn = parsed.searchParams.get("geoUrn") || "";

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
  while ((status === "RUNNING" || status === "READY") && attempts < 240) {
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

function profileKey(p: Record<string, unknown>): string {
  const url = (p.linkedinUrl as string) || "";
  if (url) return url;
  const first = (p.firstName as string) || "";
  const last = (p.lastName as string) || "";
  return `${first}|${last}`;
}

function buildBaseInput(options: LinkedInSearchOptions): Record<string, unknown> {
  const input: Record<string, unknown> = {
    profileScraperMode: "Short",
  };

  if (options.jobTitles && options.jobTitles.length > 0) {
    input.currentJobTitles = options.jobTitles;
  } else if (options.searchQuery) {
    input.searchQuery = options.searchQuery;
  }

  if (options.locations && options.locations.length > 0) {
    input.locations = options.locations;
  }

  return input;
}

async function fetchLinkedInPage(
  baseInput: Record<string, unknown>,
  page: number
): Promise<Array<Record<string, unknown>>> {
  const pageInput = {
    ...baseInput,
    startPage: page,
    takePages: 1,
    maxItems: PROFILES_PER_PAGE,
  };

  const runRes = await axios.post(
    `${APIFY_BASE}/acts/${ACTOR}/runs`,
    pageInput,
    { params: { token: APIFY_TOKEN }, timeout: 30_000 }
  );

  const runId: string = runRes.data.data.id;
  const datasetId: string = runRes.data.data.defaultDatasetId;

  console.log(`LinkedIn page ${page}: run ${runId} started`);

  const succeeded = await waitForRun(runId);
  if (!succeeded) {
    console.error(`LinkedIn page ${page}: actor run ${runId} failed or timed out`);
    return [];
  }

  const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
    params: { token: APIFY_TOKEN, format: "json", clean: true, limit: 50 },
  });

  return items.data as Array<Record<string, unknown>>;
}

export async function scrapeLinkedInSearch(options: LinkedInSearchOptions): Promise<ScrapedContact[]> {
  if (!APIFY_TOKEN) throw new Error("APIFY_API_TOKEN not set");

  const maxItems = options.maxItems || 1000;
  const takePages = Math.min(Math.ceil(maxItems / PROFILES_PER_PAGE), 100);
  const baseInput = buildBaseInput(options);

  console.log(`🔍 LinkedIn scrape: up to ${takePages} pages (${maxItems} profiles max)`);

  const allProfiles: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();

  for (let page = 1; page <= takePages && allProfiles.length < maxItems; page++) {
    try {
      const pageProfiles = await fetchLinkedInPage(baseInput, page);
      let added = 0;

      for (const p of pageProfiles) {
        const key = profileKey(p);
        if (!seen.has(key)) {
          seen.add(key);
          allProfiles.push(p);
          added++;
        }
      }

      console.log(`LinkedIn page ${page}: ${pageProfiles.length} raw, ${added} new (total: ${allProfiles.length})`);

      // Empty page = definitely no more results
      if (pageProfiles.length === 0) {
        console.log(`LinkedIn scrape stopping: page ${page} returned 0 profiles`);
        break;
      }
      
      // Partial page = likely end of results, but continue for a few more tries
      if (pageProfiles.length < PROFILES_PER_PAGE) {
        console.log(`LinkedIn scrape: page ${page} returned ${pageProfiles.length}/${PROFILES_PER_PAGE} (may be last page)`);
        // Don't break immediately - the actor might have more on next page
      }

      if (page < takePages) {
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error(`LinkedIn page ${page} failed:`, err instanceof Error ? err.message : err);
      break;
    }
  }

  console.log(`LinkedIn scrape complete: ${allProfiles.length} unique profiles`);

  // Debug: log first profile to see what fields we're getting
  if (allProfiles.length > 0) {
    console.log(`Sample profile fields:`, JSON.stringify(Object.keys(allProfiles[0]), null, 2));
    console.log(`Sample profile data:`, JSON.stringify(allProfiles[0], null, 2));
  }

  return allProfiles.slice(0, maxItems).map(p => {
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
      linkedinUrl: (p.linkedinUrl as string) || (p.profileUrl as string) || "",
      crunchbaseUrl: "",
      profileImageUrl: (p.photo as string) || (p.profilePicture as Record<string, string>)?.url || "",
    };
  });
}
