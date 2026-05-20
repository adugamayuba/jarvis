"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDrafts, bulkSend, GmailDraft } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Mail, Users, RefreshCw, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ParsedContact {
  name: string;
  email: string;
  company?: string;
}

// Parse pasted text like:
// "John Smith, john@acme.com, Acme Corp"
// "John Smith <john@acme.com>"
// "john@acme.com"
function parseContacts(text: string): ParsedContact[] {
  const lines = text
    .split(/\n|;/)
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.flatMap((line) => {
    // "Name <email>"
    const angleMatch = line.match(/^(.+?)\s*<([^>]+)>/);
    if (angleMatch) {
      return [{ name: angleMatch[1].trim(), email: angleMatch[2].trim() }];
    }

    // CSV: name, email, company
    const parts = line.split(",").map((p) => p.trim());
    const emailIdx = parts.findIndex((p) => p.includes("@"));
    if (emailIdx >= 0) {
      return [
        {
          name: parts[emailIdx - 1] || parts[0] || "",
          email: parts[emailIdx],
          company: parts[emailIdx + 1] || undefined,
        },
      ];
    }

    // Just an email
    if (line.includes("@")) {
      return [{ name: line.split("@")[0], email: line }];
    }

    return [];
  });
}

export default function BulkSendPage() {
  const [pastedList, setPastedList] = useState("");
  const [fromName, setFromName] = useState("Abel Adugam");
  const [fromEmail, setFromEmail] = useState("adugamhq@gmail.com");
  const [selectedDraft, setSelectedDraft] = useState<GmailDraft | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [campaignName, setCampaignName] = useState("");

  const queryClient = useQueryClient();

  const { data: draftsData, isLoading: draftsLoading, refetch: refetchDrafts } = useQuery({
    queryKey: ["drafts"],
    queryFn: getDrafts,
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      bulkSend({ contacts: parsedContacts, fromName, fromEmail, subject, body, campaignName }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Bulk send started", {
          description: `Sending to ${res.data?.contactCount} contacts`,
        });
        queryClient.invalidateQueries({ queryKey: ["campaigns"] });
        setPastedList("");
        setSelectedDraft(null);
      } else {
        toast.error(res.error || "Failed to send");
      }
    },
    onError: () => toast.error("Cannot connect to backend"),
  });

  const parsedContacts = parseContacts(pastedList);
  const drafts = draftsData?.data || [];

  function selectDraft(draft: GmailDraft) {
    setSelectedDraft(draft);
    setSubject(draft.subject);
    setBody(draft.body);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromEmail.trim()) return toast.error("From email required");
    if (!subject.trim()) return toast.error("Subject required");
    if (!body.trim()) return toast.error("Email body required");
    if (parsedContacts.length === 0) return toast.error("Paste at least one contact");
    sendMutation.mutate();
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Bulk Send</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">
          Paste a list of contacts, pick a Gmail draft, and send
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Contact list + sender */}
        <div className="space-y-4">
          {/* Paste contacts */}
          <div className="border border-neutral-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Contact list
              </p>
              {parsedContacts.length > 0 && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {parsedContacts.length} parsed
                </span>
              )}
            </div>
            <Textarea
              value={pastedList}
              onChange={(e) => setPastedList(e.target.value)}
              placeholder={`Paste names and emails, one per line:\n\nJohn Smith, john@acme.com\nJane Doe <jane@startup.io>\nsam@company.com`}
              rows={10}
              className="bg-neutral-800/50 border-neutral-700 text-neutral-300 placeholder:text-neutral-600 font-mono text-[12px] resize-none"
            />
            <p className="text-[11px] text-neutral-600">
              Accepted formats: "Name, email", "Name &lt;email&gt;", or just email
            </p>
          </div>

          {/* Parsed preview */}
          {parsedContacts.length > 0 && (
            <div className="border border-neutral-800 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-neutral-800">
                <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                  Preview
                </p>
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-neutral-800/50">
                {parsedContacts.map((c, i) => (
                  <div key={i} className="px-4 py-2 flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center text-[10px] text-neutral-500 shrink-0">
                      {c.name.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] text-neutral-300 truncate">{c.name || "—"}</p>
                      <p className="text-[11px] text-neutral-600 font-mono truncate">{c.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* From */}
          <div className="border border-neutral-800 rounded-lg p-4 space-y-3">
            <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Sender</p>
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
                placeholder="you@gmail.com"
                className="bg-neutral-800/50 border-neutral-700 text-neutral-200 placeholder:text-neutral-600 text-[13px] h-8"
              />
            </div>
            <Input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Campaign name (optional)"
              className="bg-neutral-800/50 border-neutral-700 text-neutral-200 placeholder:text-neutral-600 text-[13px] h-8"
            />
          </div>
        </div>

        {/* Right: Gmail drafts + email body */}
        <div className="space-y-4">
          {/* Gmail drafts */}
          <div className="border border-neutral-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Pick a Gmail draft
              </p>
              <button
                type="button"
                onClick={() => refetchDrafts()}
                className="text-neutral-600 hover:text-neutral-400 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {draftsLoading ? (
              <div className="flex items-center gap-2 py-4 text-neutral-600 text-[13px]">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading drafts...
              </div>
            ) : drafts.length === 0 ? (
              <p className="text-[13px] text-neutral-600 py-4">
                No drafts found. Create a draft in Gmail first, then refresh.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto">
                {drafts.map((draft) => (
                  <button
                    key={draft.id}
                    type="button"
                    onClick={() => selectDraft(draft)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg border transition-colors",
                      selectedDraft?.id === draft.id
                        ? "bg-neutral-800 border-neutral-600"
                        : "border-transparent hover:bg-neutral-800/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-medium text-neutral-300 truncate">
                        {draft.subject || "(no subject)"}
                      </p>
                      {selectedDraft?.id === draft.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-600 truncate mt-0.5">{draft.snippet}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Subject + body */}
          <div className="border border-neutral-800 rounded-lg p-4 space-y-3">
            <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
              Email content
            </p>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject — use {{firstName}}, {{company}}"
              className="bg-neutral-800/50 border-neutral-700 text-neutral-200 placeholder:text-neutral-600 text-[13px] h-8"
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={9}
              className="bg-neutral-800/50 border-neutral-700 text-neutral-300 font-mono text-[12px] resize-none placeholder:text-neutral-600"
              placeholder="Email body — use {{firstName}}, {{name}}, {{company}}"
            />
            <p className="text-[11px] text-neutral-600">
              Variables: {'{{firstName}}'} {'{{name}}'} {'{{company}}'}
            </p>
          </div>

          <Button
            type="submit"
            disabled={sendMutation.isPending || parsedContacts.length === 0}
            className="w-full bg-white text-neutral-900 hover:bg-neutral-200 text-[13px] font-medium h-9"
          >
            {sendMutation.isPending ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Sending...</>
            ) : (
              <><Mail className="w-3.5 h-3.5 mr-1.5" />Send to {parsedContacts.length} contact{parsedContacts.length !== 1 ? "s" : ""}</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
