"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import { getDirectApiUrl } from "@/lib/apiBase";
import { getToken } from "@/lib/auth";
import {
  Upload, FileText, Trash2, ChevronDown, ChevronUp,
  Loader2, BookOpen, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Insight {
  category: string;
  content: string;
}

interface LearnedDocument {
  id: string;
  filename: string;
  summary: string;
  insights: Insight[];
  charCount: number;
  sizeBytes: number;
  uploadedAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  product: "text-blue-400 bg-blue-900/20 border-blue-800/40",
  traction: "text-emerald-400 bg-emerald-900/20 border-emerald-800/40",
  team: "text-purple-400 bg-purple-900/20 border-purple-800/40",
  market: "text-amber-400 bg-amber-900/20 border-amber-800/40",
  financials: "text-cyan-400 bg-cyan-900/20 border-cyan-800/40",
  pitch: "text-pink-400 bg-pink-900/20 border-pink-800/40",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentCard({ doc, onDelete }: { doc: LearnedDocument; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-neutral-800 rounded-xl overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0 mt-0.5">
            <FileText className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-neutral-200 truncate">{doc.filename}</p>
            <p className="text-[11px] text-neutral-500 mt-0.5 line-clamp-2">{doc.summary}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[10px] text-neutral-700">{formatBytes(doc.sizeBytes)}</span>
              <span className="text-[10px] text-neutral-700">{doc.charCount.toLocaleString()} chars</span>
              <span className="text-[10px] text-neutral-700">{doc.insights.length} insights</span>
              <span className="text-[10px] text-neutral-700">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-neutral-600 hover:text-white hover:bg-neutral-800 rounded transition-colors">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onDelete}
            className="p-1.5 text-neutral-600 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {expanded && doc.insights.length > 0 && (
        <div className="border-t border-neutral-800 p-4 space-y-2">
          <p className="text-[11px] text-neutral-600 uppercase tracking-wider mb-3">Extracted Insights</p>
          {doc.insights.map((insight, i) => (
            <div key={i} className={cn(
              "px-3 py-2 rounded-lg border text-[12px]",
              CATEGORY_COLORS[insight.category] || "text-neutral-400 bg-neutral-800/50 border-neutral-700"
            )}>
              <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60 block mb-0.5">
                {insight.category}
              </span>
              {insight.content}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DocumentsPage() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const res = await axios.get("/api/documents");
      return res.data.data as LearnedDocument[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/documents/${id}`),
    onSuccess: () => {
      toast.success("Document removed");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  async function uploadFile(file: File) {
    if (!file) return;
    const allowed = ["application/pdf", "text/plain"];
    if (!allowed.includes(file.type) && !file.name.endsWith(".pdf") && !file.name.endsWith(".txt")) {
      toast.error("Only PDF and TXT files are supported");
      return;
    }

    setUploading(true);
    setUploadProgress("Uploading and parsing...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadProgress("Extracting text from document...");
      const token = getToken();
      const res = await axios.post(getDirectApiUrl("/api/documents/upload"), formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 120_000,
        onUploadProgress: (e) => {
          if (e.total) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(`Uploading... ${pct}%`);
          }
        },
      });

      if (res.data.success) {
        toast.success(`Learned from "${file.name}"`, {
          description: res.data.message,
        });
        queryClient.invalidateQueries({ queryKey: ["documents"] });
      }
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error || err.message
        : "Upload failed";
      toast.error(msg === "Route not found"
        ? "Upload endpoint unavailable — redeploy Railway backend, then try again"
        : msg);
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    uploadFile(files[0]);
  }

  const totalInsights = docs.reduce((s, d) => s + d.insights.length, 0);

  return (
    <div className="p-4 sm:p-8 h-full overflow-y-auto max-w-3xl">
      <div className="mb-8">
        <p className="text-[11px] font-mono text-neutral-600 uppercase tracking-widest mb-1">Jarvis</p>
        <h1 className="text-xl font-semibold text-white">Documents & Knowledge</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">
          Upload PDFs and documents — Jarvis parses them and uses the insights to fill applications and answer questions
        </p>
      </div>

      {/* Stats */}
      {docs.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Documents", value: docs.length },
            { label: "Total Insights", value: totalInsights },
            { label: "Knowledge Chars", value: docs.reduce((s, d) => s + d.charCount, 0).toLocaleString() },
          ].map(({ label, value }) => (
            <div key={label} className="border border-neutral-800 rounded-xl p-4">
              <p className="text-xl font-semibold text-white tabular-nums">{value}</p>
              <p className="text-[11px] text-neutral-600 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-10 text-center mb-6 transition-colors cursor-pointer",
          dragging ? "border-white bg-white/5" : "border-neutral-800 hover:border-neutral-600",
          uploading && "pointer-events-none opacity-60"
        )}
        onClick={() => !uploading && fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
      >
        <input ref={fileRef} type="file" accept=".pdf,.txt" className="hidden"
          onChange={e => handleFiles(e.target.files)} />

        {uploading ? (
          <div>
            <Loader2 className="w-8 h-8 text-neutral-500 animate-spin mx-auto mb-3" />
            <p className="text-[13px] text-neutral-400 font-medium">{uploadProgress}</p>
            <p className="text-[11px] text-neutral-600 mt-1">Jarvis is reading and learning from the document...</p>
          </div>
        ) : (
          <div>
            <Upload className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
            <p className="text-[13px] text-neutral-300 font-medium">Drop a PDF or TXT file here</p>
            <p className="text-[12px] text-neutral-600 mt-1">
              Pitch decks, investor updates, company docs, research — anything useful
            </p>
            <p className="text-[11px] text-neutral-700 mt-2">PDF or TXT · Max 20MB</p>
          </div>
        )}
      </div>

      {/* Tip */}
      <div className="flex items-start gap-3 p-4 border border-neutral-800 rounded-xl bg-neutral-900/30 mb-6">
        <Sparkles className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-[12px] text-neutral-400 font-medium mb-0.5">How it works</p>
          <p className="text-[12px] text-neutral-600">
            After uploading, Jarvis extracts all key information and adds it to its knowledge base.
            This context is automatically used when you chat with Jarvis AI and when filling accelerator applications.
          </p>
        </div>
      </div>

      {/* Document list */}
      {isLoading ? (
        <div className="text-center py-10">
          <Loader2 className="w-6 h-6 text-neutral-600 animate-spin mx-auto" />
        </div>
      ) : docs.length === 0 ? (
        <div className="border border-neutral-800 rounded-xl p-12 text-center">
          <BookOpen className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
          <p className="text-[13px] text-neutral-500">No documents uploaded yet</p>
          <p className="text-[12px] text-neutral-700 mt-1">
            Start by uploading your Reelin AI pitch deck or any company document
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[12px] text-neutral-600">{docs.length} document{docs.length !== 1 ? "s" : ""} in knowledge base</p>
          {docs.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onDelete={() => deleteMutation.mutate(doc.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
