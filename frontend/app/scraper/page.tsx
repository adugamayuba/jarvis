"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { startScrapeJob, startSocialGoogleScrape, startTechCrunchScrape, getScrapeJob, getScrapeJobs } from "@/lib/api";
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

type ScrapeMode = "url" | "social_google" | "techcrunch";

const urlSourceOptions = [
  { value: "crunchbase", label: "Crunchbase" },
  { value: "linkedin", label: "LinkedIn" },
] as const;

const socialPlatforms = [
  { id: "twitter", label: "Twitter / X" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "tiktok", label: "TikTok" },
] as const;

type SocialPlatformId = (typeof socialPlatforms)[number]["id"];

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

  const label =
    job.source === "social_google"
      ? `Google: ${job.platforms?.join(", ") || "social"} · "${job.keyword || "angel investor"}"`
      : job.source === "techcrunch"
        ? job.url || "TechCrunch staff page"
        : job.url;

  return (
    <tr className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors group">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-neutral-300 font-mono truncate max-w-sm">{label}</span>
          {job.source !== "social_google" && job.source !== "techcrunch" && (
            <a href={job.url} target="_blank" rel="noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-600 hover:text-neutral-400">
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        {job.status === "failed" && job.error && (
          <p className="text-[11px] text-red-400 mt-0.5 truncate max-w-sm">{job.error}</p>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-[12px] text-neutral-500 capitalize">
          {job.source === "social_google" ? "Google + Social" : job.source === "techcrunch" ? "TechCrunch" : job.source}
        </span>
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
  const [mode, setMode] = useState<ScrapeMode>("social_google");
  const [url, setUrl] = useState("");
  const [source, setSource] = useState<"crunchbase" | "linkedin">("crunchbase");
  const [keyword, setKeyword] = useState("angel investor");
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatformId[]>(["twitter", "instagram"]);
  const queryClient = useQueryClient();

  const { data: jobsData, refetch } = useQuery({
    queryKey: ["scrapeJobs"],
    queryFn: getScrapeJobs,
    refetchInterval: 10_000,
  });

  const urlScrapeMutation = useMutation({
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
    onError: (err) => toast.error(err instanceof Error ? err.message : "Cannot connect to backend"),
  });

  const socialScrapeMutation = useMutation({
    mutationFn: () => startSocialGoogleScrape({
      keyword: keyword.trim(),
      platforms: selectedPlatforms,
    }),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("Social Google scrape started");
        queryClient.invalidateQueries({ queryKey: ["scrapeJobs"] });
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
      } else {
        toast.error(res.error || "Failed to start scrape");
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Cannot connect to backend"),
  });

  const techcrunchScrapeMutation = useMutation({
    mutationFn: () => startTechCrunchScrape(),
    onSuccess: (res) => {
      if (res.success) {
        toast.success("TechCrunch journalist scrape started");
        queryClient.invalidateQueries({ queryKey: ["scrapeJobs"] });
        queryClient.invalidateQueries({ queryKey: ["contacts"] });
      } else {
        toast.error(res.error || "Failed to start scrape");
      }
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Cannot connect to backend"),
  });

  const jobs = jobsData?.data || [];
  const isPending = urlScrapeMutation.isPending || socialScrapeMutation.isPending || techcrunchScrapeMutation.isPending;

  function togglePlatform(id: SocialPlatformId) {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "techcrunch") {
      techcrunchScrapeMutation.mutate();
      return;
    }
    if (mode === "url") {
      if (!url.trim()) return toast.error("Enter a URL first");
      urlScrapeMutation.mutate();
      return;
    }
    if (selectedPlatforms.length === 0) return toast.error("Select at least one platform");
    if (!keyword.trim()) return toast.error("Enter a keyword");
    socialScrapeMutation.mutate();
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Scraper</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">
          Scrape investors from lists/social, or TechCrunch journalists for press outreach
        </p>
        <p className="text-[12px] text-neutral-600 mt-2">
          Contacts are auto-tagged by audience: Crunchbase / LinkedIn / social → <span className="text-amber-500/80">Investors</span> · TechCrunch → <span className="text-purple-400/80">Journalists</span>. Same email cannot exist in two audiences.
        </p>
      </div>

      <div className="border border-neutral-800 rounded-lg p-5 mb-8 bg-neutral-900/30">
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode("social_google")}
            className={cn(
              "flex-1 text-[12px] font-medium py-2 rounded-md border transition-colors",
              mode === "social_google"
                ? "bg-white text-neutral-900 border-white"
                : "bg-neutral-800/50 text-neutral-400 border-neutral-700 hover:border-neutral-600"
            )}
          >
            Google + Social
          </button>
          <button
            type="button"
            onClick={() => setMode("techcrunch")}
            className={cn(
              "flex-1 text-[12px] font-medium py-2 rounded-md border transition-colors",
              mode === "techcrunch"
                ? "bg-white text-neutral-900 border-white"
                : "bg-neutral-800/50 text-neutral-400 border-neutral-700 hover:border-neutral-600"
            )}
          >
            TechCrunch
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            className={cn(
              "flex-1 text-[12px] font-medium py-2 rounded-md border transition-colors",
              mode === "url"
                ? "bg-white text-neutral-900 border-white"
                : "bg-neutral-800/50 text-neutral-400 border-neutral-700 hover:border-neutral-600"
            )}
          >
            URL scrape
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === "techcrunch" ? (
            <>
              <p className="text-[12px] text-neutral-500 mb-4">
                Scrapes{" "}
                <a
                  href="https://techcrunch.com/about-techcrunch/"
                  target="_blank"
                  rel="noreferrer"
                  className="text-neutral-400 underline underline-offset-2 hover:text-white"
                >
                  techcrunch.com/about-techcrunch
                </a>
                , visits each author profile, and saves journalists with their emails to Contacts (tagged for press outreach).
              </p>
            </>
          ) : mode === "social_google" ? (
            <>
              <p className="text-[12px] text-neutral-500 mb-4">
                Searches Google like{" "}
                <code className="text-neutral-400 font-mono text-[11px]">
                  site:twitter.com &quot;angel investor&quot;
                </code>
                , extracts names + emails from results, then scrapes each profile page for more.
              </p>

              <div className="grid gap-3 mb-4">
                <div>
                  <label className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1.5 block">Keyword</label>
                  <Input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="angel investor"
                    className="bg-neutral-800/50 border-neutral-700 text-neutral-200 placeholder:text-neutral-600 text-[13px] h-9"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1.5 block">Platforms</label>
                  <div className="flex flex-wrap gap-2">
                    {socialPlatforms.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePlatform(p.id)}
                        className={cn(
                          "text-[12px] px-3 py-1.5 rounded-md border transition-colors",
                          selectedPlatforms.includes(p.id)
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                            : "bg-neutral-800/50 border-neutral-700 text-neutral-500 hover:border-neutral-600"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex gap-3 mb-4">
              <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
                <SelectTrigger className="w-36 bg-neutral-800/50 border-neutral-700 text-neutral-200 text-[13px] h-9 shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-neutral-700">
                  {urlSourceOptions.map((opt) => (
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
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-neutral-600">
              {mode === "techcrunch"
                ? "Journalists saved with emails · use Gmail extension → Journalists to email"
                : mode === "social_google"
                ? "Contacts saved with all emails found · deduped by profile URL"
                : "e.g. crunchbase.com/lists/... or linkedin.com/search/..."}
            </p>
            <Button
              type="submit"
              disabled={isPending || (mode === "url" ? !url.trim() : mode === "social_google" ? selectedPlatforms.length === 0 : false)}
              className="bg-white text-neutral-900 hover:bg-neutral-200 text-[13px] font-medium h-9 px-4 shrink-0"
            >
              {isPending ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Running</>
              ) : mode === "techcrunch" ? "Scrape TechCrunch" : mode === "social_google" ? "Scrape Social" : "Scrape"}
            </Button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        {mode === "techcrunch" ? (
          [
            { step: "01", label: "Fetch staff page", desc: "about-techcrunch author links" },
            { step: "02", label: "Scrape author profiles", desc: "Names, titles, mailto emails" },
            { step: "03", label: "Contacts saved", desc: "Tagged journalist · email from Gmail" },
          ].map(({ step, label, desc }) => (
            <div key={step} className="border border-neutral-800 rounded-lg px-4 py-3">
              <p className="text-[11px] text-neutral-600 font-mono mb-1.5">{step}</p>
              <p className="text-[13px] font-medium text-neutral-300">{label}</p>
              <p className="text-[12px] text-neutral-500 mt-0.5">{desc}</p>
            </div>
          ))
        ) : mode === "social_google" ? (
          [
            { step: "01", label: "Google site: search", desc: "site:twitter.com + keyword" },
            { step: "02", label: "Parse + scrape profiles", desc: "Names/emails from snippets + profile pages" },
            { step: "03", label: "Contacts saved", desc: "Multiple emails per person in Firebase" },
          ].map(({ step, label, desc }) => (
            <div key={step} className="border border-neutral-800 rounded-lg px-4 py-3">
              <p className="text-[11px] text-neutral-600 font-mono mb-1.5">{step}</p>
              <p className="text-[13px] font-medium text-neutral-300">{label}</p>
              <p className="text-[12px] text-neutral-500 mt-0.5">{desc}</p>
            </div>
          ))
        ) : (
          [
            { step: "01", label: "Paste a list URL", desc: "Any Crunchbase /lists/ or /discover/ page" },
            { step: "02", label: "Apify scrapes it", desc: "Extracts names, titles, emails, bios" },
            { step: "03", label: "Contacts saved", desc: "Auto-stored in Firebase, ready to email" },
          ].map(({ step, label, desc }) => (
            <div key={step} className="border border-neutral-800 rounded-lg px-4 py-3">
              <p className="text-[11px] text-neutral-600 font-mono mb-1.5">{step}</p>
              <p className="text-[13px] font-medium text-neutral-300">{label}</p>
              <p className="text-[12px] text-neutral-500 mt-0.5">{desc}</p>
            </div>
          ))
        )}
      </div>

      <div>
        <h2 className="text-[11px] font-medium text-neutral-500 uppercase tracking-widest mb-3">History</h2>
        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          {jobs.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[13px] text-neutral-500">No jobs yet. Run a scrape above to get started.</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-800">
                  {["Query / URL", "Source", "Contacts", "Status", "Date"].map((h) => (
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
