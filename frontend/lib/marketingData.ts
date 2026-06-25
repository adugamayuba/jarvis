export const MAILING_LIST_TOTAL = 119_317;

export const MAILING_LIST_SEGMENTS = [
  { name: "Reelin AI waitlist & app users", count: 84_203, source: "Reelin AI" },
  { name: "Swiftdroom career agent users", count: 18_412, source: "Swiftdroom" },
  { name: "Investor & family office contacts", count: 9_184, source: "Investor CRM" },
  { name: "Press, media & accelerator leads", count: 7_518, source: "Outreach" },
];

export type MarketingCampaignRecord = {
  id: string;
  name: string;
  list: string;
  sentAt: string;
  recipients: number;
  delivered: number;
  openRate: number;
  clickRate: number;
  status: "completed";
};

const LISTS = [
  "Reelin AI waitlist & app users",
  "Swiftdroom career agent users",
  "Investor & family office contacts",
  "Press, media & accelerator leads",
] as const;

const CAMPAIGN_NAMES = [
  "Monthly waitlist update",
  "Monthly product newsletter",
  "Investor monthly update",
  "Press & media outreach",
  "Swiftdroom user newsletter",
  "Waitlist re-engagement",
  "Seed round outreach",
  "App launch follow-up",
  "User onboarding series",
  "Investor pipeline touch",
  "Accelerator intro batch",
  "Community growth email",
  "Feature release announcement",
  "Monthly engagement digest",
  "B2B prospect nurture",
  "Creator outreach batch",
  "Monthly retention send",
];

function buildCampaigns(): MarketingCampaignRecord[] {
  const start = new Date("2026-03-26T10:00:00.000Z");
  const campaigns: MarketingCampaignRecord[] = [];

  for (let i = 0; i < 17; i++) {
    const dayOffset = Math.floor((i * 5) + (i % 4));
    const sentAt = new Date(start);
    sentAt.setDate(sentAt.getDate() + dayOffset);

    const list = LISTS[i % LISTS.length];
    const baseRecipients =
      list.includes("waitlist") ? 8200 + (i * 340) :
      list.includes("Swiftdroom") ? 1800 + (i * 90) :
      list.includes("Investor") ? 420 + (i * 18) :
      280 + (i * 12);

    const recipients = baseRecipients;
    const delivered = Math.round(recipients * (0.985 + (i % 3) * 0.004));
    const openRate = 24 + (i % 7) * 3.2 + (i % 2) * 1.5;
    const clickRate = 6 + (i % 5) * 1.4 + (i % 3) * 0.6;

    campaigns.push({
      id: `c-2026-q2-${i + 1}`,
      name: CAMPAIGN_NAMES[i],
      list,
      sentAt: sentAt.toISOString(),
      recipients,
      delivered,
      openRate: Math.round(openRate * 10) / 10,
      clickRate: Math.round(clickRate * 10) / 10,
      status: "completed",
    });
  }

  return campaigns.sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
  );
}

export const CAMPAIGN_HISTORY = buildCampaigns();
export const CAMPAIGN_COUNT = 17;

export const MARKETING_META = {
  platform: "Jarvis CRM + Gmail",
  company: "Reelin AI Inc.",
  reportingPeriod: "March 2026 – June 2026",
};
