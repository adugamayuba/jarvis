"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getContacts, deleteContact, deleteContacts, updateContact, createInvestor, backfillContactAudiences, bulkSetContactAudience, OutreachAudience } from "@/lib/api";
import { Contact } from "@/types";
import { AUDIENCE_COLORS, AUDIENCE_LABELS, inferContactAudience, OUTREACH_AUDIENCES } from "@/lib/outreachAudience";
import { toast } from "sonner";
import {
  Trash2,
  ExternalLink,
  CheckCircle2,
  Download,
  Mail,
  Copy,
  Send,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
        checked ? "bg-white border-white" : "border-neutral-600 hover:border-neutral-400"
      )}
    >
      {checked && (
        <svg className="w-2.5 h-2.5 text-neutral-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

function SourceBadge({ source }: { source: Contact["source"] }) {
  return (
    <span className={cn(
      "text-[11px] font-medium px-1.5 py-0.5 rounded capitalize",
      source === "crunchbase" ? "bg-orange-500/10 text-orange-400" :
      source === "linkedin" ? "bg-blue-500/10 text-blue-400" :
      source === "techcrunch" ? "bg-purple-500/10 text-purple-400" :
      source === "extension" ? "bg-violet-500/10 text-violet-400" :
      "bg-neutral-800 text-neutral-400"
    )}>
      {source === "extension" ? "web" : source}
    </span>
  );
}

function AudienceBadge({ contact }: { contact: Contact }) {
  const audience = inferContactAudience(contact);
  return (
    <span className={cn("text-[11px] font-medium px-1.5 py-0.5 rounded", AUDIENCE_COLORS[audience])}>
      {AUDIENCE_LABELS[audience]}
    </span>
  );
}

function ContactRow({
  contact,
  selected,
  onSelect,
  onDelete,
  onCopyEmails,
  onMarkReachedOut,
  onMoveToInvestors,
}: {
  contact: Contact;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onCopyEmails: () => void;
  onMarkReachedOut: () => void;
  onMoveToInvestors: () => void;
}) {
  return (
    <tr className={cn(
      "border-b border-neutral-800/40 hover:bg-neutral-800/20 transition-colors group",
      selected && "bg-neutral-800/30"
    )}>
      <td className="px-4 py-3">
        <Checkbox checked={selected} onChange={onSelect} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[11px] font-semibold text-neutral-400 shrink-0">
            {contact.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[13px] font-medium text-neutral-200">{contact.name}</p>
            {(contact.title || contact.company) && (
              <p className="text-[11px] text-neutral-500 mt-0.5">
                {[contact.title, contact.company].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {contact.email ? (
          <div className="space-y-0.5">
            <a href={`mailto:${contact.email}`}
              className="text-[12px] text-neutral-400 hover:text-white font-mono transition-colors block">
              {contact.email}
            </a>
            {contact.emails?.filter(e => e !== contact.email).map(e => (
              <a key={e} href={`mailto:${e}`}
                className="text-[11px] text-neutral-600 hover:text-neutral-400 font-mono transition-colors block">
                {e}
              </a>
            ))}
            {(contact.emails?.length ?? 0) > 1 && (
              <span className="text-[10px] text-neutral-700">
                +{(contact.emails?.length ?? 1) - 1} more
              </span>
            )}
          </div>
        ) : (
          <span className="text-[12px] text-neutral-700">No email</span>
        )}
      </td>
      <td className="px-4 py-3 max-w-xs">
        <p className="text-[12px] text-neutral-500 line-clamp-1">{contact.oneLiner || "—"}</p>
      </td>
      <td className="px-4 py-3">
        <AudienceBadge contact={contact} />
      </td>
      <td className="px-4 py-3">
        <SourceBadge source={contact.source} />
      </td>
      <td className="px-4 py-3">
        {contact.emailSent ? (
          <div className="flex items-center gap-1.5 text-[12px] text-emerald-500">
            <CheckCircle2 className="w-3 h-3" />
            Sent
          </div>
        ) : (
          <span className="text-[12px] text-neutral-700">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {contact.email && (
            <button
              onClick={onCopyEmails}
              className="text-neutral-600 hover:text-white transition-colors p-1 hover:bg-neutral-700 rounded"
              title="Copy all emails"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          {!contact.emailSent && contact.email && (
            <button
              onClick={onMarkReachedOut}
              className="text-neutral-600 hover:text-blue-400 transition-colors p-1 hover:bg-neutral-700 rounded"
              title="Mark as reached out"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
          {contact.emailSent && (
            <button
              onClick={onMoveToInvestors}
              className="text-neutral-600 hover:text-emerald-400 transition-colors p-1 hover:bg-neutral-700 rounded"
              title="Move to investor pipeline"
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
          )}
          {contact.crunchbaseUrl && (
            <a href={contact.crunchbaseUrl} target="_blank" rel="noreferrer"
              className="text-neutral-600 hover:text-neutral-400 transition-colors p-1">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {contact.linkedinUrl && (
            <a href={contact.linkedinUrl} target="_blank" rel="noreferrer"
              className="text-neutral-600 hover:text-blue-400 transition-colors p-1"
              title="LinkedIn profile">
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button onClick={onDelete} className="text-neutral-600 hover:text-red-400 transition-colors p-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [audienceFilter, setAudienceFilter] = useState<OutreachAudience | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => getContacts({ limit: 5000 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => {
      toast.success("Contact deleted");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => deleteContacts(ids),
    onSuccess: () => {
      toast.success(`${selected.size} contacts deleted`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  const bulkAudienceMutation = useMutation({
    mutationFn: ({ ids, audience }: { ids: string[]; audience: OutreachAudience }) =>
      bulkSetContactAudience(ids, audience),
    onSuccess: (res) => {
      const d = res.data;
      toast.success(`Audience updated`, {
        description: d ? `${d.updated} updated${d.conflicts ? ` · ${d.conflicts} locked (has email)` : ""}` : undefined,
      });
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: () => toast.error("Failed to update audience"),
  });

  const backfillMutation = useMutation({
    mutationFn: backfillContactAudiences,
    onSuccess: (res) => {
      toast.success(`Backfilled ${res.data?.updated ?? 0} contacts`);
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: () => toast.error("Backfill failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Contact> }) =>
      updateContact(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });

  function copyEmails(contact: Contact) {
    const emails = contact.emails && contact.emails.length > 0 
      ? contact.emails.join(", ") 
      : contact.email || "";
    
    if (!emails) {
      toast.error("No emails to copy");
      return;
    }

    navigator.clipboard.writeText(emails);
    toast.success("Emails copied to clipboard", {
      description: emails.length > 60 ? `${emails.substring(0, 60)}...` : emails
    });
  }

  function markReachedOut(contact: Contact) {
    updateMutation.mutate(
      { id: contact.id, updates: { emailSent: true, emailSentAt: new Date().toISOString() } },
      {
        onSuccess: () => {
          toast.success(`Marked ${contact.name} as reached out`);
        }
      }
    );
  }

  async function moveToInvestors(contact: Contact) {
    // Create investor from contact
    try {
      const res = await createInvestor({
        name: contact.name,
        email: contact.email || "",
        company: contact.company || "",
        status: "contacted",
        source: contact.source,
        linkedinUrl: contact.linkedinUrl,
        notes: `Moved from contacts on ${new Date().toLocaleDateString()}. Originally reached out.`,
      });
      
      if (res.success) {
        toast.success(`${contact.name} moved to investor pipeline`);
        // Optionally delete from contacts
        // deleteMutation.mutate(contact.id);
      }
    } catch (err) {
      toast.error("Failed to move to investors");
    }
  }

  const contacts = data?.data || [];

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q);
    const matchesFilter =
      filter === "all" ||
      (filter === "with-email" && !!c.email) ||
      (filter === "no-email" && !c.email) ||
      (filter === "emailed" && c.emailSent) ||
      (filter === "not-emailed" && !c.emailSent) ||
      c.source === filter;
    const matchesAudience =
      audienceFilter === "all" || inferContactAudience(c) === audienceFilter;
    return matchesSearch && matchesFilter && matchesAudience;
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id)));
  }

  function exportCsv() {
    const rows = [
      ["Name", "Email", "One-liner", "Title", "Company", "Source", "Emailed"],
      ...filtered.map((c) => [c.name, c.email, c.oneLiner, c.title || "", c.company || "", c.source, c.emailSent ? "yes" : "no"]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "contacts.csv";
    a.click();
  }

  return (
    <div className="p-4 sm:p-8 h-full overflow-y-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Contacts</h1>
          <p className="text-[13px] text-neutral-500 mt-0.5">
            {contacts.length} total · {contacts.filter((c) => c.email).length} with emails · isolated by outreach audience
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => backfillMutation.mutate()}
            disabled={backfillMutation.isPending}
            className="text-neutral-500 hover:text-white hover:bg-neutral-800 text-[12px] h-8"
          >
            {backfillMutation.isPending ? "Backfilling…" : "Backfill audiences"}
          </Button>
          <Button
          variant="ghost"
          size="sm"
          onClick={exportCsv}
          className="text-neutral-400 hover:text-white hover:bg-neutral-800 text-[12px] h-8 gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
        </div>
      </div>

      {/* Audience tabs */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={() => setAudienceFilter("all")}
          className={cn(
            "text-[12px] px-3 py-1.5 rounded-lg border transition-colors",
            audienceFilter === "all"
              ? "bg-white text-neutral-900 border-white"
              : "border-neutral-800 text-neutral-500 hover:text-neutral-300"
          )}
        >
          All audiences
        </button>
        {OUTREACH_AUDIENCES.map((a) => (
          <button
            key={a}
            onClick={() => setAudienceFilter(a)}
            className={cn(
              "text-[12px] px-3 py-1.5 rounded-lg border transition-colors",
              audienceFilter === a
                ? "bg-white text-neutral-900 border-white"
                : "border-neutral-800 text-neutral-500 hover:text-neutral-300"
            )}
          >
            {AUDIENCE_LABELS[a]}
            <span className="ml-1.5 text-neutral-600 tabular-nums">
              {contacts.filter((c) => inferContactAudience(c) === a).length}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, company..."
          className="max-w-xs bg-neutral-800/50 border-neutral-700 text-neutral-200 placeholder:text-neutral-600 text-[13px] h-8"
        />
        <Select value={filter} onValueChange={(v) => setFilter(v ?? "all")}>
          <SelectTrigger className="w-36 bg-neutral-800/50 border-neutral-700 text-neutral-400 text-[13px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-neutral-900 border-neutral-700">
            {[
              { value: "all", label: "All" },
              { value: "with-email", label: "With email" },
              { value: "no-email", label: "No email" },
              { value: "emailed", label: "Emailed" },
              { value: "not-emailed", label: "Not emailed" },
              { value: "crunchbase", label: "Crunchbase" },
              { value: "linkedin", label: "LinkedIn" },
              { value: "extension", label: "Web (extension)" },
            ].map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-neutral-200 text-[13px]">{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <span className="text-[12px] text-neutral-500">{selected.size} selected</span>
            <Select onValueChange={(v) => {
              if (v) bulkAudienceMutation.mutate({ ids: [...selected], audience: v as OutreachAudience });
            }}>
              <SelectTrigger className="w-40 bg-neutral-800/50 border-neutral-700 text-neutral-400 text-[12px] h-8">
                <SelectValue placeholder="Set audience" />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700">
                {OUTREACH_AUDIENCES.map((a) => (
                  <SelectItem key={a} value={a} className="text-neutral-200 text-[13px]">{AUDIENCE_LABELS[a]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => bulkDeleteMutation.mutate([...selected])}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-[12px] h-8 gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </Button>
            <a
              href={`/campaigns?contacts=${[...selected].join(",")}`}
              className="inline-flex items-center gap-1.5 bg-white text-neutral-900 hover:bg-neutral-200 text-[12px] font-medium h-8 px-3 rounded-md transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              Send campaign
            </a>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border border-neutral-800 rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] text-neutral-500">Loading...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] text-neutral-500">No contacts found.</p>
            <p className="text-[12px] text-neutral-600 mt-1">Try scraping a Crunchbase URL first.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="px-4 py-2.5 w-8">
                    <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} />
                  </th>
                  {["Person", "Email", "About", "Audience", "Source", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((contact) => (
                  <ContactRow
                    key={contact.id}
                    contact={contact}
                    selected={selected.has(contact.id)}
                    onSelect={() => toggleSelect(contact.id)}
                    onDelete={() => deleteMutation.mutate(contact.id)}
                    onCopyEmails={() => copyEmails(contact)}
                    onMarkReachedOut={() => markReachedOut(contact)}
                    onMoveToInvestors={() => moveToInvestors(contact)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-[11px] text-neutral-600 mt-3">
          {filtered.length} of {contacts.length} contacts
        </p>
      )}
    </div>
  );
}
