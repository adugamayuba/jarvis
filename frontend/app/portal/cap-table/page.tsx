"use client";

import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/portal/PortalShell";
import { getPortalCapTable } from "@/lib/portal";
import { HolderAvatar, fmtShares, fmtCapMoney, StatusBadge } from "@/components/portal/CapTableDisplay";
import { p } from "@/components/portal/portalTheme";

export default function PortalCapTablePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["portal-cap-table"],
    queryFn: getPortalCapTable,
  });

  const entries = data?.data || [];
  const totalInvested = entries.reduce((s, e) => s + (e.investmentAmount || 0), 0);
  const totalOwnership = entries.reduce((s, e) => s + (e.ownershipPct || 0), 0);

  return (
    <PortalShell>
      <div className="space-y-8">
        <div>
          <h1 className={p.h1}>Cap table</h1>
          <p className={p.subtitle}>Ownership and investment across all holders</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className={`${p.card} ${p.cardPad}`}>
            <p className={p.statLabel}>Total invested</p>
            <p className={p.statValue}>{fmtCapMoney(totalInvested)}</p>
          </div>
          <div className={`${p.card} ${p.cardPad}`}>
            <p className={p.statLabel}>Tracked ownership</p>
            <p className={p.statValue}>{totalOwnership.toFixed(2)}%</p>
          </div>
        </div>

        {isLoading ? (
          <p className={p.muted}>Loading cap table...</p>
        ) : (
          <div className={p.tableWrap}>
            <table className="w-full">
              <thead>
                <tr>
                  <th className={p.th}>Holder</th>
                  <th className={p.th}>Company</th>
                  <th className={`${p.th} text-right`}>Investment</th>
                  <th className={`${p.th} text-right`}>Valuation</th>
                  <th className={`${p.th} text-right`}>Shares</th>
                  <th className={`${p.th} text-right`}>Ownership</th>
                  <th className={p.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(row => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className={p.td}>
                      <div className="flex items-center gap-3">
                        <HolderAvatar name={row.holderName} imageUrl={row.profileImageUrl} />
                        <div>
                          <p className="font-medium text-slate-900">{row.holderName}</p>
                          <p className="text-xs text-slate-500 capitalize mt-0.5">{row.holderType.replace("_", " ")}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`${p.td} text-slate-600`}>{row.company || "—"}</td>
                    <td className={`${p.td} text-right tabular-nums font-medium text-slate-900`}>
                      {fmtCapMoney(row.investmentAmount || 0)}
                    </td>
                    <td className={`${p.td} text-right tabular-nums text-slate-600`}>
                      {row.valuationAtInvestment ? fmtCapMoney(row.valuationAtInvestment) : "—"}
                    </td>
                    <td className={`${p.td} text-right text-slate-600 max-w-[180px]`}>
                      {fmtShares(row.shares, row.sharesLabel)}
                    </td>
                    <td className={`${p.td} text-right tabular-nums font-medium text-slate-900`}>
                      {row.ownershipPct ? `${row.ownershipPct.toFixed(2)}%` : "—"}
                    </td>
                    <td className={p.td}>
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-[15px] text-slate-500">
                      No cap table entries yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
