"use client";

import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/portal/PortalShell";
import { getPortalCapTable } from "@/lib/portal";
import { HolderAvatar, fmtShares, fmtCapMoney } from "@/components/portal/CapTableDisplay";

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
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Cap Table</h1>
          <p className="text-[13px] text-neutral-500 mt-1">Ownership and investment across all holders</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="border border-neutral-800 rounded-xl p-4">
            <p className="text-[11px] text-neutral-500 uppercase tracking-wide">Total invested</p>
            <p className="text-lg font-semibold text-white mt-1">{fmtCapMoney(totalInvested)}</p>
          </div>
          <div className="border border-neutral-800 rounded-xl p-4">
            <p className="text-[11px] text-neutral-500 uppercase tracking-wide">Tracked ownership</p>
            <p className="text-lg font-semibold text-white mt-1">{totalOwnership.toFixed(2)}%</p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-[13px] text-neutral-500">Loading...</p>
        ) : (
          <div className="border border-neutral-800 rounded-xl overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-neutral-500 border-b border-neutral-800 bg-neutral-900/50">
                  <th className="text-left px-4 py-3 font-medium">Holder</th>
                  <th className="text-left px-4 py-3 font-medium">Company</th>
                  <th className="text-right px-4 py-3 font-medium">Investment</th>
                  <th className="text-right px-4 py-3 font-medium">Valuation</th>
                  <th className="text-right px-4 py-3 font-medium">Shares</th>
                  <th className="text-right px-4 py-3 font-medium">Ownership</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(row => (
                  <tr key={row.id} className="border-b border-neutral-800/50 hover:bg-neutral-900/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <HolderAvatar name={row.holderName} imageUrl={row.profileImageUrl} />
                        <div>
                          <p className="text-white font-medium">{row.holderName}</p>
                          <p className="text-[10px] text-neutral-600 capitalize">{row.holderType.replace("_", " ")}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-400">{row.company || "—"}</td>
                    <td className="px-4 py-3 text-right text-neutral-300">{fmtCapMoney(row.investmentAmount || 0)}</td>
                    <td className="px-4 py-3 text-right text-neutral-400">
                      {row.valuationAtInvestment ? fmtCapMoney(row.valuationAtInvestment) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-300 tabular-nums">{fmtShares(row.shares || 0)}</td>
                    <td className="px-4 py-3 text-right text-neutral-300">
                      {row.ownershipPct ? `${row.ownershipPct.toFixed(2)}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-400 capitalize">{row.status}</td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">No cap table entries yet</td>
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
