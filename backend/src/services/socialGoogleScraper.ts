import axios from "axios";
import {
  cleanEmails,
  GoogleOrganicResult,
  scrapeContactPagesForEmails,
} from "./emailSearchEnricher";
import { ScrapedContact } from "./apify";
import { Contact } from "../types";

const APIFY_BASE = "https://api.apify.com/v2";
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const GOOGLE_ACTOR = "apify~google-search-scraper";

export type SocialPlatform = "twitter" | "instagram" | "facebook" | "tiktok";

export interface SocialGoogleScrapeOptions {
  keyword?: string;
  platforms?: SocialPlatform[];
  maxPagesPerQuery?: number;
  maxProfiles?: number;
}

interface ProfileCandidate {
  name: string;
  emails: string[];
  profileUrl: string;
  platform: SocialPlatform;
  oneLiner?: string;
}

const PLATFORM_SITES: Record<SocialPlatform, string[]> = {
  twitter: ["twitter.com", "x.com"],
  instagram: ["instagram.com"],
  facebook: ["facebook.com", "fb.com"],
  tiktok: ["tiktok.com"],
};

const SKIP_PATH_PREFIXES: Record<SocialPlatform, string[]> = {
  twitter: ["search", "home", "explore", "i", "intent", "hashtag", "settings", "share"],
  instagram: ["p", "reel", "reels", "explore", "accounts", "direct", "stories", "tv"],
  facebook: ["watch", "groups", "events", "marketplace", "login", "help"],
  tiktok: ["discover", "tag", "music", "login"],
};

async function waitForApifyRun(runId: string, maxWaitMs = 120_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 4000));
    try {
      const s = await axios.get(`${APIFY_BASE}/actor-runs/${runId}`, {
        params: { token: APIFY_TOKEN },
        timeout: 10_000,
      });
      const status: string = s.data.data.status;
      if (status === "SUCCEEDED") return true;
      if (["FAILED", "ABORTED", "TIMED-OUT"].includes(status)) return false;
    } catch { /* keep polling */ }
  }
  return false;
}

function buildGoogleQuery(platform: SocialPlatform, keyword: string): string {
  const sites = PLATFORM_SITES[platform];
  const siteClause =
    sites.length === 1
      ? `site:${sites[0]}`
      : `(${sites.map(s => `site:${s}`).join(" OR ")})`;

  return `${siteClause} "${keyword}"`;
}

function detectPlatformFromUrl(url: string): SocialPlatform | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    for (const [platform, sites] of Object.entries(PLATFORM_SITES) as [SocialPlatform, string[]][]) {
      if (sites.some(s => host === s || host.endsWith(`.${s}`))) return platform;
    }
  } catch { /* ignore */ }
  return null;
}

function isProfileUrl(url: string, platform: SocialPlatform): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const sites = PLATFORM_SITES[platform];
    if (!sites.some(s => host === s || host.endsWith(`.${s}`))) return false;

    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length === 0) return false;

    const first = parts[0].toLowerCase();
    if (SKIP_PATH_PREFIXES[platform].includes(first)) return false;

    if (platform === "twitter") {
      return parts.length === 1 && first.length > 0;
    }
    if (platform === "instagram") {
      return parts.length === 1 && !first.startsWith("?");
    }
    if (platform === "tiktok") {
      return parts.length === 1 && (first.startsWith("@") || parts[0].length > 1);
    }
    if (platform === "facebook") {
      return parts.length >= 1 && (first !== "profile.php" || u.searchParams.has("id"));
    }
    return parts.length >= 1;
  } catch {
    return false;
  }
}

function normalizeProfileUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    let path = u.pathname.replace(/\/+$/, "");
    if (path && !path.endsWith("/") && detectPlatformFromUrl(url) === "instagram") {
      path += "/";
    }
    u.pathname = path || "/";
    return u.toString();
  } catch {
    return url.split("?")[0];
  }
}

function parseNameFromTitle(title: string, platform: SocialPlatform): string {
  let name = title
    .replace(/\s*[\|•·–—]\s*.*/s, "")
    .replace(/\s*\(\@[^)]+\).*/s, "")
    .replace(/\s*\/\s*X\s*$/i, "")
    .replace(/\s*on\s+(Twitter|Instagram|Facebook|TikTok).*$/i, "")
    .replace(/\s*@\s*\S+\s*on\s+X.*$/i, "")
    .trim();

  if (name.includes(" - ")) name = name.split(" - ")[0].trim();
  if (name.startsWith("@")) name = "";

  const lower = name.toLowerCase();
  if (
    name.length < 3 ||
    lower.includes("instagram photos") ||
    lower.includes("twitter profile") ||
    lower === "x" ||
    lower === "home"
  ) {
    return "";
  }
  return name;
}

function parseUsernameFromUrl(url: string, platform: SocialPlatform): string {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    if (parts.length === 0) return "";
    let user = parts[0];
    if (platform === "tiktok" && user.startsWith("@")) user = user.slice(1);
    if (platform === "twitter" || platform === "instagram") {
      return user.replace(/^@/, "");
    }
    return user;
  } catch {
    return "";
  }
}

