import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const APIFY_BASE_URL = "https://api.apify.com/v2";
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

// Apify REST API uses ~ as separator, not /
const ACTORS = {
  CRUNCHBASE: "curious_coder~crunchbase-scraper",
};

export interface ScrapedContact {
  name: string;
  email?: string;
  oneLiner?: string;
  title?: string;
  company?: string;
  linkedinUrl?: string;
  crunchbaseUrl?: string;
  profileImageUrl?: string;
}

async function runActor(
  actorId: string,
  input: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  if (!APIFY_TOKEN) {
    throw new Error(
      "APIFY_API_TOKEN is not set — add it to Railway environment variables"
    );
  }

  // Start the actor run
  const runResponse = await axios.post(
    `${APIFY_BASE_URL}/acts/${actorId}/runs`,
    input,
    {
      params: { token: APIFY_TOKEN },
      headers: { "Content-Type": "application/json" },
      timeout: 30_000,
    }
  );

  const runId: string = runResponse.data.data.id;
  const datasetId: string = runResponse.data.data.defaultDatasetId;
  console.log(`Apify run started: ${runId}`);

  // Poll until finished (max 6 minutes)
  let status = "RUNNING";
  let attempts = 0;

  while ((status === "RUNNING" || status === "READY") && attempts < 72) {
    await new Promise((r) => setTimeout(r, 5000));
    const s = await axios.get(
      `${APIFY_BASE_URL}/actor-runs/${runId}`,
      { params: { token: APIFY_TOKEN }, timeout: 10_000 }
    );
    status = s.data.data.status;
    attempts++;
    console.log(`Apify status: ${status} (${attempts * 5}s elapsed)`);
  }

  if (status !== "SUCCEEDED") {
    throw new Error(
      `Apify actor finished with status: ${status}. Check your Apify dashboard for details.`
    );
  }

  const itemsResponse = await axios.get(
    `${APIFY_BASE_URL}/datasets/${datasetId}/items`,
    {
      params: { token: APIFY_TOKEN, format: "json", clean: true },
      timeout: 30_000,
    }
  );

  return itemsResponse.data as Record<string, unknown>[];
}

export async function scrapeCrunchbase(url: string): Promise<ScrapedContact[]> {
  const input = {
    startUrls: [{ url }],
    maxItems: 100,
  };

  const results = await runActor(ACTORS.CRUNCHBASE, input);
  return parseResults(results);
}

// Maps curious_coder/crunchbase-scraper output to our contact schema.
// This actor returns people/company records — we normalise both shapes.
function parseResults(results: Record<string, unknown>[]): ScrapedContact[] {
  return results.map((item) => ({
    name:
      str(item.name) ||
      str(item.full_name) ||
      str(item.firstName) + " " + str(item.lastName) ||
      "Unknown",
    email:
      str(item.email) ||
      str(item.contact_email) ||
      extractEmail(item),
    oneLiner:
      str(item.short_description) ||
      str(item.description) ||
      str(item.bio) ||
      str(item.overview) ||
      "",
    title:
      str(item.title) ||
      str(item.primary_job_title) ||
      str(item.job_title) ||
      str(item.role) ||
      "",
    company:
      str(item.primary_organization) ||
      str(item.organization_name) ||
      str(item.company) ||
      "",
    linkedinUrl:
      str(item.linkedin_url) ||
      str(item.linkedinUrl) ||
      "",
    crunchbaseUrl:
      str(item.profile_url) ||
      str(item.url) ||
      str(item.crunchbase_url) ||
      "",
    profileImageUrl:
      str(item.profile_image_url) ||
      str(item.image_url) ||
      str(item.logo_url) ||
      "",
  }));
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function extractEmail(item: Record<string, unknown>): string {
  const matches = JSON.stringify(item).match(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
  );
  return matches ? matches[0] : "";
}
