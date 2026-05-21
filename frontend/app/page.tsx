"use client";

import { useQuery } from "@tanstack/react-query";
import { getContacts, getCampaigns, getScrapeJobs, checkHealth } from "@/lib/api";
import {
  Users, Mail, Search, CheckCircle2, AlertCircle,
  Wifi, ArrowRight, TrendingUp, Target, Zap,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ScrapeJob, Campaign } from "@/types";

const RAISE_GOAL = 10_000_000;
const RAISED = 100_000;

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
      <div
        className="h-full bg-white rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function StatusDot({ status }: { status: ScrapeJob["status"] | Campaign["status"] }) {
  return (
    <span className={cn("inline-block w-1.5 h-1.5 rounded-full shrink-0",
      status === "completed" || status === "sent" ? "bg-emerald-500" :
      status === "running" || status === "sending" ? "bg-amber-400 animate-pulse" :
      status === "failed" ? "bg-red-500" : "bg-neutral-600"
    )} />
  );
}

export default function DashboardPage() {
  const { data: isHealthy, isLoading: healthLoading } = useQuery({
    queryKey: ["health"], queryFn: checkHealth, refetchInterval: 30_000,
  });
  const { data: contactsData } = useQuery({
    queryKey: ["contacts"], queryFn: () => getContacts({ limit: 1000 }), enabled: isHealthy === true,
  });
  const { data: campaignsData } = useQuery({
    queryKey: ["campaigns"], queryFn: getCampaigns, enabled: isHealthy === true,
  });
  const { data: jobsData } = useQuery({
    queryKey: ["scrapeJobs"], queryFn: getScrapeJobs, enabled: isHealthy === true,
  });

  const contacts = contactsData?.data || [];
  const campaigns = campaignsData?.data || [];
  const jobs = jobsData?.data || [];

  const emailsSent = contacts.filter((c) => c.emailSent).length;
  const withEmail = contacts.filter((c) => c.email).length;
  const totalSent = campaigns.reduce((s, c) => s + (c.sentCount || 0), 0);
  const pct = ((RAISED / RAISE_GOAL) * 100).toFixed(2);

  return (
    <div className="p-8 max-w-5xl">
      {/* Backend status */}
      {!healthLoading && !isHealthy && (
        <div className="flex items-center gap-2 text-[12px] px-3 py-2 rounded-md mb-6 w-fit bg-red-500/10 text-red-400 border border-red-500/20">
          <AlertCircle className="w-3.5 h-3.5" />
          Backend unreachable — check Railway is deployed and <code className="font-mono mx-1">BACKEND_URL</code> is set in Vercel
        </div>
      )}
      {!healthLoading && isHealthy && (
        <div className="flex items-center gap-2 text-[12px] px-3 py-2 rounded-md mb-6 w-fit bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Wifi className="w-3.5 h-3.5" /> All systems live
        </div>
      )}

      {/* Mission header */}
      <div className="mb-8">
        <p className="text-[11px] font-mono text-neutral-600 uppercase tracking-widest mb-1">Mission</p>
        <h1 className="text-2xl font-semibold text-white">Raise $10M from Angel Investors</h1>
        <p className="text-[13px] text-neutral-500 mt-1">
          Min. check size $3K · VersusPay / Softdroom Holdings · Series A prep
        </p>
      </div>

      {/* Raise progress */}
      <div className="border border-neutral-800 rounded-xl p-5 mb-6">
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1">Raised to date</p>
            <p className="text-3xl font-semibold text-white tabular-nums">{fmt(RAISED)}</p>
            <p className="text-[12px] text-neutral-600 mt-0.5">of {fmt(RAISE_GOAL)} goal · {pct}% complete</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-neutral-500 mb-1">Remaining</p>
            <p className="text-xl font-semibold text-neutral-300">{fmt(RAISE_GOAL - RAISED)}</p>
          </div>
        </div>
        <ProgressBar value={RAISED} max={RAISE_GOAL} />
        <div className="mt-3 flex items-center gap-4 text-[12px] text-neutral-600">
          <span className="flex items-center gap-1.5"><TrendingUp className="w-3 h-3" /> $100K from Shark Tank investor (6mo ago)</span>
          <span>·</span>
          <span>Need ~3,300 checks at $3K avg</span>
        </div>
      </div>

      {/* Pipeline stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Investors in pipeline", value: contacts.length, sub: `${withEmail} with email` },
          { label: "Outreach sent", value: emailsSent, sub: `${totalSent} total deliveries` },
          { label: "Campaigns run", value: campaigns.length, sub: `${campaigns.filter(c => c.status === "sent").length} completed` },
          { label: "Scrape jobs", value: jobs.length, sub: `${jobs.filter(j => j.status === "running").length} running` },
        ].map(({ label, value, sub }) => (
          <div key={label} className="border border-neutral-800 rounded-lg px-4 py-3.5 bg-neutral-900/30">
            <p className="text-2xl font-semibold text-white tabular-nums">{value}</p>
            <p className="text-[12px] text-neutral-400 mt-0.5">{label}</p>
            <p className="text-[11px] text-neutral-600 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Jarvis quick command */}
      <div className="border border-neutral-800 rounded-xl p-5 mb-6 bg-neutral-900/20">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
            <Zap className="w-3 h-3 text-neutral-900" />
          </div>
          <p className="text-[13px] font-medium text-white">Jarvis is ready</p>
        </div>
        <p className="text-[13px] text-neutral-500 mb-4">
          I know your goal. Ask me to find investors, scrape Crunchbase lists, draft pitch emails, or research funds.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {[
            "Find 20 fintech angel investors I can email today",
            "Search Crunchbase for $3K–$100K angel check writers",
            "Draft my investor pitch email for VersusPay",
            "Research top African tech angel investors",
          ].map((prompt) => (
            <Link
              key={prompt}
              href={`/jarvis?q=${encodeURIComponent(prompt)}`}
              className="text-left px-3 py-2.5 rounded-lg border border-neutral-800 text-[12px] text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 hover:bg-neutral-800/30 transition-all line-clamp-1"
            >
              {prompt}
            </Link>
          ))}
        </div>
        <Link
          href="/jarvis"
          className="inline-flex items-center gap-1.5 text-[12px] text-neutral-400 hover:text-white transition-colors"
        >
          Open Jarvis <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Pipeline actions */}
      <div className="mb-8">
        <h2 className="text-[11px] font-medium text-neutral-600 uppercase tracking-widest mb-3">Pipeline actions</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { href: "/scraper", icon: Search, label: "Find investors", desc: "Scrape Crunchbase lists" },
            { href: "/contacts", icon: Users, label: "View pipeline", desc: `${contacts.length} contacts` },
            { href: "/bulk", icon: Mail, label: "Send outreach", desc: "Bulk email with Gmail" },
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

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent scrapes */}
        <div>
          <h2 className="text-[11px] font-medium text-neutral-600 uppercase tracking-widest mb-3">Recent scrapes</h2>
          <div className="border border-neutral-800 rounded-lg overflow-hidden">
            {jobs.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-[12px] text-neutral-600">No scrape jobs yet</p>
                <Link href="/scraper" className="text-[12px] text-neutral-500 hover:text-white underline underline-offset-2 mt-1 inline-block transition-colors">Start scraping →</Link>
              </div>
            ) : (
              <div className="divide-y divide-neutral-800/50">
                {jobs.slice(0, 4).map((job) => (
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

        {/* Recent campaigns */}
        <div>
          <h2 className="text-[11px] font-medium text-neutral-600 uppercase tracking-widest mb-3">Recent campaigns</h2>
          <div className="border border-neutral-800 rounded-lg overflow-hidden">
            {campaigns.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-[12px] text-neutral-600">No campaigns sent yet</p>
                <Link href="/campaigns" className="text-[12px] text-neutral-500 hover:text-white underline underline-offset-2 mt-1 inline-block transition-colors">Create campaign →</Link>
              </div>
            ) : (
              <div className="divide-y divide-neutral-800/50">
                {campaigns.slice(0, 4).map((c) => (
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
