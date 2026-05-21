import axios from "axios";

const APOLLO_BASE = "https://api.apollo.io/v1";
const APOLLO_KEY = process.env.APOLLO_API_KEY;

export interface ApolloPersonResult {
  name: string;
  email?: string;
  emails: string[];
  title?: string;
  organization?: string;
  linkedin?: string;
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first: parts[0], last: "" };
  const last = parts[parts.length - 1];
  const first = parts.slice(0, -1).join(" ");
  return { first, last };
}

export async function apolloMatchPerson(
  name: string,
  organizationName?: string
): Promise<ApolloPersonResult | null> {
  if (!APOLLO_KEY) throw new Error("APOLLO_API_KEY not set");

  const { first, last } = splitName(name);

  const headers = {
    "Content-Type": "application/json",
    "X-Api-Key": APOLLO_KEY,
    "Cache-Control": "no-cache",
  };

  // Strategy 1: people/match with org name (most accurate)
  if (organizationName) {
    try {
      const res = await axios.post(`${APOLLO_BASE}/people/match`, {
        first_name: first,
        last_name: last,
        organization_name: organizationName,
        reveal_personal_emails: true,
      }, { headers, timeout: 15_000 });
      const result = extractPerson(res.data?.person, name, organizationName);
      if (result) return result;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) throw new Error("RATE_LIMIT");
    }
  }

  // Strategy 2: people/search by keyword (works without org)
  try {
    const res = await axios.post(`${APOLLO_BASE}/mixed_people/search`, {
      q_keywords: name,
      page: 1,
      per_page: 3,
    }, { headers, timeout: 15_000 });

    const people: Array<Record<string, unknown>> = res.data?.people || res.data?.contacts || [];
    // Find the best match by name similarity
    for (const p of people) {
      const pName = `${p.first_name || ""} ${p.last_name || ""}`.trim().toLowerCase();
      if (pName === name.toLowerCase() || pName.includes(last.toLowerCase())) {
        const result = extractPerson(p, name, organizationName);
        if (result) return result;
      }
    }
    return null;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 429) throw new Error("RATE_LIMIT");
      console.error(`Apollo search ${status} for ${name}:`, err.response?.data?.message || err.message);
    }
    return null;
  }
}

function extractPerson(
  person: Record<string, unknown> | null | undefined,
  fallbackName: string,
  fallbackOrg?: string
): ApolloPersonResult | null {
  if (!person) return null;

  const emails: string[] = [];
  if (person.email && typeof person.email === "string") emails.push(person.email);
  if (Array.isArray(person.personal_emails)) {
    emails.push(...(person.personal_emails as string[]).filter(Boolean));
  }

  const unique = [...new Set(emails.filter(e => typeof e === "string" && e.includes("@")))];
  if (unique.length === 0) return null;

  const org = (person.organization as Record<string, unknown>)?.name as string | undefined;

  return {
    name: [`${person.first_name || ""}`, `${person.last_name || ""}`].join(" ").trim() || fallbackName,
    email: unique[0],
    emails: unique,
    title: person.title as string | undefined,
    organization: org || fallbackOrg,
    linkedin: person.linkedin_url as string | undefined,
  };
}

// Quick test to verify the API key works
export async function apolloTestConnection(): Promise<{ ok: boolean; message: string }> {
  if (!APOLLO_KEY) return { ok: false, message: "APOLLO_API_KEY not set in Railway" };
  try {
    const res = await axios.post(`${APOLLO_BASE}/mixed_people/search`, {
      q_keywords: "Mark Cuban",
      page: 1,
      per_page: 1,
    }, {
      headers: { "Content-Type": "application/json", "X-Api-Key": APOLLO_KEY, "Cache-Control": "no-cache" },
      timeout: 15_000,
    });
    const people = res.data?.people || res.data?.contacts || [];
    const person = people[0];
    if (person?.email) return { ok: true, message: `✅ API key works — found ${person.first_name} ${person.last_name} <${person.email}>` };
    if (person) return { ok: true, message: `✅ API key works — found ${person.first_name} ${person.last_name} (no email on free plan)` };
    return { ok: true, message: "✅ API key valid — no results for test query (normal)" };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      return { ok: false, message: `Apollo error ${err.response?.status}: ${JSON.stringify(err.response?.data) || err.message}` };
    }
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
