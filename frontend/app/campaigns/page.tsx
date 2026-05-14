"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getContacts, getCampaigns, createCampaign } from "@/lib/api";
import { Campaign, Contact } from "@/types";
import { toast } from "sonner";
import {
  Mail,
  Send,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Users,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const DEFAULT_TEMPLATE = `Hi {{firstName}},

I came across your work at {{company}} and was really impressed by what you're building.

I'd love to connect and explore if there's any way we can collaborate or add value to what you're doing.

Would you be open to a quick 15-minute chat this week?

Best,`;

function CampaignCard({ campaign }: { campaign: Campaign }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        className="w-full px-5 py-4 flex items-center gap-4 text-left hover:bg-white/[0.015] transition-colors"
        onClick={() => setOpen((v) => !v)}
      >
        <div
          className={cn(
            "w-2 h-2 rounded-full shrink-0",
            campaign.status === "sent"
              ? "bg-emerald-400"
              : campaign.status === "sending"
              ? "bg-amber-400 animate-pulse"
              : campaign.status === "failed"
              ? "bg-red-400"
              : "bg-white/20"
          )}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{campaign.name}</p>
          <p className="text-xs text-white/40 mt-0.5">
            {campaign.subject} · {campaign.contactIds.length} recipients
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {campaign.status === "sent" && (
            <div className="text-right">
              <p className="text-sm font-semibold text-emerald-400">
                {campaign.sentCount}
              </p>
              <p className="text-xs text-white/30">sent</p>
            </div>
          )}
          <span
            className={cn(
              "text-xs px-2.5 py-1 rounded-full font-medium",
              campaign.status === "sent"
                ? "bg-emerald-500/10 text-emerald-400"
                : campaign.status === "sending"
                ? "bg-amber-500/10 text-amber-400"
                : campaign.status === "failed"
                ? "bg-red-500/10 text-red-400"
                : "bg-white/5 text-white/40"
            )}
          >
            {campaign.status}
          </span>
          {open ? (
            <ChevronUp className="w-4 h-4 text-white/30" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/30" />
          )}
        </div>
      </button>
      {open && (
        <div className="border-t border-white/[0.04] px-5 py-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-white/30 mb-1">From</p>
            <p className="text-white/70">
              {campaign.fromName} &lt;{campaign.fromEmail}&gt;
            </p>
          </div>
          <div>
            <p className="text-xs text-white/30 mb-1">Subject</p>
            <p className="text-white/70">{campaign.subject}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs text-white/30 mb-1">Body preview</p>
            <p className="text-white/50 text-xs whitespace-pre-line line-clamp-4">
              {campaign.body}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/30 mb-1">Sent</p>
            <p className="text-emerald-400">{campaign.sentCount ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-white/30 mb-1">Failed</p>
            <p className="text-red-400">{campaign.failedCount ?? "—"}</p>
          </div>
          {campaign.createdAt && (
            <div className="col-span-2">
              <p className="text-xs text-white/30 mb-1">Created</p>
              <p className="text-white/40 text-xs">
                {new Date(campaign.createdAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CampaignStatusIcon({ status }: { status: Campaign["status"] }) {
  if (status === "sent") return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-red-400" />;
  if (status === "sending") return <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />;
  return <Clock className="w-4 h-4 text-white/30" />;
}
// Suppress unused warning
void CampaignStatusIcon;

function NewCampaignForm({ preselectedIds }: { preselectedIds: string[] }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(DEFAULT_TEMPLATE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(preselectedIds)
  );
  const [contactSearch, setContactSearch] = useState("");

  const { data: contactsData } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => getContacts({ limit: 1000 }),
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      createCampaign({
        name,
        fromName,
        fromEmail,
        subject,
        body,
        contactIds: [...selectedIds],
      }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Campaign launched!", {
          description: `Sending to ${res.data?.contactCount} contacts`,
        });
        queryClient.invalidateQueries({ queryKey: ["campaigns"] });
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
        setName("");
        setSubject("");
        setBody(DEFAULT_TEMPLATE);
        setSelectedIds(new Set());
      } else {
        toast.error(res.error || "Failed to send campaign");
      }
    },
    onError: () => toast.error("Failed to connect to backend"),
  });

  const contacts = contactsData?.data || [];
  const withEmail = contacts.filter((c) => !!c.email);
  const filtered = withEmail.filter(
    (c) =>
      !contactSearch ||
      c.name?.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.email?.toLowerCase().includes(contactSearch.toLowerCase()) ||
      c.company?.toLowerCase().includes(contactSearch.toLowerCase())
  );

  function toggleContact(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(filtered.map((c) => c.id)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error("Campaign name is required");
    if (!fromEmail.trim()) return toast.error("From email is required");
    if (!subject.trim()) return toast.error("Subject is required");
    if (!body.trim()) return toast.error("Email body is required");
    if (selectedIds.size === 0) return toast.error("Select at least one contact");
    sendMutation.mutate();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Campaign Details */}
      <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
          Campaign Details
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs text-white/40 mb-1.5 block">
              Campaign Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. YC W24 Founders Outreach"
              className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">
              From Name
            </label>
            <Input
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="Your Name"
              className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">
              From Email
            </label>
            <Input
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="you@yourdomain.com"
              className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-white/40 mb-1.5 block">
              Subject Line
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Quick question about {{company}}"
              className="bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-white/40">Email Body</label>
            <span className="text-xs text-white/20 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Use {`{{firstName}}`}, {`{{company}}`}, {`{{name}}`}
            </span>
          </div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="bg-white/[0.03] border-white/[0.08] text-white/80 placeholder:text-white/20 font-mono text-sm resize-none"
          />
        </div>
      </div>

      {/* Contact Selector */}
      <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">
              Recipients
            </h3>
            <p className="text-xs text-white/30 mt-0.5">
              {selectedIds.size} selected · only contacts with emails shown
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={selectAll}
            className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 text-xs"
          >
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Select All ({filtered.length})
          </Button>
        </div>

        <div className="relative mb-3">
          <Input
            value={contactSearch}
            onChange={(e) => setContactSearch(e.target.value)}
            placeholder="Search contacts…"
            className="bg-white/[0.02] border-white/[0.06] text-white/70 placeholder:text-white/20 text-sm"
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-white/20 py-6">
              No contacts with emails. Scrape some leads first.
            </p>
          ) : (
            filtered.map((contact) => {
              const isSelected = selectedIds.has(contact.id);
              return (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => toggleContact(contact.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                    isSelected
                      ? "bg-violet-500/10 border border-violet-500/20"
                      : "hover:bg-white/[0.03] border border-transparent"
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                      isSelected
                        ? "bg-violet-500 border-violet-500"
                        : "border-white/20"
                    )}
                  >
                    {isSelected && (
                      <svg
                        className="w-2.5 h-2.5 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">
                      {contact.name}
                    </p>
                    <p className="text-xs text-white/30 truncate">
                      {contact.email}
                      {contact.company ? ` · ${contact.company}` : ""}
                    </p>
                  </div>
                  {contact.emailSent && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400/60 shrink-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={sendMutation.isPending || selectedIds.size === 0}
        className="w-full bg-violet-600 hover:bg-violet-500 text-white h-11 text-sm font-medium"
      >
        {sendMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Sending campaign…
          </>
        ) : (
          <>
            <Send className="w-4 h-4 mr-2" />
            Send to {selectedIds.size} contact{selectedIds.size !== 1 ? "s" : ""}
          </>
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
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-mono text-violet-400 uppercase tracking-widest">
            Campaigns
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white">Email Campaigns</h1>
        <p className="text-white/40 text-sm mt-1">
          Send personalized outreach at scale using Resend
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: New Campaign */}
        <div>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">
            New Campaign
          </h2>
          <NewCampaignForm preselectedIds={preselectedIds} />
        </div>

        {/* Right: Past Campaigns */}
        <div>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">
            Campaign History
          </h2>
          {campaigns.length === 0 ? (
            <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-12 text-center">
              <Mail className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-sm">No campaigns sent yet</p>
              <p className="text-white/20 text-xs mt-1">
                Create your first campaign on the left
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          )}
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
