"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { startScrapeJob, getScrapeJob, getScrapeJobs } from "@/lib/api";
import { ScrapeJob } from "@/types";
import { toast } from "sonner";
import {
  Search,
  Link2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Zap,
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

const sourceOptions = [
  { value: "crunchbase", label: "Crunchbase" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "Twitter / X" },
];

function JobStatusIcon({ status }: { status: ScrapeJob["status"] }) {
  if (status === "completed")
    return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-red-400" />;
  if (status === "running")
    return <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />;
  return <Clock className="w-4 h-4 text-white/30" />;
}

function JobRow({ job, onRefresh }: { job: ScrapeJob; onRefresh: () => void }) {
  useEffect(() => {
    if (job.status !== "running") return;
    const interval = setInterval(async () => {
      const res = await getScrapeJob(job.id);
      if (res.data?.status !== "running") {
        onRefresh();
        clearInterval(interval);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [job.id, job.status, onRefresh]);

  return (
    <div className="px-5 py-4 flex items-start gap-4">
      <div className="mt-0.5">
        <JobStatusIcon status={job.status} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-white/80 hover:text-white truncate flex items-center gap-1 max-w-md"
          >
            {job.url}
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        </div>
        <div className="flex items-center gap-3 text-xs text-white/30">
          <span className="capitalize">{job.source}</span>
          {job.contactsFound !== undefined && (
            <span className="text-emerald-400/70">
              {job.contactsFound} contacts found
            </span>
          )}
          {job.error && (
            <span className="text-red-400/70 truncate">{job.error}</span>
          )}
          {job.createdAt && (
            <span>{new Date(job.createdAt).toLocaleString()}</span>
          )}
        </div>
      </div>
      <span
        className={cn(
          "text-xs px-2.5 py-1 rounded-full font-medium shrink-0",
          job.status === "completed"
            ? "bg-emerald-500/10 text-emerald-400"
            : job.status === "running"
            ? "bg-amber-500/10 text-amber-400"
            : job.status === "failed"
            ? "bg-red-500/10 text-red-400"
            : "bg-white/5 text-white/40"
        )}
      >
        {job.status}
      </span>
    </div>
  );
}

export default function ScraperPage() {
  const [url, setUrl] = useState("");
  const [source, setSource] = useState<"crunchbase" | "linkedin" | "twitter">(
    "crunchbase"
  );

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
        toast.success("Scrape job started!", {
          description: `Job ID: ${res.data?.jobId}`,
        });
        setUrl("");
        queryClient.invalidateQueries({ queryKey: ["scrapeJobs"] });
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
      } else {
        toast.error(res.error || "Failed to start scrape");
      }
    },
    onError: () => toast.error("Failed to connect to backend"),
  });

  const jobs = jobsData?.data || [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return toast.error("Please enter a URL");
    scrapeMutation.mutate();
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Search className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-mono text-violet-400 uppercase tracking-widest">
            Lead Scraper
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white">Scrape Leads</h1>
        <p className="text-white/40 text-sm mt-1">
          Paste a Crunchbase list or profile URL to extract contacts and emails
        </p>
      </div>

      {/* Scrape Form */}
      <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-6 mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">
              Source Platform
            </label>
            <Select
              value={source}
              onValueChange={(v) =>
                setSource(v as "crunchbase" | "linkedin" | "twitter")
              }
            >
              <SelectTrigger className="bg-white/[0.03] border-white/[0.08] text-white w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#13131f] border-white/[0.08]">
                {sourceOptions.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-white/80"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">
              URL to Scrape
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.crunchbase.com/lists/..."
                  className="pl-9 bg-white/[0.03] border-white/[0.08] text-white placeholder:text-white/20 focus-visible:ring-violet-500/50 focus-visible:border-violet-500/50"
                />
              </div>
              <Button
                type="submit"
                disabled={scrapeMutation.isPending || !url.trim()}
                className="bg-violet-600 hover:bg-violet-500 text-white px-6 shrink-0"
              >
                {scrapeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Scrape
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-white/25 mt-2">
              Example: https://www.crunchbase.com/lists/recently-funded-startups
            </p>
          </div>
        </form>
      </div>

      {/* Tips */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          {
            label: "Crunchbase Lists",
            desc: "Paste any /lists/ or /organization/ URL",
          },
          {
            label: "Auto Email Detection",
            desc: "Apify extracts emails from scraped profiles",
          },
          {
            label: "Auto-saved",
            desc: "Contacts saved to Firebase automatically",
          },
        ].map(({ label, desc }) => (
          <div
            key={label}
            className="bg-white/[0.02] border border-white/[0.05] rounded-lg px-4 py-3"
          >
            <p className="text-xs font-medium text-white/60">{label}</p>
            <p className="text-xs text-white/30 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      {/* Jobs List */}
      <div>
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-3">
          Scrape History
        </h2>
        <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl overflow-hidden">
          {jobs.length === 0 ? (
            <div className="p-12 text-center">
              <Search className="w-10 h-10 text-white/10 mx-auto mb-3" />
              <p className="text-white/30 text-sm">No scrape jobs yet</p>
              <p className="text-white/20 text-xs mt-1">
                Paste a URL above to get started
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {jobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  onRefresh={() => refetch()}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
