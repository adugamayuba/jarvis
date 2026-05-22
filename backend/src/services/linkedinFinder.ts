import axios from "axios";

const APIFY_BASE = "https://api.apify.com/v2";
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

// Batch-search LinkedIn URLs for a list of names in ONE Apify run
export async function findLinkedInUrls(
  names: string[]
): Promise<Map<string, string>> {
  if (!APIFY_TOKEN || names.length === 0) return new Map();

  // Build one query per name, e.g. '"Naval Ravikant" linkedin.com/in'
  const queries = names.map(n => `"${n}" site:linkedin.com/in`).join("\n");

  try {
    const runRes = await axios.post(
      `${APIFY_BASE}/acts/apify~google-search-scraper/runs`,
      { queries, maxPagesPerQuery: 1, resultsPerPage: 3 },
      { params: { token: APIFY_TOKEN }, timeout: 30_000 }
    );

    const runId: string = runRes.data.data.id;
    let status = "RUNNING";
    let attempts = 0;
    while ((status === "RUNNING" || status === "READY") && attempts < 24) {
      await new Promise(r => setTimeout(r, 5000));
      const s = await axios.get(`${APIFY_BASE}/actor-runs/${runId}`, { params: { token: APIFY_TOKEN } });
      status = s.data.data.status;
      attempts++;
    }
    if (status !== "SUCCEEDED") return new Map();

    const datasetId: string = runRes.data.data.defaultDatasetId;
    const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
      params: { token: APIFY_TOKEN, format: "json", clean: true },
    });

    const results = new Map<string, string>();
    const pages = items.data as Array<{
      searchQuery?: { term?: string };
      organicResults?: Array<{ url?: string; title?: string }>;
    }>;

    for (const page of pages) {
      const term = page.searchQuery?.term || "";
      // Extract the name from the query: '"Naval Ravikant" site:...'
      const nameMatch = term.match(/"([^"]+)"/);
      if (!nameMatch) continue;
      const name = nameMatch[1];

      // Find first linkedin.com/in URL
      const linkedinResult = (page.organicResults || []).find(r =>
        r.url?.includes("linkedin.com/in/")
      );
      if (linkedinResult?.url) {
        // Normalize URL - strip query params
        const url = linkedinResult.url.split("?")[0].replace(/\/$/, "");
        results.set(name, url);
      }
    }

    return results;
  } catch (err) {
    console.error("LinkedIn URL finder error:", err instanceof Error ? err.message : err);
    return new Map();
  }
}
