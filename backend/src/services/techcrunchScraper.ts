import axios from "axios";
import { ScrapedContact } from "./apify";
import {
  cleanEmails,
  enrichEmailsFromGoogleResults,
  GoogleOrganicResult,
  rankEmailsForPerson,
} from "./emailSearchEnricher";

const DEFAULT_ABOUT_URL = "https://techcrunch.com/about-techcrunch/";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const APIFY_BASE = "https://api.apify.com/v2";
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

const EDITORIAL_KEYWORDS = [
  "editor", "reporter", "writer", "journalist", "contributor", "copy editor", "producer", "chief",
];

const SKIP_ROLES = [
  "event", "account executive", "account manager", "operations manager", "software engineer",
  "marketing manager", "director of event", "brand studio", "audience development",
];

/** Staff from techcrunch.com/about-techcrunch — used as fallback if page parse misses someone */
export const TECHCRUNCH_STAFF: Array<{ name: string; title: string; slug?: string }> = [
  { name: "Connie Loizos", title: "Editor in Chief & General Manager", slug: "connie-loizos" },
  { name: "Kirsten Korosec", title: "Transportation Editor", slug: "kirsten-korosec" },
  { name: "Sarah Perez", title: "Consumer News Editor", slug: "sarah-perez" },
  { name: "Zack Whittaker", title: "Security Editor", slug: "zack-whittaker" },
  { name: "Julie Bort", title: "Venture Editor", slug: "julie-bort" },
  { name: "Russell Brandom", title: "AI Editor", slug: "russell-brandom" },
  { name: "Tim De Chant", title: "Senior Reporter, Climate", slug: "tim-de-chant" },
  { name: "Aisha Malik", title: "Consumer News Reporter", slug: "aisha-malik" },
  { name: "Amanda Silberling", title: "Senior Writer", slug: "amanda-silberling" },
  { name: "David Riggs", title: "Sr. Copy Editor", slug: "david-riggs" },
  { name: "Carrie Andrews", title: "Copy Editor", slug: "carrie-andrews" },
  { name: "Dominic-Madori Davis", title: "Senior Reporter, Venture", slug: "dominic-madori-davis" },
  { name: "Lorenzo Franceschi-Bicchierai", title: "Senior Reporter, Cybersecurity", slug: "lorenzo-franceschi-bicchierai" },
  { name: "Maggie Nye", title: "Sr. Audio Producer", slug: "maggie-stamets" },
  { name: "Marina Temkin", title: "Reporter, Venture", slug: "marina-temkin" },
  { name: "Rebecca Bellan", title: "Senior Reporter", slug: "rebecca-bellan" },
  { name: "Sean O'Kane", title: "Sr. Reporter, Transportation", slug: "sean-okane" },
  { name: "Tim Fernholz", title: "Senior Reporter", slug: "tim-fernholz" },
  { name: "Theresa Loconsolo", title: "Audio Producer", slug: "theresa-loconsolo" },
  { name: "Lucas Ropek", title: "Senior Writer, TechCrunch", slug: "lucas-ropek" },
  { name: "Anna Heim", title: "Freelance Reporter", slug: "anna-heim" },
  { name: "Anthony Ha", title: "Editorial Contributor", slug: "anthony-ha" },
  { name: "Ivan Mehta", title: "Editorial Contributor", slug: "ivan-mehta" },
  { name: "Jagmeet Singh", title: "Reporter", slug: "jagmeet-singh" },
  { name: "Kate Park", title: "Reporter, Asia", slug: "kate-park" },
  { name: "Lauren Forristal", title: "Editorial Contributor", slug: "lauren-forristal" },
  { name: "Ram Iyer", title: "Editor", slug: "ram-iyer" },
];

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

function normalizeAuthorUrl(url: string): string {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("techcrunch.com")) return "";
    const match = u.pathname.match(/\/author\/([a-z0-9-]+)/i);
    if (!match) return "";
    return `https://techcrunch.com/author/${match[1]}/`;
  } catch {
    return "";
  }
}

