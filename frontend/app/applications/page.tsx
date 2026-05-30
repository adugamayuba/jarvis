"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
import {
  Loader2, Globe, CheckCircle2, Clock, AlertCircle,
  Trash2, ExternalLink, Eye, Send, Plus, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FormField {
  label: string;
  type: string;
  selector: string;
  required: boolean;
  options?: string[];
  suggestedValue: string;
  reasoning: string;
}

interface ApplicationPreview {
  url: string;
  title: string;
  fields: FormField[];
  screenshot: string;
  warnings: string[];
}

interface Application {
  id: string;
  name: string;
  url: string;
  status: "draft" | "filled" | "submitted" | "failed";
  deadline?: string;
  notes?: string;
  submittedAt?: string;
  screenshot?: string;
  message?: string;
  createdAt: string;
}

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "text-neutral-400", bg: "bg-neutral-800/50", icon: Clock },
  filled: { label: "Filled", color: "text-amber-400", bg: "bg-amber-900/20", icon: Eye },
  submitted: { label: "Submitted", color: "text-emerald-400", bg: "bg-emerald-900/20", icon: CheckCircle2 },
  failed: { label: "Failed", color: "text-red-400", bg: "bg-red-900/20", icon: AlertCircle },
};

// Known accelerator programs
const ACCELERATORS = [
  { name: "Y Combinator", url: "https://www.ycombinator.com/apply", deadline: "Rolling" },
  { name: "Techstars", url: "https://www.techstars.com/apply", deadline: "Rolling" },
  { name: "500 Global", url: "https://500.co/accelerator", deadline: "Rolling" },
  { name: "Antler", url: "https://www.antler.co/apply", deadline: "Rolling" },
  { name: "Seedcamp", url: "https://seedcamp.com/apply/", deadline: "Rolling" },
  { name: "Plug and Play", url: "https://www.plugandplaytechcenter.com/apply/", deadline: "Rolling" },
  { name: "MassChallenge", url: "https://masschallenge.org/apply", deadline: "Rolling" },
  { name: "Founder Institute", url: "https://fi.co/apply", deadline: "Rolling" },
];

