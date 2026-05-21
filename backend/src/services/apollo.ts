import axios from "axios";

// Apollo base URL with /api/ prefix as per official docs
const APOLLO_BASE = "https://api.apollo.io/api/v1";
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
  return { first: parts.slice(0, -1).join(" "), last: parts[parts.length - 1] };
}

const HEADERS = () => ({
  "Content-Type": "application/json",
  "X-Api-Key": APOLLO_KEY || "",
  "Cache-Control": "no-cache",
  "accept": "application/json",
});

export async function apolloMatchPerson(
  name: string,
  organizationName?: string
): Promise<ApolloPersonResult | null> {
  if (!APOLLO_KEY) throw new Error("APOLLO_API_KEY not set");

  const { first, last } = splitName(name);

  // Strategy 1: people/match — most accurate when we have org
  if (organizationName && last) {
    try {
      const res = await axios.post(
        `${APOLLO_BASE}/people/match`,
        { first_name: first, last_name: last, organization_name: organizationName, reveal_personal_emails: true },
        { headers: HEADERS(), timeout: 15_000 }
      );
      const result = extractPerson(res.data?.person, name, organizationName);
      if (result) return result;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) throw new Error("RATE_LIMIT");
    }
  }

  // Strategy 2: api_search with q_keywords (paid plan endpoint)
  try {
    const res = await axios.post(
      `${APOLLO_BASE}/mixed_people/search`,
      { q_keywords: name, per_page: 5 },
      { headers: HEADERS(), timeout: 15_000 }
    );

    const people: Array<Record<string, unknown>> = res.data?.people || [];
    for (const p of people) {
      const pFirst = (p.first_name as string || "").toLowerCase();
      const pLast = (p.last_name as string || "").toLowerCase();
      const pFullName = `${pFirst} ${pLast}`.trim();
      if (pFullName === name.toLowerCase() || pLast === last.toLowerCase()) {
        // Get full details via bulk_match with ID
        const personId = p.id as string;
        if (personId) {
          const enriched = await apolloEnrichById(personId);
          if (enriched) return enriched;
        }
        const result = extractPerson(p, name, organizationName);
        if (result) return result;
      }
    }
    return null;
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 429) throw new Error("RATE_LIMIT");
      console.error(`Apollo search ${status} for ${name}:`, JSON.stringify(err.response?.data));
    }
    return null;
  }
}

// Enrich a single person by Apollo ID to get their email
async function apolloEnrichById(apolloId: string): Promise<ApolloPersonResult | null> {
  try {
    const res = await axios.post(
      `${APOLLO_BASE}/people/bulk_match`,
      { details: [{ id: apolloId }], reveal_personal_emails: true },
      { headers: HEADERS(), timeout: 15_000 }
    );
    const people = res.data?.matches || res.data?.people || [];
    const person = people[0];
    return person ? extractPerson(person, "", undefined) : null;
  } catch {
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
  if (typeof person.email === "string" && person.email) emails.push(person.email);
  if (Array.isArray(person.personal_emails)) {
    emails.push(...(person.personal_emails as string[]).filter(e => typeof e === "string" && e.includes("@")));
  }

  const unique = [...new Set(emails)];
  if (unique.length === 0) return null;

  const orgObj = person.organization as Record<string, unknown> | undefined;
  return {
    name: [person.first_name, person.last_name].filter(Boolean).join(" ") as string || fallbackName,
    email: unique[0],
    emails: unique,
    title: person.title as string | undefined,
    organization: orgObj?.name as string | undefined || fallbackOrg,
    linkedin: person.linkedin_url as string | undefined,
  };
}

export async function apolloTestConnection(): Promise<{ ok: boolean; message: string; plan?: string }> {
  if (!APOLLO_KEY) return { ok: false, message: "APOLLO_API_KEY not set in Railway" };

  // Test 1: Account info (works on all plans)
  try {
    const acct = await axios.get(`${APOLLO_BASE}/auth/health`, { headers: HEADERS(), timeout: 10_000 });
    const user = acct.data?.user;
    if (user) {
      const plan = user.account?.plan_tier || user.plan_tier || "unknown";
      // Test 2: Can we hit enrichment?
      try {
        await axios.post(`${APOLLO_BASE}/people/match`,
          { first_name: "Mark", last_name: "Cuban", organization_name: "Dallas Mavericks" },
          { headers: HEADERS(), timeout: 10_000 }
        );
        return { ok: true, message: `✅ Apollo working — plan: ${plan}, enrichment access confirmed`, plan };
      } catch (enrichErr) {
        if (axios.isAxiosError(enrichErr) && enrichErr.response?.status === 403) {
          return {
            ok: false,
            plan,
            message: `API key valid (plan: ${plan}) but enrichment endpoints blocked. Go to apollo.io → Settings → API Keys → regenerate key with "People Search" + "Enrichment" permissions enabled. You may need Professional ($99/mo) plan.`,
          };
        }
        return { ok: true, message: `✅ Apollo key valid (plan: ${plan})`, plan };
      }
    }
  } catch { /* try next */ }

  // Test 2: Basic contacts endpoint (available on all paid plans)
  try {
    await axios.get(`${APOLLO_BASE}/contacts`, { headers: HEADERS(), params: { per_page: 1 }, timeout: 10_000 });
    return {
      ok: false,
      message: `API key connects but enrichment endpoints (people/match, people/search) are blocked. Your plan may not include API enrichment — requires Apollo Professional ($99/mo). Check apollo.io → Settings → API Keys for permissions.`,
    };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 403) {
      return { ok: false, message: `403 Forbidden on all endpoints — API key likely doesn't have enrichment permissions. Regenerate at apollo.io → Settings → Integrations → API Keys and enable all scopes.` };
    }
    if (axios.isAxiosError(err) && err.response?.status === 401) {
      return { ok: false, message: `401 — Invalid API key. Copy a fresh key from apollo.io → Settings → Integrations → API Keys.` };
    }
    return { ok: false, message: `Connection error: ${err instanceof Error ? err.message : String(err)}` };
  }
}
