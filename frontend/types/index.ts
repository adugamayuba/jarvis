export const PRESS_OUTLET_IDS = [
  "techcrunch",
  "businessinsider",
  "theverge",
  "wired",
  "arstechnica",
  "venturebeat",
  "fastcompany",
  "fortune",
  "cnbc",
  "axios",
  "semafor",
  "mashable",
  "engadget",
  "gizmodo",
  "vox",
] as const;

export type PressOutletId = (typeof PRESS_OUTLET_IDS)[number];

export type NonPressContactSource =
  | "crunchbase"
  | "linkedin"
  | "twitter"
  | "instagram"
  | "facebook"
  | "tiktok"
  | "manual"
  | "extension";

export type ContactSource = NonPressContactSource | PressOutletId;

export interface Contact {
  id: string;
  name: string;
  email: string;
  emails?: string[];
  apolloEmails?: string[];
  oneLiner: string;
  title?: string;
  company?: string;
  linkedinUrl?: string;
  crunchbaseUrl?: string;
  profileImageUrl?: string;
  source: ContactSource;
  audience?: "investor" | "journalist" | "swiftdroom-b2c" | "swiftdroom-b2b";
  tags?: string[];
  emailSent?: boolean;
  emailSentAt?: string;
  campaignId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  fromName: string;
  fromEmail: string;
  contactIds: string[];
  status: "draft" | "sending" | "sent" | "failed";
  sentCount?: number;
  failedCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type ScrapeJobSource =
  | "crunchbase"
  | "linkedin"
  | "twitter"
  | "social_google"
  | "press_all"
  | PressOutletId;

export interface ScrapeJob {
  id: string;
  url: string;
  source: ScrapeJobSource;
  status: "pending" | "running" | "completed" | "failed";
  contactsFound?: number;
  error?: string;
  keyword?: string;
  emailDomain?: string;
  platforms?: string[];
  pressResults?: Record<string, number>;
  createdAt?: string;
  completedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
