import axios from "axios";
import { ApiResponse } from "@/types";
import { getToken } from "./auth";
import { getDirectApiUrl } from "./apiBase";

const portalApi = axios.create({
  baseURL: "/",
  headers: { "Content-Type": "application/json" },
});

portalApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export type PortalStage = "prospect" | "discussing" | "safe_sent" | "safe_signed" | "closed";
export type SafeStatus = "draft" | "sent" | "signed" | "funded";
export type CapTableHolderType = "founder" | "investor" | "advisor" | "option_pool" | "parent" | "other";
export type CapTableInstrument = "common" | "preferred" | "safe" | "convertible_note" | "options";
export type CapTableStatus = "active" | "pending" | "discussing" | "negotiating";
export type DataRoomCategory = "financials" | "legal" | "product" | "pitch" | "wire" | "other";

export interface PortalUser {
  id: string;
  email: string;
  name: string;
  company?: string;
  investorId?: string;
  stage: PortalStage;
  lastConversation?: string;
  investmentAmount?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface CapTableEntry {
  id: string;
  holderName: string;
  holderType: CapTableHolderType;
  company?: string;
  email?: string;
  portalUserId?: string;
  ownershipPct?: number;
  shares?: number;
  sharesLabel?: string;
  investmentAmount?: number;
  valuationAtInvestment?: number;
  websiteUrl?: string;
  instrument: CapTableInstrument;
  status: CapTableStatus;
  visible: boolean;
  notes?: string;
  description?: string;
  sortOrder?: number;
  profileImageUrl?: string;
}

export interface InvestorSafe {
  id: string;
  portalUserId: string;
  investorName: string;
  amount: number;
  valuationCap?: number;
  discount?: number;
  status: SafeStatus;
  signedAt?: string;
  safeNotes?: string;
  documentTitle?: string;
  documentUrl?: string;
  hasDocument?: boolean;
}

export interface DataRoomDoc {
  id: string;
  title: string;
  description?: string;
  category: DataRoomCategory;
  visibility: "all" | "specific";
  allowedPortalUserIds?: string[];
  documentUrl?: string;
  hasFile?: boolean;
  sizeBytes?: number;
  uploadedAt: string;
}

export interface PortalDashboard {
  profile: {
    name: string;
    email: string;
    company: string;
    stage: PortalStage;
    lastConversation: string;
    investmentAmount: number;
  };
  safe: {
    id: string;
    amount: number;
    valuationCap?: number;
    discount?: number;
    status: SafeStatus;
    signedAt?: string;
    safeNotes?: string;
    documentTitle?: string;
    documentUrl?: string;
    hasDocument: boolean;
  } | null;
  capTable: CapTableEntry[];
  dataRoomCount: number;
}

export async function portalLogin(email: string, password: string): Promise<ApiResponse<{
  token: string;
  role: string;
  portalUserId: string;
  name: string;
  email: string;
  company: string;
  stage: PortalStage;
}>> {
  const res = await portalApi.post("/api/auth/portal-login", { email, password });
  return res.data;
}

export async function getPortalDashboard(): Promise<ApiResponse<PortalDashboard>> {
  const res = await portalApi.get("/api/portal/dashboard");
  return res.data;
}

export async function getPortalCapTable(): Promise<ApiResponse<CapTableEntry[]>> {
  const res = await portalApi.get("/api/portal/cap-table");
  return res.data;
}

export async function getPortalDataRoom(): Promise<ApiResponse<DataRoomDoc[]>> {
  const res = await portalApi.get("/api/portal/data-room");
  return res.data;
}

export async function getPortalMySafe(): Promise<ApiResponse<InvestorSafe | null>> {
  const res = await portalApi.get("/api/portal/my-safe");
  return res.data;
}

export async function getPortalWireInstructions(): Promise<ApiResponse<DataRoomDoc[]>> {
  const res = await portalApi.get("/api/portal/wire-instructions");
  return res.data;
}

export async function downloadPortalFile(path: string): Promise<ApiResponse<{
  type: "url" | "base64";
  url?: string;
  content?: string;
  mimeType?: string;
  title?: string;
}>> {
  const res = await portalApi.get(path);
  return res.data;
}

// Admin portal management
export async function getPortalUsers(): Promise<ApiResponse<PortalUser[]>> {
  const res = await portalApi.get("/api/portal/admin/users");
  return res.data;
}

export async function createPortalUser(data: {
  email: string;
  password?: string;
  name: string;
  company?: string;
  investorId?: string;
  stage?: PortalStage;
  lastConversation?: string;
  investmentAmount?: number;
}): Promise<ApiResponse<PortalUser & { credentials: { email: string; password: string } }>> {
  const res = await portalApi.post("/api/portal/admin/users", data);
  return res.data;
}

export async function updatePortalUser(id: string, updates: Partial<PortalUser>): Promise<ApiResponse<PortalUser>> {
  const res = await portalApi.patch(`/api/portal/admin/users/${id}`, updates);
  return res.data;
}

export async function resetPortalPassword(id: string, password?: string): Promise<ApiResponse<{ email: string; password: string }>> {
  const res = await portalApi.post(`/api/portal/admin/users/${id}/reset-password`, { password });
  return res.data;
}

export async function deletePortalUser(id: string): Promise<ApiResponse<void>> {
  const res = await portalApi.delete(`/api/portal/admin/users/${id}`);
  return res.data;
}

export async function getAdminCapTable(): Promise<ApiResponse<CapTableEntry[]>> {
  const res = await portalApi.get("/api/portal/admin/cap-table");
  return res.data;
}

export async function createCapTableEntry(data: Omit<CapTableEntry, "id">): Promise<ApiResponse<CapTableEntry>> {
  const res = await portalApi.post("/api/portal/admin/cap-table", data);
  return res.data;
}

export async function updateCapTableEntry(id: string, updates: Partial<CapTableEntry>): Promise<ApiResponse<CapTableEntry>> {
  const res = await portalApi.patch(`/api/portal/admin/cap-table/${id}`, updates);
  return res.data;
}

export async function deleteCapTableEntry(id: string): Promise<ApiResponse<void>> {
  const res = await portalApi.delete(`/api/portal/admin/cap-table/${id}`);
  return res.data;
}

export async function getAdminSafes(): Promise<ApiResponse<InvestorSafe[]>> {
  const res = await portalApi.get("/api/portal/admin/safes");
  return res.data;
}

export async function createSafe(data: Omit<InvestorSafe, "id">): Promise<ApiResponse<InvestorSafe>> {
  const res = await portalApi.post("/api/portal/admin/safes", data);
  return res.data;
}

export async function updateSafe(id: string, updates: Partial<InvestorSafe>): Promise<ApiResponse<InvestorSafe>> {
  const res = await portalApi.patch(`/api/portal/admin/safes/${id}`, updates);
  return res.data;
}

export async function deleteSafe(id: string): Promise<ApiResponse<void>> {
  const res = await portalApi.delete(`/api/portal/admin/safes/${id}`);
  return res.data;
}

export async function uploadSafeFile(id: string, file: File): Promise<ApiResponse<{ id: string; documentTitle: string }>> {
  const form = new FormData();
  form.append("file", file);
  const res = await axios.post(getDirectApiUrl(`/api/portal/admin/safes/${id}/upload`), form, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.data;
}

export async function getAdminDataRoom(): Promise<ApiResponse<DataRoomDoc[]>> {
  const res = await portalApi.get("/api/portal/admin/data-room");
  return res.data;
}

export async function createDataRoomDoc(data: {
  title: string;
  description?: string;
  category?: DataRoomCategory;
  visibility?: "all" | "specific";
  allowedPortalUserIds?: string[];
  documentUrl?: string;
}): Promise<ApiResponse<DataRoomDoc>> {
  const res = await portalApi.post("/api/portal/admin/data-room", data);
  return res.data;
}

export async function updateDataRoomDoc(id: string, updates: Partial<DataRoomDoc>): Promise<ApiResponse<DataRoomDoc>> {
  const res = await portalApi.patch(`/api/portal/admin/data-room/${id}`, updates);
  return res.data;
}

export async function deleteDataRoomDoc(id: string): Promise<ApiResponse<void>> {
  const res = await portalApi.delete(`/api/portal/admin/data-room/${id}`);
  return res.data;
}

export async function uploadDataRoomFile(id: string, file: File): Promise<ApiResponse<{ id: string; sizeBytes: number }>> {
  const form = new FormData();
  form.append("file", file);
  const res = await axios.post(getDirectApiUrl(`/api/portal/admin/data-room/${id}/upload`), form, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.data;
}

export function openPortalFile(data: { type: "url" | "base64"; url?: string; content?: string; mimeType?: string; title?: string }) {
  if (data.type === "url" && data.url) {
    window.open(data.url, "_blank");
    return;
  }
  if (data.type === "base64" && data.content) {
    const blob = new Blob([Uint8Array.from(atob(data.content), c => c.charCodeAt(0))], {
      type: data.mimeType || "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }
}
