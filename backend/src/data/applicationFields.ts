/**
 * Approved accelerator form answers — matched by label before AI fallback.
 * Source: SOSV application (May 2026), verified by Abel.
 */
import { SOSV_APPLICATION_FORM } from "./sosvApplication";

const { contact, company, founders, answers } = SOSV_APPLICATION_FORM;

export const FORM_FIELD_MAP: Record<string, string> = {
  // Contact
  "first name": contact.firstName,
  "last name": contact.lastName,
  "contact email": contact.email,
  "enter email": contact.email,
  "confirm email": contact.email,

  // Company
  "company name": company.name,
  "website": company.website,
  "description, in 140 characters": company.tagline140,
  "description in 140 characters": company.tagline140,
  "140 characters": company.tagline140,
  "one-liner": company.tagline140,
  "one liner": company.tagline140,
  "location": company.city,
  "city": company.city,
  "state / province / region": company.state,
  "state": company.state,
  "country": company.country,

  // SOSV / accelerator long-form (exact question labels)
  "where is your team currently located? (current location doesn't affect application)":
    answers.teamLocations,
  "where is your team currently located": answers.teamLocations,
  "team location": answers.teamLocations,

  "what is the availability of the founders to attend the program? please elaborate any potential conflicts":
    answers.founderAvailability,
  "founder availability": answers.founderAvailability,

  "choose the sosv program you would like to apply for.": answers.sosvProgram,
  "choose the sosv program you would like to apply for": answers.sosvProgram,
  "sosv program": answers.sosvProgram,

  "what problem are you working to solve?": answers.problem,

  "optional video pitch, maximum 5 minutes. present yourself, your idea, your product. have fun!":
    answers.videoPitch,
  "optional video pitch": answers.videoPitch,
  "video pitch": answers.videoPitch,

  "what is the basis of your technological solution?": answers.technologicalBasis,

  "what is your team's experience working on this technology?": answers.teamExperience,
  "what is your teams experience working on this technology?": answers.teamExperience,

  "do you have patents or intellectual property for this technology?": answers.patentsAndIP,

  "who do you think your primary customer is?": answers.primaryCustomer,

  "have you already or how do you plan to reach your customer?": answers.customerAcquisition,

  "describe your team's ability (role, skills, education, etc) to form or attract an audience, users, or customers.":
    answers.teamAudienceAbility,
  "describe your teams ability (role, skills, education, etc) to form or attract an audience, users, or customers.":
    answers.teamAudienceAbility,

  "how will your business make money?": answers.businessModel,

  "have you taken any outside investment and, if so, where did it come from?": answers.outsideInvestment,

  "why should we choose your company?": answers.whyChooseUs,

  "please provide us with a link to your deck": answers.pitchDeck,
  "pitch deck": answers.pitchDeck,
  "deck link": answers.pitchDeck,

  "referral details": answers.referralDetails,
};

export interface FieldMatchContext {
  fieldIndex?: number;
  allFields?: Array<{ label: string; name?: string; type?: string }>;
}

/** Normalize a form label for lookup */
function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Count founder blocks before this field index (for repeated Name/Email/Title/LinkedIn fields) */
function getFounderIndex(ctx?: FieldMatchContext): number | null {
  if (!ctx?.allFields || ctx.fieldIndex === undefined) return null;

  const founderLabels = ["name", "title", "email", "linkedin"];
  let founderBlock = 0;

  for (let i = 0; i < ctx.fieldIndex; i++) {
    const label = normalizeLabel(ctx.allFields[i]?.label || "");
    if (founderLabels.some(k => label === k || label.startsWith(k + " "))) {
      if (label.startsWith("name") || label === "name") founderBlock++;
    }
  }

  // Name fields: 0 = Abel, 1 = Ligia
  const currentLabel = normalizeLabel(ctx.allFields[ctx.fieldIndex]?.label || "");
  if (currentLabel.startsWith("name") || currentLabel === "name") {
    return founderBlock;
  }

  // For title/email/linkedin — find which founder block we're in by scanning backwards
  for (let i = ctx.fieldIndex; i >= 0; i--) {
    const label = normalizeLabel(ctx.allFields[i]?.label || "");
    if (label.startsWith("name") || label === "name") {
      let block = 0;
      for (let j = 0; j < i; j++) {
        const l = normalizeLabel(ctx.allFields[j]?.label || "");
        if (l.startsWith("name") || l === "name") block++;
      }
      return block;
    }
  }

  return null;
}

