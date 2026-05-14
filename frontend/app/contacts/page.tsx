"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getContacts, deleteContact, deleteContacts } from "@/lib/api";
import { Contact } from "@/types";
import { toast } from "sonner";
import {
  Users,
  Mail,
  Search,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Circle,
  Filter,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function ContactRow({
  contact,
  selected,
  onSelect,
  onDelete,
}: {
  contact: Contact;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.015] transition-colors group">
      <td className="px-4 py-3.5">
        <button onClick={onSelect} className="flex items-center justify-center">
          {selected ? (
            <CheckCircle2 className="w-4 h-4 text-violet-400" />
          ) : (
            <Circle className="w-4 h-4 text-white/20 group-hover:text-white/40" />
          )}
        </button>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          {contact.profileImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={contact.profileImageUrl}
              alt={contact.name}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-600/30 flex items-center justify-center text-xs font-semibold text-violet-300">
              {contact.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-white">{contact.name}</p>
            <p className="text-xs text-white/40">
              {contact.title}
              {contact.title && contact.company ? " · " : ""}
              {contact.company}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        {contact.email ? (
          <a
            href={`mailto:${contact.email}`}
            className="text-sm text-violet-300 hover:text-violet-200 font-mono"
          >
            {contact.email}
          </a>
        ) : (
          <span className="text-xs text-white/20">—</span>
        )}
      </td>
      <td className="px-4 py-3.5 max-w-xs">
        <p className="text-xs text-white/50 line-clamp-2">
          {contact.oneLiner || "—"}
        </p>
      </td>
      <td className="px-4 py-3.5">
        <Badge
          variant="secondary"
          className={cn(
            "text-xs capitalize",
            contact.source === "crunchbase"
              ? "bg-orange-500/10 text-orange-400 border-0"
              : contact.source === "linkedin"
              ? "bg-blue-500/10 text-blue-400 border-0"
              : "bg-white/5 text-white/40 border-0"
          )}
        >
          {contact.source}
        </Badge>
      </td>
      <td className="px-4 py-3.5">
        {contact.emailSent ? (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Sent
          </span>
        ) : (
          <span className="text-xs text-white/25">—</span>
        )}
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {contact.crunchbaseUrl && (
            <a
              href={contact.crunchbaseUrl}
              target="_blank"
              rel="noreferrer"
              className="text-white/30 hover:text-white/70 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={onDelete}
            className="text-white/30 hover:text-red-400 transition-colors"
          >
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
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => getContacts({ limit: 1000 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteContact(id),
    onSuccess: () => {
      toast.success("Contact deleted");
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: () => toast.error("Failed to delete contact"),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => deleteContacts(ids),
    onSuccess: () => {
      toast.success(`${selected.size} contacts deleted`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: () => toast.error("Failed to delete contacts"),
  });

  const contacts = data?.data || [];

  const filtered = contacts.filter((c) => {
    const matchesSearch =
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "all" ||
      (filter === "with-email" && !!c.email) ||
      (filter === "no-email" && !c.email) ||
      (filter === "emailed" && c.emailSent) ||
      (filter === "not-emailed" && !c.emailSent) ||
      c.source === filter;

    return matchesSearch && matchesFilter;
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  }

  function exportCsv() {
    const rows = [
      ["Name", "Email", "One-liner", "Title", "Company", "Source", "Emailed"],
      ...filtered.map((c) => [
        c.name,
        c.email,
        c.oneLiner,
        c.title || "",
        c.company || "",
        c.source,
        c.emailSent ? "yes" : "no",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "jarvis-contacts.csv";
    link.click();
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-mono text-violet-400 uppercase tracking-widest">
              Contacts
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white">Your Leads</h1>
          <p className="text-white/40 text-sm mt-1">
            {contacts.length} contacts · {contacts.filter((c) => c.email).length} with emails
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={exportCsv}
          className="border-white/10 text-white/60 hover:text-white hover:bg-white/[0.04] gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts…"
            className="pl-9 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20"
          />
        </div>
        <Filter className="w-4 h-4 text-white/30 shrink-0" />
        <Select value={filter} onValueChange={(v) => setFilter(v ?? "all")}>
          <SelectTrigger className="w-44 bg-white/[0.03] border-white/[0.08] text-white/70">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#13131f] border-white/[0.08]">
            <SelectItem value="all" className="text-white/80">All contacts</SelectItem>
            <SelectItem value="with-email" className="text-white/80">With email</SelectItem>
            <SelectItem value="no-email" className="text-white/80">No email</SelectItem>
            <SelectItem value="emailed" className="text-white/80">Emailed</SelectItem>
            <SelectItem value="not-emailed" className="text-white/80">Not emailed</SelectItem>
            <SelectItem value="crunchbase" className="text-white/80">Crunchbase</SelectItem>
            <SelectItem value="linkedin" className="text-white/80">LinkedIn</SelectItem>
          </SelectContent>
        </Select>

        {selected.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => bulkDeleteMutation.mutate([...selected])}
            className="bg-red-500/15 text-red-400 hover:bg-red-500/25 border-0"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            Delete {selected.size}
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-white/30 text-sm">Loading contacts…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-white/10 mx-auto mb-3" />
            <p className="text-white/30 text-sm">No contacts found</p>
            <p className="text-white/20 text-xs mt-1">
              Try scraping a Crunchbase URL first
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3">
                    <button onClick={toggleAll}>
                      {selected.size === filtered.length && filtered.length > 0 ? (
                        <CheckCircle2 className="w-4 h-4 text-violet-400" />
                      ) : (
                        <Circle className="w-4 h-4 text-white/20" />
                      )}
                    </button>
                  </th>
                  {["Person", "Email", "One-liner", "Source", "Status", ""].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-xs font-medium text-white/30 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
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
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer count */}
      {filtered.length > 0 && (
        <p className="text-xs text-white/25 mt-3">
          Showing {filtered.length} of {contacts.length} contacts
          {selected.size > 0 && ` · ${selected.size} selected`}
        </p>
      )}

      {/* Send campaign shortcut */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-violet-600 rounded-xl px-5 py-3 flex items-center gap-4 shadow-xl shadow-violet-900/40">
          <span className="text-sm font-medium text-white">
            {selected.size} contact{selected.size !== 1 ? "s" : ""} selected
          </span>
          <a
            href={`/campaigns?contacts=${[...selected].join(",")}`}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            Send Campaign
          </a>
        </div>
      )}
    </div>
  );
}
