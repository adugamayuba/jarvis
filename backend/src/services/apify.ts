import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const APIFY_BASE_URL = "https://api.apify.com/v2";
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

// Apify REST API uses ~ as separator, not /
const ACTORS = {
  CRUNCHBASE: "saswave~crunchbase-search-results",
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
  // Parse cookies from env var — stored as JSON array string
  let cookie: unknown[] = [];
  if (process.env.CRUNCHBASE_COOKIES) {
    try {
      cookie = JSON.parse(process.env.CRUNCHBASE_COOKIES);
    } catch {
      console.warn("CRUNCHBASE_COOKIES env var is not valid JSON, proceeding without cookies");
    }
  }

  const input: Record<string, unknown> = {
    url,
    max_pages: 3,
    proxyConfiguration: { useApifyProxy: true },
  };

  if (cookie.length > 0) {
    input.cookies = cookie;
  }

  const results = await runActor(ACTORS.CRUNCHBASE, input);
  return parseResults(results);
}

// Normalises any shape of Crunchbase actor output into our contact schema.
// Field names vary by actor — we check all known variants.
function parseResults(results: Record<string, unknown>[]): ScrapedContact[] {
  return results.map((item) => {
    const firstName = str(item.first_name) || str(item.firstName);
    const lastName = str(item.last_name) || str(item.lastName);
    const fullFromParts = [firstName, lastName].filter(Boolean).join(" ");

    return {
      name:
        str(item.name) ||
        str(item.full_name) ||
        fullFromParts ||
        "Unknown",
      email:
        str(item.email) ||
        str(item.contact_email) ||
        str(item.Email) ||
        extractEmail(item),
      oneLiner:
        str(item.short_description) ||
        str(item.description) ||
        str(item.bio) ||
        str(item.overview) ||
        str(item.Short_Description) ||
        "",
      title:
        str(item.primary_job_title) ||
        str(item.title) ||
        str(item.job_title) ||
        str(item.role) ||
        str(item.Primary_Job_Title) ||
        "",
      company:
        str(item.primary_organization) ||
        str(item.organization_name) ||
        str(item.company) ||
        str(item.Primary_Organization) ||
        "",
      linkedinUrl:
        str(item.linkedin_url) ||
        str(item.linkedinUrl) ||
        str(item.LinkedIn) ||
        "",
      crunchbaseUrl:
        str(item.profile_url) ||
        str(item.url) ||
        str(item.crunchbase_url) ||
        str(item.Profile_URL) ||
        "",
      profileImageUrl:
        str(item.profile_image_url) ||
        str(item.image_url) ||
        str(item.logo_url) ||
        "",
    };
  });
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
