import axios from "axios";

const HUNTER_BASE = "https://api.hunter.io/v2";
const HUNTER_KEY = process.env.HUNTER_API_KEY;

export interface HunterResult {
  email: string;
  confidence: number;
  firstName?: string;
  lastName?: string;
  domain?: string;
}

// Find email by domain + name (requires knowing the company domain)
export async function hunterFindEmail(
  firstName: string,
  lastName: string,
  domain: string
): Promise<HunterResult | null> {
  if (!HUNTER_KEY) return null;

  try {
    const res = await axios.get(`${HUNTER_BASE}/email-finder`, {
      params: {
        domain,
        first_name: firstName,
        last_name: lastName,
        api_key: HUNTER_KEY,
      },
      timeout: 10_000,
    });

    const data = res.data?.data;
    if (!data?.email) return null;

    return {
      email: data.email,
      confidence: data.score || 0,
      firstName: data.first_name,
      lastName: data.last_name,
      domain,
    };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 429) {
      throw new Error("HUNTER_RATE_LIMIT");
    }
    return null;
  }
}

// Search for all emails at a domain
export async function hunterDomainSearch(domain: string, limit = 10): Promise<HunterResult[]> {
  if (!HUNTER_KEY) return [];

  try {
    const res = await axios.get(`${HUNTER_BASE}/domain-search`, {
      params: { domain, limit, api_key: HUNTER_KEY },
      timeout: 10_000,
    });

    const emails = res.data?.data?.emails || [];
    return emails.map((e: Record<string, unknown>) => ({
      email: e.value as string,
      confidence: (e.confidence as number) || 0,
      firstName: e.first_name as string | undefined,
      lastName: e.last_name as string | undefined,
      domain,
    }));
  } catch {
    return [];
  }
}

export async function hunterTestConnection(): Promise<{ ok: boolean; message: string; credits?: number }> {
  if (!HUNTER_KEY) return { ok: false, message: "HUNTER_API_KEY not set in Railway" };

  try {
    const res = await axios.get(`${HUNTER_BASE}/account`, {
      params: { api_key: HUNTER_KEY },
      timeout: 10_000,
    });
    const data = res.data?.data;
    const credits = data?.requests?.searches?.available || 0;
    return {
      ok: true,
      message: `✅ Hunter.io connected — ${credits} searches remaining`,
      credits,
    };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      return { ok: false, message: `Hunter error ${err.response?.status}: ${err.response?.data?.errors?.[0]?.details || err.message}` };
    }
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
