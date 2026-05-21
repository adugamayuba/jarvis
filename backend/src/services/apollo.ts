import axios from "axios";

const APOLLO_BASE = "https://api.apollo.io/api/v1";
const APOLLO_KEY = process.env.APOLLO_API_KEY;

export interface ApolloPersonResult {
  name: string;
  email?: string;
  emails?: string[];
  title?: string;
  organization?: string;
  linkedin?: string;
  city?: string;
  state?: string;
  country?: string;
}

// Match a person in Apollo's database by name and optionally company
export async function apolloMatchPerson(
  name: string,
  organizationName?: string
): Promise<ApolloPersonResult | null> {
  if (!APOLLO_KEY) {
    throw new Error("APOLLO_API_KEY not set in environment variables");
  }

  try {
    const body: Record<string, string> = { name };
    if (organizationName) body.organization_name = organizationName;

    const res = await axios.post(
      `${APOLLO_BASE}/people/match`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": APOLLO_KEY,
        },
        timeout: 15_000,
      }
    );

    const person = res.data?.person;
    if (!person) return null;

    const emails: string[] = [];
    if (person.email) emails.push(person.email);
    if (person.personal_emails) emails.push(...person.personal_emails);
    if (person.email_status === "verified" || person.email) {
      // de-dup
    }

    return {
      name: person.name || name,
      email: person.email || undefined,
      emails: [...new Set(emails)].filter(Boolean),
      title: person.title || undefined,
      organization: person.organization?.name || organizationName,
      linkedin: person.linkedin_url || undefined,
      city: person.city || undefined,
      state: person.state || undefined,
      country: person.country || undefined,
    };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return null; // person not in Apollo
    }
    if (axios.isAxiosError(err) && err.response?.status === 429) {
      throw new Error("Apollo rate limit hit — slow down");
    }
    console.error(`Apollo match failed for ${name}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

// Bulk enrich a list of contacts using Apollo
export async function apolloBulkEnrich(
  contacts: Array<{ id: string; name: string; company?: string }>
): Promise<Map<string, ApolloPersonResult>> {
  const results = new Map<string, ApolloPersonResult>();

  for (const contact of contacts) {
    try {
      const result = await apolloMatchPerson(contact.name, contact.company);
      if (result) results.set(contact.id, result);
      // Apollo free tier: 50 req/min — add small delay
      await new Promise((r) => setTimeout(r, 1300));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("rate limit")) {
        console.log("Apollo rate limit — waiting 60s");
        await new Promise((r) => setTimeout(r, 60_000));
        // Retry once
        try {
          const retry = await apolloMatchPerson(contact.name, contact.company);
          if (retry) results.set(contact.id, retry);
        } catch { /* skip */ }
      }
    }
  }

  return results;
}
