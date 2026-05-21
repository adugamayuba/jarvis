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
export async function login(password: string): Promise<ApiResponse<{ token: string }>> {
  const res = await api.post("/api/auth/login", { password });
  return res.data;
}

// ── Health ────────────────────────────────────────────────────────────────────
export async function checkHealth(): Promise<boolean> {
  try { await api.get("/api/health"); return true; } catch { return false; }
}

// ── Scraping ──────────────────────────────────────────────────────────────────
export async function startScrapeJob(url: string, source: "crunchbase" | "linkedin" | "twitter" = "crunchbase"): Promise<ApiResponse<{ jobId: string }>> {
  const res = await api.post("/api/scrape", { url, source });
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
  status: "running" | "completed" | "failed";
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

export async function getApolloJobs(): Promise<ApiResponse<EmailFinderJob[]>> {
  const res = await api.get("/api/import/apollo-enrich");
  return res.data;
}
