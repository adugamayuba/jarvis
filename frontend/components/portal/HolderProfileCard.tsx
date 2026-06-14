import type { CapTableEntry } from "@/lib/portal";
import { HolderAvatar, fmtShares, fmtCapMoney, StatusBadge } from "./CapTableDisplay";
import { p } from "./portalTheme";

export function HolderProfileCard({ holder }: { holder: CapTableEntry }) {
  return (
    <article className={`${p.card} overflow-hidden flex flex-col`}>
      <div className="p-6 sm:p-7 flex flex-col sm:flex-row gap-5 sm:gap-6">
        <HolderAvatar name={holder.holderName} imageUrl={holder.profileImageUrl} large />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-slate-900 tracking-tight">{holder.holderName}</h3>
              <p className="text-[15px] text-slate-500 mt-0.5 font-medium">{holder.company || "Investor"}</p>
            </div>
            <StatusBadge status={holder.status} />
          </div>
          {holder.description && (
            <p className="text-[15px] text-slate-600 leading-relaxed mt-4">{holder.description}</p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200 border-t border-slate-200">
        {[
          { label: "Investment", value: fmtCapMoney(holder.investmentAmount || 0) },
          { label: "Ownership", value: holder.ownershipPct ? `${holder.ownershipPct.toFixed(2)}%` : "—" },
          { label: "Shares", value: fmtShares(holder.shares, holder.sharesLabel) },
          {
            label: "Valuation",
            value: holder.valuationAtInvestment ? fmtCapMoney(holder.valuationAtInvestment) : "—",
          },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-50/90 px-4 py-4 sm:px-5">
            <p className={p.statLabel}>{label}</p>
            <p className="text-base font-semibold text-slate-900 mt-1.5 tabular-nums">{value}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
