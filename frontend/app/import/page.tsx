"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkImportContacts, startEmailFinder, getEmailFinderJob,
  getEmailFinderJobs, patchMissingEmails, CsvContact, EmailFinderJob,
} from "@/lib/api";
import { toast } from "sonner";
import {
  Upload, Play, RefreshCw, CheckCircle2, Loader2,
  AlertCircle, FileText, Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function parseCsvContacts(csv: string): CsvContact[] {
  const lines = csv.split("\n").filter(Boolean);
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const hasInvestorType = header.includes("investor type");

  return lines.slice(1).flatMap((line) => {
    // Handle quoted CSV fields
    const cols: string[] = [];
    let current = "";
    let inQuote = false;
    for (const char of line) {
      if (char === '"') { inQuote = !inQuote; continue; }
      if (char === "," && !inQuote) { cols.push(current.trim()); current = ""; continue; }
      current += char;
    }
    cols.push(current.trim());

    const name = cols[0]?.trim();
    const url = cols[1]?.trim();
    if (!name || !url) return [];

    if (hasInvestorType) {
      // angel-investors CSV: Name, URL, InvestorType, NumInvestments, NumExits, Location
      return [{
        name,
        crunchbaseUrl: url,
        investorType: cols[2]?.trim() || "",
        numInvestments: parseInt(cols[3] || "0") || 0,
        numExits: parseInt(cols[4] || "0") || 0,
        location: cols[5]?.trim() || "",
      }];
    } else {
      // list CSV: Name, URL, NumInvestments, NumExits, Location
      return [{
        name,
        crunchbaseUrl: url,
        numInvestments: parseInt(cols[2] || "0") || 0,
        numExits: parseInt(cols[3] || "0") || 0,
        location: cols[4]?.trim() || "",
      }];
    }
  });
}

function JobCard({ job, onRefresh }: { job: EmailFinderJob; onRefresh: () => void }) {
  useEffect(() => {
    if (job.status !== "running") return;
    const t = setInterval(onRefresh, 10_000);
    return () => clearInterval(t);
  }, [job.status, onRefresh]);

  const pct = job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0;

  return (
    <div className="border border-neutral-800 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {job.status === "running" ? (
              <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            ) : job.status === "completed" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            )}
            <span className={cn("text-[12px] font-medium capitalize",
              job.status === "running" ? "text-amber-400" :
              job.status === "completed" ? "text-emerald-400" : "text-red-400"
            )}>{job.status}</span>
          </div>
          <p className="text-[13px] text-neutral-300">
            {job.status === "running" ? `Finding emails... ${pct}% complete` :
             job.status === "completed" ? `Done — ${job.found} emails found out of ${job.total} contacts` :
             `Failed: ${job.error}`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-semibold text-white tabular-nums">{job.found ?? 0}</p>
          <p className="text-[11px] text-neutral-600">emails found</p>
        </div>
      </div>

      {job.total > 0 && (
        <>
          <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-[11px] text-neutral-600">
            <span>{job.processed ?? 0} / {job.total} processed</span>
            <span>{pct}%</span>
          </div>
        </>
      )}

      {job.startedAt && (
        <p className="text-[11px] text-neutral-700 mt-2">
          Started {new Date(job.startedAt).toLocaleString()}
          {job.completedAt && ` · Finished ${new Date(job.completedAt).toLocaleString()}`}
        </p>
      )}
    </div>
  );
}

