import { PRESS_OUTLET_IDS, PressOutletId } from "@/types";

export { PRESS_OUTLET_IDS };
export type { PressOutletId };

export const PRESS_OUTLET_LABELS: Record<PressOutletId, string> = {
  techcrunch: "TechCrunch",
  businessinsider: "Business Insider",
  theverge: "The Verge",
  wired: "Wired",
  arstechnica: "Ars Technica",
  venturebeat: "VentureBeat",
  fastcompany: "Fast Company",
  fortune: "Fortune",
  cnbc: "CNBC",
  axios: "Axios",
  semafor: "Semafor",
  mashable: "Mashable",
  engadget: "Engadget",
  gizmodo: "Gizmodo",
  vox: "Vox",
};

export function isPressOutletId(value: string): value is PressOutletId {
  return (PRESS_OUTLET_IDS as readonly string[]).includes(value);
}

export function isPressSource(source: string): boolean {
  return isPressOutletId(source);
}

export function pressOutletLabel(id: string): string {
  if (isPressOutletId(id)) return PRESS_OUTLET_LABELS[id];
  return id;
}

export function isJournalistContact(contact: {
  source?: string;
  audience?: string;
  tags?: string[];
}): boolean {
  if (contact.audience === "journalist") return true;
  if (contact.tags?.includes("journalist")) return true;
  if (contact.source && isPressSource(contact.source)) return true;
  return false;
}
