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
  organizationName?: string,
  linkedinUrl?: string
): Promise<ApolloPersonResult | null> {
  if (!APOLLO_KEY) throw new Error("APOLLO_API_KEY not set");

  const { first, last } = splitName(name);

  // Build attempts in order of confidence
  // According to Apollo docs, params should be query parameters, not body
  const attempts: Array<{ params: Record<string, string> }> = [];

  if (linkedinUrl) {
    // Most reliable: LinkedIn URL uniquely identifies the person
    attempts.push({ 
      params: { 
        linkedin_url: linkedinUrl, 
        reveal_personal_emails: "true" 
      } 
    });
  }
  if (first && last) {
    const baseParams: Record<string, string> = { 
      first_name: first, 
      last_name: last, 
      reveal_personal_emails: "true" 
    };
    if (linkedinUrl) {
      attempts.push({ params: { ...baseParams, linkedin_url: linkedinUrl } });
    }
    if (organizationName) {
      attempts.push({ params: { ...baseParams, organization_name: organizationName } });
    }
    // Last resort: name only
    attempts.push({ params: baseParams });
  }

  console.log(`Apollo matching: ${name} (LinkedIn: ${linkedinUrl ? "yes" : "no"}, Org: ${organizationName || "none"})`);

  for (let i = 0; i < attempts.length; i++) {
    const { params } = attempts[i];
    try {
      const paramsStr = new URLSearchParams(params).toString();
      console.log(`  Attempt ${i + 1}/${attempts.length}: ${paramsStr.substring(0, 120)}`);
      
      const res = await axios.post(
        `${APOLLO_BASE}/people/match?${paramsStr}`,
        {},  // Empty body - all params go in URL
        { headers: HEADERS(), timeout: 15_000 }
      );
      
      // Log what we got back
      const person = res.data?.person;
      if (person) {
        console.log(`  📋 Person found: ${person.first_name} ${person.last_name}, email: ${person.email || "NONE"}, personal_emails: ${person.personal_emails?.length || 0}`);
      }
      
      const result = extractPerson(person, name, organizationName);
      if (result) {
        console.log(`  ✅ Match found: ${result.emails.join(", ")}`);
        return result;
      }
      console.log(`  ⚠️  Person found but no emails extracted`);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        console.log(`  ❌ Attempt ${i + 1} failed: ${status} ${err.response?.data?.error || err.message}`);
        if (status === 429) throw new Error("RATE_LIMIT");
        if (status === 422 || status === 404) continue; // try next attempt
        if (status === 403) {
          console.error(`Apollo 403 for ${name} — endpoint not accessible on this plan`);
          return null;
        }
      }
    }
  }
  console.log(`  ❌ No match found after ${attempts.length} attempts`);
  return null;
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

export async function apolloTestConnection(): Promise<{ ok: boolean; message: string }> {
  if (!APOLLO_KEY) return { ok: false, message: "APOLLO_API_KEY not set in Railway" };

  try {
    const params = new URLSearchParams({
      first_name: "Mark",
      last_name: "Cuban",
      organization_name: "Dallas Mavericks",
      reveal_personal_emails: "true"
    });
    
    const res = await axios.post(
      `${APOLLO_BASE}/people/match?${params.toString()}`,
      {},
      { headers: HEADERS(), timeout: 15_000 }
    );
    const person = res.data?.person;
    if (person?.email) return { ok: true, message: `✅ Working — found ${person.first_name} ${person.last_name} <${person.email}>` };
    if (person) return { ok: true, message: `✅ API key valid — connected but email not revealed for this person` };
    return { ok: true, message: `✅ API key accepted — no person found for test query (normal)` };
  } catch (err) {
    if (!axios.isAxiosError(err)) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }

    const status = err.response?.status;
    const code = err.response?.data?.error_code || "";
    const msg = err.response?.data?.error || err.message;

    if (status === 401) return { ok: false, message: `❌ Invalid API key — copy a fresh key from apollo.io → Settings → Integrations → API Keys` };
    if (status === 403 && code === "API_INACCESSIBLE") {
      return { ok: false, message: `❌ Plan doesn't include API enrichment. Apollo requires Professional plan ($99/mo) for people/match. Go to apollo.io → Upgrade, then regenerate your API key.` };
    }
    if (status === 403) return { ok: false, message: `❌ 403 Forbidden — regenerate key at apollo.io → Settings → Integrations → API Keys and enable all permissions` };
    if (status === 422) return { ok: false, message: `❌ 422 — API key format issue. Make sure you copied the full key from apollo.io` };

    return { ok: false, message: `❌ Apollo error ${status}: ${msg}` };
  }
}
