import type { CapTableEntry } from "@/lib/portal";
import { HolderAvatar, fmtShares, fmtCapMoney, StatusBadge } from "./CapTableDisplay";
import { p } from "./portalTheme";
import { ExternalLink } from "lucide-react";

function holderTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    parent: "Parent company",
    founder: "Co-founder",
    investor: "Investor",
    advisor: "Advisor",
    option_pool: "Option pool",
    other: "Other",
  };
  return labels[type] || type.replace("_", " ");
}

export function HolderProfileCard({ holder }: { holder: CapTableEntry }) {
  const isParent = holder.holderType === "parent";
  const isFounder = holder.holderType === "founder";

  return (
    <article
      className={`${p.card} overflow-hidden flex flex-col ${isParent ? "ring-1 ring-slate-900/10" : ""}`}
    >
      {isParent && (
        <div className="px-5 py-2 bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider">
          Parent company
        </div>
      )}
      {isFounder && (
        <div className="px-5 py-2 bg-slate-700 text-white text-xs font-semibold uppercase tracking-wider">
          Co-founder
        </div>
      )}
      <div className="p-5 sm:p-7 flex flex-col sm:flex-row gap-5 sm:gap-6">
        <HolderAvatar name={holder.holderName} imageUrl={holder.profileImageUrl} large />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                {holder.holderName}
              </h3>
              <p className="text-[15px] text-slate-500 mt-1 font-medium">
                {holder.company || holderTypeLabel(holder.holderType)}
              </p>
              {holder.websiteUrl && (
                <a
                  href={holder.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[15px] text-slate-700 hover:text-slate-900 font-medium mt-2 underline underline-offset-2"
                >
                  {holder.websiteUrl.replace(/^https?:\/\//, "")}
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              )}
            </div>
            <StatusBadge status={holder.status} notes={holder.notes} />
          </div>
          {holder.description && (
            <p className="text-[15px] sm:text-base text-slate-600 leading-relaxed mt-4">
              {holder.description}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 border-t border-slate-200">
        {[
          {
            label: holder.holderType === "investor" ? "Round commitment" : "Investment",
            value:
              holder.holderType === "investor" && holder.investmentAmount
                ? fmtCapMoney(holder.investmentAmount)
                : "—",
          },
          {
            label: "Ownership",
            value: holder.ownershipPct ? `${holder.ownershipPct.toFixed(2)}%` : "—",
          },
          { label: "Shares", value: fmtShares(holder.shares, holder.sharesLabel) },
          {
            label: "Valuation",
            value: holder.valuationAtInvestment ? fmtCapMoney(holder.valuationAtInvestment) : "—",
          },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-50/90 px-4 py-4 sm:px-5">
            <p className={p.statLabel}>{label}</p>
            <p className="text-sm sm:text-base font-semibold text-slate-900 mt-1.5 tabular-nums break-words">
              {value}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}
