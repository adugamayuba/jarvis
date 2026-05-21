"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInvestors, createInvestor, updateInvestor, deleteInvestor,
  Investor, InvestorStatus,
} from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, Mail, ExternalLink, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const STATUS_CONFIG: Record<InvestorStatus, { label: string; color: string; bg: string }> = {
  prospect:  { label: "Prospect",   color: "text-neutral-400",  bg: "bg-neutral-800" },
  contacted: { label: "Contacted",  color: "text-blue-400",     bg: "bg-blue-500/10" },
  interested:{ label: "Interested", color: "text-amber-400",    bg: "bg-amber-500/10" },
  verbal:    { label: "Verbal",     color: "text-violet-400",   bg: "bg-violet-500/10" },
  committed: { label: "Committed",  color: "text-emerald-400",  bg: "bg-emerald-500/10" },
  closed:    { label: "Closed",     color: "text-emerald-500",  bg: "bg-emerald-500/15" },
  passed:    { label: "Passed",     color: "text-red-400",      bg: "bg-red-500/10" },
};

function fmt(n: number) {
  if (!n) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function StatusBadge({ status, onChange }: { status: InvestorStatus; onChange?: (s: InvestorStatus) => void }) {
  const cfg = STATUS_CONFIG[status];
  if (!onChange) return (
    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded", cfg.bg, cfg.color)}>{cfg.label}</span>
  );
  return (
    <Select value={status} onValueChange={(v) => onChange(v as InvestorStatus)}>
      <SelectTrigger className={cn("h-6 text-[11px] font-medium px-2 border-0 w-28", cfg.bg, cfg.color)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-neutral-900 border-neutral-700">
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <SelectItem key={k} value={k} className={cn("text-[12px]", v.color)}>{v.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface AddInvestorModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (i: Omit<Investor, "id">) => void;
  initial?: Partial<Investor>;
}

function InvestorModal({ open, onClose, onSave, initial }: AddInvestorModalProps) {
  const [form, setForm] = useState<Partial<Investor>>(initial || { status: "prospect", round: "seed" });
  const set = (k: keyof Investor, v: string | number) => setForm(p => ({ ...p, [k]: v }));

  function handleSave() {
    if (!form.name?.trim()) { toast.error("Name required"); return; }
    onSave({ name: form.name, email: form.email || "", company: form.company || "",
      title: form.title || "", location: form.location || "", status: form.status || "prospect",
      amount: form.amount || 0, notes: form.notes || "", source: form.source || "",
      linkedinUrl: form.linkedinUrl || "", twitterUrl: form.twitterUrl || "",
      checkSize: form.checkSize || "", round: form.round || "seed",
    });
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-neutral-950 border-neutral-800 max-w-md p-6 gap-4">
        <h2 className="text-[15px] font-semibold text-white">{initial?.name ? "Edit investor" : "Add investor"}</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="text-[11px] text-neutral-500 mb-1 block">Name *</label>
              <Input value={form.name || ""} onChange={e => set("name", e.target.value)}
                placeholder="John Smith" className="bg-neutral-800/50 border-neutral-700 text-white text-[13px] h-8" />
            </div>
            <div>
              <label className="text-[11px] text-neutral-500 mb-1 block">Email</label>
              <Input value={form.email || ""} onChange={e => set("email", e.target.value)}
                placeholder="john@fund.com" className="bg-neutral-800/50 border-neutral-700 text-white text-[13px] h-8" />
            </div>
            <div>
              <label className="text-[11px] text-neutral-500 mb-1 block">Company / Fund</label>
              <Input value={form.company || ""} onChange={e => set("company", e.target.value)}
                placeholder="Sequoia" className="bg-neutral-800/50 border-neutral-700 text-white text-[13px] h-8" />
            </div>
            <div>
              <label className="text-[11px] text-neutral-500 mb-1 block">Title</label>
              <Input value={form.title || ""} onChange={e => set("title", e.target.value)}
                placeholder="Angel Investor" className="bg-neutral-800/50 border-neutral-700 text-white text-[13px] h-8" />
            </div>
            <div>
              <label className="text-[11px] text-neutral-500 mb-1 block">Location</label>
              <Input value={form.location || ""} onChange={e => set("location", e.target.value)}
                placeholder="San Francisco, US" className="bg-neutral-800/50 border-neutral-700 text-white text-[13px] h-8" />
            </div>
            <div>
              <label className="text-[11px] text-neutral-500 mb-1 block">Status</label>
              <Select value={form.status || "prospect"} onValueChange={(v) => v && set("status", v)}>
                <SelectTrigger className="bg-neutral-800/50 border-neutral-700 text-white text-[13px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700">
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k} className={cn("text-[12px]", v.color)}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[11px] text-neutral-500 mb-1 block">Amount (USD)</label>
              <Input type="number" value={form.amount || ""} onChange={e => set("amount", Number(e.target.value))}
                placeholder="25000" className="bg-neutral-800/50 border-neutral-700 text-white text-[13px] h-8" />
            </div>
            <div>
              <label className="text-[11px] text-neutral-500 mb-1 block">Check Size Range</label>
              <Input value={form.checkSize || ""} onChange={e => set("checkSize", e.target.value)}
                placeholder="$10K–$100K" className="bg-neutral-800/50 border-neutral-700 text-white text-[13px] h-8" />
            </div>
            <div>
              <label className="text-[11px] text-neutral-500 mb-1 block">Source</label>
              <Input value={form.source || ""} onChange={e => set("source", e.target.value)}
                placeholder="Crunchbase, Twitter..." className="bg-neutral-800/50 border-neutral-700 text-white text-[13px] h-8" />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-neutral-500 mb-1 block">Notes</label>
              <Input value={form.notes || ""} onChange={e => set("notes", e.target.value)}
                placeholder="Verbal commitment, follow up Friday..." className="bg-neutral-800/50 border-neutral-700 text-white text-[13px] h-8" />
            </div>
            <div>
              <label className="text-[11px] text-neutral-500 mb-1 block">LinkedIn URL</label>
              <Input value={form.linkedinUrl || ""} onChange={e => set("linkedinUrl", e.target.value)}
                placeholder="linkedin.com/in/..." className="bg-neutral-800/50 border-neutral-700 text-white text-[13px] h-8" />
            </div>
            <div>
              <label className="text-[11px] text-neutral-500 mb-1 block">Twitter / X</label>
              <Input value={form.twitterUrl || ""} onChange={e => set("twitterUrl", e.target.value)}
                placeholder="twitter.com/..." className="bg-neutral-800/50 border-neutral-700 text-white text-[13px] h-8" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button onClick={handleSave} className="flex-1 bg-white text-neutral-900 hover:bg-neutral-200 text-[13px] h-9">
            <Check className="w-3.5 h-3.5 mr-1.5" /> Save
          </Button>
          <Button onClick={onClose} variant="ghost" className="text-neutral-500 hover:text-white h-9">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function InvestorsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [editInvestor, setEditInvestor] = useState<Investor | null>(null);
  const [filter, setFilter] = useState<InvestorStatus | "all">("all");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["investors"], queryFn: getInvestors });

  const createMutation = useMutation({
    mutationFn: (i: Omit<Investor, "id">) => createInvestor(i),
    onSuccess: () => { toast.success("Investor added"); queryClient.invalidateQueries({ queryKey: ["investors"] }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Investor> }) => updateInvestor(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["investors"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInvestor(id),
    onSuccess: () => { toast.success("Removed"); queryClient.invalidateQueries({ queryKey: ["investors"] }); },
  });

  const investors = data?.data || [];

  const filtered = investors.filter(inv => {
    const matchesFilter = filter === "all" || inv.status === filter;
    const matchesSearch = !search ||
      inv.name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.email?.toLowerCase().includes(search.toLowerCase()) ||
      inv.company?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalCommitted = investors
    .filter(i => ["verbal", "committed", "closed"].includes(i.status))
    .reduce((s, i) => s + (i.amount || 0), 0);

  const GOAL = 10_000_000;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 sm:p-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-start gap-3 sm:justify-between">
          <div>
            <p className="text-[11px] font-mono text-neutral-600 uppercase tracking-widest mb-1">Seed Round</p>
            <h1 className="text-xl font-semibold text-white">Investor Pipeline</h1>
            <p className="text-[13px] text-neutral-500 mt-0.5">
              {investors.length} investors · {fmt(totalCommitted)} of {fmt(GOAL)} committed
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)}
            className="bg-white text-neutral-900 hover:bg-neutral-200 text-[13px] h-8 gap-1.5 w-full sm:w-auto">
            <Plus className="w-3.5 h-3.5" /> Add investor
          </Button>
        </div>

        {/* Progress */}
        <div className="border border-neutral-800 rounded-xl p-4 mb-6">
          <div className="flex items-end justify-between mb-2">
            <p className="text-[12px] text-neutral-500">Seed Round Progress</p>
            <p className="text-[12px] text-neutral-400 tabular-nums">{fmt(totalCommitted)} / {fmt(GOAL)}</p>
          </div>
          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-white rounded-full transition-all"
              style={{ width: `${Math.min((totalCommitted / GOAL) * 100, 100)}%` }} />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
              const count = investors.filter(i => i.status === status).length;
              return (
                <button key={status} onClick={() => setFilter(filter === status as InvestorStatus ? "all" : status as InvestorStatus)}
                  className={cn("text-center px-2 py-1.5 rounded-lg border transition-colors",
                    filter === status ? "border-neutral-600 bg-neutral-800" : "border-neutral-800 hover:border-neutral-700"
                  )}>
                  <p className={cn("text-[13px] font-semibold tabular-nums", cfg.color)}>{count}</p>
                  <p className="text-[10px] text-neutral-600">{cfg.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, company..."
            className="bg-neutral-800/50 border-neutral-700 text-white placeholder:text-neutral-600 text-[13px] h-8 sm:max-w-xs" />
          {filter !== "all" && (
            <Button variant="ghost" size="sm" onClick={() => setFilter("all")}
              className="text-neutral-500 hover:text-white h-8 text-[12px]">
              Clear filter
            </Button>
          )}
        </div>

        {/* Table / Cards */}
        {isLoading ? (
          <div className="text-center py-12 text-neutral-500 text-[13px]">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="border border-neutral-800 rounded-xl p-12 text-center">
            <p className="text-[13px] text-neutral-500">No investors yet.</p>
            <button onClick={() => setAddOpen(true)} className="text-[13px] text-neutral-400 hover:text-white underline underline-offset-2 mt-1 inline-block transition-colors">
              Add your first investor →
            </button>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block border border-neutral-800 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-800">
                    {["Investor", "Email", "Amount", "Status", "Notes", ""].map(h => (
                      <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(inv => (
                    <tr key={inv.id} className="border-b border-neutral-800/40 hover:bg-neutral-800/15 transition-colors group">
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-medium text-neutral-200">{inv.name}</p>
                        <p className="text-[11px] text-neutral-600">
                          {[inv.title, inv.company, inv.location].filter(Boolean).join(" · ")}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {inv.email ? (
                          <a href={`mailto:${inv.email}`} className="text-[12px] text-neutral-400 hover:text-white font-mono transition-colors flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {inv.email}
                          </a>
                        ) : <span className="text-neutral-700 text-[12px]">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[13px] text-neutral-300 tabular-nums font-medium">{fmt(inv.amount || 0)}</p>
                        {inv.checkSize && <p className="text-[11px] text-neutral-600">{inv.checkSize}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={inv.status}
                          onChange={(s) => inv.id && updateMutation.mutate({ id: inv.id, updates: { status: s } })} />
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-[12px] text-neutral-500 truncate">{inv.notes || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {inv.linkedinUrl && (
                            <a href={inv.linkedinUrl.startsWith("http") ? inv.linkedinUrl : `https://${inv.linkedinUrl}`}
                              target="_blank" rel="noreferrer" className="text-neutral-600 hover:text-blue-400 transition-colors">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button onClick={() => setEditInvestor(inv)}
                            className="text-neutral-600 hover:text-white transition-colors text-[11px]">Edit</button>
                          <button onClick={() => inv.id && deleteMutation.mutate(inv.id)}
                            className="text-neutral-600 hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-2">
              {filtered.map(inv => (
                <div key={inv.id} className="border border-neutral-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-[14px] font-medium text-neutral-200">{inv.name}</p>
                      <p className="text-[11px] text-neutral-600">
                        {[inv.title, inv.company].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <StatusBadge status={inv.status}
                      onChange={(s) => inv.id && updateMutation.mutate({ id: inv.id, updates: { status: s } })} />
                  </div>
                  <div className="flex flex-wrap gap-3 text-[12px]">
                    {inv.email && (
                      <a href={`mailto:${inv.email}`} className="text-neutral-400 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {inv.email}
                      </a>
                    )}
                    {(inv.amount || 0) > 0 && (
                      <span className="text-emerald-400 font-medium">{fmt(inv.amount || 0)}</span>
                    )}
                  </div>
                  {inv.notes && <p className="text-[12px] text-neutral-500 mt-2">{inv.notes}</p>}
                  <div className="flex gap-3 mt-3 pt-3 border-t border-neutral-800">
                    <button onClick={() => setEditInvestor(inv)}
                      className="text-[12px] text-neutral-500 hover:text-white transition-colors">Edit</button>
                    <button onClick={() => inv.id && deleteMutation.mutate(inv.id)}
                      className="text-[12px] text-red-500/60 hover:text-red-400 transition-colors">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {filtered.length > 0 && (
          <p className="text-[11px] text-neutral-600 mt-3">{filtered.length} of {investors.length} investors</p>
        )}
      </div>

      {/* Modals */}
      <InvestorModal open={addOpen} onClose={() => setAddOpen(false)}
        onSave={(i) => createMutation.mutate(i)} />
      {editInvestor && (
        <InvestorModal open={!!editInvestor} onClose={() => setEditInvestor(null)}
          initial={editInvestor}
          onSave={(updates) => {
            if (editInvestor.id) updateMutation.mutate({ id: editInvestor.id, updates });
            setEditInvestor(null);
          }} />
      )}
    </div>
  );
}
