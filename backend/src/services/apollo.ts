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

  const body: Record<string, unknown> = {
    api_key: APOLLO_KEY,
    first_name: first,
    last_name: last,
    reveal_personal_emails: true,
    reveal_phone_number: false,
  };
  if (organizationName) body.organization_name = organizationName;

  try {
    const res = await axios.post(`${APOLLO_BASE}/people/match`, body, {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
      timeout: 20_000,
    });

    const person = res.data?.person;
    if (!person) {
      return null; // not found
    }

    const emails: string[] = [];
    if (person.email) emails.push(person.email);
    if (Array.isArray(person.personal_emails)) {
      emails.push(...person.personal_emails);
    }

    const unique = [...new Set(emails.filter(Boolean))];

    if (unique.length === 0) return null;

    return {
      name: [person.first_name, person.last_name].filter(Boolean).join(" ") || name,
      email: unique[0],
      emails: unique,
      title: person.title || undefined,
      organization: person.organization?.name || organizationName,
      linkedin: person.linkedin_url || undefined,
    };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 404) return null;
      if (status === 422) return null; // person not found / invalid
      if (status === 429) throw new Error("RATE_LIMIT");
      console.error(`Apollo ${status} for ${name}:`, err.response?.data?.message || err.message);
    } else {
      console.error(`Apollo error for ${name}:`, err instanceof Error ? err.message : err);
    }
    return null;
  }
}

// Quick test to verify the API key works
export async function apolloTestConnection(): Promise<{ ok: boolean; message: string }> {
  if (!APOLLO_KEY) return { ok: false, message: "APOLLO_API_KEY not set in Railway" };
  try {
    const res = await axios.post(`${APOLLO_BASE}/people/match`, {
      api_key: APOLLO_KEY,
      first_name: "Mark",
      last_name: "Cuban",
      reveal_personal_emails: true,
    }, {
      headers: { "Content-Type": "application/json" },
      timeout: 15_000,
    });
    const person = res.data?.person;
    if (person?.email) return { ok: true, message: `API key works — found ${person.email}` };
    if (person) return { ok: true, message: "API key works — person found but email not in Apollo database" };
    return { ok: true, message: "API key works — test person not found (normal)" };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      return { ok: false, message: `Apollo API error ${err.response?.status}: ${err.response?.data?.message || err.message}` };
    }
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