export default function ImportPage() {
  const [files, setFiles] = useState<{ name: string; contacts: CsvContact[] }[]>([]);
  const [importing, setImporting] = useState(false);
  const [patching, setPatching] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [patchResult, setPatchResult] = useState<{ patched: number } | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: jobsData, refetch: refetchJobs } = useQuery({
    queryKey: ["emailFinderJobs"],
    queryFn: getEmailFinderJobs,
    refetchInterval: activeJobId ? 8_000 : false,
  });

  const jobs = jobsData?.data || [];

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    Array.from(fileList).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const csv = e.target?.result as string;
        const contacts = parseCsvContacts(csv);
        setFiles((prev) => {
          const exists = prev.find(f => f.name === file.name);
          if (exists) return prev;
          return [...prev, { name: file.name, contacts }];
        });
        toast.success(`Parsed ${contacts.length} contacts from ${file.name}`);
      };
      reader.readAsText(file);
    });
  }

  async function handleImport() {
    const allContacts = files.flatMap(f => f.contacts);
    if (allContacts.length === 0) { toast.error("No contacts to import"); return; }
    setImporting(true);
    try {
      // Import in chunks of 200 to stay well under request size limits
      const chunkSize = 200;
      let totalImported = 0;
      let totalSkipped = 0;
      for (let i = 0; i < allContacts.length; i += chunkSize) {
        const chunk = allContacts.slice(i, i + chunkSize);
        const res = await bulkImportContacts(chunk);
        if (res.success && res.data) {
          totalImported += res.data.imported;
          totalSkipped += res.data.skipped;
        }
      }
      setImportResult({ imported: totalImported, skipped: totalSkipped });
      toast.success(`Imported ${totalImported} contacts`, { description: `${totalSkipped} already existed` });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error("Import failed", { description: msg });
    } finally {
      setImporting(false);
    }
  }

  async function handlePatch() {
    setPatching(true);
    try {
      const res = await patchMissingEmails();
      if (res.success && res.data) {
        setPatchResult({ patched: res.data.patched });
        toast.success(`Fixed ${res.data.patched} contacts`, { description: "Now ready for email finder" });
      }
    } catch {
      toast.error("Patch failed");
    } finally {
      setPatching(false);
    }
  }

  async function handleStartEmailFinder() {
    try {
      const res = await startEmailFinder();
      if (res.success && res.data) {
        setActiveJobId(res.data.jobId);
        toast.success("Email finder started!", { description: "Running in background — this will take a while for 2,000 contacts" });
        refetchJobs();
      }
    } catch {
      toast.error("Failed to start email finder");
    }
  }

  const totalContacts = files.reduce((s, f) => s + f.contacts.length, 0);

  return (
    <div className="p-4 sm:p-8 h-full overflow-y-auto max-w-3xl">
      <div className="mb-8">
        <p className="text-[11px] font-mono text-neutral-600 uppercase tracking-widest mb-1">Bulk Import</p>
        <h1 className="text-xl font-semibold text-white">Import &amp; Find Emails</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">
          Upload your Crunchbase CSVs, import 2,000 investors, then find their emails automatically
        </p>
      </div>

      {/* Step 1: Upload */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-neutral-900">1</div>
          <h2 className="text-[13px] font-medium text-neutral-300">Upload CSV files</h2>
        </div>
        <div
          className={cn("border-2 border-dashed border-neutral-700 rounded-xl p-8 text-center cursor-pointer hover:border-neutral-600 transition-colors",
            files.length > 0 && "border-neutral-600 bg-neutral-900/20"
          )}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        >
          <Upload className="w-8 h-8 text-neutral-600 mx-auto mb-3" />
          <p className="text-[13px] text-neutral-400">Drop your CSV files here or click to browse</p>
          <p className="text-[12px] text-neutral-600 mt-1">Supports Crunchbase export format</p>
          <input ref={fileInputRef} type="file" accept=".csv" multiple className="hidden"
            onChange={(e) => handleFiles(e.target.files)} />
        </div>

        {files.length > 0 && (
          <div className="mt-3 space-y-2">
            {files.map((f) => (
              <div key={f.name} className="flex items-center gap-3 px-4 py-3 border border-neutral-800 rounded-lg">
                <FileText className="w-4 h-4 text-neutral-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-neutral-300 truncate">{f.name}</p>
                  <p className="text-[11px] text-neutral-600">{f.contacts.length.toLocaleString()} contacts parsed</p>
                </div>
                <button onClick={() => setFiles(p => p.filter(x => x.name !== f.name))}
                  className="text-neutral-700 hover:text-red-400 transition-colors text-[12px]">Remove</button>
              </div>
            ))}
            <div className="px-4 py-2 border border-neutral-800 rounded-lg flex items-center justify-between">
              <span className="text-[13px] text-neutral-400">
                <span className="font-semibold text-white">{totalContacts.toLocaleString()}</span> total contacts
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Import */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-neutral-900">2</div>
          <h2 className="text-[13px] font-medium text-neutral-300">Import to pipeline</h2>
        </div>
        <div className="border border-neutral-800 rounded-xl p-4">
          <p className="text-[13px] text-neutral-400 mb-4">
            Imports all {totalContacts.toLocaleString()} contacts to your Contacts database. Skips duplicates automatically.
          </p>
          {importResult && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-[13px] text-emerald-400">
                <span className="font-semibold">{importResult.imported.toLocaleString()} imported</span>
                {importResult.skipped > 0 && ` · ${importResult.skipped} already existed`}
              </p>
            </div>
          )}
          <Button
            onClick={handleImport}
            disabled={importing || totalContacts === 0}
            className="bg-white text-neutral-900 hover:bg-neutral-200 text-[13px] h-9 gap-1.5"
          >
            {importing ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Importing...</>
            ) : (
              <><Upload className="w-3.5 h-3.5" />Import {totalContacts.toLocaleString()} contacts</>
            )}
          </Button>
        </div>
      </div>

      {/* Step 2b: Patch existing contacts (one-time fix) */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-neutral-700 flex items-center justify-center text-[10px] font-bold text-neutral-300">2b</div>
          <h2 className="text-[13px] font-medium text-neutral-300">Fix existing contacts <span className="text-neutral-600 font-normal">(one-time — if you imported before today)</span></h2>
        </div>
        <div className="border border-neutral-800 rounded-xl p-4">
          <p className="text-[13px] text-neutral-400 mb-3">
            If you imported contacts before this fix, they&apos;re missing the <code className="text-neutral-500 font-mono text-[12px]">email</code> field.
            This patches them so the email finder can find them.
          </p>
          {patchResult && (
            <div className="flex items-center gap-2 mb-3 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <p className="text-[12px] text-emerald-400">{patchResult.patched} contacts patched and ready</p>
            </div>
          )}
          <Button onClick={handlePatch} disabled={patching}
            variant="outline" className="border-neutral-700 text-neutral-400 hover:text-white text-[13px] h-8 gap-1.5">
            {patching ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Patching...</> : "Patch existing contacts"}
          </Button>
        </div>
      </div>

      {/* Step 3: Find emails */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-neutral-900">3</div>
          <h2 className="text-[13px] font-medium text-neutral-300">Find emails automatically</h2>
        </div>
        <div className="border border-neutral-800 rounded-xl p-4">
          <p className="text-[13px] text-neutral-400 mb-2">
            Runs in the background. Searches Google for each investor&apos;s email using their name + public profiles.
            Batches 50 at a time to stay within rate limits.
          </p>
          <p className="text-[12px] text-neutral-600 mb-4">
            For 2,000 contacts expect ~40 batches · ~30–60 min total · emails auto-saved to each contact
          </p>
          <Button
            onClick={handleStartEmailFinder}
            disabled={jobs.some(j => j.status === "running")}
            className="bg-white text-neutral-900 hover:bg-neutral-200 text-[13px] h-9 gap-1.5"
          >
            {jobs.some(j => j.status === "running") ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" />Running...</>
            ) : (
              <><Play className="w-3.5 h-3.5" />Start email finder</>
            )}
          </Button>
        </div>
      </div>

      {/* Jobs history */}
      {jobs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-medium text-neutral-600 uppercase tracking-widest">Email finder jobs</h2>
            <button onClick={() => refetchJobs()} className="text-neutral-600 hover:text-white transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onRefresh={() => refetchJobs()} />
            ))}
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="mt-8 border border-neutral-800/60 rounded-xl p-4 bg-neutral-900/20">
        <div className="flex items-start gap-3">
          <Mail className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-medium text-neutral-400 mb-1">How email finding works</p>
            <p className="text-[12px] text-neutral-600 leading-relaxed">
              For each investor, Jarvis runs a targeted Google search like{" "}
              <code className="text-neutral-500 font-mono">&quot;Naval Ravikant&quot; angel investor email contact</code>.
              It scans search result snippets for email addresses, then scrapes their personal website or AngelList profile if needed.
              Found emails are automatically saved back to each contact. LinkedIn is skipped — it blocks scrapers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
