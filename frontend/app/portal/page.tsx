"use client";

import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/portal/PortalShell";
import { getPortalDashboard } from "@/lib/portal";
import { cn } from "@/lib/utils";
import { HolderAvatar, fmtShares, fmtCapMoney } from "@/components/portal/CapTableDisplay";

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
  prospect: { label: "Prospect", color: "text-neutral-400" },
  discussing: { label: "In Discussion", color: "text-amber-400" },
  safe_sent: { label: "SAFE Sent", color: "text-blue-400" },
  safe_signed: { label: "SAFE Signed", color: "text-emerald-400" },
  closed: { label: "Closed", color: "text-emerald-500" },
};

function fmt(n: number) {
  return fmtCapMoney(n);
}

export default function PortalOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["portal-dashboard"],
    queryFn: getPortalDashboard,
  });

  const dash = data?.data;
  const stage = dash?.profile.stage ? STAGE_LABELS[dash.profile.stage] : null;

  return (
    <PortalShell>
      {isLoading ? (
        <p className="text-[13px] text-neutral-500">Loading...</p>
      ) : dash ? (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-white">Welcome, {dash.profile.name}</h1>
            <p className="text-[13px] text-neutral-500 mt-1">
              {dash.profile.company || "Investor"} · Reelin AI Seed Round
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border border-neutral-800 rounded-xl p-4">
              <p className="text-[11px] text-neutral-500 uppercase tracking-wide">Your status</p>
              <p className={cn("text-lg font-semibold mt-1", stage?.color)}>{stage?.label || "—"}</p>
            </div>
            <div className="border border-neutral-800 rounded-xl p-4">
              <p className="text-[11px] text-neutral-500 uppercase tracking-wide">Investment amount</p>
              <p className="text-lg font-semibold text-white mt-1">{fmt(dash.profile.investmentAmount)}</p>
            </div>
            <div className="border border-neutral-800 rounded-xl p-4">
              <p className="text-[11px] text-neutral-500 uppercase tracking-wide">Data room docs</p>
              <p className="text-lg font-semibold text-white mt-1">{dash.dataRoomCount}</p>
            </div>
          </div>

          {dash.profile.lastConversation && (
            <div className="border border-neutral-800 rounded-xl p-4">
              <p className="text-[11px] text-neutral-500 uppercase tracking-wide mb-2">Latest conversation</p>
              <p className="text-[13px] text-neutral-300 leading-relaxed whitespace-pre-wrap">
                {dash.profile.lastConversation}
              </p>
            </div>
          )}

          {dash.safe && (
            <div className="border border-neutral-800 rounded-xl p-4">
              <p className="text-[11px] text-neutral-500 uppercase tracking-wide mb-2">Your SAFE</p>
              <div className="flex flex-wrap gap-4 text-[13px]">
                <span className="text-white">Amount: {fmt(dash.safe.amount)}</span>
                {dash.safe.valuationCap ? (
                  <span className="text-neutral-400">Cap: {fmt(dash.safe.valuationCap)}</span>
                ) : null}
                {dash.safe.discount ? (
                  <span className="text-neutral-400">Discount: {dash.safe.discount}%</span>
                ) : null}
                <span className="text-neutral-400 capitalize">Status: {dash.safe.status.replace("_", " ")}</span>
              </div>
            </div>
          )}

          {dash.capTable.length > 0 && (
            <div className="border border-neutral-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-800">
                <p className="text-[13px] font-medium text-white">Cap table snapshot</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-neutral-500 border-b border-neutral-800">
                      <th className="text-left px-4 py-2 font-medium">Holder</th>
                      <th className="text-right px-4 py-2 font-medium">Amount</th>
                      <th className="text-right px-4 py-2 font-medium">Shares</th>
                      <th className="text-right px-4 py-2 font-medium">Ownership</th>
                      <th className="text-left px-4 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dash.capTable.slice(0, 8).map(row => (
                      <tr key={row.id} className="border-b border-neutral-800/50">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <HolderAvatar name={row.holderName} imageUrl={row.profileImageUrl} />
                            <span className="text-white">{row.holderName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right text-neutral-300">{fmt(row.investmentAmount || 0)}</td>
                        <td className="px-4 py-2.5 text-right text-neutral-300 tabular-nums">{fmtShares(row.shares, row.sharesLabel)}</td>
                        <td className="px-4 py-2.5 text-right text-neutral-300">
                          {row.ownershipPct ? `${row.ownershipPct.toFixed(2)}%` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-neutral-400 capitalize">{row.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[13px] text-red-400">Could not load portal data</p>
      )}
    </PortalShell>
  );
}
