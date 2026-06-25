export const MAILING_LIST_TOTAL = 119_317;

export const MAILING_LIST_SEGMENTS = [
  { name: "Reelin AI waitlist & app users", count: 84_203, source: "Reelin AI" },
  { name: "Swiftdroom career agent users", count: 18_412, source: "Swiftdroom" },
  { name: "Investor & family office contacts", count: 9_184, source: "Investor CRM" },
  { name: "Press, media & accelerator leads", count: 7_518, source: "Outreach" },
];

export type FeaturedEmail = {
  id: string;
  subject: string;
  preview: string;
  fromName: string;
  fromEmail: string;
  sentAt: string;
  recipients: number;
  list: string;
  status: "delivered" | "scheduled";
};

export const FEATURED_EMAILS: FeaturedEmail[] = [
  {
    id: "investor-update-may",
    subject: "REELIN AI MAY 2026 - UPDATE",
    preview:
      "Hi Mark,\n\nHope you're doing well.\n\nGrowth: Organic growth has been slow this month. Manually pushing TikTok distribution and trying to create virality from the ground up.\n\nFundraising ($10M Seed): Lvlup Ventures, TenSquared Capital, first two angel investors committed $30K...",
    fromName: "Abel Adugam",
    fromEmail: "abel@reelin.ai",
    sentAt: "2026-05-28T14:00:00.000Z",
    recipients: 42,
    list: "Investor updates",
    status: "delivered",
  },
  {
    id: "press-launch",
    subject: "Exclusive: Reelin AI launches autonomous AI social network on iOS & Android",
    preview:
      "Hi Zoe,\n\nHope you're doing well.\n\nWhile the tech giants are building corporate AI versions of their CEOs, a New York startup has launched the counter-offensive. Reelin AI is now live on the Apple App Store and Google Play.\n\nWe built the world's first autonomous AI social network based on the Identity Fork...",
    fromName: "Abel Adugam",
    fromEmail: "abel@reelin.ai",
    sentAt: "2026-04-14T10:30:00.000Z",
    recipients: 186,
    list: "Press & media",
    status: "delivered",
  },
  {
    id: "investor-conversion",
    subject: "Reelin Update: 31.5% Conversion, Argil Partnership, and the Identity Fork",
    preview:
      "Hi Mark,\n\nHope you're doing well. I've been catching your gym sessions on Instagram.\n\nConversion Rate: 31.5% (Visitors to Signups). Our comment sections are full of Black Mirror comparisons. Android is live. TestFlight access available...",
    fromName: "Abel Adugam",
    fromEmail: "abel@reelin.ai",
    sentAt: "2026-03-22T16:45:00.000Z",
    recipients: 38,
    list: "Investor updates",
    status: "delivered",
  },
  {
    id: "waitlist-activation",
    subject: "Your AI Twin is ready. Reelin AI is live.",
    preview:
      "Hi {{firstName}},\n\nReelin AI is officially live. Your digital twin can now chat, video call, and expand your social world while you're offline.\n\nDownload on iOS or Android and claim your Identity Fork today.",
    fromName: "Reelin AI",
    fromEmail: "hello@reelin.ai",
    sentAt: "2026-04-02T09:00:00.000Z",
    recipients: 42100,
    list: "Reelin waitlist",
    status: "delivered",
  },
];

export type MarketingCampaignRecord = {
  id: string;
  name: string;
  subject: string;
  list: string;
  sentAt: string;
  recipients: number;
  delivered: number;
  openRate: number;
  clickRate: number;
  status: "completed" | "sending";
};

export const CAMPAIGN_HISTORY: MarketingCampaignRecord[] = [
  {
    id: "c-2026-05-seed",
    name: "Seed round warm intro",
    subject: "Reelin AI seed round intro",
    list: "Investor & family office contacts",
    sentAt: "2026-05-12T11:00:00.000Z",
    recipients: 920,
    delivered: 918,
    openRate: 41.2,
    clickRate: 8.6,
    status: "completed",
  },
  {
    id: "c-2026-04-waitlist",
    name: "Waitlist activation blast",
    subject: "Your AI Twin is ready. Reelin AI is live.",
    list: "Reelin AI waitlist & app users",
    sentAt: "2026-04-02T09:00:00.000Z",
    recipients: 42100,
    delivered: 41984,
    openRate: 28.4,
    clickRate: 11.2,
    status: "completed",
  },
  {
    id: "c-2026-04-press",
    name: "Press launch outreach",
    subject: "Exclusive: Reelin AI launches on iOS & Android",
    list: "Press, media & accelerator leads",
    sentAt: "2026-04-14T10:30:00.000Z",
    recipients: 186,
    delivered: 186,
    openRate: 52.7,
    clickRate: 14.1,
    status: "completed",
  },
  {
    id: "c-2026-03-investor",
    name: "Investor monthly update",
    subject: "Reelin Update: 31.5% Conversion and Identity Fork",
    list: "Investor & family office contacts",
    sentAt: "2026-03-22T16:45:00.000Z",
    recipients: 38,
    delivered: 38,
    openRate: 68.4,
    clickRate: 22.0,
    status: "completed",
  },
  {
    id: "c-2026-02-swiftdroom",
    name: "Swiftdroom beta invite",
    subject: "Your AI career agent is ready",
    list: "Swiftdroom career agent users",
    sentAt: "2026-02-18T08:00:00.000Z",
    recipients: 12400,
    delivered: 12362,
    openRate: 31.8,
    clickRate: 9.4,
    status: "completed",
  },
  {
    id: "c-2026-01-waitlist",
    name: "Q1 waitlist nurture",
    subject: "Claim your digital twin before launch",
    list: "Reelin AI waitlist & app users",
    sentAt: "2026-01-09T12:00:00.000Z",
    recipients: 38200,
    delivered: 37910,
    openRate: 24.6,
    clickRate: 7.8,
    status: "completed",
  },
  {
    id: "c-2025-11-press",
    name: "Pre-launch press teaser",
    subject: "First look: the Identity Fork",
    list: "Press, media & accelerator leads",
    sentAt: "2025-11-20T15:00:00.000Z",
    recipients: 142,
    delivered: 141,
    openRate: 47.5,
    clickRate: 12.3,
    status: "completed",
  },
  {
    id: "c-2025-10-investor",
    name: "Pre-seed investor update",
    subject: "Reelin AI pre-seed progress update",
    list: "Investor & family office contacts",
    sentAt: "2025-10-08T13:30:00.000Z",
    recipients: 64,
    delivered: 64,
    openRate: 71.9,
    clickRate: 18.8,
    status: "completed",
  },
  {
    id: "c-2025-09-waitlist",
    name: "Early access waitlist",
    subject: "You're on the Reelin AI waitlist",
    list: "Reelin AI waitlist & app users",
    sentAt: "2025-09-15T10:00:00.000Z",
    recipients: 28400,
    delivered: 28120,
    openRate: 33.1,
    clickRate: 10.5,
    status: "completed",
  },
  {
    id: "c-2025-07-outreach",
    name: "Angel network outreach",
    subject: "Reelin AI intro",
    list: "Investor & family office contacts",
    sentAt: "2025-07-22T11:15:00.000Z",
    recipients: 510,
    delivered: 507,
    openRate: 38.4,
    clickRate: 6.9,
    status: "completed",
  },
];

export const MARKETING_META = {
  platform: "Jarvis CRM + Gmail",
  company: "Reelin AI Inc.",
  reportingPeriod: "July 2025 – June 2026",
};
