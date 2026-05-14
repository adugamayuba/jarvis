import axios from "axios";
import { ScrapedContact } from "./apify";

// Convert Cookie-Editor JSON array → Cookie header string
function cookiesToHeader(cookieJson: string): string {
  try {
    const arr = JSON.parse(cookieJson) as Array<{ name: string; value: string }>;
    return arr.map((c) => `${c.name}=${c.value}`).join("; ");
  } catch {
    return "";
  }
}

function getCookieHeader(): string {
  const raw = process.env.CRUNCHBASE_COOKIES || "";
  return cookiesToHeader(raw);
}

// Shared headers that mimic a real browser session
function getHeaders(cookie: string) {
  const headers: Record<string, string> = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "content-type": "application/json",
    "cookie": cookie,
    "origin": "https://www.crunchbase.com",
    "referer": "https://www.crunchbase.com/",
    "user-agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "x-requested-with": "XMLHttpRequest",
  };

  // Required by Crunchbase API — get from browser DevTools (see README)
  if (process.env.CRUNCHBASE_USER_KEY) {
    headers["x-cb-user-key"] = process.env.CRUNCHBASE_USER_KEY;
  }

  return headers;
}

// Field IDs we want for person results
const PERSON_FIELDS = [
  "first_name",
  "last_name",
  "primary_job_title",
  "primary_organization",
  "short_description",
  "profile_image_url",
  "linkedin",
  "identifier",
  "facet_ids",
];

// Field IDs for company results
const ORG_FIELDS = [
  "identifier",
  "short_description",
  "website",
  "linkedin",
  "contact_email",
  "phone_number",
  "num_employees_enum",
  "funding_total",
  "location_identifiers",
];

interface CbPerson {
  first_name?: string;
  last_name?: string;
  primary_job_title?: string;
  primary_organization?: { value?: string };
  short_description?: string;
  profile_image_url?: string;
  linkedin?: string;
  identifier?: { permalink?: string; image_id?: string; value?: string };
}

interface CbOrg {
  identifier?: { permalink?: string; value?: string };
  short_description?: string;
  contact_email?: string;
  linkedin?: string;
  profile_image_url?: string;
}

// Parse the list UUID from a Crunchbase /lists/ URL
function extractListUuid(url: string): string | null {
  const m = url.match(
    /\/lists\/[^/]+\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  );
  return m ? m[1] : null;
}

// Determine entity type from URL
function getEntityType(url: string): "people" | "organizations" | "investors" {
  if (url.includes("principal.investors") || url.includes("investor")) return "investors";
  if (url.includes("/person/") || url.includes("people")) return "people";
  if (url.includes("/organization/") || url.includes("companies")) return "organizations";
  return "people";
}

// Scrape a saved Crunchbase list using the internal v4 API
async function scrapeList(url: string, cookie: string): Promise<ScrapedContact[]> {
  const uuid = extractListUuid(url);
  const entityType = getEntityType(url);

  const searchType =
    entityType === "investors" ? "principal.investors" :
    entityType === "organizations" ? "organizations" :
    "people";

  const fields = entityType === "organizations" ? ORG_FIELDS : PERSON_FIELDS;

  const body: Record<string, unknown> = {
    field_ids: fields,
    order: [{ field_id: "rank_person", sort: "asc", nulls: "last" }],
    query: uuid
      ? [
          {
            type: "predicate",
            field_id: "facet_ids",
            operator_id: "includes",
            values: [searchType === "principal.investors" ? "investor" : searchType],
          },
          {
            type: "predicate",
            field_id: "saved_list_ids",
            operator_id: "includes",
            values: [uuid],
          },
        ]
      : [],
    count: 100,
    after_id: null,
  };

  const res = await axios.post(
    `https://www.crunchbase.com/v4/data/searches/${searchType}`,
    body,
    { headers: getHeaders(cookie), timeout: 30_000 }
  );

  const entities = res.data?.entities || [];
  return entities.map((e: { properties: CbPerson }) => mapPerson(e.properties));
}

// Scrape a single /person/ or /organization/ profile page
async function scrapeProfile(url: string, cookie: string): Promise<ScrapedContact[]> {
  const isOrg = url.includes("/organization/");
  const slug = url.split("/").pop();

  if (isOrg) {
    const res = await axios.get(
      `https://www.crunchbase.com/v4/data/entities/organizations/${slug}?field_ids=${ORG_FIELDS.join(",")}`,
      { headers: getHeaders(cookie), timeout: 20_000 }
    );
    const p = res.data?.properties as CbOrg;
    return [
      {
        name: p?.identifier?.value || slug || "Unknown",
        email: p?.contact_email || "",
        oneLiner: p?.short_description || "",
        title: "",
        company: p?.identifier?.value || "",
        linkedinUrl: p?.linkedin || "",
        crunchbaseUrl: url,
        profileImageUrl: p?.profile_image_url || "",
      },
    ];
  }

  const res = await axios.get(
    `https://www.crunchbase.com/v4/data/entities/people/${slug}?field_ids=${PERSON_FIELDS.join(",")}`,
    { headers: getHeaders(cookie), timeout: 20_000 }
  );
  const p = res.data?.properties as CbPerson;
  return [mapPerson(p, url)];
}

function mapPerson(p: CbPerson, profileUrl?: string): ScrapedContact {
  const firstName = p?.first_name || "";
  const lastName = p?.last_name || "";
  return {
    name: [firstName, lastName].filter(Boolean).join(" ") || p?.identifier?.value || "Unknown",
    email: "",
    oneLiner: p?.short_description || "",
    title: p?.primary_job_title || "",
    company: p?.primary_organization?.value || "",
    linkedinUrl: p?.linkedin || "",
    crunchbaseUrl:
      profileUrl ||
      (p?.identifier?.permalink
        ? `https://www.crunchbase.com/person/${p.identifier.permalink}`
        : ""),
    profileImageUrl: p?.profile_image_url || "",
  };
}

// Main export — called by the scrape route
export async function scrapeCrunchbaseDirect(url: string): Promise<ScrapedContact[]> {
  const cookie = getCookieHeader();
  if (!cookie) {
    throw new Error(
      "CRUNCHBASE_COOKIES is not set in environment variables. Export your cookies from crunchbase.com using the Cookie-Editor Chrome extension and add them to Railway."
    );
  }

  const isListUrl = url.includes("/lists/") || url.includes("/discover/");
  if (isListUrl) {
    return scrapeList(url, cookie);
  }
  return scrapeProfile(url, cookie);
}
