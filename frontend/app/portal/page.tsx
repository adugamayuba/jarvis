"use client";

import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/portal/PortalShell";
import { getPortalDashboard } from "@/lib/portal";
import { cn } from "@/lib/utils";
import { HolderProfileCard } from "@/components/portal/HolderProfileCard";
import { fmtCapMoney } from "@/components/portal/CapTableDisplay";
import { portalHref } from "@/lib/investorPortalHost";
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
            <section className="space-y-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Investors</h2>
                  <p className="text-[15px] text-slate-500 mt-1">Key participants in the Reelin AI cap table</p>
                </div>
                <a
                  href={portalHref("/portal/cap-table")}
                  className="text-[15px] font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2 shrink-0"
                >
                  View full cap table
                </a>
              </div>
              <div className="grid gap-5">
                {dash.capTable.slice(0, 4).map(holder => (
                  <HolderProfileCard key={holder.id} holder={holder} />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <p className={p.error}>Could not load portal data. Please try again or contact abel@reelin.ai.</p>
      )}
    </PortalShell>
  );
}
