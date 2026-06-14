"use client";

import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/portal/PortalShell";
import { getPortalDashboard } from "@/lib/portal";
import { cn } from "@/lib/utils";
import { HolderAvatar, fmtShares, fmtCapMoney, StatusBadge } from "@/components/portal/CapTableDisplay";
import { p } from "@/components/portal/portalTheme";

const STAGE_LABELS: Record<string, { label: string; className: string }> = {
  prospect: { label: "Prospect", className: "text-slate-600" },
  discussing: { label: "In discussion", className: "text-sky-700" },
  safe_sent: { label: "SAFE sent", className: "text-blue-700" },
  safe_signed: { label: "SAFE signed", className: "text-emerald-700" },
  closed: { label: "Closed", className: "text-emerald-800" },
};

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
        <p className={p.muted}>Loading your dashboard...</p>
      ) : dash ? (
        <div className="space-y-8">
          <div>
            <h1 className={p.h1}>Welcome back, {dash.profile.name}</h1>
            <p className={p.subtitle}>
              {dash.profile.company || "Investor"} · Reelin AI Seed Round
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className={`${p.card} ${p.cardPad}`}>
              <p className={p.statLabel}>Your status</p>
              <p className={cn("text-xl font-semibold mt-2", stage?.className)}>{stage?.label || "—"}</p>
            </div>
            <div className={`${p.card} ${p.cardPad}`}>
              <p className={p.statLabel}>Investment amount</p>
              <p className={p.statValue}>{fmtCapMoney(dash.profile.investmentAmount)}</p>
            </div>
            <div className={`${p.card} ${p.cardPad}`}>
              <p className={p.statLabel}>Data room documents</p>
              <p className={p.statValue}>{dash.dataRoomCount}</p>
            </div>
          </div>

          {dash.profile.lastConversation && (
            <div className={`${p.card} ${p.cardPad}`}>
              <p className={p.statLabel}>Latest conversation</p>
              <p className="text-[15px] text-slate-700 leading-relaxed whitespace-pre-wrap mt-3">
                {dash.profile.lastConversation}
              </p>
            </div>
          )}

          {dash.safe && (
            <div className={`${p.card} ${p.cardPad}`}>
              <p className={p.statLabel}>Your SAFE</p>
              <div className="flex flex-wrap gap-x-8 gap-y-2 text-[15px] mt-3">
                <span className="text-slate-900 font-medium">Amount: {fmtCapMoney(dash.safe.amount)}</span>
                {dash.safe.valuationCap ? (
                  <span className="text-slate-600">Cap: {fmtCapMoney(dash.safe.valuationCap)}</span>
                ) : null}
                {dash.safe.discount ? (
                  <span className="text-slate-600">Discount: {dash.safe.discount}%</span>
                ) : null}
                <span className="text-slate-600 capitalize">Status: {dash.safe.status.replace("_", " ")}</span>
              </div>
            </div>
          )}

          {dash.capTable.length > 0 && (
            <div className={p.tableWrap}>
              <div className="px-5 py-4 border-b border-slate-200 bg-white">
                <h2 className="text-lg font-semibold text-slate-900">Cap table</h2>
                <p className="text-sm text-slate-500 mt-0.5">Current ownership across all holders</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className={p.th}>Holder</th>
                      <th className={`${p.th} text-right`}>Investment</th>
                      <th className={`${p.th} text-right`}>Shares</th>
                      <th className={`${p.th} text-right`}>Ownership</th>
                      <th className={p.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dash.capTable.slice(0, 12).map(row => (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className={p.td}>
                          <div className="flex items-center gap-3">
                            <HolderAvatar name={row.holderName} imageUrl={row.profileImageUrl} />
                            <span className="font-medium text-slate-900">{row.holderName}</span>
                          </div>
                        </td>
                        <td className={`${p.td} text-right tabular-nums`}>{fmtCapMoney(row.investmentAmount || 0)}</td>
                        <td className={`${p.td} text-right text-slate-600`}>{fmtShares(row.shares, row.sharesLabel)}</td>
                        <td className={`${p.td} text-right tabular-nums font-medium text-slate-900`}>
                          {row.ownershipPct ? `${row.ownershipPct.toFixed(2)}%` : "—"}
                        </td>
                        <td className={p.td}>
                          <StatusBadge status={row.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className={p.error}>Could not load portal data. Please try again or contact abel@reelin.ai.</p>
      )}
    </PortalShell>
  );
}
