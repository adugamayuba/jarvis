"use client";

import { useQuery } from "@tanstack/react-query";
import { PortalShell } from "@/components/portal/PortalShell";
import { downloadPortalFile, getPortalDataRoom, openPortalFile } from "@/lib/portal";
import { FolderOpen, Download } from "lucide-react";
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
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Data Room</h1>
          <p className="text-[13px] text-neutral-500 mt-1">Company documents shared with investors</p>
        </div>

        {isLoading ? (
          <p className="text-[13px] text-neutral-500">Loading...</p>
        ) : docs.length === 0 ? (
          <div className="border border-neutral-800 rounded-xl p-8 text-center">
            <FolderOpen className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
            <p className="text-[13px] text-neutral-400">No documents available yet</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {docs.map(doc => (
              <div
                key={doc.id}
                className="border border-neutral-800 rounded-xl p-4 flex items-start justify-between gap-4 hover:bg-neutral-900/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                    <FolderOpen className="w-4 h-4 text-neutral-400" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-white">{doc.title}</p>
                    {doc.description && (
                      <p className="text-[12px] text-neutral-500 mt-0.5">{doc.description}</p>
                    )}
                    <p className="text-[11px] text-neutral-600 mt-1">
                      {CATEGORY_LABELS[doc.category] || doc.category}
                      {doc.uploadedAt ? ` · ${new Date(doc.uploadedAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                </div>
                {(doc.hasFile || doc.documentUrl) && (
                  <button
                    onClick={() => openDoc(doc.id)}
                    className="flex items-center gap-1.5 text-[12px] text-neutral-400 hover:text-white shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
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
