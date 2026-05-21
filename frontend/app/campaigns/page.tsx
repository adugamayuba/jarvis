"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getContacts, getCampaigns, createCampaign } from "@/lib/api";
import { Campaign } from "@/types";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const DEFAULT_BODY = `Hi {{firstName}},

I came across your work at {{company}} and wanted to reach out.

Would you be open to a quick 15-minute call this week?`;

function CampaignRow({ campaign }: { campaign: Campaign }) {
  const [open, setOpen] = useState(false);
  const sentRate = campaign.contactIds.length > 0
    ? Math.round(((campaign.sentCount || 0) / campaign.contactIds.length) * 100)
    : 0;

  return (
    <div className={cn("border border-neutral-800 rounded-lg overflow-hidden", open && "border-neutral-700")}>
      <button
        className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-neutral-800/20 transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          campaign.status === "sent" ? "bg-emerald-500" :
          campaign.status === "sending" ? "bg-amber-400 animate-pulse" :
          campaign.status === "failed" ? "bg-red-500" : "bg-neutral-600"
        )} />
        <div className="flex-1 min-w-0 text-left">
          <p className="text-[13px] font-medium text-neutral-200 truncate">{campaign.name}</p>
          <p className="text-[11px] text-neutral-500 mt-0.5">{campaign.subject}</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-[13px] font-medium text-neutral-300 tabular-nums">{campaign.sentCount ?? 0}</p>
            <p className="text-[11px] text-neutral-600">sent</p>
          </div>
          <div className="text-right">
            <p className="text-[13px] font-medium text-neutral-300 tabular-nums">{campaign.contactIds.length}</p>
            <p className="text-[11px] text-neutral-600">recipients</p>
          </div>
          <span className={cn(
            "text-[11px] font-medium px-2 py-0.5 rounded w-16 text-center",
            campaign.status === "sent" ? "bg-emerald-500/10 text-emerald-400" :
            campaign.status === "sending" ? "bg-amber-500/10 text-amber-400" :
            campaign.status === "failed" ? "bg-red-500/10 text-red-400" :
            "bg-neutral-800 text-neutral-500"
          )}>
            {campaign.status}
          </span>
          {open ? <ChevronUp className="w-3.5 h-3.5 text-neutral-600" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-600" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-neutral-800 px-4 py-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] text-neutral-600 mb-1 uppercase tracking-wider">From</p>
            <p className="text-[13px] text-neutral-400">{campaign.fromName} &lt;{campaign.fromEmail}&gt;</p>
          </div>
          <div>
            <p className="text-[11px] text-neutral-600 mb-1 uppercase tracking-wider">Delivery rate</p>
            <p className="text-[13px] text-neutral-400">{sentRate}% ({campaign.sentCount} / {campaign.contactIds.length})</p>
          </div>
          <div className="col-span-2">
            <p className="text-[11px] text-neutral-600 mb-1 uppercase tracking-wider">Body preview</p>
            <p className="text-[12px] text-neutral-500 font-mono whitespace-pre-line line-clamp-3">{campaign.body}</p>
          </div>
          {campaign.createdAt && (
            <div className="col-span-2">
              <p className="text-[11px] text-neutral-600 mb-1 uppercase tracking-wider">Sent</p>
              <p className="text-[12px] text-neutral-500">{new Date(campaign.createdAt).toLocaleString()}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NewCampaignForm({ preselectedIds }: { preselectedIds: string[] }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [fromName, setFromName] = useState("Abel Adugam");
  const [fromEmail, setFromEmail] = useState("adugamhq@gmail.com");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(DEFAULT_BODY);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(preselectedIds));
  const [search, setSearch] = useState("");

  const { data: contactsData } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => getContacts({ limit: 1000 }),
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      createCampaign({ name, fromName, fromEmail, subject, body, contactIds: [...selectedIds] }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Campaign launched", { description: `Sending to ${res.data?.contactCount} contacts` });
        queryClient.invalidateQueries({ queryKey: ["campaigns"] });
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
        setName(""); setSubject(""); setBody(DEFAULT_BODY); setSelectedIds(new Set());
      } else {
        toast.error(res.error || "Failed");
      }
    },
    onError: () => toast.error("Cannot connect to backend"),
  });

  const contacts = (contactsData?.data || []).filter((c) => !!c.email);
  const filteredContacts = contacts.filter((c) =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Campaign name required");
    if (!fromEmail.trim()) return toast.error("From email required");
    if (!subject.trim()) return toast.error("Subject required");
    if (selectedIds.size === 0) return toast.error("Select at least one contact");
    sendMutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Details */}
      <div className="border border-neutral-800 rounded-lg p-4 space-y-3">
        <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Campaign details</p>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Campaign name"
          className="bg-neutral-800/50 border-neutral-700 text-neutral-200 placeholder:text-neutral-600 text-[13px] h-8"
        />
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder="Your name"
            className="bg-neutral-800/50 border-neutral-700 text-neutral-200 placeholder:text-neutral-600 text-[13px] h-8"
          />
          <Input
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="you@yourdomain.com"
            className="bg-neutral-800/50 border-neutral-700 text-neutral-200 placeholder:text-neutral-600 text-[13px] h-8"
          />
        </div>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Subject line — use {{company}}, {{firstName}}"
          className="bg-neutral-800/50 border-neutral-700 text-neutral-200 placeholder:text-neutral-600 text-[13px] h-8"
        />
        <div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="bg-neutral-800/50 border-neutral-700 text-neutral-300 placeholder:text-neutral-600 font-mono text-[12px] resize-none"
          />
          <p className="text-[11px] text-neutral-600 mt-1.5">
            Variables: {'{{firstName}}'} {'{{name}}'} {'{{company}}'} {'{{title}}'}
          </p>
        </div>
      </div>

      {/* Recipients */}
      <div className="border border-neutral-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
            Recipients — {selectedIds.size} selected
          </p>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set(filteredContacts.map((c) => c.id)))}
            className="text-[12px] text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            Select all ({filteredContacts.length})
          </button>
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter contacts..."
          className="mb-2 bg-neutral-800/50 border-neutral-700 text-neutral-200 placeholder:text-neutral-600 text-[13px] h-8"
        />
        <div className="max-h-52 overflow-y-auto space-y-px">
          {filteredContacts.length === 0 ? (
            <p className="text-[13px] text-neutral-600 py-4 text-center">
              No contacts with emails. Scrape some leads first.
            </p>
          ) : (
            filteredContacts.map((c) => {
              const isSelected = selectedIds.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedIds((prev) => {
                    const next = new Set(prev);
                    next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                    return next;
                  })}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-left transition-colors",
                    isSelected ? "bg-neutral-800" : "hover:bg-neutral-800/40"
                  )}
                >
                  <div className={cn(
                    "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                    isSelected ? "bg-white border-white" : "border-neutral-600"
                  )}>
                    {isSelected && (
                      <svg className="w-2 h-2 text-neutral-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[13px] text-neutral-300">{c.name}</span>
                    <span className="text-[11px] text-neutral-600 ml-2">{c.email}</span>
                  </div>
                  {c.emailSent && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </div>

      <Button
        type="submit"
        disabled={sendMutation.isPending || selectedIds.size === 0}
        className="w-full bg-white text-neutral-900 hover:bg-neutral-200 text-[13px] font-medium h-9"
      >
        {sendMutation.isPending ? (
          <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sending...</>
        ) : (
          `Send to ${selectedIds.size} contact${selectedIds.size !== 1 ? "s" : ""}`
        )}
      </Button>
    </form>
  );
}

function CampaignsInner() {
  const searchParams = useSearchParams();
  const preselectedIds = searchParams.get("contacts")?.split(",").filter(Boolean) || [];

  const { data: campaignsData } = useQuery({
    queryKey: ["campaigns"],
    queryFn: getCampaigns,
    refetchInterval: 15_000,
  });

  const campaigns = campaignsData?.data || [];

  return (
      <div className="p-4 sm:p-8 h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Campaigns</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">Write a template, pick contacts, send via your Gmail</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        {/* Left: History */}
        <div>
          <h2 className="text-[11px] font-medium text-neutral-500 uppercase tracking-widest mb-3">History</h2>
          {campaigns.length === 0 ? (
            <div className="border border-neutral-800 rounded-lg px-5 py-10 text-center">
              <p className="text-[13px] text-neutral-500">No campaigns yet.</p>
              <p className="text-[12px] text-neutral-600 mt-1">Create one on the right.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {campaigns.map((c) => <CampaignRow key={c.id} campaign={c} />)}
            </div>
          )}
        </div>

        {/* Right: New Campaign */}
        <div>
          <h2 className="text-[11px] font-medium text-neutral-500 uppercase tracking-widest mb-3">New campaign</h2>
          <NewCampaignForm preselectedIds={preselectedIds} />
        </div>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense>
      <CampaignsInner />
    </Suspense>
  );
}
