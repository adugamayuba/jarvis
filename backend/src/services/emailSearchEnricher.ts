import axios from "axios";

const APIFY_BASE = "https://api.apify.com/v2";
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const CONTACT_INFO_SCRAPER = "vdrmota~contact-info-scraper";

export type GoogleOrganicResult = {
  title?: string;
  url?: string;
  description?: string;
};

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const SKIP_EMAIL_DOMAINS = [
  "example.com", "test.com", "sentry.io", "wix.com", "squarespace.com",
  "adobe.com", "google.com", "facebook.com", "twitter.com", "placeholder",
  "yoursite.com", "domain.com", "email.com", "user.com", "company.com",
  "linkedin.com", "crunchbase.com", "wikipedia.org", "contactout.com",
  "twitter.com", "x.com", "instagram.com", "facebook.com", "tiktok.com",
];

export function cleanEmails(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) || [];
  return [...new Set(matches.filter(e =>
    !SKIP_EMAIL_DOMAINS.some(d => e.toLowerCase().includes(d)) &&
    e.length < 80 &&
    !e.startsWith(".")
  ))].map(e => e.toLowerCase());
}

export function isContactOutProfileUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host !== "contactout.com") return false;
    const path = u.pathname.toLowerCase();
    if (path === "/" || path.startsWith("/login") || path.startsWith("/signup")) return false;
    if (path.startsWith("/company/") || path.startsWith("/pricing") || path.startsWith("/api")) return false;
    return path.length > 1;
  } catch {
    return false;
  }
}

export function extractContactOutUrls(results: GoogleOrganicResult[]): string[] {
  const urls: string[] = [];
  for (const r of results) {
    if (r.url && isContactOutProfileUrl(r.url)) urls.push(r.url.split("?")[0]);
  }
  return [...new Set(urls)];
}

export function extractSnippetEmails(results: GoogleOrganicResult[]): string[] {
  const allText = results
    .map(r => `${r.title || ""} ${r.description || ""} ${r.url || ""}`)
    .join(" ");
  return cleanEmails(allText);
}

export function rankEmailsForPerson(emails: string[], name: string, company?: string): string[] {
  const unique = [...new Set(emails.map(e => e.trim().toLowerCase()))].filter(e => e.includes("@"));
  const nameParts = name.toLowerCase().split(/\s+/).filter(p => p.length > 1);
  const companySlug = (company || "").toLowerCase().replace(/[^a-z0-9]/g, "");

  return unique.sort((a, b) => {
    const score = (email: string) => {
      const low = email.toLowerCase();
      let s = 0;
      if (nameParts.some(p => low.includes(p))) s += 2;
      if (companySlug && low.includes(companySlug)) s += 3;
      return s;
    };
    return score(b) - score(a);
  });
}

export function mergePersonEmails(
  organicResults: GoogleOrganicResult[],
  name: string,
  company: string | undefined,
  scrapedByUrl: Map<string, string[]>
): string[] {
  const snippetEmails = extractSnippetEmails(organicResults);
  const contactOutUrls = extractContactOutUrls(organicResults);
  const scrapedEmails = contactOutUrls.flatMap(url => scrapedByUrl.get(url) || []);
  return rankEmailsForPerson([...snippetEmails, ...scrapedEmails], name, company);
}

async function waitForApifyRun(runId: string, maxWaitMs = 90_000): Promise<boolean> {
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

/** Scrape ContactOut (and similar) profile pages found in Google results. */
export async function scrapeContactPagesForEmails(urls: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!APIFY_TOKEN || urls.length === 0) return map;

  const unique = [...new Set(urls.map(u => u.split("?")[0]))].slice(0, 20);

  try {
    console.log(`📇 Scraping ${unique.length} ContactOut/profile page(s) for emails...`);

    const runRes = await axios.post(
      `${APIFY_BASE}/acts/${CONTACT_INFO_SCRAPER}/runs`,
      {
        startUrls: unique.map(url => ({ url })),
        maxDepth: 0,
        maxPages: unique.length,
      },
      { params: { token: APIFY_TOKEN }, timeout: 30_000 }
    );

    const succeeded = await waitForApifyRun(runRes.data.data.id, 90_000);
    if (!succeeded) {
      console.warn("Contact page scrape run did not succeed");
      return map;
    }

    const datasetId: string = runRes.data.data.defaultDatasetId;
    const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
      params: { token: APIFY_TOKEN, format: "json", clean: true },
    });

    for (const item of items.data as Array<Record<string, unknown>>) {
      const pageUrl = String(item.url || item.loadedUrl || "").split("?")[0];
      if (!pageUrl) continue;

      const fromField = Array.isArray(item.emails)
        ? (item.emails as string[]).filter(Boolean)
        : [];
      const fromText = cleanEmails(JSON.stringify(item));
      const emails = [...new Set([...fromField.map(e => e.toLowerCase()), ...fromText])];

      if (emails.length > 0) {
        map.set(pageUrl, emails);
        console.log(`  📧 ${pageUrl}: ${emails.join(", ")}`);
      }
    }
  } catch (err) {
    console.error("Contact page scrape error:", err instanceof Error ? err.message : err);
  }

  return map;
}

export async function enrichEmailsFromGoogleResults(
  organicResults: GoogleOrganicResult[],
  name: string,
  company?: string
): Promise<string[]> {
  const contactOutUrls = extractContactOutUrls(organicResults);
  const scraped = contactOutUrls.length > 0
    ? await scrapeContactPagesForEmails(contactOutUrls)
    : new Map<string, string[]>();

  return mergePersonEmails(organicResults, name, company, scraped);
}