export function extractAuthorProfileUrls(html: string): string[] {
  const urls = new Set<string>();

  for (const match of html.matchAll(/href="(\/author\/[a-z0-9-]+\/?)"/gi)) {
    const normalized = normalizeAuthorUrl(`https://techcrunch.com${match[1]}`);
    if (normalized) urls.add(normalized);
  }

  for (const match of html.matchAll(/href="(https:\/\/techcrunch\.com\/author\/[a-z0-9-]+\/?)"/gi)) {
    const normalized = normalizeAuthorUrl(match[1]);
    if (normalized) urls.add(normalized);
  }

  return [...urls];
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

function extractEmailsFromHtml(html: string): string[] {
  const mailtos = [...html.matchAll(/mailto:([^"'>\s?]+)/gi)]
    .map(m => decodeURIComponent(m[1]).trim().toLowerCase())
    .filter(e => e.includes("@"));

  const snippetEmails = cleanEmails(html);
  return rankEmailsForPerson(
    [...new Set([...mailtos, ...snippetEmails])],
    "",
    "TechCrunch"
  );
}

function pickPrimaryEmail(emails: string[]): string {
  const tc = emails.filter(e => e.endsWith("@techcrunch.com"));
  return tc[0] || emails[0] || "";
}

function parseAuthorProfile(html: string): {
  name: string;
  title: string;
  emails: string[];
  oneLiner: string;
} | null {
  const nameMatch =
    html.match(/<h1[^>]*class="[^"]*wp-block-post-title[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
    html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const name = decodeHtml(nameMatch?.[1] || "");
  if (!name || name.length < 2) return null;

  let title = "";
  const titleMatch = html.match(/<h1[^>]*>[^<]+<\/h1>\s*<p[^>]*>([^<]+)<\/p>/i);
  if (titleMatch) title = decodeHtml(titleMatch[1]);

  const emails = extractEmailsFromHtml(html);
  if (emails.length === 0) return null;

  const bioMatch = html.match(/<h1[^>]*>[^<]+<\/h1>\s*<p[^>]*>[^<]+<\/p>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
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

/** Google: "{name}" techcrunch email — finds emails in snippets + ContactOut pages */
async function findTechCrunchEmailViaGoogle(name: string): Promise<string[]> {
  if (!APIFY_TOKEN) return [];

  const query = `"${name}" techcrunch email`;
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

    const emails = await enrichEmailsFromGoogleResults(organicResults, name, "TechCrunch");
    return rankEmailsForPerson(emails, name, "TechCrunch");
  } catch (err) {
    console.warn(`  Google email search failed for ${name}:`, err instanceof Error ? err.message : err);
    return [];
  }
}

async function findTechCrunchEmailsViaGoogleBatch(
  people: Array<{ name: string }>
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (!APIFY_TOKEN || people.length === 0) return map;

  const queries = people.map(p => `"${p.name}" techcrunch email`).join("\n");
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
      const emails = await enrichEmailsFromGoogleResults(organic, name, "TechCrunch");
      const ranked = rankEmailsForPerson(emails, name, "TechCrunch");
      if (ranked.length) map.set(name, ranked);
    }
  } catch (err) {
    console.warn("Batch Google email search failed:", err instanceof Error ? err.message : err);
  }

  return map;
}

export async function scrapeTechCrunchJournalists(
  aboutUrl = DEFAULT_ABOUT_URL
): Promise<Array<ScrapedContact & { emails?: string[]; profileUrl: string }>> {
  console.log(`📰 Fetching TechCrunch staff page: ${aboutUrl}`);

  let aboutHtml = "";
  try {
    aboutHtml = await fetchHtml(aboutUrl);
  } catch (err) {
    console.warn("About page fetch failed, using known staff list:", err instanceof Error ? err.message : err);
  }

  const authorUrls = aboutHtml ? extractAuthorProfileUrls(aboutHtml) : [];
  console.log(`📰 Found ${authorUrls.length} author profile links`);

  // Merge author URLs from about page + known staff slugs
  const profileTargets = new Map<string, { profileUrl: string; title?: string; fallbackName?: string }>();

  for (const url of authorUrls) {
    const slug = url.match(/\/author\/([a-z0-9-]+)/i)?.[1];
    if (slug) profileTargets.set(slug, { profileUrl: url });
  }

  for (const staff of TECHCRUNCH_STAFF) {
    if (!staff.slug) continue;
    const profileUrl = `https://techcrunch.com/author/${staff.slug}/`;
    if (!profileTargets.has(staff.slug)) {
      profileTargets.set(staff.slug, { profileUrl, title: staff.title, fallbackName: staff.name });
    } else {
      const existing = profileTargets.get(staff.slug)!;
      existing.title = existing.title || staff.title;
      existing.fallbackName = staff.name;
    }
  }

  const contacts: Array<ScrapedContact & { emails?: string[]; profileUrl: string }> = [];
  const seenEmails = new Set<string>();
  const needsGoogle: Array<{ name: string; title: string; profileUrl: string; oneLiner: string }> = [];

  const entries = [...profileTargets.entries()];
  for (let i = 0; i < entries.length; i++) {
    const [, target] = entries[i];
    const profileUrl = target.profileUrl;

    try {
      const html = await fetchHtml(profileUrl);
      const parsed = parseAuthorProfile(html);

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
        const primary = pickPrimaryEmail(emails.filter(e => !seenEmails.has(e)));
        if (!primary) continue;

        emails.forEach(e => seenEmails.add(e));
        contacts.push({
          name: parsed.name,
          email: primary,
          emails,
          title: parsed.title || "Journalist",
          company: "TechCrunch",
          oneLiner: parsed.oneLiner,
          crunchbaseUrl: profileUrl,
          profileUrl,
        });
        console.log(`  ✓ ${parsed.name}: ${emails.join(", ")} (profile)`);
      } else {
        needsGoogle.push({ name, title, profileUrl, oneLiner });
        console.log(`  ? ${name}: no email on profile — will Google search`);
      }
    } catch (err) {
      if (target.fallbackName) {
        needsGoogle.push({
          name: target.fallbackName,
          title: target.title || "Journalist",
          profileUrl,
          oneLiner: target.title || "",
        });
      }
      console.warn(`  failed ${profileUrl}:`, err instanceof Error ? err.message : err);
    }

    if (i % 5 === 4) await sleep(600);
  }

  // Google search for journalists missing emails on their profile
  if (needsGoogle.length > 0) {
    console.log(`🔍 Google email search for ${needsGoogle.length} journalist(s)...`);
    const googleMap = await findTechCrunchEmailsViaGoogleBatch(needsGoogle);

    for (const person of needsGoogle) {
      let emails = googleMap.get(person.name) || [];

      if (emails.length === 0) {
        emails = await findTechCrunchEmailViaGoogle(person.name);
        await sleep(500);
      }

      const fresh = emails.filter(e => !seenEmails.has(e));
      const primary = pickPrimaryEmail(fresh.length ? fresh : emails);
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
        company: "TechCrunch",
        oneLiner: person.oneLiner,
        crunchbaseUrl: person.profileUrl,
        profileUrl: person.profileUrl,
      });
      console.log(`  ✓ ${person.name}: ${emails.join(", ")} (google)`);
    }
  }

  console.log(`✅ TechCrunch scrape: ${contacts.length} journalists with emails`);
  return contacts;
}
