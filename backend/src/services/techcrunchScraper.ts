import axios from "axios";
import { ScrapedContact } from "./apify";
import { cleanEmails } from "./emailSearchEnricher";

const DEFAULT_ABOUT_URL = "https://techcrunch.com/about-techcrunch/";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const EDITORIAL_KEYWORDS = [
  "editor", "reporter", "writer", "journalist", "contributor", "copy editor", "producer", "chief",
];

const SKIP_ROLES = [
  "event", "account executive", "account manager", "operations manager", "software engineer",
  "marketing manager", "director of event", "brand studio", "audience development",
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

function parseAuthorProfile(html: string, profileUrl: string): {
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

  const mailtos = [...html.matchAll(/mailto:([^"'>\s?]+)/gi)]
    .map(m => decodeURIComponent(m[1]).trim().toLowerCase())
    .filter(e => e.includes("@"));

  const snippetEmails = cleanEmails(html);
  const emails = [...new Set([...mailtos, ...snippetEmails])].filter(e => e.includes("@"));
  if (emails.length === 0) return null;

  const bioMatch = html.match(/<h1[^>]*>[^<]+<\/h1>\s*<p[^>]*>[^<]+<\/p>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
  const oneLiner = bioMatch ? decodeHtml(bioMatch[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 280) : title;

  return { name, title, emails, oneLiner: oneLiner || title };
}

function isEditorialRole(title: string, oneLiner: string, name: string): boolean {
  const text = `${title} ${oneLiner} ${name}`.toLowerCase();
  if (SKIP_ROLES.some(r => text.includes(r))) return false;
  if (EDITORIAL_KEYWORDS.some(k => text.includes(k))) return true;
  // Profiles linked from the editorial sections often have a title line even if role keywords differ
  return Boolean(title.trim());
}

export async function scrapeTechCrunchJournalists(
  aboutUrl = DEFAULT_ABOUT_URL
): Promise<Array<ScrapedContact & { emails?: string[]; profileUrl: string }>> {
  console.log(`📰 Fetching TechCrunch staff page: ${aboutUrl}`);
  const aboutHtml = await fetchHtml(aboutUrl);
  const authorUrls = extractAuthorProfileUrls(aboutHtml);
  console.log(`📰 Found ${authorUrls.length} author profile links`);

  const contacts: Array<ScrapedContact & { emails?: string[]; profileUrl: string }> = [];
  const seenEmails = new Set<string>();

  for (let i = 0; i < authorUrls.length; i++) {
    const profileUrl = authorUrls[i];
    try {
      const html = await fetchHtml(profileUrl);
      const parsed = parseAuthorProfile(html, profileUrl);
      if (!parsed) continue;

      if (!isEditorialRole(parsed.title, parsed.oneLiner, parsed.name)) {
        console.log(`  skip (non-editorial): ${parsed.name}`);
        continue;
      }

      const primary = parsed.emails.find(e => !seenEmails.has(e));
      if (!primary) continue;

      parsed.emails.forEach(e => seenEmails.add(e));

      contacts.push({
        name: parsed.name,
        email: primary,
        emails: parsed.emails,
        title: parsed.title || "Journalist",
        company: "TechCrunch",
        oneLiner: parsed.oneLiner,
        crunchbaseUrl: profileUrl,
        profileUrl,
      });

      console.log(`  ✓ ${parsed.name}: ${parsed.emails.join(", ")}`);
    } catch (err) {
      console.warn(`  failed ${profileUrl}:`, err instanceof Error ? err.message : err);
    }

    if (i % 5 === 4) await sleep(800);
  }

  console.log(`✅ TechCrunch scrape: ${contacts.length} journalists with emails`);
  return contacts;
}
