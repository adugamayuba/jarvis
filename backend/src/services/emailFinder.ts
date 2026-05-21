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
const SKIP_DOMAINS = [
  "example.com", "test.com", "sentry.io", "wix.com", "squarespace.com",
  "adobe.com", "google.com", "facebook.com", "twitter.com", "placeholder",
  "yoursite.com", "domain.com", "email.com", "user.com", "company.com",
];

function cleanEmails(text: string): string[] {
  const matches = text.match(EMAIL_REGEX) || [];
  return [...new Set(matches.filter(e =>
    !SKIP_DOMAINS.some(d => e.includes(d)) &&
    e.length < 80 &&
    !e.startsWith(".") &&
    e.includes(".")
  ))];
}

async function waitForRun(runId: string, maxWaitMs = 120_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const s = await axios.get(`${APIFY_BASE}/actor-runs/${runId}`, {
        params: { token: APIFY_TOKEN }, timeout: 10_000,
      });
      const status: string = s.data.data.status;
      if (status === "SUCCEEDED") return true;
      if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") return false;
    } catch { /* keep polling */ }
  }
  return false;
}

// Search Google for ONE investor's email — simple, reliable
async function findEmailForContact(contact: ContactToEnrich): Promise<string | null> {
  if (!APIFY_TOKEN) return null;

  const query = `"${contact.name}" angel investor email -site:linkedin.com`;

  try {
    const runRes = await axios.post(
      `${APIFY_BASE}/acts/apify~google-search-scraper/runs`,
      { queries: query, maxPagesPerQuery: 1, resultsPerPage: 5 },
      { params: { token: APIFY_TOKEN }, timeout: 15_000 }
    );

    const succeeded = await waitForRun(runRes.data.data.id, 60_000);
    if (!succeeded) return null;

    const datasetId: string = runRes.data.data.defaultDatasetId;
    const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
      params: { token: APIFY_TOKEN, format: "json", clean: true },
    });

    const results = (items.data as Array<{
      organicResults?: Array<{ title?: string; url?: string; description?: string }>;
    }>);

    const allText = results
      .flatMap(r => r.organicResults || [])
      .map(r => `${r.title || ""} ${r.description || ""} ${r.url || ""}`)
      .join(" ");

    const emails = cleanEmails(allText);
    return emails[0] || null;
  } catch (err) {
    console.error(`Email search failed for ${contact.name}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

// Main: find emails for all contacts missing one
export async function findEmailsForAllContacts(jobId: string): Promise<void> {
  const db = getDb();
  const jobRef = db.collection("emailFinderJobs").doc(jobId);

  try {
    // Fetch crunchbase contacts — filter for no email in memory (avoids index issues)
    const snap = await db.collection(COLLECTIONS.CONTACTS)
      .where("source", "==", "crunchbase")
      .limit(2500)
      .get();

    const contacts: ContactToEnrich[] = snap.docs
      .filter(d => !d.data().email)  // missing or empty email
      .map(d => ({
        id: d.id,
        name: (d.data().name as string) || "",
        crunchbaseUrl: (d.data().crunchbaseUrl as string) || "",
        company: (d.data().company as string) || "",
      }))
      .filter(c => c.name.trim());

    const total = contacts.length;
    console.log(`🔍 Email finder: ${total} contacts to enrich`);

    await jobRef.set({
      status: "running",
      total,
      processed: 0,
      found: 0,
      progress: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    if (total === 0) {
      await jobRef.update({ status: "completed", completedAt: new Date().toISOString() });
      console.log("No contacts need email enrichment");
      return;
    }

    let processed = 0;
    let found = 0;

    // Process one at a time — reliable but slower
    // For 2000 contacts at ~5s each = ~2.5 hours. Use concurrency of 3 to speed up.
    const CONCURRENCY = 3;

    for (let i = 0; i < contacts.length; i += CONCURRENCY) {
      const batch = contacts.slice(i, i + CONCURRENCY);

      const results = await Promise.allSettled(
        batch.map(c => findEmailForContact(c))
      );

      // Save any found emails
      const dbBatch = db.batch();
      let batchHasUpdates = false;

      for (let j = 0; j < batch.length; j++) {
        const result = results[j];
        const contact = batch[j];
        if (result.status === "fulfilled" && result.value) {
          const email = result.value;
          console.log(`✉️  ${contact.name}: ${email}`);
          dbBatch.update(db.collection(COLLECTIONS.CONTACTS).doc(contact.id), {
            email,
            emails: [email],   // start the emails array
            updatedAt: new Date().toISOString(),
          });
          found++;
          batchHasUpdates = true;
        }
        processed++;
      }

      if (batchHasUpdates) await dbBatch.commit();

      // Update job progress every 10 contacts
      if (processed % 10 === 0 || processed === total) {
        await jobRef.update({
          processed,
          found,
          progress: Math.round((processed / total) * 100),
          updatedAt: new Date().toISOString(),
        });
        console.log(`📊 ${processed}/${total} — ${found} emails found so far`);
      }

      // Small delay to avoid hammering Apify
      await new Promise((r) => setTimeout(r, 500));
    }

    await jobRef.update({
      status: "completed",
      processed,
      found,
      progress: 100,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log(`✅ Email finder complete: ${found}/${total} emails found`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Email finder error:", msg);
    await jobRef.update({ status: "failed", error: msg, updatedAt: new Date().toISOString() });
  }
}