function usernameToDisplayName(username: string): string {
  return username
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

function extractFromOrganicResult(
  result: GoogleOrganicResult,
  platform: SocialPlatform
): ProfileCandidate | null {
  if (!result.url || !isProfileUrl(result.url, platform)) return null;

  const profileUrl = normalizeProfileUrl(result.url);
  const snippetText = `${result.title || ""} ${result.description || ""}`;
  const emails = cleanEmails(snippetText);

  let name = parseNameFromTitle(result.title || "", platform);
  if (!name) {
    const username = parseUsernameFromUrl(profileUrl, platform);
    name = username ? usernameToDisplayName(username) : "";
  }
  if (!name) return null;

  return {
    name,
    emails,
    profileUrl,
    platform,
    oneLiner: (result.description || "").slice(0, 280),
  };
}

async function runGoogleSearches(queries: string[], maxPagesPerQuery: number): Promise<GoogleOrganicResult[]> {
  if (!APIFY_TOKEN) throw new Error("APIFY_API_TOKEN not set");

  const runRes = await axios.post(
    `${APIFY_BASE}/acts/${GOOGLE_ACTOR}/runs`,
    {
      queries: queries.join("\n"),
      maxPagesPerQuery,
      resultsPerPage: 10,
    },
    { params: { token: APIFY_TOKEN }, timeout: 30_000 }
  );

  const succeeded = await waitForApifyRun(runRes.data.data.id, 180_000);
  if (!succeeded) throw new Error("Google search run failed");

  const datasetId: string = runRes.data.data.defaultDatasetId;
  const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
    params: { token: APIFY_TOKEN, format: "json", clean: true },
  });

  const pages = items.data as Array<{
    organicResults?: GoogleOrganicResult[];
  }>;

  return pages.flatMap(p => p.organicResults || []);
}

function mergeCandidates(existing: Map<string, ProfileCandidate>, candidate: ProfileCandidate): void {
  const key = candidate.profileUrl;
  const prev = existing.get(key);
  if (!prev) {
    existing.set(key, candidate);
    return;
  }
  prev.emails = [...new Set([...prev.emails, ...candidate.emails])];
  if (candidate.name.length > prev.name.length) prev.name = candidate.name;
  if (candidate.oneLiner && !prev.oneLiner) prev.oneLiner = candidate.oneLiner;
}

function toScrapedContact(c: ProfileCandidate): ScrapedContact & { emails?: string[]; platform: SocialPlatform; profileUrl: string } {
  const primary = c.emails[0];
  return {
    name: c.name,
    email: primary,
    emails: c.emails.length ? c.emails : undefined,
    oneLiner: c.oneLiner || `${c.platform} profile`,
    title: "Angel Investor",
    company: "",
    linkedinUrl: c.platform === "twitter" ? c.profileUrl : undefined,
    crunchbaseUrl: c.profileUrl,
    platform: c.platform,
    profileUrl: c.profileUrl,
  };
}

export function buildSocialScrapeLabel(opts: SocialGoogleScrapeOptions): string {
  const platforms = opts.platforms?.join(",") || "twitter,instagram";
  const keyword = opts.keyword || "angel investor";
  return `google:social|platforms=${platforms}|keyword=${keyword}`;
}

export async function scrapeSocialViaGoogle(
  opts: SocialGoogleScrapeOptions = {}
): Promise<Array<ScrapedContact & { emails?: string[]; platform: SocialPlatform; profileUrl: string }>> {
  const keyword = opts.keyword?.trim() || "angel investor";
  const platforms = opts.platforms?.length ? opts.platforms : (["twitter", "instagram"] as SocialPlatform[]);
  const maxPagesPerQuery = opts.maxPagesPerQuery ?? 2;
  const maxProfiles = opts.maxProfiles ?? 150;

  const queries = platforms.map(p => buildGoogleQuery(p, keyword));
  console.log(`🔍 Social Google scrape — ${queries.length} queries for "${keyword}"`);

  const organicResults = await runGoogleSearches(queries, maxPagesPerQuery);
  const byUrl = new Map<string, ProfileCandidate>();

  for (const result of organicResults) {
    const platform = detectPlatformFromUrl(result.url || "");
    if (!platform || !platforms.includes(platform)) continue;
    const candidate = extractFromOrganicResult(result, platform);
    if (candidate) mergeCandidates(byUrl, candidate);
  }

  console.log(`📋 ${byUrl.size} social profiles from Google snippets`);

  const needsScrape = [...byUrl.values()]
    .filter(c => c.emails.length === 0)
    .slice(0, maxProfiles);

  if (needsScrape.length > 0) {
    const urls = needsScrape.map(c => c.profileUrl);
    for (let i = 0; i < urls.length; i += 20) {
      const chunk = urls.slice(i, i + 20);
      const scraped = await scrapeContactPagesForEmails(chunk);
      for (const candidate of needsScrape) {
        const found = scraped.get(candidate.profileUrl.split("?")[0]);
        if (found?.length) {
          candidate.emails = [...new Set([...candidate.emails, ...found])];
        }
      }
    }
    console.log(`📇 Profile scrape pass done for ${needsScrape.length} URLs`);
  }

  const withEmail = [...byUrl.values()].filter(c => c.emails.length > 0);
  const withoutEmail = [...byUrl.values()].filter(c => c.emails.length === 0);

  const contacts = [
    ...withEmail.map(toScrapedContact),
    ...withoutEmail.slice(0, Math.max(0, maxProfiles - withEmail.length)).map(c => ({
      ...toScrapedContact(c),
      email: undefined,
      emails: undefined,
    })),
  ].slice(0, maxProfiles);

  console.log(`✅ Social Google scrape: ${contacts.length} contacts (${withEmail.length} with email)`);
  return contacts;
}

export function socialPlatformToContactSource(platform: SocialPlatform): Contact["source"] {
  if (platform === "instagram") return "instagram";
  if (platform === "facebook") return "facebook";
  if (platform === "tiktok") return "tiktok";
  return "twitter";
}
