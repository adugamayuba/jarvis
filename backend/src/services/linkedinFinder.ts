import axios from "axios";

const APIFY_BASE = "https://api.apify.com/v2";
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const GOOGLE_ACTOR = "apify~google-search-scraper";

async function waitForRun(runId: string, maxAttempts = 36): Promise<string> {
  let status = "RUNNING";
  let attempts = 0;
  while ((status === "RUNNING" || status === "READY") && attempts < maxAttempts) {
    await new Promise(r => setTimeout(r, 5000));
    const s = await axios.get(`${APIFY_BASE}/actor-runs/${runId}`, {
      params: { token: APIFY_TOKEN },
      timeout: 10_000,
    });
    status = s.data.data.status;
    attempts++;
  }
  return status;
}

function extractAxiosError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: { message?: string } | string } | undefined;
    if (typeof data?.error === "string") return data.error;
    if (data?.error && typeof data.error === "object" && data.error.message) {
      return data.error.message;
    }
    if (err.message) return err.message;
    return `HTTP ${err.response?.status ?? "error"}`;
  }
  if (err instanceof Error && err.message) return err.message;
  return String(err ?? "Unknown error");
}

// Batch-search LinkedIn URLs for a list of names in ONE Apify run
export async function findLinkedInUrls(
  names: string[]
): Promise<Map<string, string>> {
  if (!APIFY_TOKEN) {
    throw new Error("APIFY_API_TOKEN not set — required for LinkedIn URL lookup");
  }
  if (names.length === 0) return new Map();

  // One query per line (Apify format)
  const queries = names.map(n => `"${n}" site:linkedin.com/in`).join("\n");

  const runRes = await axios.post(
    `${APIFY_BASE}/acts/${GOOGLE_ACTOR}/runs`,
    { queries, maxPagesPerQuery: 1, resultsPerPage: 5 },
    { params: { token: APIFY_TOKEN }, timeout: 30_000 }
  );

  const runId: string = runRes.data?.data?.id;
  if (!runId) throw new Error("Apify Google Search run did not return a run ID");

  const status = await waitForRun(runId);
  if (status !== "SUCCEEDED") {
    throw new Error(`Google Search actor failed with status: ${status}`);
  }

  // Fetch dataset ID from completed run (more reliable than initial response)
  const runInfo = await axios.get(`${APIFY_BASE}/actor-runs/${runId}`, {
    params: { token: APIFY_TOKEN },
    timeout: 10_000,
  });
  const datasetId: string = runInfo.data?.data?.defaultDatasetId;
  if (!datasetId) throw new Error("Google Search run completed but no dataset ID");

  const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
    params: { token: APIFY_TOKEN, format: "json", clean: true, limit: 100 },
    timeout: 30_000,
  });

  const results = new Map<string, string>();
  const pages = items.data as Array<{
    searchQuery?: { term?: string };
    organicResults?: Array<{ url?: string; title?: string }>;
  }>;

  for (const page of pages) {
    const term = page.searchQuery?.term || "";
    const nameMatch = term.match(/"([^"]+)"/);
    if (!nameMatch) continue;
    const name = nameMatch[1];

    const linkedinResult = (page.organicResults || []).find(r =>
      r.url?.includes("linkedin.com/in/")
    );
    if (linkedinResult?.url) {
      const url = linkedinResult.url.split("?")[0].replace(/\/$/, "");
      results.set(name, url);
    }
  }

  return results;
}
