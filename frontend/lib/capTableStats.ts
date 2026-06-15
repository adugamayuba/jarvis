import type { CapTableEntry } from "./portal";

/** Closed/collected investor capital only — excludes pipeline negotiations. */
export function roundCommitments(entries: CapTableEntry[]): number {
  return entries
    .filter(e => e.holderType === "investor" && e.status === "active")
    .reduce((s, e) => s + (e.investmentAmount || 0), 0);
}

/** Capital still in active term negotiation. */
export function pipelineCommitments(entries: CapTableEntry[]): number {
  return entries
    .filter(e => e.holderType === "investor" && (e.status === "discussing" || e.status === "negotiating"))
    .reduce((s, e) => s + (e.investmentAmount || 0), 0);
}

export function trackedOwnership(entries: CapTableEntry[]): number {
  return entries.reduce((s, e) => s + (e.ownershipPct || 0), 0);
}

export const ROUND_TARGET = {
  raiseUsd: 10_000_000,
  postMoneyValuationUsd: 50_000_000,
  milestones: [
    "Onboard the first 500,000 Residents into the Reelin AI simulation",
    "Achieve $2.5M in monthly recurring revenue (MRR)",
    "Unlock and scale the pilot program by end of Q4 with 10 brand partners ($1M annualized revenue)",
  ],
  useOfFunds: [
    { label: "Proprietary AI / IP development", pct: 35, color: "#f97316" },
    { label: "Marketing & growth", pct: 25, color: "#a855f7" },
    { label: "Operations", pct: 20, color: "#ef4444" },
    { label: "Legal", pct: 10, color: "#3b82f6" },
    { label: "In-house team growth", pct: 10, color: "#84cc16" },
  ],
} as const;
