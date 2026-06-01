export interface Contact {
  id?: string;
  name: string;
  email?: string;            // primary email
  emails?: string[];         // all known emails
  apolloEmails?: string[];   // emails from Apollo specifically
  oneLiner?: string;
  title?: string;
  company?: string;
  linkedinUrl?: string;
  crunchbaseUrl?: string;
  profileImageUrl?: string;
  source: "crunchbase" | "linkedin" | "twitter" | "manual" | "extension";
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

export interface ScrapeJob {
  id?: string;
  url: string;
  source: "crunchbase" | "linkedin" | "twitter";
  status: "pending" | "running" | "completed" | "failed";
  contactsFound?: number;
  apifyRunId?: string;
  error?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
