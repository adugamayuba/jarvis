export type PortalStage =
  | "prospect"
  | "discussing"
  | "safe_sent"
  | "safe_signed"
  | "closed";

export type CapTableHolderType =
  | "founder"
  | "investor"
  | "advisor"
  | "option_pool"
  | "parent"
  | "other";

export type CapTableInstrument =
  | "common"
  | "preferred"
  | "safe"
  | "convertible_note"
  | "options";

export type CapTableStatus = "active" | "pending" | "discussing";

export type SafeStatus = "draft" | "sent" | "signed" | "funded";

export type DataRoomCategory =
  | "financials"
  | "legal"
  | "product"
  | "pitch"
  | "other";

export interface PortalUser {
  id?: string;
  email: string;
  passwordHash: string;
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
  id?: string;
  holderName: string;
  holderType: CapTableHolderType;
  company?: string;
  email?: string;
  portalUserId?: string;
  ownershipPct?: number;
  shares?: number;
  sharesLabel?: string;
  investmentAmount?: number;
  instrument: CapTableInstrument;
  status: CapTableStatus;
  visible: boolean;
  notes?: string;
  description?: string;
  sortOrder?: number;
  profileImageUrl?: string;
  valuationAtInvestment?: number;
  websiteUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvestorSafe {
  id?: string;
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
  documentBase64?: string;
  documentMimeType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataRoomDocument {
  id?: string;
  title: string;
  description?: string;
  category: DataRoomCategory;
  visibility: "all" | "specific";
  allowedPortalUserIds?: string[];
  documentUrl?: string;
  documentBase64?: string;
  documentMimeType?: string;
  sizeBytes?: number;
  uploadedAt: string;
  updatedAt: string;
}
