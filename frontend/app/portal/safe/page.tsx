"use client";

import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/portal/PortalShell";
import { downloadPortalFile, getPortalMySafe, openPortalFile } from "@/lib/portal";
import { p } from "@/components/portal/portalTheme";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";

function fmt(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent for signature",
  signed: "Signed",
  funded: "Funded",
};

export default function PortalSafePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["portal-my-safe"],
    queryFn: getPortalMySafe,
  });

  const safe = data?.data;

  async function downloadSafe() {
    try {
      const res = await downloadPortalFile("/api/portal/safe/file");
      if (res.success && res.data) {
        openPortalFile(res.data);
      } else {
        toast.error(res.error || "No document available");
      }
    } catch {
      toast.error("Could not download SAFE");
    }
  }

  return (
    <PortalShell>
      <div className="space-y-8">
        <div>
          <h1 className={p.h1}>My SAFE</h1>
          <p className={p.subtitle}>Simple Agreement for Future Equity</p>
        </div>

        {isLoading ? (
          <p className={p.muted}>Loading SAFE details...</p>
        ) : safe ? (
          <div className={`${p.card} ${p.cardPad} space-y-6`}>
            <div className="flex flex-col sm:flex-row sm:items-start gap-5 justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6 text-slate-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-900">{safe.documentTitle || "SAFE Agreement"}</p>
                  <p className="text-[15px] text-slate-500 mt-1">
                    {STATUS_LABELS[safe.status] || safe.status}
                    {safe.signedAt ? ` · Signed ${new Date(safe.signedAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
              </div>
              {(safe.hasDocument || safe.documentUrl) && (
                <button type="button" onClick={downloadSafe} className={p.btnSecondary}>
                  <Download className="w-4 h-4 mr-2" />
                  View document
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                <p className={p.statLabel}>Investment amount</p>
                <p className="text-xl font-semibold text-slate-900 mt-2 tabular-nums">{fmt(safe.amount)}</p>
              </div>
              {safe.valuationCap ? (
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                  <p className={p.statLabel}>Valuation cap</p>
                  <p className="text-xl font-semibold text-slate-900 mt-2 tabular-nums">{fmt(safe.valuationCap)}</p>
                </div>
              ) : null}
              {safe.discount ? (
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                  <p className={p.statLabel}>Discount</p>
                  <p className="text-xl font-semibold text-slate-900 mt-2 tabular-nums">{safe.discount}%</p>
                </div>
              ) : null}
            </div>

            {safe.safeNotes && (
              <div className="pt-2 border-t border-slate-100">
                <p className={p.statLabel}>Notes</p>
                <p className="text-[15px] text-slate-700 leading-relaxed whitespace-pre-wrap mt-3">{safe.safeNotes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className={`${p.card} px-8 py-14 text-center`}>
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-800">No SAFE on file yet</p>
            <p className="text-[15px] text-slate-500 mt-2 max-w-md mx-auto">
              Your SAFE will appear here once it has been prepared and shared with you.
            </p>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
