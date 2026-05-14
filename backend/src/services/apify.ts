import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const APIFY_BASE_URL = "https://api.apify.com/v2";
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

// Apify actor IDs for different platforms
const ACTORS = {
  CRUNCHBASE: "missourivalleyfinancial/crunchbase-companies-scraper",
  LINKEDIN: "curious_coder/linkedin-profile-scraper",
  TWITTER: "apidojo/tweet-scraper",
};

export interface ApifyRunInput {
  url?: string;
  urls?: string[];
  [key: string]: unknown;
}

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
  input: ApifyRunInput
): Promise<unknown[]> {
  if (!APIFY_TOKEN) {
    throw new Error("APIFY_API_TOKEN is not set");
  }

  const runResponse = await axios.post(
    `${APIFY_BASE_URL}/acts/${actorId}/runs`,
    input,
    {
      params: { token: APIFY_TOKEN },
      headers: { "Content-Type": "application/json" },
    }
  );

  const runId = runResponse.data.data.id;
  console.log(`🚀 Apify run started: ${runId}`);

  // Poll for completion
  let status = "RUNNING";
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes max

  while (status === "RUNNING" || status === "READY") {
    if (attempts >= maxAttempts) {
      throw new Error("Apify run timed out after 5 minutes");
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const statusResponse = await axios.get(
      `${APIFY_BASE_URL}/acts/${actorId}/runs/${runId}`,
      { params: { token: APIFY_TOKEN } }
    );
    status = statusResponse.data.data.status;
    attempts++;
    console.log(`⏳ Apify run status: ${status} (attempt ${attempts})`);
  }

  if (status !== "SUCCEEDED") {
    throw new Error(`Apify run failed with status: ${status}`);
  }

  // Fetch dataset results
  const datasetId = runResponse.data.data.defaultDatasetId;
  const resultsResponse = await axios.get(
    `${APIFY_BASE_URL}/datasets/${datasetId}/items`,
    {
      params: { token: APIFY_TOKEN, format: "json", clean: true },
    }
  );

  return resultsResponse.data;
}

// Scrape Crunchbase list/profile page
export async function scrapeCrunchbase(url: string): Promise<ScrapedContact[]> {
  const input: ApifyRunInput = {
    startUrls: [{ url }],
    maxItems: 100,
    proxyConfiguration: { useApifyProxy: true },
  };

  try {
    const results = await runActor(ACTORS.CRUNCHBASE, input);
    return parseCrunchbaseResults(results as Record<string, unknown>[]);
  } catch (error) {
    console.error("Crunchbase scrape error:", error);
    throw error;
  }
}

function parseCrunchbaseResults(
  results: Record<string, unknown>[]
): ScrapedContact[] {
  return results.map((item) => {
    const contact: ScrapedContact = {
      name:
        (item.name as string) ||
        (item.fullName as string) ||
        (item.personName as string) ||
        "Unknown",
      email: (item.email as string) || extractEmail(item),
      oneLiner:
        (item.shortDescription as string) ||
        (item.description as string) ||
        (item.bio as string) ||
        "",
      title:
        (item.title as string) ||
        (item.jobTitle as string) ||
        (item.primaryJobTitle as string) ||
        "",
      company:
        (item.company as string) ||
        (item.organizationName as string) ||
        (item.primaryOrganization as string) ||
        "",
      linkedinUrl:
        (item.linkedinUrl as string) || (item.linkedin as string) || "",
      crunchbaseUrl:
        (item.profileUrl as string) ||
        (item.url as string) ||
        (item.crunchbaseUrl as string) ||
        "",
      profileImageUrl:
        (item.profileImageUrl as string) ||
        (item.imageUrl as string) ||
        (item.avatar as string) ||
        "",
    };
    return contact;
  });
}

function extractEmail(item: Record<string, unknown>): string {
  const text = JSON.stringify(item);
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  return matches ? matches[0] : "";
}

// Get Apify run status by run ID
export async function getRunStatus(runId: string): Promise<{
  status: string;
  contactsFound?: number;
}> {
  if (!APIFY_TOKEN) throw new Error("APIFY_API_TOKEN is not set");

  const response = await axios.get(`${APIFY_BASE_URL}/actor-runs/${runId}`, {
    params: { token: APIFY_TOKEN },
  });

  return {
    status: response.data.data.status,
    contactsFound: response.data.data.stats?.itemCount,
  };
}