function matchFounderField(normalized: string, ctx?: FieldMatchContext): string | null {
  const idx = getFounderIndex(ctx);
  if (idx === null) return null;

  const founder = founders[idx];
  if (!founder) return null;

  if (normalized.startsWith("name") || normalized === "name") return founder.name;
  if (normalized.startsWith("title") || normalized === "title") return founder.title;
  if (normalized.startsWith("email") || normalized === "email") return founder.email;
  if (normalized.includes("linkedin")) return founder.linkedIn;

  return null;
}

/** Match a form field label to an approved value */
export function matchFormField(
  label: string,
  name?: string,
  placeholder?: string,
  ctx?: FieldMatchContext
): string | null {
  const normalized = normalizeLabel(label);
  if (!normalized && name) return matchFormField(name, undefined, placeholder, ctx);

  // Exact match first
  if (FORM_FIELD_MAP[normalized]) return FORM_FIELD_MAP[normalized];

  // Positional founder matching (Name/Title/Email/LinkedIn blocks)
  const founderMatch = matchFounderField(normalized, ctx);
  if (founderMatch) return founderMatch;

  // Longest partial key match — avoids short keys hijacking unrelated fields
  let bestKey = "";
  let bestValue: string | null = null;
  for (const [key, value] of Object.entries(FORM_FIELD_MAP)) {
    if (key.length < 12) continue; // skip ambiguous short keys in partial match
    if (normalized.includes(key) && key.length > bestKey.length) {
      bestKey = key;
      bestValue = value;
    }
  }
  if (bestValue) return bestValue;

  // Short exact keys only (city, website, country, etc.)
  for (const [key, value] of Object.entries(FORM_FIELD_MAP)) {
    if (key.length >= 12) continue;
    if (normalized === key) return value;
  }

  // Co-founder context from name/placeholder hints
  const haystack = `${normalized} ${name || ""} ${placeholder || ""}`.toLowerCase();
  if (haystack.includes("ligia") || haystack.includes("co-founder") || haystack.includes("cofounder")) {
    if (haystack.includes("email")) return founders[1].email;
    if (haystack.includes("title")) return founders[1].title;
    if (haystack.includes("linkedin")) return founders[1].linkedIn;
    if (haystack.includes("name")) return founders[1].name;
  }

  if (haystack.includes("abel") || haystack.includes("founder & ceo")) {
    if (haystack.includes("email")) return founders[0].email;
    if (haystack.includes("title")) return founders[0].title;
    if (haystack.includes("linkedin")) return founders[0].linkedIn;
    if (haystack.includes("name")) return founders[0].name;
  }

  return null;
}

export { getSosvKnowledgeText } from "./sosvApplication";

export const SOSV_APPLICATION_KNOWLEDGE = `
SOSV APPLICATION (approved May 2026 — use verbatim for SOSV forms):
- Contact: Abel Adugam, abel@reelin.ai
- Company: Reelin AI, https://reelin.ai, New York, United States
- 140-char: Autonomous AI social network creating digital replicas & AI Twins of users.
- Founders: Abel Adugam (Founder & CEO, abel@reelin.ai, https://adugam.com) + Ligia Tica (Co-founder & Operations, ligia@reelin.ai, https://www.linkedin.com/in/ligia-t-8b4630225/)
- Team locations: New York, NY and Washington, D.C.
- Founder availability: Both full-time, no conflicts
- SOSV program: Both
- Problem: Humans bottlenecked by time/bandwidth; passive chat wrappers fail. Reelin fixes via identity forking — autonomous AI twins, zero manual control, 24/7 human extension.
- Tech: Proprietary parallel simulation architecture, synthetic social graph, vertically integrated custom inference engine for millions of parallel agent simulations.
- Team: Abel ex-CTO, Versuspay exit; Ligia early investor 4 years ago; 1 year building identity forking architecture (not API wrappers).
- IP: NO formal patents filed. Moat = simulation architecture + inference engine + network effects + user data loop.
- Customer: Digital-first creators, executives, high-influence individuals bottlenecked by time/bandwidth.
- GTM: Product viral loops, each twin = acquisition node, 251 users zero marketing spend, PR leveraging Mark Cuban.
- Revenue: Tiered subscriptions + brand integration + enterprise licensing; $100M+ ARR in 5 years.
- Funding: $100K pre-seed Mark Cuban; raising $10M seed, $500K soft-circled.
- Why us: 251 organic users, Mark Cuban backing, proprietary architecture, proven founder velocity (Versuspay exit).
- Deck: https://docsend.com/view/raru36axy8gftwb4
- Video pitch: leave empty unless Abel provides a URL
- NEVER swap first/last name (Abel / Adugam)
- NEVER claim patents exist
`;
