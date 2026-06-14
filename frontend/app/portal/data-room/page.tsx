"use client";

import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/portal/PortalShell";
import { downloadPortalFile, getPortalDataRoom, openPortalFile } from "@/lib/portal";
import { p } from "@/components/portal/portalTheme";
import { FileText, Download } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  financials: "Financials",
  legal: "Legal",
  product: "Product",
  pitch: "Pitch",
  other: "Other",
};

export default function PortalDataRoomPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["portal-data-room"],
    queryFn: getPortalDataRoom,
  });

  const docs = data?.data || [];

  async function openDoc(id: string) {
    try {
      const res = await downloadPortalFile(`/api/portal/data-room/${id}/file`);
      if (res.success && res.data) {
        openPortalFile(res.data);
      } else {
        toast.error(res.error || "No file available");
      }
    } catch {
      toast.error("Could not open document");
    }
  }

  return (
    <PortalShell>
      <div className="space-y-8">
        <div>
          <h1 className={p.h1}>Data room</h1>
          <p className={p.subtitle}>Company documents shared with authorized investors</p>
        </div>

        {isLoading ? (
          <p className={p.muted}>Loading documents...</p>
        ) : docs.length === 0 ? (
          <div className={`${p.card} px-8 py-14 text-center`}>
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-slate-800">No documents available</p>
            <p className="text-[15px] text-slate-500 mt-2">Materials will be added here as they become available.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map(doc => (
              <div
                key={doc.id}
                className={`${p.card} px-5 py-5 flex items-center justify-between gap-4 hover:border-slate-300 transition-colors`}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-lg bg-slate-100 ring-1 ring-slate-200 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-slate-900 truncate">{doc.title}</p>
                    {doc.description && (
                      <p className="text-[15px] text-slate-500 mt-0.5 line-clamp-2">{doc.description}</p>
                    )}
                    <p className="text-sm text-slate-400 mt-1.5">
                      {CATEGORY_LABELS[doc.category] || doc.category}
                      {doc.uploadedAt ? ` · ${new Date(doc.uploadedAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                </div>
                {(doc.hasFile || doc.documentUrl) && (
                  <button
                    type="button"
                    onClick={() => openDoc(doc.id)}
                    className={`${p.btnSecondary} shrink-0`}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Open
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </PortalShell>
  );
}
