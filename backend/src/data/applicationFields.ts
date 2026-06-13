/**
 * Approved form answers — matched by label/context before AI fallback.
 */
import {
  REELIN_CONTACT,
  REELIN_COMPANY,
  REELIN_FOUNDERS,
  TRAINING_QA,
  buildQaFieldMap,
  getTrainingKnowledgeText,
} from "./trainingData";

const qaMap = buildQaFieldMap();

/** Short structural fields only — never fuzzy-match these against long Q&A keys */
const SHORT_FIELD_MAP: Record<string, string> = {
  "first name": REELIN_CONTACT.firstName,
  "last name": REELIN_CONTACT.lastName,
  "contact email": REELIN_CONTACT.email,
  "enter email": REELIN_CONTACT.email,
  "confirm email": REELIN_CONTACT.email,
  "company name": REELIN_COMPANY.name,
  "one-liner": REELIN_COMPANY.tagline140,
  "one liner": REELIN_COMPANY.tagline140,
  "country": REELIN_COMPANY.country,
  "pitch deck": qaMap["please provide us with a link to your deck"] || "",
  "deck link": qaMap["please provide us with a link to your deck"] || "",
  "optional video pitch": "",
  "video pitch": "",
};

export const FORM_FIELD_MAP: Record<string, string> = {
  ...SHORT_FIELD_MAP,
  ...qaMap,
};

export interface FieldMatchContext {
  fieldIndex?: number;
  allFields?: Array<{ label: string; name?: string; type?: string; fieldContext?: string }>;
  fieldContext?: string;
}

const GENERIC_LABELS = /^(textbox|text box|text field|field \d+|input|editable|rich text)$/i;

function normalizeLabel(label: string): string {
  return label.toLowerCase().replace(/\*/g, "").replace(/\s+/g, " ").trim();
}

function buildHaystack(label: string, name?: string, placeholder?: string, ctx?: FieldMatchContext): string {
  const context = (ctx?.fieldContext || "").slice(0, 600);
  return `${normalizeLabel(label)} ${name || ""} ${placeholder || ""} ${context}`.toLowerCase();
}

/** Pick the real question from context when label is generic */
function effectiveLabel(label: string, ctx?: FieldMatchContext): string {
  const normalized = normalizeLabel(label);
  if (!GENERIC_LABELS.test(normalized)) return normalized;

  let best = normalized;
  let bestScore = 0;
  for (const line of (ctx?.fieldContext || "").split("\n")) {
    const t = normalizeLabel(line);
    if (t.length < 10 || GENERIC_LABELS.test(t)) continue;
    let score = t.length;
    if (t.includes("?")) score += 60;
    if (/\b(describe|explain|what|how|why|please|tell us)\b/.test(t)) score += 25;
    if (/\b(name|email|website|linkedin|title)\b/.test(t) && t.length < 40) score += 30;
    if (score > bestScore) {
      bestScore = score;
      best = t;
    }
  }
  return best;
}

function isCompanyNameHaystack(h: string): boolean {
  return /\b(company name|company\/organization|organization name|startup name|legal name|business name|name of (?:your )?company)\b/.test(h)
    || (/\bcompany\b/.test(h) && /\bname\b/.test(h) && !/\bfounder\b/.test(h) && !/\bceo name\b/.test(h));
}

function isWebsiteHaystack(h: string): boolean {
  return /\b(company website|website url|company url|your website|homepage|web site)\b/.test(h)
    && !/\b(linkedin|deck|pitch|video|twitter|github|docsend)\b/.test(h);
}

function isDeckHaystack(h: string): boolean {
  return /\b(pitch deck|deck link|link to (?:your )?deck|docsend)\b/.test(h);
}

function isVideoPitchHaystack(h: string): boolean {
  return /\b(video pitch|video url|pitch video|record a video)\b/.test(h);
}

function isLinkedInHaystack(h: string): boolean {
  return /\blinkedin\b/.test(h);
}

function isOneLinerHaystack(h: string): boolean {
  return /\b(140 character|one-?liner|tagline|describe.*in one|short description)\b/.test(h);
}

function isLocationHaystack(h: string): boolean {
  return /\b(where is your team|team location|currently located|city\b|location\b)\b/.test(h)
    && !/\bproblem\b/.test(h);
}

