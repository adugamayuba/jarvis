"use client";

import { useQuery } from "@tanstack/react-query";
import { getContacts, getCampaigns, getScrapeJobs, checkHealth, getSwiftdroomStats } from "@/lib/api";
import {
  Users, Mail, Search, AlertCircle,
  Wifi, ArrowRight, Zap, Briefcase, Sparkles,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ScrapeJob, Campaign } from "@/types";
import {
  SUBSIDIARIES,
  getGrowthHubSubsidiaries,
  fmtMoney,
  SWIFTDROOM_MRR_GOAL,
} from "@/lib/subsidiaries";

function ProgressBar({ value, max, color = "bg-white" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatusDot({ status }: { status: ScrapeJob["status"] | Campaign["status"] }) {
  return (
    <span
      className={cn(
        "inline-block w-1.5 h-1.5 rounded-full shrink-0",
        status === "completed" || status === "sent" ? "bg-emerald-500" :
        status === "running" || status === "sending" ? "bg-amber-400 animate-pulse" :
        status === "failed" ? "bg-red-500" : "bg-neutral-600"
      )}
    />
  );
}

export default function DashboardPage() {
  const { data: isHealthy, isLoading: healthLoading } = useQuery({
    queryKey: ["health"], queryFn: checkHealth, refetchInterval: 30_000,
  });
  const { data: contactsData } = useQuery({
    queryKey: ["contacts"], queryFn: () => getContacts({ limit: 5000 }), enabled: isHealthy === true,
  });
  const { data: campaignsData } = useQuery({
    queryKey: ["campaigns"], queryFn: getCampaigns, enabled: isHealthy === true,
  });
  const { data: jobsData } = useQuery({
    queryKey: ["scrapeJobs"], queryFn: getScrapeJobs, enabled: isHealthy === true,
  });

  const { data: swiftdroomStats } = useQuery({
    queryKey: ["swiftdroomStats"],
    queryFn: getSwiftdroomStats,
    enabled: isHealthy === true,
    refetchInterval: 120_000,
  });

  const contacts = contactsData?.data || [];
  const campaigns = campaignsData?.data || [];
  const jobs = jobsData?.data || [];
  const growthHubs = getGrowthHubSubsidiaries();
  const portfolioOnly = SUBSIDIARIES.filter(s => !s.hasGrowthHub);

  const emailsSent = contacts.filter(c => c.emailSent).length;
  const withEmail = contacts.filter(c => c.email || (c.emails && c.emails.length > 0)).length;
  const totalSent = campaigns.reduce((s, c) => s + (c.sentCount || 0), 0);

  const reelin = growthHubs.find(s => s.id === "reelin");
  const swiftdroom = growthHubs.find(s => s.id === "swiftdroom");
  const swiftdroomMrr = swiftdroomStats?.success ? swiftdroomStats.data?.mrr ?? 0 : (swiftdroom?.currentMrr ?? 0);

  return (
    <div className="p-4 sm:p-8 max-w-5xl overflow-y-auto h-full">
      {!healthLoading && !isHealthy && (
        <div className="flex items-center gap-2 text-[12px] px-3 py-2 rounded-md mb-6 w-fit bg-red-500/10 text-red-400 border border-red-500/20">
          <AlertCircle className="w-3.5 h-3.5" />
          Backend unreachable — check Railway and <code className="font-mono mx-1">BACKEND_URL</code> on Vercel
        </div>
      )}
      {!healthLoading && isHealthy && (
        <div className="flex items-center gap-2 text-[12px] px-3 py-2 rounded-md mb-6 w-fit bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Wifi className="w-3.5 h-3.5" /> Jarvis ops online
        </div>
      )}

      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono text-neutral-600 uppercase tracking-widest mb-1">Command Center</p>
          <h1 className="text-2xl font-semibold text-white">Softdroom Holdings</h1>
          <p className="text-[13px] text-neutral-500 mt-1">
            Growth & operations arm — Reelin AI, Swiftdroom, and portfolio subsidiaries
          </p>
        </div>
        <Link
          href="/jarvis"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-700 text-[12px] text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors shrink-0"
        >
          <Zap className="w-3 h-3" /> Ask Jarvis
        </Link>
      </div>

      {/* Active growth targets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        {swiftdroom && (
          <Link
            href={`/subsidiaries/${swiftdroom.slug}`}
            className="border border-neutral-800 rounded-xl p-5 bg-neutral-900/20 hover:border-sky-500/30 hover:bg-sky-500/5 transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-sky-400" />
              <span className="text-[10px] font-mono text-sky-400 uppercase tracking-widest">Priority · SaaS</span>
            </div>
            <p className="text-[15px] font-medium text-white group-hover:text-sky-100">Swiftdroom</p>
            <p className="text-[12px] text-neutral-500 mt-0.5">Job application co-pilot · Chrome extension pending</p>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-xl font-semibold text-white tabular-nums">{fmtMoney(swiftdroomMrr)}</p>
                <p className="text-[11px] text-neutral-600">MRR · target {fmtMoney(SWIFTDROOM_MRR_GOAL)}/mo</p>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-sky-400 transition-colors" />
            </div>
            <ProgressBar value={swiftdroomMrr} max={SWIFTDROOM_MRR_GOAL} color="bg-sky-400" />
          </Link>
        )}

        {reelin && (
          <Link
            href={`/subsidiaries/${reelin.slug}`}
            className="border border-neutral-800 rounded-xl p-5 bg-neutral-900/20 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-mono text-emerald-500 uppercase tracking-widest">Raising Now</span>
            </div>
            <p className="text-[15px] font-medium text-white group-hover:text-emerald-100">Reelin AI</p>
            <p className="text-[12px] text-neutral-500 mt-0.5">Mark Cuban backed · autonomous AI social network</p>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-xl font-semibold text-white tabular-nums">{fmtMoney(reelin.raised ?? 0)}</p>
                <p className="text-[11px] text-neutral-600">raised · {fmtMoney(reelin.raiseGoal ?? 0)} seed target</p>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-emerald-400 transition-colors" />
            </div>
            <ProgressBar value={reelin.raised ?? 0} max={reelin.raiseGoal ?? 1} />
          </Link>
        )}
      </div>

      {/* Ops stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Contacts in pipeline", value: contacts.length, sub: `${withEmail} with email` },
          { label: "Outreach sent", value: emailsSent, sub: `${totalSent} campaign deliveries` },
          { label: "Campaigns", value: campaigns.length, sub: `${campaigns.filter(c => c.status === "sent").length} completed` },
          { label: "Scrape jobs", value: jobs.length, sub: `${jobs.filter(j => j.status === "running").length} running` },
        ].map(({ label, value, sub }) => (
          <div key={label} className="border border-neutral-800 rounded-lg px-4 py-3.5 bg-neutral-900/30">
            <p className="text-2xl font-semibold text-white tabular-nums">{value}</p>
            <p className="text-[12px] text-neutral-400 mt-0.5">{label}</p>
            <p className="text-[11px] text-neutral-600 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Subsidiary growth hubs */}
      <div className="mb-8">
        <h2 className="text-[11px] font-medium text-neutral-600 uppercase tracking-widest mb-3">Growth HQ</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {growthHubs.map(sub => (
            <Link
              key={sub.slug}
              href={`/subsidiaries/${sub.slug}`}
              className="border border-neutral-800 rounded-lg px-4 py-4 hover:border-neutral-600 hover:bg-neutral-800/30 transition-all group flex items-start justify-between gap-3"
            >
              <div>
                <p className="text-[14px] font-medium text-neutral-200 group-hover:text-white">{sub.name}</p>
                <p className="text-[11px] text-neutral-600 mt-0.5">{sub.category}</p>
                <p className="text-[12px] text-neutral-500 mt-2 line-clamp-2">{sub.tagline}</p>
                <span className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded mt-2 inline-block",
                  sub.status.includes("Raising") || sub.status.includes("pending")
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-emerald-500/10 text-emerald-400"
                )}>
                  {sub.status}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-white shrink-0 mt-1 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Quick pipeline */}
      <div className="mb-8">
        <h2 className="text-[11px] font-medium text-neutral-600 uppercase tracking-widest mb-3">Quick actions</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { href: "/subsidiaries/swiftdroom", icon: Briefcase, label: "Swiftdroom growth", desc: "$100K MRR tools" },
            { href: "/scraper", icon: Search, label: "Find leads", desc: "Scrape & enrich" },
            { href: "/bulk", icon: Mail, label: "Send outreach", desc: "Gmail bulk send" },
          ].map(({ href, icon: Icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="border border-neutral-800 rounded-lg px-4 py-3.5 hover:border-neutral-700 hover:bg-neutral-800/30 transition-all group"
            >
              <Icon className="w-4 h-4 text-neutral-600 group-hover:text-neutral-300 mb-2.5 transition-colors" />
              <p className="text-[13px] font-medium text-neutral-200">{label}</p>
              <p className="text-[12px] text-neutral-500 mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Portfolio */}
      <div className="mb-6">
        <h2 className="text-[11px] font-medium text-neutral-600 uppercase tracking-widest mb-3">Portfolio</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {portfolioOnly.map(sub => (
            <a
              key={sub.id}
              href={`https://${sub.website}`}
              target="_blank"
              rel="noreferrer"
              className="border border-neutral-800 rounded-lg px-3 py-3 hover:border-neutral-700 hover:bg-neutral-800/20 transition-all group"
            >
              <p className="text-[13px] font-medium text-neutral-300 group-hover:text-white transition-colors">{sub.name}</p>
              <p className="text-[11px] text-neutral-600 mt-0.5">{sub.category}</p>
              <span className={cn(
                "text-[10px] font-medium px-1.5 py-0.5 rounded mt-1.5 inline-block",
                sub.status.startsWith("New") ? "bg-blue-500/10 text-blue-400" : "bg-neutral-800 text-neutral-500"
              )}>
                {sub.status}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h2 className="text-[11px] font-medium text-neutral-600 uppercase tracking-widest mb-3">Recent scrapes</h2>
          <div className="border border-neutral-800 rounded-lg overflow-hidden">
            {jobs.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-[12px] text-neutral-600">No scrape jobs yet</p>
                <Link href="/scraper" className="text-[12px] text-neutral-500 hover:text-white underline underline-offset-2 mt-1 inline-block">
                  Start scraping →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-neutral-800/50">
                {jobs.slice(0, 4).map(job => (
                  <div key={job.id} className="px-4 py-3 flex items-center gap-3">
                    <StatusDot status={job.status} />
                    <p className="text-[12px] text-neutral-400 truncate flex-1 font-mono">{job.url}</p>
                    <span className="text-[11px] text-neutral-600 shrink-0">{job.contactsFound ?? "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-[11px] font-medium text-neutral-600 uppercase tracking-widest mb-3">Recent campaigns</h2>
          <div className="border border-neutral-800 rounded-lg overflow-hidden">
            {campaigns.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-[12px] text-neutral-600">No campaigns yet</p>
                <Link href="/campaigns" className="text-[12px] text-neutral-500 hover:text-white underline underline-offset-2 mt-1 inline-block">
                  Create campaign →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-neutral-800/50">
                {campaigns.slice(0, 4).map(c => (
                  <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                    <StatusDot status={c.status} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-neutral-300 truncate">{c.name}</p>
                      <p className="text-[11px] text-neutral-600">{c.contactIds.length} recipients</p>
                    </div>
                    <span className="text-[12px] text-emerald-500 tabular-nums shrink-0">{c.sentCount ?? 0} sent</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
