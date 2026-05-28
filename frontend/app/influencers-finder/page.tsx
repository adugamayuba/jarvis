"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Search, Star, Copy, ExternalLink, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import axios from "axios";

interface Influencer {
  id: string;
  platform: "instagram" | "twitter";
  username: string;
  name: string;
  bio: string;
  followers: number;
  profileUrl: string;
  email: string;
  profilePic: string;
  niche: string;
}

interface SearchJob {
  id: string;
  status: "running" | "finding_emails" | "completed" | "failed";
  total: number;
  found: number;
  niche: string;
  error?: string;
}

const NICHES = [
  "AI technology",
  "startup investing",
  "social media marketing",
  "content creation",
  "tech entrepreneur",
  "venture capital",
  "product hunt",
  "indie hacker",
];

function PlatformIcon({ platform }: { platform: string }) {
  if (platform === "instagram") return <span className="text-[10px] font-bold text-pink-400">IG</span>;
  if (platform === "twitter") return <span className="text-[10px] font-bold text-sky-400">X</span>;
  return <Star className="w-3.5 h-3.5 text-neutral-400" />;
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function InfluencerFinderPage() {
  const [niche, setNiche] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["instagram", "twitter"]);
  const [minFollowers, setMinFollowers] = useState("10000");
  const [maxResults, setMaxResults] = useState("50");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [filterEmail, setFilterEmail] = useState(false);
  const [search, setSearch] = useState("");

  const { data: jobData, refetch: refetchJob } = useQuery({
    queryKey: ["influencerJob", activeJobId],
    queryFn: async () => {
      if (!activeJobId) return null;
      const res = await axios.get(`/api/influencers/jobs/${activeJobId}`);
      return res.data.data as SearchJob;
    },
    enabled: !!activeJobId,
    refetchInterval: (query) => {
      const job = query.state.data;
      if (!job) return false;
      return job.status === "running" || job.status === "finding_emails" ? 5000 : false;
    },
  });

  const { data: influencersData, refetch: refetchInfluencers } = useQuery({
    queryKey: ["influencers"],
    queryFn: async () => {
      const res = await axios.get("/api/influencers");
      return res.data.data as Influencer[];
    },
  });

  const job = jobData;
  const isRunning = job?.status === "running" || job?.status === "finding_emails";

  const influencers = (influencersData || []).filter(inf => {
    const q = search.toLowerCase();
    const matchSearch = !q || inf.name?.toLowerCase().includes(q) || inf.username?.toLowerCase().includes(q) || inf.niche?.toLowerCase().includes(q);
    const matchEmail = !filterEmail || !!inf.email;
    return matchSearch && matchEmail;
  });

  function togglePlatform(p: string) {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }

  async function handleSearch() {
    if (!niche.trim()) { toast.error("Enter a niche to search"); return; }
    if (platforms.length === 0) { toast.error("Select at least one platform"); return; }
    setSearching(true);
    try {
      const res = await axios.post("/api/influencers/search", {
        niche: niche.trim(),
        platforms,
        minFollowers: parseInt(minFollowers) || 10000,
        maxResults: parseInt(maxResults) || 50,
      });
      if (res.data.success) {
        setActiveJobId(res.data.data.jobId);
        toast.success("Influencer search started!", {
          description: `Searching for ${niche} influencers on ${platforms.join(", ")}`,
        });
      }
    } catch {
      toast.error("Failed to start search");
    } finally {
      setSearching(false);
    }
  }

  function copyEmail(email: string) {
    navigator.clipboard.writeText(email);
    toast.success("Email copied!");
  }

  function copyAllEmails() {
    const emails = influencers.filter(i => i.email).map(i => i.email).join(", ");
    if (!emails) { toast.error("No emails to copy"); return; }
    navigator.clipboard.writeText(emails);
    toast.success(`Copied ${influencers.filter(i => i.email).length} emails!`);
  }

  function exportCsv() {
    const rows = [
      ["Name", "Username", "Platform", "Followers", "Email", "Bio", "Profile URL", "Niche"],
      ...influencers.map(i => [i.name, i.username, i.platform, i.followers, i.email || "", i.bio?.replace(/"/g, "'") || "", i.profileUrl, i.niche]),
    ];
    const csv = rows.map(r => r.map(v => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `influencers-${niche || "all"}.csv`;
    a.click();
  }

  return (
    <div className="p-4 sm:p-8 h-full overflow-y-auto max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[11px] font-mono text-neutral-600 uppercase tracking-widest mb-1">Co-founder Tool</p>
        <h1 className="text-xl font-semibold text-white">Influencer Finder</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">
          Find influencers in your niche and get their email addresses for Reelin AI partnerships
        </p>
      </div>

      {/* Search Form */}
      <div className="border border-neutral-800 rounded-xl p-5 mb-6">
        <h2 className="text-[13px] font-medium text-neutral-300 mb-4">Search Parameters</h2>

        {/* Niche input */}
        <div className="mb-4">
          <label className="text-[11px] text-neutral-500 uppercase tracking-wider block mb-1.5">Niche / Keywords</label>
          <Input
            value={niche}
            onChange={e => setNiche(e.target.value)}
            placeholder='e.g. "AI social media", "content creator", "tech influencer"'
            className="bg-neutral-800/50 border-neutral-700 text-neutral-200 placeholder:text-neutral-600 text-[13px] h-9"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {NICHES.map(n => (
              <button key={n} onClick={() => setNiche(n)}
                className={cn("text-[11px] px-2 py-0.5 rounded border transition-colors",
                  niche === n ? "border-white text-white" : "border-neutral-700 text-neutral-500 hover:border-neutral-500 hover:text-neutral-300"
                )}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Platforms */}
        <div className="mb-4">
          <label className="text-[11px] text-neutral-500 uppercase tracking-wider block mb-1.5">Platforms</label>
          <div className="flex gap-2">
            {[
              { id: "instagram", label: "Instagram", badge: "IG", color: "text-pink-400" },
              { id: "twitter", label: "Twitter / X", badge: "X", color: "text-sky-400" },
            ].map(({ id, label, badge, color }) => (
              <button key={id} onClick={() => togglePlatform(id)}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-medium transition-colors",
                  platforms.includes(id)
                    ? "border-white bg-neutral-800 text-white"
                    : "border-neutral-700 text-neutral-500 hover:border-neutral-600"
                )}>
                <span className={cn("text-[10px] font-bold", platforms.includes(id) ? color : "text-neutral-600")}>{badge}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Min followers & max results */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div>
            <label className="text-[11px] text-neutral-500 uppercase tracking-wider block mb-1.5">Min Followers</label>
            <Input value={minFollowers} onChange={e => setMinFollowers(e.target.value)}
              placeholder="10000"
              className="bg-neutral-800/50 border-neutral-700 text-neutral-200 text-[13px] h-9" />
          </div>
          <div>
            <label className="text-[11px] text-neutral-500 uppercase tracking-wider block mb-1.5">Max Results</label>
            <Input value={maxResults} onChange={e => setMaxResults(e.target.value)}
              placeholder="50"
              className="bg-neutral-800/50 border-neutral-700 text-neutral-200 text-[13px] h-9" />
          </div>
        </div>

        <Button onClick={handleSearch} disabled={searching || isRunning}
          className="bg-white text-neutral-900 hover:bg-neutral-200 text-[13px] font-medium h-9 gap-2">
          {searching || isRunning
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />
                {job?.status === "finding_emails" ? "Finding emails..." : "Searching..."}
              </>
            : <><Search className="w-3.5 h-3.5" />Find Influencers</>
          }
        </Button>
      </div>

      {/* Job Status */}
      {job && (
        <div className={cn("border rounded-xl p-4 mb-6", isRunning ? "border-amber-800/40 bg-amber-900/10" : job.status === "completed" ? "border-emerald-800/40 bg-emerald-900/10" : "border-red-800/40 bg-red-900/10")}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isRunning && <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
              <span className={cn("text-[13px] font-medium",
                isRunning ? "text-amber-400" : job.status === "completed" ? "text-emerald-400" : "text-red-400"
              )}>
                {job.status === "running" ? "Searching for influencers..." :
                 job.status === "finding_emails" ? "Finding email addresses..." :
                 job.status === "completed" ? `Done — ${job.found} emails found from ${job.total} influencers` :
                 `Failed: ${job.error}`}
              </span>
            </div>
            {job.status === "completed" && (
              <button onClick={() => { refetchInfluencers(); }}
                className="text-[11px] text-neutral-500 hover:text-white flex items-center gap-1 transition-colors">
                <RefreshCw className="w-3 h-3" /> Refresh list
              </button>
            )}
          </div>
          {isRunning && (
            <div className="mt-2 h-1 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full animate-pulse" style={{ width: "60%" }} />
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {influencers.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or niche..."
                className="w-56 bg-neutral-800/50 border-neutral-700 text-neutral-200 placeholder:text-neutral-600 text-[13px] h-8" />
              <button onClick={() => setFilterEmail(!filterEmail)}
                className={cn("text-[12px] px-2.5 py-1 rounded border transition-colors",
                  filterEmail ? "border-white text-white" : "border-neutral-700 text-neutral-500 hover:border-neutral-500"
                )}>
                With email only
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={copyAllEmails}
                className="text-neutral-400 hover:text-white hover:bg-neutral-800 text-[12px] h-8 gap-1.5">
                <Copy className="w-3.5 h-3.5" /> Copy all emails
              </Button>
              <Button variant="ghost" size="sm" onClick={exportCsv}
                className="text-neutral-400 hover:text-white hover:bg-neutral-800 text-[12px] h-8 gap-1.5">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </Button>
            </div>
          </div>

          <p className="text-[11px] text-neutral-600 mb-3">
            {influencers.length} influencers · {influencers.filter(i => i.email).length} with emails
          </p>

          <div className="border border-neutral-800 rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-800">
                  {["Influencer", "Followers", "Email", "Bio", ""].map(h => (
                    <th key={h} className="px-4 py-2.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {influencers.map(inf => (
                  <tr key={inf.id} className="border-b border-neutral-800/40 hover:bg-neutral-800/20 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {inf.profilePic ? (
                          <img src={inf.profilePic} alt={inf.name} className="w-7 h-7 rounded-full object-cover bg-neutral-800" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-[11px] font-semibold text-neutral-400">
                            {(inf.name || inf.username)?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-[13px] font-medium text-neutral-200">{inf.name || inf.username}</p>
                            <PlatformIcon platform={inf.platform} />
                          </div>
                          <p className="text-[11px] text-neutral-600">@{inf.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-neutral-300 font-medium tabular-nums">
                        {formatFollowers(inf.followers || 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {inf.email ? (
                        <span className="text-[12px] text-neutral-400 font-mono">{inf.email}</span>
                      ) : (
                        <span className="text-[12px] text-neutral-700">No email</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-[12px] text-neutral-500 line-clamp-1">{inf.bio || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {inf.email && (
                          <button onClick={() => copyEmail(inf.email)}
                            className="p-1 text-neutral-600 hover:text-white hover:bg-neutral-700 rounded transition-colors"
                            title="Copy email">
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <a href={inf.profileUrl} target="_blank" rel="noreferrer"
                          className="p-1 text-neutral-600 hover:text-white hover:bg-neutral-700 rounded transition-colors"
                          title="View profile">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {influencers.length === 0 && !isRunning && (
        <div className="border border-neutral-800 rounded-xl p-12 text-center">
          <Star className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
          <p className="text-[13px] text-neutral-500">No influencers yet</p>
          <p className="text-[12px] text-neutral-700 mt-1">
            Enter a niche above and click "Find Influencers" to get started
          </p>
        </div>
      )}
    </div>
  );
}
