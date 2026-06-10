import {
  PRESS_OUTLET_IDS,
  PressOutletId,
  ContactSource,
  NON_PRESS_CONTACT_SOURCES,
} from "../lib/pressOutlets";

export type { PressOutletId, ContactSource };
export { PRESS_OUTLET_IDS, NON_PRESS_CONTACT_SOURCES };

export interface Contact {
  id?: string;
  name: string;
  email?: string;
  emails?: string[];
  apolloEmails?: string[];
  oneLiner?: string;
  title?: string;
  company?: string;
  linkedinUrl?: string;
  crunchbaseUrl?: string;
  profileImageUrl?: string;
  source: ContactSource;
  /** Outreach list — contacts never cross audiences (investor / journalist / swiftdroom). */
  audience?: "investor" | "journalist" | "swiftdroom-b2c" | "swiftdroom-b2b";
  tags?: string[];
  emailSent?: boolean;
  emailSentAt?: string;
  campaignId?: string;
  apolloEnriched?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Campaign {
  id?: string;
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
  id?: string;
  url: string;
  source: ScrapeJobSource;
  status: "pending" | "running" | "completed" | "failed";
  contactsFound?: number;
  apifyRunId?: string;
  error?: string;
  keyword?: string;
  emailDomain?: string;
  platforms?: string[];
  /** Per-outlet counts when source is press_all */
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
