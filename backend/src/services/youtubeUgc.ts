import axios from "axios";
import fs from "fs";
import os from "os";
import path from "path";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { google } from "googleapis";
import { chromium } from "playwright";

const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

function getClientId(): string {
  return process.env.YOUTUBE_CLIENT_ID || process.env.GMAIL_CLIENT_ID || "";
}

function getClientSecret(): string {
  return process.env.YOUTUBE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET || "";
}

export function getYouTubeRedirectUri(): string {
  if (process.env.YOUTUBE_REDIRECT_URI) return process.env.YOUTUBE_REDIRECT_URI;
  const base = process.env.BACKEND_URL || process.env.RAILWAY_PUBLIC_DOMAIN;
  if (base) {
    const url = base.startsWith("http") ? base : `https://${base}`;
    return `${url.replace(/\/$/, "")}/api/ugc/youtube/oauth/callback`;
  }
  return "http://localhost:8080/api/ugc/youtube/oauth/callback";
}

export function createYouTubeOAuthClient() {
  return new google.auth.OAuth2(getClientId(), getClientSecret(), getYouTubeRedirectUri());
}

export function getYouTubeAuthUrl(accountId: string): string {
  const client = createYouTubeOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: YOUTUBE_SCOPES,
    state: accountId,
  });
}

export async function exchangeYouTubeCode(code: string): Promise<{
  refreshToken: string;
  accessToken: string;
  channelId: string;
  channelTitle: string;
}> {
  const client = createYouTubeOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("No refresh token returned — revoke app access in Google Account settings and reconnect with consent");
  }

  client.setCredentials(tokens);
  const youtube = google.youtube({ version: "v3", auth: client });
  const channels = await youtube.channels.list({ part: ["snippet"], mine: true });
  const channel = channels.data.items?.[0];
  if (!channel?.id) throw new Error("No YouTube channel found for this Google account");

  return {
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token || "",
    channelId: channel.id,
    channelTitle: channel.snippet?.title || channel.id,
  };
}

export interface YouTubeUploadInput {
  refreshToken: string;
  videoUrl: string;
  title: string;
  description?: string;
  tags?: string[];
  privacyStatus?: "public" | "private" | "unlisted";
}

export interface YouTubeUploadResult {
  success: boolean;
  videoId?: string;
  videoUrl?: string;
  error?: string;
}

async function downloadVideo(url: string): Promise<string> {
  const tmpPath = path.join(os.tmpdir(), `jarvis-yt-${Date.now()}.mp4`);
  const response = await axios.get(url, { responseType: "stream", timeout: 300_000, maxContentLength: 500 * 1024 * 1024 });
  await pipeline(response.data, createWriteStream(tmpPath));
  return tmpPath;
}

/** Upload a video to YouTube via the official Data API */
export async function uploadVideoToYouTube(input: YouTubeUploadInput): Promise<YouTubeUploadResult> {
  if (!getClientId() || !getClientSecret()) {
    return { success: false, error: "YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET (or GMAIL_* vars) not set" };
  }
  if (!input.refreshToken?.trim()) {
    return { success: false, error: "YouTube OAuth refresh token required — connect account first" };
  }
  if (!input.videoUrl?.trim()) {
    return { success: false, error: "Video URL required" };
  }

  const client = createYouTubeOAuthClient();
  client.setCredentials({ refresh_token: input.refreshToken });
  const youtube = google.youtube({ version: "v3", auth: client });

  let tmpPath: string | null = null;
  try {
    tmpPath = await downloadVideo(input.videoUrl);
    const title = (input.title || "Untitled").substring(0, 100);
    const description = [
      input.description || "",
      ...(input.tags || []).map(t => (t.startsWith("#") ? t : `#${t}`)),
    ].filter(Boolean).join("\n").substring(0, 5000);

    const res = await youtube.videos.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title,
          description,
          tags: (input.tags || []).map(t => t.replace(/^#/, "")).slice(0, 30),
          categoryId: "22", // People & Blogs
        },
        status: {
          privacyStatus: input.privacyStatus || "public",
          selfDeclaredMadeForKids: false,
        },
      },
      media: { body: fs.createReadStream(tmpPath) },
    });

    const videoId = res.data.id;
    return {
      success: !!videoId,
      videoId: videoId || undefined,
      videoUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : undefined,
      error: videoId ? undefined : "Upload succeeded but no video ID returned",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  } finally {
    if (tmpPath && fs.existsSync(tmpPath)) {
      try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
    }
  }
}

/** Search YouTube channels by keyword via Data API */
export async function searchYouTubeChannels(query: string, maxResults = 20) {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("YOUTUBE_API_KEY or GOOGLE_API_KEY required for channel search");

  const youtube = google.youtube({ version: "v3", auth: apiKey });
  const searchRes = await youtube.search.list({
    part: ["snippet"],
    q: query,
    type: ["channel"],
    maxResults: Math.min(maxResults, 50),
  });

  const channels: Array<{
    platform: "youtube";
    channelId: string;
    username: string;
    name: string;
    bio: string;
    followers: number;
    profileUrl: string;
    profilePic: string;
  }> = [];

  for (const item of searchRes.data.items || []) {
    const channelId = item.snippet?.channelId || item.id?.channelId;
    if (!channelId) continue;

    let subscribers = 0;
    try {
      const detail = await youtube.channels.list({
        part: ["snippet", "statistics"],
        id: [channelId],
      });
      const ch = detail.data.items?.[0];
      subscribers = parseInt(ch?.statistics?.subscriberCount || "0", 10);
      channels.push({
        platform: "youtube",
        channelId,
        username: ch?.snippet?.customUrl?.replace("@", "") || channelId,
        name: ch?.snippet?.title || item.snippet?.title || channelId,
        bio: ch?.snippet?.description || "",
        followers: subscribers,
        profileUrl: `https://www.youtube.com/channel/${channelId}`,
        profilePic: ch?.snippet?.thumbnails?.default?.url || "",
      });
    } catch {
      channels.push({
        platform: "youtube",
        channelId,
        username: channelId,
        name: item.snippet?.title || channelId,
        bio: item.snippet?.description || "",
        followers: 0,
        profileUrl: `https://www.youtube.com/channel/${channelId}`,
        profilePic: item.snippet?.thumbnails?.default?.url || "",
      });
    }
  }

  return channels;
}

/** Open Google/YouTube signup — user completes verification manually (local dev only) */
export async function launchYouTubeSignup(email: string, _password: string): Promise<{ success: boolean; message: string }> {
  const isServer = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV === "production";
  if (isServer) {
    return {
      success: true,
      message: `Account saved. Create a Google account at https://accounts.google.com/signup using ${email}, enable YouTube channel, then click Connect with Google in Jarvis.`,
    };
  }

  try {
    const browser = await chromium.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.goto("https://accounts.google.com/signup", { waitUntil: "domcontentloaded", timeout: 30_000 });

    try {
      const emailInput = page.locator('input[type="email"]').first();
      await emailInput.waitFor({ timeout: 8000 });
      await emailInput.fill(email);
    } catch { /* UI may vary */ }

    return {
      success: true,
      message: "Browser opened — complete Google signup, create YouTube channel, then Connect with Google in Jarvis.",
    };
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : String(err) };
  }
}
