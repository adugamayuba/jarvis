import axios from "axios";
import { chromium } from "playwright";

const APIFY_BASE = "https://api.apify.com/v2";
const APIFY_TOKEN = process.env.APIFY_API_TOKEN;

// Apify actors for TikTok UGC
const TIKTOK_POSTER = "alizarin_refrigerator-owner/tiktok-poster";
const TIKTOK_SCRAPER = "apidojo/tiktok-scraper";

export interface TikTokPostInput {
  cookies: string;
  videoUrl: string;
  caption: string;
  hashtags?: string[];
  isPrivate?: boolean;
  allowComments?: boolean;
  allowDuet?: boolean;
  allowStitch?: boolean;
}

export interface TikTokPostResult {
  success: boolean;
  message?: string;
  videoUrl?: string;
  error?: string;
}

async function waitForRun(runId: string, maxWaitMs = 180_000): Promise<{ ok: boolean; datasetId?: string; error?: string }> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const s = await axios.get(`${APIFY_BASE}/actor-runs/${runId}`, {
        params: { token: APIFY_TOKEN },
        timeout: 10_000,
      });
      const status: string = s.data.data.status;
      if (status === "SUCCEEDED") return { ok: true, datasetId: s.data.data.defaultDatasetId };
      if (["FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
        return { ok: false, error: `Apify run ${status}` };
      }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }
  return { ok: false, error: "Timed out waiting for TikTok post" };
}

/** Post a video to TikTok via Apify browser automation (cookies required) */
export async function postVideoToTikTok(input: TikTokPostInput): Promise<TikTokPostResult> {
  if (!APIFY_TOKEN) return { success: false, error: "APIFY_API_TOKEN not set" };
  if (!input.cookies?.trim()) return { success: false, error: "TikTok session cookies required" };
  if (!input.videoUrl?.trim()) return { success: false, error: "Video URL required" };

  const caption = [
    input.caption,
    ...(input.hashtags || []).map(h => (h.startsWith("#") ? h : `#${h}`)),
  ].filter(Boolean).join(" ").substring(0, 2200);

  try {
    const runRes = await axios.post(
      `${APIFY_BASE}/acts/${TIKTOK_POSTER}/runs`,
      {
        cookies: input.cookies,
        videoUrl: input.videoUrl,
        caption,
        hashtags: input.hashtags || [],
        isPrivate: input.isPrivate ?? false,
        allowComments: input.allowComments ?? true,
        allowDuet: input.allowDuet ?? true,
        allowStitch: input.allowStitch ?? true,
        demoMode: false,
        timeout: 180,
      },
      { params: { token: APIFY_TOKEN }, timeout: 30_000 }
    );

    const runId = runRes.data.data.id;
    const result = await waitForRun(runId, 200_000);
    if (!result.ok || !result.datasetId) {
      return { success: false, error: result.error || "Post failed" };
    }

    const items = await axios.get(`${APIFY_BASE}/datasets/${result.datasetId}/items`, {
      params: { token: APIFY_TOKEN, format: "json", clean: true },
    });

    const output = (items.data as Array<Record<string, unknown>>)[0];
    if (!output) return { success: false, error: "No response from TikTok poster" };

    const success = output.success === true || output.status === "success";
    return {
      success,
      message: (output.message as string) || (output.status as string) || "Posted",
      videoUrl: (output.videoUrl as string) || (output.url as string) || undefined,
      error: success ? undefined : ((output.error as string) || (output.message as string) || "Post failed"),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Search TikTok creators by hashtag/keyword via Apify */
export async function searchTikTokCreators(niche: string, maxResults = 30) {
  if (!APIFY_TOKEN) throw new Error("APIFY_API_TOKEN not set");

  const runRes = await axios.post(
    `${APIFY_BASE}/acts/${TIKTOK_SCRAPER}/runs`,
    {
      hashtags: [niche.replace(/^#/, "")],
      maxItems: maxResults,
      resultsPerPage: maxResults,
    },
    { params: { token: APIFY_TOKEN }, timeout: 30_000 }
  );

  const runId = runRes.data.data.id;
  const datasetId = runRes.data.data.defaultDatasetId;
  const result = await waitForRun(runId, 120_000);
  if (!result.ok) throw new Error(result.error || "TikTok search failed");

  const items = await axios.get(`${APIFY_BASE}/datasets/${datasetId}/items`, {
    params: { token: APIFY_TOKEN, format: "json", clean: true, limit: maxResults },
  });

  const seen = new Set<string>();
  const creators: Array<{
    platform: "tiktok";
    username: string;
    name: string;
    bio: string;
    followers: number;
    profileUrl: string;
    profilePic: string;
    avgViews: number;
  }> = [];

  for (const item of items.data as Array<Record<string, unknown>>) {
    const author = (item.authorMeta || item.author || item) as Record<string, unknown>;
    const username = (author.name as string) || (author.uniqueId as string) || (item.author as string) || "";
    if (!username || seen.has(username)) continue;
    seen.add(username);

    creators.push({
      platform: "tiktok",
      username,
      name: (author.nickName as string) || (author.nickname as string) || username,
      bio: (author.signature as string) || "",
      followers: (author.fans as number) || (author.followerCount as number) || 0,
      profileUrl: `https://www.tiktok.com/@${username}`,
      profilePic: (author.avatar as string) || "",
      avgViews: (item.playCount as number) || (item.views as number) || 0,
    });
  }

  return creators.slice(0, maxResults);
}

/** Open TikTok signup with pre-filled details — user completes phone verification manually */
export async function launchTikTokSignup(email: string, password: string): Promise<{ success: boolean; message: string }> {
  const isServer = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === "production";
  if (isServer) {
    return {
      success: true,
      message: `Account saved. Sign up manually at https://www.tiktok.com/signup/phone-or-email/email using ${email}, then paste session cookies in Jarvis.`,
    };
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.goto("https://www.tiktok.com/signup/phone-or-email/email", { waitUntil: "domcontentloaded", timeout: 30_000 });

    // Pre-fill email if field visible
    try {
      const emailInput = page.locator('input[name="email"], input[type="email"]').first();
      await emailInput.waitFor({ timeout: 8000 });
      await emailInput.fill(email);
    } catch { /* TikTok UI may vary */ }

    try {
      const pwInput = page.locator('input[type="password"]').first();
      await pwInput.waitFor({ timeout: 5000 });
      await pwInput.fill(password);
    } catch { /* optional */ }

    return {
      success: true,
      message: "Browser opened — complete phone verification and captcha manually, then export cookies into Jarvis.",
    };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  } finally {
    // Keep browser open for user — don't close
  }
}