function founderIndex(haystack: string, ctx?: FieldMatchContext): number {
  if (/\bligia\b|founder\s*2|co-?founder\s*2|second founder|other founder/i.test(haystack)) return 1;
  if (/\bsecond\b/.test(haystack) && /\bfounder\b/.test(haystack)) return 1;

  if (/\bfirst founder\b|founder\s*1\b/.test(haystack)) return 0;

  const idx = getFounderBlockIndex(ctx);
  return idx ?? 0;
}

function getFounderBlockIndex(ctx?: FieldMatchContext): number | null {
  if (!ctx?.allFields || ctx.fieldIndex === undefined) return null;

  let block = 0;
  for (let i = 0; i < ctx.fieldIndex; i++) {
    const h = buildHaystack(ctx.allFields[i]?.label || "", ctx.allFields[i]?.name, undefined, {
      fieldContext: ctx.allFields[i]?.fieldContext,
    });
    if (/\bfounder\s*2\b|\bligia\b|second founder/i.test(h)) block = 1;
    else if (normalizeLabel(ctx.allFields[i]?.label || "") === "name") block++;
  }

  const cur = buildHaystack(ctx.allFields[ctx.fieldIndex]?.label || "", ctx.allFields[ctx.fieldIndex]?.name, undefined, ctx);
  if (/\bfounder\s*2\b|\bligia\b|second founder/i.test(cur)) return 1;
  if (/\bfounder\s*1\b|\bceo\b/i.test(cur)) return 0;

  return block > 0 ? 1 : 0;
}

function matchFounderField(haystack: string, normalized: string, ctx?: FieldMatchContext): string | null {
  if (isCompanyNameHaystack(haystack)) return null;
  if (/\bcompany\b/.test(haystack) && !/\bfounder\b/.test(haystack)) return null;

  const isFounderCtx = /\bfounder\b|\bceo\b|\bco-?founder\b|\bligia\b|\bAbel\b/.test(haystack);
  const isGenericName = normalized === "name" || normalized.startsWith("name ");
  const isGenericEmail = normalized === "email" || normalized.startsWith("email");
  const isGenericTitle = normalized === "title" || normalized.startsWith("title");

  if (!isFounderCtx && !isGenericName && !isGenericEmail && !isGenericTitle && !isLinkedInHaystack(haystack)) {
    return null;
  }

  const idx = founderIndex(haystack, ctx);
  const founder = REELIN_FOUNDERS[idx];
  if (!founder) return null;

  if (isGenericName || /\bfounder name\b|\bfull name\b/.test(haystack)) {
    if (!isCompanyNameHaystack(haystack)) return founder.name;
  }
  if (isGenericTitle || /\bfounder title\b|\bjob title\b/.test(haystack)) return founder.title;
  if (isGenericEmail || /\bfounder email\b/.test(haystack)) return founder.email;
  if (isLinkedInHaystack(haystack) && !/\bcompany\b/.test(haystack)) return founder.linkedIn;

  return null;
}

function tokenOverlap(haystack: string, question: string): number {
  const wordsQ = question.split(/\s+/).filter(w => w.length > 3);
  if (!wordsQ.length) return 0;
  const setH = new Set(haystack.split(/\s+/));
  let hits = 0;
  for (const w of wordsQ) if (setH.has(w)) hits++;
  return hits / wordsQ.length;
}

function matchQaByQuestion(haystack: string, effective: string): string | null {
  const text = `${effective} ${haystack}`;

  // Exact Q&A key match on effective label
  if (qaMap[effective]) return qaMap[effective];

  let bestAnswer: string | null = null;
  let bestScore = 0;

  for (const { question, answer } of TRAINING_QA) {
    const q = normalizeLabel(question);

    // Full question appears in context — strongest signal
    if (text.includes(q) && q.length >= 25) {
      if (q.length > bestScore) {
        bestScore = q.length + 100;
        bestAnswer = answer;
      }
      continue;
    }

    const overlap = tokenOverlap(text, q);
    if (overlap >= 0.55 && overlap > bestScore) {
      bestScore = overlap;
      bestAnswer = answer;
    }
  }

  return bestScore >= 0.55 ? bestAnswer : null;
}

