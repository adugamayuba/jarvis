export type OutreachAudience =
  | "investor"
  | "journalist"
  | "swiftdroom-b2c"
  | "swiftdroom-b2b";

export const OUTREACH_AUDIENCES: OutreachAudience[] = [
  "investor",
  "journalist",
  "swiftdroom-b2c",
  "swiftdroom-b2b",
];

export const AUDIENCE_LABELS: Record<OutreachAudience, string> = {
  investor: "Investors",
  journalist: "Journalists",
  "swiftdroom-b2c": "Swiftdroom Users",
  "swiftdroom-b2b": "Swiftdroom Partners",
};

export const AUDIENCE_COLORS: Record<OutreachAudience, string> = {
  investor: "bg-amber-500/10 text-amber-400",
  journalist: "bg-purple-500/10 text-purple-400",
  "swiftdroom-b2c": "bg-sky-500/10 text-sky-400",
  "swiftdroom-b2b": "bg-emerald-500/10 text-emerald-400",
};

/** Infer audience from stored field or legacy tags (matches backend). */
export function inferContactAudience(contact: {
  audience?: OutreachAudience;
  source?: string;
  tags?: string[];
}): OutreachAudience {
  if (contact.audience && OUTREACH_AUDIENCES.includes(contact.audience)) {
    return contact.audience;
  }
  const tags = contact.tags || [];
  if (
    tags.includes("swiftdroom-b2b") ||
    tags.includes("swiftdroom-partner") ||
    tags.includes("swiftdroom-institution")
  ) {
    return "swiftdroom-b2b";
  }
  if (tags.includes("swiftdroom-b2c") || tags.includes("swiftdroom-user")) {
    return "swiftdroom-b2c";
  }
  if (contact.source === "techcrunch" || tags.includes("journalist")) {
    return "journalist";
  }
  return "investor";
}
