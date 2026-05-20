import axios, { AxiosError } from "axios";
import { ApiResponse, Contact, Campaign, ScrapeJob } from "@/types";
import { getToken } from "./auth";

// All requests go to /api/* on the same domain.
// next.config.ts rewrites them server-side to the Railway backend,
// so there are no CORS issues and no client-side env vars needed.
const api = axios.create({
  baseURL: "/",
  headers: { "Content-Type": "application/json" },
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Intercept errors and surface a useful message
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (!err.response) {
      err.message =
        "Backend unreachable. Check that Railway is deployed and BACKEND_URL is set in Vercel.";
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function login(password: string): Promise<ApiResponse<{ token: string }>> {
  const res = await api.post("/api/auth/login", { password });
  return res.data;
}

// ── Gmail Drafts ──────────────────────────────────────────────────────────────
export async function getDrafts(): Promise<ApiResponse<GmailDraft[]>> {
  const res = await api.get("/api/email/drafts");
  return res.data;
}

export interface GmailDraft {
  id: string;
  subject: string;
  body: string;
  snippet: string;
}

// ── Bulk Send ─────────────────────────────────────────────────────────────────
export async function bulkSend(payload: {
  contacts: Array<{ name: string; email: string; company?: string; title?: string }>;
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
  campaignName?: string;
}): Promise<ApiResponse<{ campaignId: string; contactCount: number }>> {
  const res = await api.post("/api/email/bulk", payload);
  return res.data;
}

export async function checkHealth(): Promise<boolean> {
  try {
    await api.get("/api/health");
    return true;
  } catch {
    return false;
  }
}

// ── Scraping ──────────────────────────────────────────────────────────────────
export async function startScrapeJob(
  url: string,
  source: "crunchbase" | "linkedin" | "twitter" = "crunchbase"
): Promise<ApiResponse<{ jobId: string }>> {
  const res = await api.post("/api/scrape", { url, source });
  return res.data;
}

export async function getScrapeJob(
  jobId: string
): Promise<ApiResponse<ScrapeJob>> {
  const res = await api.get(`/api/scrape/${jobId}`);
  return res.data;
}

export async function getScrapeJobs(): Promise<ApiResponse<ScrapeJob[]>> {
  const res = await api.get("/api/scrape");
  return res.data;
}

// ── Contacts ──────────────────────────────────────────────────────────────────
export async function getContacts(params?: {
  source?: string;
  emailSent?: boolean;
  limit?: number;
}): Promise<ApiResponse<Contact[]>> {
  const res = await api.get("/api/contacts", { params });
  return res.data;
}

export async function createContact(
  contact: Omit<Contact, "id">
): Promise<ApiResponse<Contact>> {
  const res = await api.post("/api/contacts", contact);
  return res.data;
}

export async function updateContact(
  id: string,
  updates: Partial<Contact>
): Promise<ApiResponse<Contact>> {
  const res = await api.patch(`/api/contacts/${id}`, updates);
  return res.data;
}

export async function deleteContact(id: string): Promise<ApiResponse<void>> {
  const res = await api.delete(`/api/contacts/${id}`);
  return res.data;
}

export async function deleteContacts(
  ids: string[]
): Promise<ApiResponse<void>> {
  const res = await api.delete("/api/contacts", { data: { ids } });
  return res.data;
}

// ── Email ──────────────────────────────────────────────────────────────────────
export async function sendSingleEmail(payload: {
  to: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
}): Promise<ApiResponse<{ messageId: string }>> {
  const res = await api.post("/api/email/send", payload);
  return res.data;
}

export async function createCampaign(payload: {
  name: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
  contactIds: string[];
}): Promise<ApiResponse<{ campaignId: string; contactCount: number }>> {
  const res = await api.post("/api/email/campaigns", payload);
  return res.data;
}

export async function getCampaigns(): Promise<ApiResponse<Campaign[]>> {
  const res = await api.get("/api/email/campaigns");
  return res.data;
}

export async function getCampaign(
  id: string
): Promise<ApiResponse<Campaign>> {
  const res = await api.get(`/api/email/campaigns/${id}`);
  return res.data;
}