export default function ApplicationsPage() {
  const [url, setUrl] = useState("");
  const [appName, setAppName] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<ApplicationPreview | null>(null);
  const [editedFields, setEditedFields] = useState<FormField[]>([]);
  const [expandedField, setExpandedField] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentAppId, setCurrentAppId] = useState<string | null>(null);
  const [showAccelerators, setShowAccelerators] = useState(false);

  const queryClient = useQueryClient();

  const { data: applications = [] } = useQuery({
    queryKey: ["applications"],
    queryFn: async () => {
      const res = await axios.get("/api/applications");
      return res.data.data as Application[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/applications/${id}`),
    onSuccess: () => {
      toast.success("Application deleted");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  async function handleAnalyze() {
    if (!url.trim()) { toast.error("Enter a URL"); return; }
    setAnalyzing(true);
    setPreview(null);
    try {
      const res = await axios.post("/api/applications/analyze", { url: url.trim() });
      const data = res.data.data as ApplicationPreview;
      setPreview(data);
      setEditedFields(data.fields);
      if (!appName) setAppName(data.title || url);
      toast.success(`Found ${data.fields.length} form fields`);
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Failed to analyze form";
      toast.error(msg || "Failed to analyze form");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSave() {
    if (!preview) return;
    const res = await axios.post("/api/applications", {
      url: url.trim(),
      name: appName || preview.title,
      fields: editedFields,
    });
    const id = res.data.data.id;
    setCurrentAppId(id);
    queryClient.invalidateQueries({ queryKey: ["applications"] });
    toast.success("Application saved");
    return id;
  }

  async function handleDryRun() {
    if (!preview) return;
    setSubmitting(true);
    try {
      const id = currentAppId || await handleSave();
      const res = await axios.post("/api/applications/submit", {
        url: url.trim(),
        fields: editedFields.map(f => ({ selector: f.selector, value: f.suggestedValue, type: f.type })),
        dryRun: true,
        applicationId: id,
      });
      const result = res.data.data;
      toast.success("Preview: form filled (not submitted)", { description: result.message });
      if (result.screenshot) setPreview(p => p ? { ...p, screenshot: result.screenshot } : p);
    } catch {
      toast.error("Dry run failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (!preview) return;
    const confirmed = window.confirm(
      `Are you sure you want to SUBMIT the application to:\n${url}\n\nThis will fill and submit the form on your behalf.`
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const id = currentAppId || await handleSave();
      const res = await axios.post("/api/applications/submit", {
        url: url.trim(),
        fields: editedFields.map(f => ({ selector: f.selector, value: f.suggestedValue, type: f.type })),
        dryRun: false,
        applicationId: id,
      });
      const result = res.data.data;
      if (result.success) {
        toast.success("Application submitted!", { description: result.message });
      } else {
        toast.error(result.message);
      }
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    } catch {
      toast.error("Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  function updateFieldValue(idx: number, value: string) {
    setEditedFields(prev => prev.map((f, i) => i === idx ? { ...f, suggestedValue: value } : f));
  }

  return (
    <div className="p-4 sm:p-8 h-full overflow-y-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] font-mono text-neutral-600 uppercase tracking-widest mb-1">Jarvis</p>
        <h1 className="text-xl font-semibold text-white">Accelerator Applications</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">
          Paste any application form URL — Jarvis reads it, fills it with Reelin AI's profile, and submits it for you
        </p>
      </div>

      {/* Quick select accelerators */}
      <div className="mb-6">
        <button onClick={() => setShowAccelerators(!showAccelerators)}
          className="flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-neutral-300 transition-colors mb-2">
          {showAccelerators ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          Quick-select known accelerators
        </button>
        {showAccelerators && (
          <div className="flex flex-wrap gap-2">
            {ACCELERATORS.map(a => (
              <button key={a.name} onClick={() => { setUrl(a.url); setAppName(a.name); }}
                className={cn("text-[12px] px-2.5 py-1 rounded-lg border transition-colors",
                  url === a.url ? "border-white text-white" : "border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200"
                )}>
                {a.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* URL Input */}
      <div className="border border-neutral-800 rounded-xl p-5 mb-6">
        <div className="flex gap-3 mb-3">
          <Input
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://www.ycombinator.com/apply"
            className="flex-1 bg-neutral-800/50 border-neutral-700 text-neutral-200 placeholder:text-neutral-600 text-[13px] h-9"
            onKeyDown={e => e.key === "Enter" && handleAnalyze()}
          />
          <Input
            value={appName}
            onChange={e => setAppName(e.target.value)}
            placeholder="Application name (optional)"
            className="w-48 bg-neutral-800/50 border-neutral-700 text-neutral-200 placeholder:text-neutral-600 text-[13px] h-9"
          />
          <Button onClick={handleAnalyze} disabled={analyzing}
            className="bg-white text-neutral-900 hover:bg-neutral-200 text-[13px] font-medium h-9 gap-2 shrink-0">
            {analyzing
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Analyzing...</>
              : <><Globe className="w-3.5 h-3.5" />Analyze Form</>
            }
          </Button>
        </div>
        <p className="text-[11px] text-neutral-600">
          Jarvis will navigate to the URL, identify all form fields, and auto-fill them with Reelin AI's profile using AI
        </p>
      </div>

      {/* Preview screenshot + fields */}
      {preview && (
        <div className="space-y-4 mb-6">
          {/* Screenshot */}
          {preview.screenshot && (
            <div className="border border-neutral-800 rounded-xl overflow-hidden">
              <div className="px-4 py-2 border-b border-neutral-800 flex items-center justify-between">
                <p className="text-[12px] text-neutral-400 font-medium">{preview.title}</p>
                <a href={url} target="_blank" rel="noreferrer"
                  className="text-[11px] text-neutral-600 hover:text-white flex items-center gap-1 transition-colors">
                  <ExternalLink className="w-3 h-3" /> Open page
                </a>
              </div>
              <img src={`data:image/png;base64,${preview.screenshot}`}
                alt="Page screenshot" className="w-full opacity-80 hover:opacity-100 transition-opacity" />
            </div>
          )}

          {/* Warnings */}
          {preview.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 p-3 border border-amber-800/40 bg-amber-900/10 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[12px] text-amber-300">{w}</p>
            </div>
          ))}

          {/* Fields */}
          <div className="border border-neutral-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <p className="text-[13px] font-medium text-neutral-200">{preview.fields.length} form fields detected</p>
                <p className="text-[11px] text-neutral-600 mt-0.5">Review and edit values before submitting</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleSave}
                  className="text-neutral-400 hover:text-white hover:bg-neutral-800 text-[12px] h-8 gap-1.5">
                  Save draft
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDryRun} disabled={submitting}
                  className="text-neutral-400 hover:text-white hover:bg-neutral-800 text-[12px] h-8 gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  {submitting ? "Running..." : "Preview fill"}
                </Button>
                <Button size="sm" onClick={handleSubmit} disabled={submitting}
                  className="bg-white text-neutral-900 hover:bg-neutral-200 text-[12px] font-medium h-8 gap-1.5">
                  {submitting
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Submitting...</>
                    : <><Send className="w-3.5 h-3.5" />Submit Application</>
                  }
                </Button>
              </div>
            </div>

            <div className="divide-y divide-neutral-800/60">
              {editedFields.map((field, idx) => (
                <div key={idx} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[12px] font-medium text-neutral-300 truncate">{field.label}</span>
                        {field.required && <span className="text-[10px] text-red-400 shrink-0">required</span>}
                        <span className="text-[10px] text-neutral-600 bg-neutral-800 px-1.5 py-0.5 rounded shrink-0">{field.type}</span>
                      </div>
                      {field.type === "textarea" || field.suggestedValue?.length > 80 ? (
                        <>
                          <textarea
                            value={field.suggestedValue}
                            onChange={e => updateFieldValue(idx, e.target.value)}
                            rows={expandedField === idx ? 8 : 3}
                            className="w-full bg-neutral-800/50 border border-neutral-700 rounded-lg text-[12px] text-neutral-300 px-3 py-2 resize-none focus:outline-none focus:border-neutral-500"
                          />
                          <button onClick={() => setExpandedField(expandedField === idx ? null : idx)}
                            className="text-[10px] text-neutral-600 hover:text-neutral-400 mt-0.5">
                            {expandedField === idx ? "Collapse" : "Expand"}
                          </button>
                        </>
                      ) : field.options && field.options.length > 0 ? (
                        <select value={field.suggestedValue} onChange={e => updateFieldValue(idx, e.target.value)}
                          className="bg-neutral-800/50 border border-neutral-700 rounded-lg text-[12px] text-neutral-300 px-2 py-1.5 focus:outline-none focus:border-neutral-500">
                          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <Input
                          value={field.suggestedValue}
                          onChange={e => updateFieldValue(idx, e.target.value)}
                          className="bg-neutral-800/50 border-neutral-700 text-neutral-300 text-[12px] h-8"
                        />
                      )}
                    </div>
                  </div>
                  {field.reasoning && (
                    <p className="text-[10px] text-neutral-700 mt-1 line-clamp-1">{field.reasoning}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Past applications */}
      {applications.length > 0 && (
        <div>
          <h2 className="text-[13px] font-medium text-neutral-300 mb-3">Applications History</h2>
          <div className="space-y-2">
            {applications.map(app => {
              const cfg = STATUS_CONFIG[app.status] || STATUS_CONFIG.draft;
              const Icon = cfg.icon;
              return (
                <div key={app.id} className="border border-neutral-800 rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", cfg.bg)}>
                      <Icon className={cn("w-4 h-4", cfg.color)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-neutral-200 truncate">{app.name}</p>
                      <p className="text-[11px] text-neutral-600 truncate">{app.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={cn("text-[11px] font-medium", cfg.color)}>{cfg.label}</span>
                    {app.submittedAt && (
                      <span className="text-[11px] text-neutral-700">
                        {new Date(app.submittedAt).toLocaleDateString()}
                      </span>
                    )}
                    <button onClick={() => { setUrl(app.url); setAppName(app.name); window.scrollTo(0, 0); }}
                      className="p-1 text-neutral-600 hover:text-white transition-colors" title="Re-apply">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <a href={app.url} target="_blank" rel="noreferrer"
                      className="p-1 text-neutral-600 hover:text-white transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={() => deleteMutation.mutate(app.id)}
                      className="p-1 text-neutral-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
