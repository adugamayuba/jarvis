import axios from "axios";
import OpenAI from "openai";
import {
  extractContactOutUrls,
  mergePersonEmails,
  scrapeContactPagesForEmails,
} from "./emailSearchEnricher";

const APIFY_BASE = "https://api.apify.com/v2";
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface PagePerson {
  name: string;
  title?: string;
  email?: string;
  emails?: string[];
  emailSource?: "page" | "google" | "none";
  confidence?: "high" | "medium" | "low";
}

export interface PeopleEmailResult {
  company: string;
  pageUrl: string;
  people: PagePerson[];
}

function inferCompanyFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const base = host.split(".")[0];
    if (!base || base.length < 2) return "";
    return base
      .split("-")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  } catch {
    return "";
  }
}

async function waitForRun(runId: string, maxWaitMs = 90_000): Promise<boolean> {
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

async function extractPeopleWithAI(
  pageText: string,
  pageTitle: string,
  pageUrl: string,
  candidateNames: string[]
): Promise<{ company: string; people: PagePerson[] }> {
  const fallbackCompany = inferCompanyFromUrl(pageUrl) || pageTitle.split(/[|\-–]/)[0]?.trim() || "";

  if (!process.env.OPENAI_API_KEY) {
    return {
      company: fallbackCompany,
      people: candidateNames.slice(0, 15).map(name => ({ name })),
    };
  }

  const prompt = `Analyze this webpage and extract REAL PEOPLE shown on it (team members, partners, investors, authors, executives).

Page URL: ${pageUrl}
Page title: ${pageTitle}
Company hint from URL: ${fallbackCompany}
DOM-detected name candidates: ${candidateNames.slice(0, 30).join(", ") || "none"}

Visible page text:
${pageText.substring(0, 6000)}

Return JSON:
{
  "company": "Organization/company name on this page (e.g. CRV Ventures for crv.com)",
  "people": [
    { "name": "Jane Foster", "title": "Partner" }
  ]
}

Rules:
- Only real human names (first + last name). No company names, products, or nav labels.
- Include everyone visible as team/staff/partners on the page (up to 20).
- Merge duplicates. Use candidate names when they match page content.
- If title is visible, include it.`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const json = JSON.parse(res.choices[0].message.content || "{}");
    const company = (json.company as string) || fallbackCompany;
    const people = ((json.people as Array<{ name?: string; title?: string }>) || [])
      .filter(p => p.name && p.name.trim().length > 3)
      .map(p => ({ name: p.name!.trim(), title: p.title?.trim() }));

    if (people.length === 0 && candidateNames.length > 0) {
      return {
        company,
        people: candidateNames.slice(0, 15).map(name => ({ name })),
      };
    }

    return { company, people: people.slice(0, 20) };
  } catch (err) {
    console.error("People extraction AI error:", err);
    return {
      company: fallbackCompany,
      people: candidateNames.slice(0, 15).map(name => ({ name })),
    };
  }
}

async function searchEmailsViaGoogle(
  people: PagePerson[],
  company: string
): Promise<Map<string, { emails: string[]; confidence: "high" | "medium" | "low" }>> {
  const results = new Map<string, { emails: string[]; confidence: "high" | "medium" | "low" }>();
  if (!APIFY_TOKEN || people.length === 0) return results;

  const needsSearch = people.filter(p => !p.email);
  if (needsSearch.length === 0) return results;

  const queries = needsSearch
    .slice(0, 15)
    .map(p => `"${p.name}" ${company} email contact`)
    .join("\n");

  try {
    const runRes = await axios.post(
      `${APIFY_BASE}/acts/apify~google-search-scraper/runs`,
      { queries, maxPagesPerQuery: 1, resultsPerPage: 5 },
      { params: { token: APIFY_TOKEN }, timeout: 30_000 }
    );

    const succeeded = await waitForRun(runRes.data.data.id, 120_000);
    if (!succeeded) return results;

    const datasetId: string = runRes.data.data.defaultDatasetId;
    const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
      params: { token: APIFY_TOKEN, format: "json", clean: true },
    });

    const pages = items.data as Array<{
      searchQuery?: { term?: string };
      organicResults?: Array<{ title?: string; url?: string; description?: string }>;
    }>;

    // Batch-scrape ContactOut profile pages Google surfaced (cheap extra emails per person)
    const allContactOutUrls = pages.flatMap(p =>
      extractContactOutUrls(p.organicResults || [])
    );
    const scrapedByUrl = allContactOutUrls.length > 0
      ? await scrapeContactPagesForEmails(allContactOutUrls)
      : new Map<string, string[]>();

    for (const page of pages) {
      const term = page.searchQuery?.term || "";
      const nameMatch = term.match(/"([^"]+)"/);
      if (!nameMatch) continue;
      const name = nameMatch[1];

      const organic = page.organicResults || [];
      const ranked = mergePersonEmails(organic, name, company, scrapedByUrl);
      if (ranked.length === 0) continue;

      const nameParts = name.toLowerCase().split(/\s+/);
      const best = ranked[0];
      const confidence: "high" | "medium" | "low" =
        nameParts.some(p => best.toLowerCase().includes(p)) ? "high" : "medium";
      results.set(name, { emails: ranked, confidence });
    }
  } catch (err) {
    console.error("Google email search error:", err);
  }

  return results;
}

function mergeOnPageEmails(
  people: PagePerson[],
  onPageEmails: Array<{ name?: string; email: string }>
): PagePerson[] {
  if (onPageEmails.length === 0) return people;

  return people.map(person => {
    if (person.email) return person;

    const parts = person.name.toLowerCase().split(/\s+/);
    const matches = onPageEmails.filter(entry => {
      const emailLocal = entry.email.split("@")[0].toLowerCase();
      return parts.some(p => p.length > 2 && (emailLocal.includes(p) || entry.name?.toLowerCase().includes(p)));
    });

    if (matches.length > 0) {
      const emails = [...new Set(matches.map(m => m.email.trim().toLowerCase()))];
      return {
        ...person,
        email: emails[0],
        emails,
        emailSource: "page" as const,
        confidence: "high" as const,
      };
    }
    return person;
  });
}

export async function findPeopleEmailsOnPage(input: {
  pageUrl: string;
  pageTitle: string;
  pageText: string;
  candidateNames?: string[];
  onPageEmails?: Array<{ name?: string; email: string }>;
}): Promise<PeopleEmailResult> {
  const candidateNames = input.candidateNames || [];
  const { company, people: extracted } = await extractPeopleWithAI(
    input.pageText,
    input.pageTitle,
    input.pageUrl,
    candidateNames
  );

  let people = mergeOnPageEmails(extracted, input.onPageEmails || []);
  const googleResults = await searchEmailsViaGoogle(people, company);

  people = people.map(person => {
    if (person.email) {
      return person.emails?.length ? person : { ...person, emails: [person.email] };
    }

    const found = googleResults.get(person.name);
    if (found) {
      return {
        ...person,
        email: found.emails[0],
        emails: found.emails,
        emailSource: "google" as const,
        confidence: found.confidence,
      };
    }

    return { ...person, emailSource: "none" as const };
  });

  return { company, pageUrl: input.pageUrl, people };
}