function isStructuralShortField(haystack: string, effective: string): boolean {
  if (effective.length < 60 && SHORT_FIELD_MAP[effective]) return true;
  return isCompanyNameHaystack(haystack)
    || /\bfirst name\b/.test(haystack)
    || /\blast name\b/.test(haystack)
    || isWebsiteHaystack(haystack)
    || isDeckHaystack(haystack)
    || isVideoPitchHaystack(haystack)
    || isOneLinerHaystack(haystack)
    || (isLinkedInHaystack(haystack) && !/\b(describe|explain|what|problem)\b/.test(haystack));
}

/** Reject obviously wrong pairings */
export function validateMapping(haystack: string, value: string): boolean {
  if (!value) return true;
  const v = value.trim();

  if (isCompanyNameHaystack(haystack)) {
    if (v.includes("@") || v.startsWith("http") || v.includes("linkedin")) return false;
    if (v === REELIN_FOUNDERS[0].name || v === REELIN_FOUNDERS[1].name) return false;
  }
  if (/\bfirst name\b/.test(haystack) && v !== REELIN_CONTACT.firstName) return false;
  if (/\blast name\b/.test(haystack) && v !== REELIN_CONTACT.lastName) return false;
  if (isWebsiteHaystack(haystack) && (v.includes("linkedin") || v.includes("docsend"))) return false;
  if (isDeckHaystack(haystack) && !v.includes("docsend") && v.startsWith("http") && !v.includes("docsend")) return false;
  if (isLinkedInHaystack(haystack) && !/\bcompany\b/.test(haystack) && v === REELIN_COMPANY.website) return false;

  return true;
}

export function matchFormField(
  label: string,
  name?: string,
  placeholder?: string,
  ctx?: FieldMatchContext
): string | null {
  const haystack = buildHaystack(label, name, placeholder, ctx);
  const effective = effectiveLabel(label, ctx);
  if (!effective && name) return matchFormField(name, undefined, placeholder, ctx);

  let value: string | null = null;

  // ── Structural short fields (highest priority) ──
  if (isCompanyNameHaystack(haystack)) value = REELIN_COMPANY.name;
  else if (/\bfirst name\b/.test(haystack)) value = REELIN_CONTACT.firstName;
  else if (/\blast name\b/.test(haystack)) value = REELIN_CONTACT.lastName;
  else if (isVideoPitchHaystack(haystack)) value = "";
  else if (isDeckHaystack(haystack)) value = qaMap["please provide us with a link to your deck"] || "";
  else if (isWebsiteHaystack(haystack)) value = REELIN_COMPANY.website;
  else if (isOneLinerHaystack(haystack)) value = REELIN_COMPANY.tagline140;
  else if (isLocationHaystack(haystack)) {
    value = qaMap["where is your team currently located? (current location doesn't affect application)"]
      || REELIN_COMPANY.city;
  }
  else if (/\bcountry\b/.test(haystack) && haystack.length < 80) value = REELIN_COMPANY.country;
  else if (SHORT_FIELD_MAP[effective]) value = SHORT_FIELD_MAP[effective];
  else {
    const founderMatch = matchFounderField(haystack, effective, ctx);
    if (founderMatch) value = founderMatch;
  }

  // ── Long Q&A textarea questions ──
  if (!value && !isStructuralShortField(haystack, effective)) {
    value = matchQaByQuestion(haystack, effective);
  }

  if (value && !validateMapping(haystack, value)) return null;
  return value;
}

export { getTrainingKnowledgeText };

export const APPLICATION_KNOWLEDGE = `
VERIFIED APPLICATION Q&A — use these answers verbatim when form questions match:

Contact: Abel Adugam, abel@reelin.ai
Company: Reelin AI, https://reelin.ai, New York, United States
One-liner: Autonomous AI social network creating digital replicas & AI Twins of users.
Founders: Abel Adugam (Founder & CEO, abel@reelin.ai, https://adugam.com) + Ligia Tica (Co-founder & Operations, ligia@reelin.ai, https://www.linkedin.com/in/ligia-t-8b4630225/)
Deck: https://docsend.com/view/raru36axy8gftwb4

${getTrainingKnowledgeText()}

STRICT FIELD RULES:
- Company name → Reelin AI (never a person name)
- Company website → https://reelin.ai (never LinkedIn)
- First name → Abel | Last name → Adugam
- Founder 1 LinkedIn → https://adugam.com | Founder 2 LinkedIn → https://www.linkedin.com/in/ligia-t-8b4630225/
- Pitch deck URL → docsend link only
- Video pitch → leave empty
- Do NOT claim patents exist
`;
