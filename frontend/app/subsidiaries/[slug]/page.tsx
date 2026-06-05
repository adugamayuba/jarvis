"use client";

import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Zap,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getSubsidiary,
  fmtMoney,
  SWIFTDROOM_MRR_GOAL,
  type GrowthTool,
  type ToolStatus,
} from "@/lib/subsidiaries";
import { getSwiftdroomStats } from "@/lib/api";

function StatusBadge({ status }: { status: ToolStatus }) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide",
        status === "live" && "bg-emerald-500/10 text-emerald-400",
        status === "in_progress" && "bg-amber-500/10 text-amber-400",
        status === "coming_soon" && "bg-neutral-800 text-neutral-500"
      )}
    >
      {status === "live" ? "Live" : status === "in_progress" ? "In progress" : "Coming soon"}
    </span>
  );
}

function ToolCard({ tool }: { tool: GrowthTool }) {
  const Icon = tool.icon;
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2 mb-2">
        <Icon className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
        <StatusBadge status={tool.status} />
      </div>
      <p className="text-[13px] font-medium text-neutral-200">{tool.label}</p>
      <p className="text-[12px] text-neutral-500 mt-1 leading-relaxed">{tool.description}</p>
      {(tool.href || tool.externalHref) && tool.status !== "coming_soon" && (
        <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 mt-3 group-hover:text-white transition-colors">
          Open {tool.externalHref ? <ExternalLink className="w-3 h-3" /> : <ArrowRight className="w-3 h-3" />}
        </span>
      )}
    </>
  );

  const className = cn(
    "border border-neutral-800 rounded-lg px-4 py-3.5 transition-all text-left w-full",
    tool.status === "coming_soon"
      ? "opacity-70 cursor-default"
      : "hover:border-neutral-600 hover:bg-neutral-800/30 group cursor-pointer"
  );

  if (tool.status === "coming_soon") {
    return <div className={className}>{inner}</div>;
  }
  if (tool.externalHref) {
    return (
      <a href={tool.externalHref} target="_blank" rel="noreferrer" className={className}>
        {inner}
      </a>
    );
  }
  if (tool.href) {
    return (
      <Link href={tool.href} className={className}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}

export default function SubsidiaryGrowthPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const sub = getSubsidiary(slug);

  if (!sub || !sub.hasGrowthHub) {
    notFound();
  }

  const isSwiftdroom = sub.id === "swiftdroom";

  const { data: statsRes, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ["swiftdroomStats"],
    queryFn: getSwiftdroomStats,
    enabled: isSwiftdroom,
    refetchInterval: 60_000,
  });

  const liveMrr = statsRes?.success ? statsRes.data?.mrr : undefined;
  const liveSubs = statsRes?.success ? statsRes.data?.activeSubscribers : undefined;
  const syncedAt = statsRes?.success ? statsRes.data?.syncedAt : undefined;

  const goal = sub.mrrGoal ?? sub.raiseGoal ?? 0;
  const current = isSwiftdroom && liveMrr !== undefined ? liveMrr : (sub.currentMrr ?? sub.raised ?? 0);
  const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;

  const swiftdroomPrompts = [
    "Draft a Chrome Web Store launch email for Swiftdroom job seekers",
    "Find TikTok creators who post about job search and Workday applications",
    "Write Product Hunt launch copy for Swiftdroom ATS autofill extension",
    "Outline SEO landing pages for Workday, Greenhouse, and Lever autofill",
  ];

  const reelinPrompts = [
    "Find 20 angel investors in AI/consumer tech I can email today",
    "Draft my Reelin AI investor pitch email (Mark Cuban backed)",
    "Scrape TechCrunch journalists for press outreach",
    "Search Twitter for angels talking about AI social networks",
  ];

  const jarvisPrompts = isSwiftdroom ? swiftdroomPrompts : reelinPrompts;

  return (
    <div className="p-4 sm:p-8 max-w-5xl h-full overflow-y-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[12px] text-neutral-500 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Softdroom Holdings
      </Link>

      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono text-neutral-600 uppercase tracking-widest mb-1">
            Subsidiary · Growth HQ
          </p>
          <h1 className="text-2xl font-semibold text-white">{sub.name}</h1>
          <p className="text-[13px] text-neutral-500 mt-1 max-w-xl">{sub.tagline}</p>
          <a
            href={`https://${sub.website}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[12px] text-neutral-400 hover:text-white mt-2 transition-colors"
          >
            {sub.website} <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <span
          className={cn(
            "text-[11px] font-medium px-2.5 py-1 rounded-md shrink-0 w-fit",
            sub.status.includes("Raising") || sub.status.includes("pending")
              ? "bg-amber-500/10 text-amber-400"
              : "bg-emerald-500/10 text-emerald-400"
          )}
        >
          {sub.status}
        </span>
      </div>

      {/* Revenue / raise goal */}
      <div className="border border-neutral-800 rounded-xl p-5 mb-8 bg-neutral-900/20">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[13px] font-medium text-white">
              {isSwiftdroom ? "MRR target" : "Fundraise target"}
            </p>
            <p className="text-[12px] text-neutral-500 mt-0.5">
              {isSwiftdroom
                ? "Jarvis growth ops — path to $100K/month recurring revenue"
                : "Seed round progress"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-white tabular-nums">{fmtMoney(current)}</p>
            <p className="text-[11px] text-neutral-600">of {fmtMoney(goal)}</p>
          </div>
        </div>
        <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", isSwiftdroom ? "bg-sky-400" : "bg-white")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-[11px] text-neutral-600 mt-2 tabular-nums">
          {pct.toFixed(1)}% · {fmtMoney(Math.max(0, goal - current))} remaining
          {isSwiftdroom && liveSubs !== undefined && (
            <span> · {liveSubs} active subscribers</span>
          )}
          {isSwiftdroom && syncedAt && (
            <span className="block mt-1 text-[10px]">Synced {new Date(syncedAt).toLocaleString()}</span>
          )}
          {isSwiftdroom && statsError && (
            <span className="block mt-1 text-[10px] text-amber-500">
              MRR sync unavailable — set SWIFTDROOM_ADMIN_API_TOKEN on Jarvis Railway
            </span>
          )}
        </p>
        {isSwiftdroom && (
          <button
            type="button"
            onClick={() => refetchStats()}
            disabled={statsLoading}
            className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-white transition-colors"
          >
            <RefreshCw className={cn("w-3 h-3", statsLoading && "animate-spin")} />
            Refresh MRR
          </button>
        )}
      </div>

      {isSwiftdroom && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-8">
          {[
            { label: "Starter plan", value: "$9.99/mo", sub: "50 apps" },
            { label: "Pro plan", value: "$19.99/mo", sub: "150 apps" },
            { label: "Business", value: "$39.99/mo", sub: "500 apps" },
            { label: "B2B institutional", value: "$2.5K/mo", sub: "500 student seats" },
            { label: "12 contracts", value: "$30K/mo", sub: "B2B pillar target" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="border border-neutral-800 rounded-lg px-3 py-2.5 bg-neutral-900/30">
              <p className="text-[11px] text-neutral-600">{label}</p>
              <p className="text-[14px] font-medium text-neutral-200 tabular-nums">{value}</p>
              <p className="text-[10px] text-neutral-600">{sub}</p>
            </div>
          ))}
        </div>
      )}

      {isSwiftdroom && (
        <div className="border border-neutral-800 rounded-lg px-4 py-3 mb-8 bg-sky-500/5 border-sky-500/20">
          <p className="text-[12px] text-neutral-300 font-medium mb-1">Gmail extension outreach</p>
          <p className="text-[12px] text-neutral-500">
            Tag contacts <code className="text-sky-400 text-[11px]">swiftdroom-b2c</code> for job seekers or{" "}
            <code className="text-sky-400 text-[11px]">swiftdroom-b2b</code> for bootcamps, universities, and career centers.
            Then use Send Emails → SD Users or SD Partners in the Jarvis extension.
          </p>
        </div>
      )}

      {/* Growth tools */}
      <div className="mb-8">
        <h2 className="text-[11px] font-medium text-neutral-500 uppercase tracking-widest mb-3">
          Growth tools · {sub.name}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sub.growthTools.map(tool => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </div>
      </div>

      {/* Reelin pipeline tools */}
      {sub.pipelineTools && sub.pipelineTools.length > 0 && (
        <div className="mb-8">
          <h2 className="text-[11px] font-medium text-neutral-500 uppercase tracking-widest mb-3">
            Outreach pipeline
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {sub.pipelineTools.map(tool => (
              <Link
                key={tool.id}
                href={tool.href!}
                className="border border-neutral-800 rounded-lg px-3 py-3 hover:border-neutral-600 hover:bg-neutral-800/30 transition-all group"
              >
                <p className="text-[12px] font-medium text-neutral-300 group-hover:text-white">{tool.label}</p>
                <p className="text-[10px] text-neutral-600 mt-0.5">{tool.description}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Jarvis prompts */}
      <div className="border border-neutral-800 rounded-xl p-5 bg-neutral-900/20">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
            <Zap className="w-3 h-3 text-neutral-900" />
          </div>
          <p className="text-[13px] font-medium text-white">Ask Jarvis — {sub.name} growth</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {jarvisPrompts.map(prompt => (
            <Link
              key={prompt}
              href={`/jarvis?q=${encodeURIComponent(prompt)}`}
              className="text-left px-3 py-2.5 rounded-lg border border-neutral-800 text-[12px] text-neutral-400 hover:text-neutral-200 hover:border-neutral-700 transition-all line-clamp-2"
            >
              {prompt}
            </Link>
          ))}
        </div>
        <Link
          href="/jarvis"
          className="inline-flex items-center gap-1.5 text-[12px] text-neutral-400 hover:text-white transition-colors mt-4"
        >
          Open Jarvis <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
