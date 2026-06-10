import axios from "axios";
import { ScrapedContact } from "./apify";
import {
  cleanEmails,
  enrichEmailsFromGoogleResults,
  GoogleOrganicResult,
  rankEmailsForPerson,
} from "./emailSearchEnricher";
import {
  PressOutletConfig,
  PressOutletId,
  PRESS_OUTLET_IDS,
  PRESS_OUTLETS,
  getPressOutlet,
} from "../lib/pressOutlets";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const APIFY_BASE = "https://api.apify.com/v2";
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

const EDITORIAL_KEYWORDS = [
  "editor", "reporter", "writer", "journalist", "contributor", "copy editor",
  "producer", "chief", "correspondent", "columnist", "anchor",
];

const SKIP_ROLES = [
  "event", "account executive", "account manager", "operations manager",
  "software engineer", "marketing manager", "director of event", "brand studio",
  "audience development", "revenue", "sales", "advertising",
];

export type PressScrapedContact = ScrapedContact & {
  emails?: string[];
  profileUrl: string;
};

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchHtml(url: string): Promise<string> {
  const res = await axios.get(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    timeout: 25_000,
    maxRedirects: 5,
  });
  return typeof res.data === "string" ? res.data : "";
}

function decodeHtml(text: string): string {
  return text
    .replace(/&#8217;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#038;/g, "&")
    .trim();
}

function extractAuthorSlugsFromStaffPage(html: string, config: PressOutletConfig): string[] {
  const slugs = new Set<string>();
  const pattern = new RegExp(config.authorSlugPattern.source, config.authorSlugPattern.flags);

  for (const match of html.matchAll(pattern)) {
    const slug = match[1]?.toLowerCase();
    if (slug && slug.length > 2 && !["about", "contact", "team", "staff"].includes(slug)) {
      slugs.add(slug);
    }
  }

  return [...slugs];
}

function extractEmailsFromHtml(html: string, company: string, name = ""): string[] {
  const mailtos = [...html.matchAll(/mailto:([^"'>\s?]+)/gi)]
    .map(m => decodeURIComponent(m[1]).trim().toLowerCase())
    .filter(e => e.includes("@"));

  const snippetEmails = cleanEmails(html);
  return rankEmailsForPerson(
    [...new Set([...mailtos, ...snippetEmails])],
    name,
    company
  );
}

function pickPrimaryEmail(emails: string[], config: PressOutletConfig): string {
  for (const domain of config.emailDomains) {
    const match = emails.find(e => e.endsWith(`@${domain}`));
    if (match) return match;
  }
  return emails[0] || "";
}

function parseAuthorProfile(html: string, company: string): {
  name: string;
  title: string;
  emails: string[];
  oneLiner: string;
} | null {
  const nameMatch =
    html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) ||
    html.match(/<h1[^>]*class="[^"]*wp-block-post-title[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
    html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  let name = decodeHtml(nameMatch?.[1] || "");
  name = name.replace(/\s*[|\-–—]\s*.+$/, "").trim();
  if (!name || name.length < 2) return null;

  let title = "";
  const titleMatch =
    html.match(/<h1[^>]*>[^<]+<\/h1>\s*<p[^>]*>([^<]+)<\/p>/i) ||
    html.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)</i);
  if (titleMatch) title = decodeHtml(titleMatch[1]);

  const emails = extractEmailsFromHtml(html, company, name);
  if (emails.length === 0) return null;

  const bioMatch = html.match(/<h1[^>]*>[^<]+<\/h1>[\s\S]{0,400}?<p[^>]*>([\s\S]*?)<\/p>/i);
  const oneLiner = bioMatch
    ? decodeHtml(bioMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 280)
    : title;

  return { name, title, emails, oneLiner: oneLiner || title };
}

function isEditorialRole(title: string, oneLiner: string, name: string): boolean {
  const text = `${title} ${oneLiner} ${name}`.toLowerCase();
  if (SKIP_ROLES.some(r => text.includes(r))) return false;
  if (EDITORIAL_KEYWORDS.some(k => text.includes(k))) return true;
  return Boolean(title.trim());
}

async function waitForApifyRun(runId: string, maxWaitMs = 90_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await sleep(4000);
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

async function findPressEmailViaGoogle(
  name: string,
  config: PressOutletConfig
): Promise<string[]> {
  if (!APIFY_TOKEN) return [];

  const query = `"${name}" ${config.googleBrand} email`;
  try {
    const runRes = await axios.post(
      `${APIFY_BASE}/acts/apify~google-search-scraper/runs`,
      { queries: query, maxPagesPerQuery: 1, resultsPerPage: 8 },
      { params: { token: APIFY_TOKEN }, timeout: 20_000 }
    );

    const succeeded = await waitForApifyRun(runRes.data.data.id, 75_000);
    if (!succeeded) return [];

    const datasetId: string = runRes.data.data.defaultDatasetId;
    const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
      params: { token: APIFY_TOKEN, format: "json", clean: true },
    });

    const organicResults = (items.data as Array<{ organicResults?: GoogleOrganicResult[] }>)
      .flatMap(r => r.organicResults || []);

    const emails = await enrichEmailsFromGoogleResults(organicResults, name, config.company);
    return rankEmailsForPerson(emails, name, config.company);
  } catch (err) {
    console.warn(`  Google email search failed for ${name}:`, err instanceof Error ? err.message : err);
    return [];
  }
}

async function findPressEmailsViaGoogleBatch(
  people: Array<{ name: string }>,
  config: PressOutletConfig
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!APIFY_TOKEN || people.length === 0) return map;

  const queries = people.map(p => `"${p.name}" ${config.googleBrand} email`).join("\n");
  try {
    const runRes = await axios.post(
      `${APIFY_BASE}/acts/apify~google-search-scraper/runs`,
      { queries, maxPagesPerQuery: 1, resultsPerPage: 8 },
      { params: { token: APIFY_TOKEN }, timeout: 30_000 }
    );

    const succeeded = await waitForApifyRun(runRes.data.data.id, 120_000);
    if (!succeeded) return map;

    const datasetId: string = runRes.data.data.defaultDatasetId;
    const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
      params: { token: APIFY_TOKEN, format: "json", clean: true },
    });

    const pages = items.data as Array<{
      searchQuery?: { term?: string };
      organicResults?: GoogleOrganicResult[];
    }>;

    for (const page of pages) {
      const term = page.searchQuery?.term || "";
      const nameMatch = term.match(/"([^"]+)"/);
      if (!nameMatch) continue;
      const name = nameMatch[1];
      const organic = page.organicResults || [];
      const emails = await enrichEmailsFromGoogleResults(organic, name, config.company);
      const ranked = rankEmailsForPerson(emails, name, config.company);
      if (ranked.length) map.set(name, ranked);
    }
  } catch (err) {
    console.warn("Batch Google email search failed:", err instanceof Error ? err.message : err);
  }

  return map;
}

