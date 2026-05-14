import axios from "axios";
import { ApiResponse, Contact, Campaign, ScrapeJob } from "@/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  headers: { "Content-Type": "application/json" },
});

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
