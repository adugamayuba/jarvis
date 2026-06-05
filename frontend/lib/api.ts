import axios, { AxiosError } from "axios";
import { ApiResponse, Contact, Campaign, ScrapeJob } from "@/types";
import { getToken } from "./auth";

const api = axios.create({
  baseURL: "/",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (!err.response) {
      err.message = "Backend unreachable. Check Railway is deployed and BACKEND_URL is set in Vercel.";
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function login(password: string): Promise<ApiResponse<{ token: string; role: string }>> {
  const res = await api.post("/api/auth/login", { password });
  return res.data;
}

// ── Health ────────────────────────────────────────────────────────────────────
export async function checkHealth(): Promise<boolean> {
  try { await api.get("/api/health"); return true; } catch { return false; }
}

// ── Swiftdroom ────────────────────────────────────────────────────────────────
export interface SwiftdroomStats {
  totalUsers: number;
  activeSubscribers: number;
  mrr: number;
  arr: number;
  applicationsThisMonth: number;
  planBreakdown: { starter: number; pro: number; business: number };
  syncedAt?: string;
}

export async function getSwiftdroomStats(): Promise<ApiResponse<SwiftdroomStats>> {
  const res = await api.get("/api/swiftdroom/stats");
  return res.data;
}

// ── Scraping ──────────────────────────────────────────────────────────────────
export type ScrapeSource = "crunchbase" | "linkedin" | "social_google" | "techcrunch";

export interface SocialScrapeParams {
  keyword?: string;
  platforms?: Array<"twitter" | "instagram" | "facebook" | "tiktok">;
  maxPagesPerQuery?: number;
  maxProfiles?: number;
}

export async function startScrapeJob(
  url: string,
  source: ScrapeSource = "crunchbase"
): Promise<ApiResponse<{ jobId: string }>> {
  const res = await api.post("/api/scrape", { url, source });
  return res.data;
}

export async function startSocialGoogleScrape(
  params: SocialScrapeParams
): Promise<ApiResponse<{ jobId: string }>> {
  const res = await api.post("/api/scrape", {
    source: "social_google",
    keyword: params.keyword || "angel investor",
    platforms: params.platforms || ["twitter", "instagram"],
    maxPagesPerQuery: params.maxPagesPerQuery ?? 2,
    maxProfiles: params.maxProfiles ?? 150,
  });
  return res.data;
}

export async function startTechCrunchScrape(
  url?: string
): Promise<ApiResponse<{ jobId: string }>> {
  const res = await api.post("/api/scrape", {
    source: "techcrunch",
    url: url || "https://techcrunch.com/about-techcrunch/",
  });
  return res.data;
}

export async function getScrapeJob(jobId: string): Promise<ApiResponse<ScrapeJob>> {
  const res = await api.get(`/api/scrape/${jobId}`);
  return res.data;
}

export async function getScrapeJobs(): Promise<ApiResponse<ScrapeJob[]>> {
  const res = await api.get("/api/scrape");
  return res.data;
}

// ── Contacts ──────────────────────────────────────────────────────────────────
export async function getContacts(params?: { source?: string; emailSent?: boolean; limit?: number }): Promise<ApiResponse<Contact[]>> {
  const res = await api.get("/api/contacts", { params });
  return res.data;
}

export async function createContact(contact: Omit<Contact, "id">): Promise<ApiResponse<Contact>> {
  const res = await api.post("/api/contacts", contact);
  return res.data;
}

export async function updateContact(id: string, updates: Partial<Contact>): Promise<ApiResponse<Contact>> {
  const res = await api.patch(`/api/contacts/${id}`, updates);
  return res.data;
}

export async function deleteContact(id: string): Promise<ApiResponse<void>> {
  const res = await api.delete(`/api/contacts/${id}`);
  return res.data;
}

export async function deleteContacts(ids: string[]): Promise<ApiResponse<void>> {
  const res = await api.delete("/api/contacts", { data: { ids } });
  return res.data;
}

// ── Email ──────────────────────────────────────────────────────────────────────
export async function sendSingleEmail(payload: { to: string; fromName: string; fromEmail: string; subject: string; body: string }): Promise<ApiResponse<{ messageId: string }>> {
  const res = await api.post("/api/email/send", payload);
  return res.data;
}

export async function createCampaign(payload: { name: string; fromName: string; fromEmail: string; subject: string; body: string; contactIds: string[] }): Promise<ApiResponse<{ campaignId: string; contactCount: number }>> {
  const res = await api.post("/api/email/campaigns", payload);
  return res.data;
}

export async function getCampaigns(): Promise<ApiResponse<Campaign[]>> {
  const res = await api.get("/api/email/campaigns");
  return res.data;
}

export async function getCampaign(id: string): Promise<ApiResponse<Campaign>> {
  const res = await api.get(`/api/email/campaigns/${id}`);
  return res.data;
}

// ── Gmail Drafts ──────────────────────────────────────────────────────────────
export interface GmailDraft { id: string; subject: string; body: string; snippet: string; }

export async function getDrafts(): Promise<ApiResponse<GmailDraft[]>> {
  const res = await api.get("/api/email/drafts");
  return res.data;
}

// ── Bulk Send ─────────────────────────────────────────────────────────────────
export async function bulkSend(payload: { contacts: Array<{ name: string; email: string; company?: string; title?: string }>; fromName: string; fromEmail: string; subject: string; body: string; campaignName?: string }): Promise<ApiResponse<{ campaignId: string; contactCount: number }>> {
  const res = await api.post("/api/email/bulk", payload);
  return res.data;
}

// ── AI / Jarvis ───────────────────────────────────────────────────────────────
export interface ChatMessage { role: "user" | "assistant" | "system"; content: string; }
export interface Conversation { id: string; title: string; messages: ChatMessage[]; createdAt: string; updatedAt: string; }

export interface ToolCall { tool: string; args: Record<string, unknown>; result: string; }

export async function sendChat(message: string, conversationId?: string): Promise<ApiResponse<{ reply: string; conversationId: string; toolCalls: ToolCall[] }>> {
  const res = await api.post("/api/ai/chat", { message, conversationId });
  return res.data;
}

export async function getConversations(): Promise<ApiResponse<Conversation[]>> {
  const res = await api.get("/api/ai/conversations");
  return res.data;
}

export async function getConversation(id: string): Promise<ApiResponse<Conversation>> {
  const res = await api.get(`/api/ai/conversations/${id}`);
  return res.data;
}

export async function deleteConversation(id: string): Promise<ApiResponse<void>> {
  const res = await api.delete(`/api/ai/conversations/${id}`);
  return res.data;
}

export async function aiResearch(query: string): Promise<ApiResponse<{ result: string }>> {
  const res = await api.post("/api/ai/research", { query });
  return res.data;
}

// ── Investors ─────────────────────────────────────────────────────────────────
export type InvestorStatus = "prospect" | "contacted" | "interested" | "verbal" | "committed" | "closed" | "passed";

export interface Investor {
  id?: string;
  name: string;
  email?: string;
  company?: string;
  title?: string;
  location?: string;
  status: InvestorStatus;
  amount?: number;
  notes?: string;
  source?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  checkSize?: string;
  round?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InvestorStats {
  total: number;
  committed: number;
  count: number;
  byStatus: Record<string, number>;
}

export async function getInvestors(): Promise<ApiResponse<Investor[]>> {
  const res = await api.get("/api/investors");
  return res.data;
}

export async function createInvestor(investor: Omit<Investor, "id">): Promise<ApiResponse<Investor>> {
  const res = await api.post("/api/investors", investor);
  return res.data;
}

export async function updateInvestor(id: string, updates: Partial<Investor>): Promise<ApiResponse<Investor>> {
  const res = await api.patch(`/api/investors/${id}`, updates);
  return res.data;
}

export async function deleteInvestor(id: string): Promise<ApiResponse<void>> {
  const res = await api.delete(`/api/investors/${id}`);
  return res.data;
}

export async function getInvestorStats(): Promise<ApiResponse<InvestorStats>> {
  const res = await api.get("/api/investors/stats");
  return res.data;
}

// ── Bulk Import ───────────────────────────────────────────────────────────────
export interface CsvContact {
  name: string;
  crunchbaseUrl: string;
  location?: string;
  investorType?: string;
  numInvestments?: number;
  numExits?: number;
}

export interface EmailFinderJob {
  id: string;
  status: "pending" | "finding_linkedin" | "running" | "completed" | "failed" | "cancelled";
  total: number;
  processed: number;
  found: number;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export async function bulkImportContacts(contacts: CsvContact[]): Promise<ApiResponse<{ imported: number; skipped: number; total: number }>> {
  const res = await api.post("/api/import/contacts", { contacts });
  return res.data;
}

export async function startEmailFinder(): Promise<ApiResponse<{ jobId: string }>> {
  const res = await api.post("/api/import/find-emails");
  return res.data;
}

export async function getEmailFinderJob(jobId: string): Promise<ApiResponse<EmailFinderJob>> {
  const res = await api.get(`/api/import/find-emails/${jobId}`);
  return res.data;
}

export async function getEmailFinderJobs(): Promise<ApiResponse<EmailFinderJob[]>> {
  const res = await api.get("/api/import/find-emails");
  return res.data;
}

export async function patchMissingEmails(): Promise<ApiResponse<{ patched: number; total: number }>> {
  const res = await api.post("/api/import/patch-emails");
  return res.data;
}

export async function startApolloEnrich(): Promise<ApiResponse<{ jobId: string }>> {
  const res = await api.post("/api/import/apollo-enrich");
  return res.data;
}

export async function testApolloConnection(): Promise<ApiResponse<{ ok: boolean; message: string }>> {
  const res = await api.get("/api/import/apollo-test");
  return res.data;
}

export async function testHunterConnection(): Promise<ApiResponse<{ ok: boolean; message: string; credits?: number }>> {
  const res = await api.get("/api/import/hunter-test");
  return res.data;
}

export async function cancelApolloJob(jobId: string): Promise<ApiResponse<void>> {
  const res = await api.post(`/api/import/apollo-enrich/${jobId}/cancel`);
  return res.data;
}

export async function cancelEmailFinderJob(jobId: string): Promise<ApiResponse<void>> {
  const res = await api.post(`/api/import/find-emails/${jobId}/cancel`);
  return res.data;
}

export async function getApolloJobs(): Promise<ApiResponse<EmailFinderJob[]>> {
  const res = await api.get("/api/import/apollo-enrich");
  return res.data;
}

// ── UGC / TikTok ──────────────────────────────────────────────────────────────

export interface TikTokAccount {
  id: string;
  username: string;
  displayName: string;
  email: string;
  status: string;
  hasCookies: boolean;
  notes: string;
  postsCount: number;
  createdAt: string;
}

export interface UgcVideo {
  id: string;
  title: string;
  videoUrl: string;
  caption: string;
  hashtags: string[];
  notes: string;
  createdAt: string;
}

export interface UgcPost {
  id: string;
  accountId: string;
  accountUsername: string;
  videoId: string;
  status: string;
  error?: string;
  tiktokUrl?: string;
  createdAt: string;
}

export async function getUgcAccounts(): Promise<ApiResponse<TikTokAccount[]>> {
  const res = await api.get("/api/ugc/accounts");
  return res.data;
}

export async function createUgcAccount(payload: { username: string; email?: string; cookies?: string; notes?: string }): Promise<ApiResponse<{ id: string }>> {
  const res = await api.post("/api/ugc/accounts", payload);
  return res.data;
}

export async function registerTikTokAccount(payload: { email: string; password: string; username?: string; notes?: string }): Promise<ApiResponse<{ id: string }>> {
  const res = await api.post("/api/ugc/accounts/register", payload);
  return res.data;
}

export async function updateUgcAccount(id: string, updates: { cookies?: string; status?: string; notes?: string }): Promise<ApiResponse<void>> {
  const res = await api.patch(`/api/ugc/accounts/${id}`, updates);
  return res.data;
}

export async function getUgcVideos(): Promise<ApiResponse<UgcVideo[]>> {
  const res = await api.get("/api/ugc/videos");
  return res.data;
}

export async function createUgcVideo(payload: { title?: string; videoUrl: string; caption?: string; hashtags?: string[] }): Promise<ApiResponse<{ id: string }>> {
  const res = await api.post("/api/ugc/videos", payload);
  return res.data;
}

export async function createUgcPost(payload: { accountId: string; videoId: string; caption?: string; publishNow?: boolean }): Promise<ApiResponse<{ id: string }>> {
  const res = await api.post("/api/ugc/posts", payload);
  return res.data;
}

export async function bulkUgcPost(payload: { accountIds: string[]; videoId: string; caption?: string }): Promise<ApiResponse<{ postIds: string[]; count: number }>> {
  const res = await api.post("/api/ugc/posts/bulk", payload);
  return res.data;
}

export async function searchUgcCreators(niche: string, maxResults = 30): Promise<ApiResponse<{ jobId: string }>> {
  const res = await api.post("/api/ugc/search-creators", { niche, maxResults });
  return res.data;
}

export interface YouTubeAccount {
  id: string;
  channelId: string;
  channelTitle: string;
  email: string;
  status: string;
  hasOAuth: boolean;
  notes: string;
  postsCount: number;
  createdAt: string;
}

export async function getYouTubeAccounts(): Promise<ApiResponse<YouTubeAccount[]>> {
  const res = await api.get("/api/ugc/youtube/accounts");
  return res.data;
}

export async function getYouTubeOAuthUrl(accountId: string): Promise<ApiResponse<{ authUrl: string }>> {
  const res = await api.get(`/api/ugc/youtube/oauth/connect/${accountId}`);
  return res.data;
}

export async function createYouTubePost(payload: { accountId: string; videoId: string; title?: string; caption?: string; privacyStatus?: string; publishNow?: boolean }): Promise<ApiResponse<{ id: string }>> {
  const res = await api.post("/api/ugc/youtube/posts", payload);
  return res.data;
}

export async function searchYouTubeChannels(query: string): Promise<ApiResponse<{ jobId: string }>> {
  const res = await api.post("/api/ugc/youtube/search-channels", { query });
  return res.data;
}