export async function scrapePressOutletJournalists(
  outletId: PressOutletId,
  staffPageUrlOverride?: string
): Promise<PressScrapedContact[]> {
  const config = getPressOutlet(outletId);
  const staffPageUrl = staffPageUrlOverride || config.staffPageUrl;

  console.log(`📰 [${config.label}] Fetching staff page: ${staffPageUrl}`);

  let staffHtml = "";
  try {
    staffHtml = await fetchHtml(staffPageUrl);
  } catch (err) {
    console.warn(`[${config.label}] Staff page fetch failed, using known staff list:`, err instanceof Error ? err.message : err);
  }

  const slugsFromPage = staffHtml ? extractAuthorSlugsFromStaffPage(staffHtml, config) : [];
  console.log(`📰 [${config.label}] Found ${slugsFromPage.length} author links on staff page`);

  const profileTargets = new Map<string, {
    profileUrl: string;
    title?: string;
    fallbackName?: string;
  }>();

  for (const slug of slugsFromPage) {
    profileTargets.set(slug, { profileUrl: config.authorProfileUrl(slug) });
  }

  for (const staff of config.staff) {
    const profileUrl = config.authorProfileUrl(staff.slug);
    if (!profileTargets.has(staff.slug)) {
      profileTargets.set(staff.slug, {
        profileUrl,
        title: staff.title,
        fallbackName: staff.name,
      });
    } else {
      const existing = profileTargets.get(staff.slug)!;
      existing.title = existing.title || staff.title;
      existing.fallbackName = staff.name;
    }
  }

  const contacts: PressScrapedContact[] = [];
  const seenEmails = new Set<string>();
  const needsGoogle: Array<{ name: string; title: string; profileUrl: string; oneLiner: string }> = [];

  const entries = [...profileTargets.entries()];
  for (let i = 0; i < entries.length; i++) {
    const [, target] = entries[i];
    const profileUrl = target.profileUrl;

    try {
      const html = await fetchHtml(profileUrl);
      const parsed = parseAuthorProfile(html, config.company);

      const name = parsed?.name || target.fallbackName || "";
      const title = parsed?.title || target.title || "Journalist";
      const oneLiner = parsed?.oneLiner || title;

      if (!name) continue;

      if (parsed && !isEditorialRole(parsed.title, parsed.oneLiner, parsed.name)) {
        console.log(`  skip (non-editorial): ${parsed.name}`);
        continue;
      }

      if (parsed?.emails.length) {
        const emails = parsed.emails;
        const primary = pickPrimaryEmail(emails.filter(e => !seenEmails.has(e)), config);
        if (!primary) continue;

        emails.forEach(e => seenEmails.add(e));
        contacts.push({
          name: parsed.name,
          email: primary,
          emails,
          title: parsed.title || "Journalist",
          company: config.company,
          oneLiner: parsed.oneLiner,
          crunchbaseUrl: profileUrl,
          profileUrl,
        });
        console.log(`  ✓ ${parsed.name}: ${emails.join(", ")} (profile)`);
      } else {
        needsGoogle.push({ name, title, profileUrl, oneLiner });
        console.log(`  ? ${name}: no email on profile — will Google search`);
      }
    } catch {
      if (target.fallbackName) {
        needsGoogle.push({
          name: target.fallbackName,
          title: target.title || "Journalist",
          profileUrl,
          oneLiner: target.title || "",
        });
      }
    }

    if (i % 5 === 4) await sleep(600);
  }

  if (needsGoogle.length > 0) {
    console.log(`🔍 [${config.label}] Google email search for ${needsGoogle.length} journalist(s)...`);
    const googleMap = await findPressEmailsViaGoogleBatch(needsGoogle, config);

    for (const person of needsGoogle) {
      let emails = googleMap.get(person.name) || [];

      if (emails.length === 0) {
        emails = await findPressEmailViaGoogle(person.name, config);
        await sleep(500);
      }

      const fresh = emails.filter(e => !seenEmails.has(e));
      const primary = pickPrimaryEmail(fresh.length ? fresh : emails, config);
      if (!primary) {
        console.log(`  ✗ ${person.name}: no email found`);
        continue;
      }

      emails.forEach(e => seenEmails.add(e));
      contacts.push({
        name: person.name,
        email: primary,
        emails,
        title: person.title,
        company: config.company,
        oneLiner: person.oneLiner,
        crunchbaseUrl: person.profileUrl,
        profileUrl: person.profileUrl,
      });
      console.log(`  ✓ ${person.name}: ${emails.join(", ")} (google)`);
    }
  }

  console.log(`✅ [${config.label}] ${contacts.length} journalists with emails`);
  return contacts;
}

/** Scrape all configured press outlets sequentially (Reelin AI press pipeline). */
export async function scrapeAllPressOutlets(): Promise<{
  total: number;
  byOutlet: Record<string, number>;
}> {
  const byOutlet: Record<string, number> = {};
  let total = 0;

  for (const outletId of PRESS_OUTLET_IDS) {
    try {
      const contacts = await scrapePressOutletJournalists(outletId);
      byOutlet[outletId] = contacts.length;
      total += contacts.length;
    } catch (err) {
      console.error(`Failed to scrape ${outletId}:`, err instanceof Error ? err.message : err);
      byOutlet[outletId] = 0;
    }
    await sleep(2000);
  }

  return { total, byOutlet };
}

/** Backward-compatible TechCrunch export */
export async function scrapeTechCrunchJournalists(
  aboutUrl = "https://techcrunch.com/about-techcrunch/"
): Promise<PressScrapedContact[]> {
  return scrapePressOutletJournalists("techcrunch", aboutUrl);
}

export const TECHCRUNCH_STAFF = PRESS_OUTLETS.techcrunch.staff;
