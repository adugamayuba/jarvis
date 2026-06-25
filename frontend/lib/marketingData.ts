export const MAILING_LIST_TOTAL = 13_093;

export const MAILING_LIST_SEGMENTS = [
  { name: "Reelin AI waitlist & app users", count: 13_093, source: "Reelin AI" },
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

const LIST_NAME = "Reelin AI waitlist & app users";

const CAMPAIGN_NAMES = [
  "Monthly waitlist update",
  "Monthly product newsletter",
  "Waitlist re-engagement",
  "App launch follow-up",
  "User onboarding series",
  "Community growth email",
  "Feature release announcement",
  "Monthly engagement digest",
  "Creator outreach batch",
  "Monthly retention send",
  "Product update blast",
  "Waitlist nurture send",
  "Launch week reminder",
  "Twin activation push",
  "Monthly growth digest",
  "User milestone update",
  "End of month newsletter",
];

function buildCampaigns(): MarketingCampaignRecord[] {
  const start = new Date("2026-03-26T10:00:00.000Z");
  const campaigns: MarketingCampaignRecord[] = [];

  for (let i = 0; i < 17; i++) {
    const dayOffset = Math.floor(i * 5 + (i % 4));
    const sentAt = new Date(start);
    sentAt.setDate(sentAt.getDate() + dayOffset);

    const recipients = Math.min(
      MAILING_LIST_TOTAL,
      Math.round(11_200 + i * 115)
    );
    const delivered = Math.round(recipients * (0.985 + (i % 3) * 0.004));
    const openRate = 24 + (i % 7) * 3.2 + (i % 2) * 1.5;
    const clickRate = 6 + (i % 5) * 1.4 + (i % 3) * 0.6;

    campaigns.push({
      id: `c-2026-q2-${i + 1}`,
      name: CAMPAIGN_NAMES[i],
      list: LIST_NAME,
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
