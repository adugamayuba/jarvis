/**
 * Approved form answers — matched by label before AI fallback.
 * Built from verified Q&A training data.
 */
import {
  REELIN_CONTACT,
  REELIN_COMPANY,
  REELIN_FOUNDERS,
  buildQaFieldMap,
  getTrainingKnowledgeText,
} from "./trainingData";

const qaMap = buildQaFieldMap();

export const FORM_FIELD_MAP: Record<string, string> = {
  // Contact
  "first name": REELIN_CONTACT.firstName,
  "last name": REELIN_CONTACT.lastName,
  "contact email": REELIN_CONTACT.email,
  "enter email": REELIN_CONTACT.email,
  "confirm email": REELIN_CONTACT.email,

  // Company
  "company name": REELIN_COMPANY.name,
  "website": REELIN_COMPANY.website,
  "description, in 140 characters": REELIN_COMPANY.tagline140,
  "description in 140 characters": REELIN_COMPANY.tagline140,
  "140 characters": REELIN_COMPANY.tagline140,
  "one-liner": REELIN_COMPANY.tagline140,
  "one liner": REELIN_COMPANY.tagline140,
  "location": REELIN_COMPANY.city,
  "city": REELIN_COMPANY.city,
  "state / province / region": REELIN_COMPANY.state,
  "state": REELIN_COMPANY.state,
  "country": REELIN_COMPANY.country,

  // Common alternate phrasings for training Q&A
  "team location": qaMap["where is your team currently located? (current location doesn't affect application)"] || "",
  "founder availability": qaMap["what is the availability of the founders to attend the program? please elaborate any potential conflicts"] || "",
  "optional video pitch, maximum 5 minutes. present yourself, your idea, your product. have fun!": "",
  "optional video pitch": "",
  "video pitch": "",
  "pitch deck": qaMap["please provide us with a link to your deck"] || "",
  "deck link": qaMap["please provide us with a link to your deck"] || "",
  "referral details": "",

  ...qaMap,
};

export interface FieldMatchContext {
  fieldIndex?: number;
  allFields?: Array<{ label: string; name?: string; type?: string }>;
}

function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/\*/g, "").replace(/\s+/g, " ").trim();
}

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

  const currentLabel = normalizeLabel(ctx.allFields[ctx.fieldIndex]?.label || "");
  if (currentLabel.startsWith("name") || currentLabel === "name") {
    return founderBlock;
  }

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

  const founder = REELIN_FOUNDERS[idx];
  if (!founder) return null;

  if (normalized.startsWith("name") || normalized === "name") return founder.name;
  if (normalized.startsWith("title") || normalized === "title") return founder.title;
  if (normalized.startsWith("email") || normalized === "email") return founder.email;
  if (normalized.includes("linkedin")) return founder.linkedIn;

  return null;
}

export function matchFormField(
  label: string,
  name?: string,
  placeholder?: string,
  ctx?: FieldMatchContext
): string | null {
  const normalized = normalizeLabel(label);
  if (!normalized && name) return matchFormField(name, undefined, placeholder, ctx);

  if (FORM_FIELD_MAP[normalized]) return FORM_FIELD_MAP[normalized];

  const founderMatch = matchFounderField(normalized, ctx);
  if (founderMatch) return founderMatch;

  let bestKey = "";
  let bestValue: string | null = null;
  for (const [key, value] of Object.entries(FORM_FIELD_MAP)) {
    if (key.length < 12) continue;
    if (normalized.includes(key) && key.length > bestKey.length) {
      bestKey = key;
      bestValue = value;
    }
  }
  if (bestValue) return bestValue;

  for (const [key, value] of Object.entries(FORM_FIELD_MAP)) {
    if (key.length >= 12) continue;
    if (normalized === key) return value;
  }

  const haystack = `${normalized} ${name || ""} ${placeholder || ""}`.toLowerCase();
  if (haystack.includes("ligia") || haystack.includes("co-founder") || haystack.includes("cofounder")) {
    if (haystack.includes("email")) return REELIN_FOUNDERS[1].email;
    if (haystack.includes("title")) return REELIN_FOUNDERS[1].title;
    if (haystack.includes("linkedin")) return REELIN_FOUNDERS[1].linkedIn;
    if (haystack.includes("name")) return REELIN_FOUNDERS[1].name;
  }

  if (haystack.includes("abel") || haystack.includes("founder & ceo")) {
    if (haystack.includes("email")) return REELIN_FOUNDERS[0].email;
    if (haystack.includes("title")) return REELIN_FOUNDERS[0].title;
    if (haystack.includes("linkedin")) return REELIN_FOUNDERS[0].linkedIn;
    if (haystack.includes("name")) return REELIN_FOUNDERS[0].name;
  }

  return null;
}

export { getTrainingKnowledgeText };

export const APPLICATION_KNOWLEDGE = `
VERIFIED APPLICATION Q&A — use these answers verbatim when form questions match:

Contact: Abel Adugam, abel@reelin.ai
Company: Reelin AI, https://reelin.ai, New York, United States
One-liner: Autonomous AI social network creating digital replicas & AI Twins of users.
Founders: Abel Adugam (Founder & CEO, abel@reelin.ai, https://adugam.com) + Ligia Tica (Co-founder & Operations, ligia@reelin.ai, https://www.linkedin.com/in/ligia-t-8b4630225/)

${getTrainingKnowledgeText()}

RULES:
- First Name = Abel, Last Name = Adugam (never swap)
- Video pitch fields = leave empty unless Abel provides a URL
- Do NOT claim patents exist — no formal patents filed yet
- Use full approved answers for textarea questions — never shorten or invent
- Never use em dashes, en dashes, or quotation marks in any output value
`;
