"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { startScrapeJob, getScrapeJob, getScrapeJobs } from "@/lib/api";
import { ScrapeJob } from "@/types";
import { toast } from "sonner";
import { Loader2, ExternalLink } from "lucide-react";
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

const sourceOptions = [
  { value: "crunchbase", label: "Crunchbase" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "Twitter / X" },
];

function StatusBadge({ status }: { status: ScrapeJob["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded",
        status === "completed" ? "bg-emerald-500/10 text-emerald-400" :
        status === "running" ? "bg-amber-500/10 text-amber-400" :
        status === "failed" ? "bg-red-500/10 text-red-400" :
        "bg-neutral-800 text-neutral-400"
      )}
    >
      {status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
      {status}
    </span>
  );
}

function JobRow({ job, onRefresh }: { job: ScrapeJob; onRefresh: () => void }) {
  useEffect(() => {
    if (job.status !== "running") return;
    const interval = setInterval(async () => {
      const res = await getScrapeJob(job.id);
      if (res.data?.status !== "running") { onRefresh(); clearInterval(interval); }
    }, 5000);
    return () => clearInterval(interval);
  }, [job.id, job.status, onRefresh]);

  return (
    <tr className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-neutral-300 font-mono truncate max-w-sm">{job.url}</span>
          <a href={job.url} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-600 hover:text-neutral-400">
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        {job.status === "failed" && job.error && (
          <p className="text-[11px] text-red-400 mt-0.5 truncate max-w-sm">{job.error}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-[12px] text-neutral-500 capitalize">{job.source}</span>
      </td>
      <td className="px-4 py-3">
        <span className="text-[13px] text-neutral-400 tabular-nums">
          {job.contactsFound !== undefined ? job.contactsFound : "—"}
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={job.status} />
      </td>
      <td className="px-4 py-3">
        <span className="text-[12px] text-neutral-600">
          {job.createdAt ? new Date(job.createdAt).toLocaleDateString() : "—"}
        </span>
      </td>
    </tr>
  );
}

export default function ScraperPage() {
  const [url, setUrl] = useState("");
  const [source, setSource] = useState<"crunchbase" | "linkedin" | "twitter">("crunchbase");
  const queryClient = useQueryClient();

  const { data: jobsData, refetch } = useQuery({
    queryKey: ["scrapeJobs"],
    queryFn: getScrapeJobs,
    refetchInterval: 10_000,
  });

  const scrapeMutation = useMutation({
    mutationFn: () => startScrapeJob(url.trim(), source),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Scrape job started");
        setUrl("");
        queryClient.invalidateQueries({ queryKey: ["scrapeJobs"] });
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
      } else {
        toast.error(res.error || "Failed to start scrape");
      }
    },
    onError: () => toast.error("Cannot connect to backend"),
  });

  const jobs = jobsData?.data || [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return toast.error("Enter a URL first");
    scrapeMutation.mutate();
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Scraper</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">Paste a URL to extract contacts and emails</p>
      </div>

      {/* Form */}
      <div className="border border-neutral-800 rounded-lg p-5 mb-8 bg-neutral-900/30">
        <form onSubmit={handleSubmit}>
          <div className="flex gap-3 mb-4">
            <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
              <SelectTrigger className="w-36 bg-neutral-800/50 border-neutral-700 text-neutral-200 text-[13px] h-9 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-neutral-700">
                {sourceOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-neutral-200 text-[13px]">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Crunchbase list URL or LinkedIn search URL..."
              className="flex-1 bg-neutral-800/50 border-neutral-700 text-neutral-200 placeholder:text-neutral-600 text-[13px] h-9"
            />
            <Button
              type="submit"
              disabled={scrapeMutation.isPending || !url.trim()}
              className="bg-white text-neutral-900 hover:bg-neutral-200 text-[13px] font-medium h-9 px-4 shrink-0"
            >
              {scrapeMutation.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Running</>
              ) : "Scrape"}
            </Button>
          </div>
          <p className="text-[12px] text-neutral-600">
            e.g. https://www.crunchbase.com/lists/my-list/... or https://www.crunchbase.com/discover/people/...
          </p>
        </form>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
        { step: "01", label: "Paste a list URL", desc: "Any Crunchbase /lists/ or /discover/ page" },
        { step: "02", label: "Apify scrapes it", desc: "Extracts names, titles, emails, bios" },
        { step: "03", label: "Contacts saved", desc: "Auto-stored in Firebase, ready to email" },
        ].map(({ step, label, desc }) => (
          <div key={step} className="border border-neutral-800 rounded-lg px-4 py-3">
            <p className="text-[11px] text-neutral-600 font-mono mb-1.5">{step}</p>
            <p className="text-[13px] font-medium text-neutral-300">{label}</p>
            <p className="text-[12px] text-neutral-500 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      {/* History table */}
      <div>
        <h2 className="text-[11px] font-medium text-neutral-500 uppercase tracking-widest mb-3">History</h2>
        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          {jobs.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[13px] text-neutral-500">No jobs yet. Paste a URL above to get started.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-800">
                  {["URL", "Source", "Contacts", "Status", "Date"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <JobRow key={job.id} job={job} onRefresh={() => refetch()} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
