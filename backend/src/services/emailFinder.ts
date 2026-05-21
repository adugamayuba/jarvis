import axios from "axios";
import { getDb, COLLECTIONS } from "./firebase";

const APIFY_BASE = "https://api.apify.com/v2";
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

export interface ContactToEnrich {
  id: string;
  name: string;
  crunchbaseUrl?: string;
  company?: string;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const SPAM_DOMAINS = ["example.com", "test.com", "sentry.io", "wix.com", "squarespace.com", "adobe.com", "google.com", "facebook.com", "twitter.com", "placeholder"];

function cleanEmails(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) || [];
  return [...new Set(matches.filter(e =>
    !SPAM_DOMAINS.some(d => e.includes(d)) &&
    e.length < 80 &&
    !e.startsWith(".")
  ))];
}

// Run Google search for multiple queries in one Apify call
async function batchGoogleSearch(queries: string[]): Promise<Map<string, string>> {
  if (!APIFY_TOKEN) throw new Error("APIFY_API_TOKEN not set");

  const runRes = await axios.post(
    `${APIFY_BASE}/acts/apify~google-search-scraper/runs`,
    {
      queries: queries.join("\n"),
      maxPagesPerQuery: 1,
      resultsPerPage: 5,
    },
    { params: { token: APIFY_TOKEN }, timeout: 60_000 }
  );

  const runId: string = runRes.data.data.id;
  let status = "RUNNING";
  let attempts = 0;

  while ((status === "RUNNING" || status === "READY") && attempts < 36) {
    await new Promise((r) => setTimeout(r, 5000));
    const s = await axios.get(`${APIFY_BASE}/actor-runs/${runId}`, {
      params: { token: APIFY_TOKEN }, timeout: 10_000,
    });
    status = s.data.data.status;
    attempts++;
    console.log(`Email finder batch: ${status} (${attempts * 5}s)`);
  }

  if (status !== "SUCCEEDED") {
    throw new Error(`Batch search failed: ${status}`);
  }

  const datasetId: string = runRes.data.data.defaultDatasetId;
  const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
    params: { token: APIFY_TOKEN, format: "json", clean: true },
  });

  // Map query index → emails found
  const results = new Map<string, string>();
  const pages = items.data as Array<{
    searchQuery?: { term?: string };
    organicResults?: Array<{ title?: string; url?: string; description?: string }>;
  }>;

  for (const page of pages) {
    const query = page.searchQuery?.term || "";
    const text = (page.organicResults || [])
      .map(r => `${r.title} ${r.description} ${r.url}`)
      .join(" ");
    const emails = cleanEmails(text);
    if (emails.length > 0) {
      results.set(query, emails[0]);
    }
  }

  return results;
}

// Process one batch of contacts, find their emails, update Firebase
export async function enrichBatch(contacts: ContactToEnrich[]): Promise<number> {
  const queries = contacts.map(c =>
    `"${c.name}" ${c.company || ""} angel investor email contact -site:linkedin.com`.trim()
  );

  let emailsFound = 0;

  try {
    const results = await batchGoogleSearch(queries);

    const db = getDb();
    const batch = db.batch();

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const query = queries[i];
      const email = results.get(query);

      if (email && contact.id) {
        console.log(`✉️  Found email for ${contact.name}: ${email}`);
        batch.update(db.collection(COLLECTIONS.CONTACTS).doc(contact.id), {
          email,
          updatedAt: new Date().toISOString(),
        });
        emailsFound++;
      }
    }

    await batch.commit();
  } catch (err) {
    console.error("Batch enrich error:", err instanceof Error ? err.message : err);
  }

  return emailsFound;
}

// Main function — finds emails for all contacts without one, in batches
export async function findEmailsForAllContacts(
  jobId: string,
  batchSize = 50
): Promise<void> {
  const db = getDb();

  // Update job status
  const jobRef = db.collection("emailFinderJobs").doc(jobId);

  try {
    // Get all contacts without emails (email field is "" for imported contacts)
    const snap = await db.collection(COLLECTIONS.CONTACTS)
      .where("email", "==", "")
      .limit(2000)
      .get();

    const contacts: ContactToEnrich[] = snap.docs
      .map(d => ({
        id: d.id,
        name: (d.data().name as string) || "",
        crunchbaseUrl: (d.data().crunchbaseUrl as string) || "",
        company: (d.data().company as string) || "",
      }))
      .filter(c => c.name);

    const total = contacts.length;
    let processed = 0;
    let totalFound = 0;

    await jobRef.set({
      status: "running",
      total,
      processed: 0,
      found: 0,
      startedAt: new Date().toISOString(),
    });

    console.log(`🔍 Starting email finder for ${total} contacts`);

    // Process in batches
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = contacts.slice(i, i + batchSize);
      const found = await enrichBatch(batch);
      processed += batch.length;
      totalFound += found;

      await jobRef.update({
        processed,
        found: totalFound,
        progress: Math.round((processed / total) * 100),
        updatedAt: new Date().toISOString(),
      });

      console.log(`📊 Progress: ${processed}/${total} (${totalFound} emails found)`);

      // Small delay between batches to avoid rate limits
      await new Promise((r) => setTimeout(r, 2000));
    }

    await jobRef.update({
      status: "completed",
      processed,
      found: totalFound,
      completedAt: new Date().toISOString(),
    });

    console.log(`✅ Email finder done: ${totalFound}/${total} emails found`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await jobRef.update({ status: "failed", error: msg });
    console.error("Email finder failed:", msg);
  }
}
