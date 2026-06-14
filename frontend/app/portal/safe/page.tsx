"use client";

import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/portal/PortalShell";
import { downloadPortalFile, getPortalMySafe, openPortalFile } from "@/lib/portal";
import { Button } from "@/components/ui/button";
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
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white">My SAFE</h1>
          <p className="text-[13px] text-neutral-500 mt-1">Your Simple Agreement for Future Equity</p>
        </div>

        {isLoading ? (
          <p className="text-[13px] text-neutral-500">Loading...</p>
        ) : safe ? (
          <div className="border border-neutral-800 rounded-xl p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center">
                <FileText className="w-5 h-5 text-neutral-400" />
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-medium text-white">{safe.documentTitle || "SAFE Agreement"}</p>
                <p className="text-[12px] text-neutral-500 mt-0.5">
                  Status: {STATUS_LABELS[safe.status] || safe.status}
                  {safe.signedAt ? ` · Signed ${new Date(safe.signedAt).toLocaleDateString()}` : ""}
                </p>
              </div>
              {(safe.hasDocument || safe.documentUrl) && (
                <Button
                  onClick={downloadSafe}
                  variant="outline"
                  className="border-neutral-700 text-white hover:bg-neutral-800 h-8 text-[12px]"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  View document
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-neutral-900/50 rounded-lg p-3">
                <p className="text-[11px] text-neutral-500">Investment amount</p>
                <p className="text-[15px] font-semibold text-white mt-1">{fmt(safe.amount)}</p>
              </div>
              {safe.valuationCap ? (
                <div className="bg-neutral-900/50 rounded-lg p-3">
                  <p className="text-[11px] text-neutral-500">Valuation cap</p>
                  <p className="text-[15px] font-semibold text-white mt-1">{fmt(safe.valuationCap)}</p>
                </div>
              ) : null}
              {safe.discount ? (
                <div className="bg-neutral-900/50 rounded-lg p-3">
                  <p className="text-[11px] text-neutral-500">Discount</p>
                  <p className="text-[15px] font-semibold text-white mt-1">{safe.discount}%</p>
                </div>
              ) : null}
            </div>

            {safe.safeNotes && (
              <div>
                <p className="text-[11px] text-neutral-500 uppercase tracking-wide mb-2">Notes</p>
                <p className="text-[13px] text-neutral-300 leading-relaxed whitespace-pre-wrap">{safe.safeNotes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="border border-neutral-800 rounded-xl p-8 text-center">
            <FileText className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
            <p className="text-[13px] text-neutral-400">No SAFE on file yet</p>
            <p className="text-[12px] text-neutral-600 mt-1">Your SAFE will appear here once it is prepared and sent</p>
          </div>
        )}
      </div>
    </PortalShell>
  );
}
