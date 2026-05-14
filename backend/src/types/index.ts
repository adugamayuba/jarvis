export interface Contact {
  id?: string;
  name: string;
  email?: string;
  oneLiner?: string;
  title?: string;
  company?: string;
  linkedinUrl?: string;
  crunchbaseUrl?: string;
  profileImageUrl?: string;
  source: "crunchbase" | "linkedin" | "twitter" | "manual";
  tags?: string[];
  emailSent?: boolean;
  emailSentAt?: string;
  campaignId?: string;
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
