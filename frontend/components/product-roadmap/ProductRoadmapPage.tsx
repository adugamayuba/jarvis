"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  FLYWHEEL,
  MOAT_PILLARS,
  NORTH_STAR,
  ROADMAP_META,
  ROADMAP_QUARTERS,
  USER_MILESTONES,
} from "@/lib/roadmapData";
import {
  ArrowUpRight,
  Bot,
  Cpu,
  Globe,
  Layers,
  Rocket,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function fmtMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

const PILLAR_ICONS = [Sparkles, Rocket, Shield];

export function ProductRoadmapPage() {
  const [activeQuarter, setActiveQuarter] = useState(ROADMAP_QUARTERS[0].id);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    ROADMAP_QUARTERS.forEach(q => {
      const el = sectionRefs.current[q.id];
      if (!el) return;
      const obs = new IntersectionObserver(
        entries => {
          if (entries[0]?.isIntersecting) setActiveQuarter(q.id);
        },
        { rootMargin: "-30% 0px -55% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  function scrollToQuarter(id: string) {
    setActiveQuarter(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const maxUsers = NORTH_STAR.users;

  function scrollToId(id: string) {
    if (id === "north-star") {
      document.getElementById("north-star")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    scrollToQuarter(id);
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-slate-900 [color-scheme:light]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#f8f9fb]/90 backdrop-blur-md border-b border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Image src="/reelin-logo.png" alt="Reelin AI" width={32} height={32} className="rounded-lg shrink-0" />
            <div className="min-w-0">
              <p className="text-sm sm:text-[15px] font-semibold tracking-tight truncate">Reelin AI</p>
              <p className="text-xs text-slate-500 hidden sm:block">Product Roadmap</p>
            </div>
          </div>
          <a
            href="https://reelin.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-600 hover:text-slate-900 font-medium inline-flex items-center gap-1 shrink-0"
          >
            reelin.ai
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200/80">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.12),transparent)]" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20 relative">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Technical & Product Roadmap
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight leading-[1.1] max-w-3xl">
            {ROADMAP_META.title}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
            {ROADMAP_META.span} · {ROADMAP_META.tagline}
          </p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Users, label: "Activated users", value: fmt(NORTH_STAR.users), sub: `by ${NORTH_STAR.date}` },
              { icon: Wallet, label: "Monthly recurring revenue", value: fmtMoney(NORTH_STAR.mrr), sub: "MRR target" },
              {
                icon: TrendingUp,
                label: "Paid subscribers",
                value: fmt(NORTH_STAR.paidSubscribers),
                sub: `${NORTH_STAR.paidPct}% conversion target`,
              },
            ].map(({ icon: Icon, label, value, sub }) => (
              <div
                key={label}
                className="rounded-2xl bg-white border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center mb-3">
                  <Icon className="w-4.5 h-4.5 text-slate-700" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="text-2xl sm:text-3xl font-semibold mt-1 tabular-nums tracking-tight">{value}</p>
                <p className="text-sm text-slate-500 mt-1">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Growth trajectory */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold">User growth trajectory</h2>
            <p className="text-sm text-slate-500 mt-1">Registered users by quarter</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200/90 p-5 sm:p-7 shadow-sm">
          <div className="flex items-end justify-between gap-2 sm:gap-4 h-40 sm:h-48">
            {USER_MILESTONES.map(({ id, quarter, users }) => {
              const pct = (users / maxUsers) * 100;
              const isFinal = users === maxUsers;
              return (
                <button
                  key={quarter}
                  type="button"
                  onClick={() => scrollToId(id)}
                  className="flex-1 flex flex-col items-center gap-2 group"
                >
                  <span className="text-xs sm:text-sm font-semibold text-slate-900 tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                    {fmt(users)}
                  </span>
                  <div className="w-full flex items-end justify-center h-28 sm:h-36">
                    <div
                      className={cn(
                        "w-full max-w-[3.5rem] rounded-t-lg transition-all duration-500 group-hover:opacity-90",
                        isFinal ? "bg-emerald-600" : "bg-slate-800"
                      )}
                      style={{ height: `${Math.max(pct, 8)}%` }}
                    />
                  </div>
                  <span className="text-[10px] sm:text-xs font-medium text-slate-500">{quarter}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quarter nav + timeline */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-6">
        <div className="sticky top-14 sm:top-16 z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 bg-[#f8f9fb]/95 backdrop-blur-sm border-y border-slate-200/60 sm:rounded-xl sm:border sm:mx-0 sm:px-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-0.5">
            {ROADMAP_QUARTERS.map(q => (
              <button
                key={q.id}
                type="button"
                onClick={() => scrollToQuarter(q.id)}
                className={cn(
                  "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all",
                  activeQuarter === q.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                )}
              >
                {q.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => document.getElementById("north-star")?.scrollIntoView({ behavior: "smooth" })}
              className="shrink-0 px-4 py-2 rounded-full text-sm font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              July 2027
            </button>
          </div>
        </div>
      </section>

      {/* Quarter sections */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8 sm:space-y-10 pb-16">
        {ROADMAP_QUARTERS.map((q, idx) => (
          <article
            key={q.id}
            id={q.id}
            ref={el => { sectionRefs.current[q.id] = el; }}
            className="scroll-mt-36"
          >
            <div className="rounded-2xl bg-white border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="p-5 sm:p-8 border-b border-slate-100">
                <div className="flex flex-wrap items-start gap-4 justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: q.color }}>
                      {q.phase}
                    </p>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mt-2">
                      <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight">{q.label}</h3>
                      <span className="text-sm text-slate-500">{q.period}</span>
                    </div>
                    <p className="text-lg sm:text-xl text-slate-700 mt-2 font-medium">{q.headline}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 shrink-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Target</p>
                    <p className="text-xl font-semibold tabular-nums mt-0.5">{fmt(q.userTarget)} users</p>
                  </div>
                </div>
                <p className="mt-4 text-[15px] text-slate-600 leading-relaxed flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                  {q.revenueNote}
                </p>
              </div>

              <div className="p-5 sm:p-8 grid gap-4 sm:grid-cols-3">
                {q.milestones.map((m, mi) => (
                  <div
                    key={m.title}
                    className="group rounded-xl border border-slate-200/90 p-5 hover:border-slate-300 hover:shadow-sm transition-all bg-slate-50/40 hover:bg-white"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold mb-3"
                      style={{ backgroundColor: q.color }}
                    >
                      {idx + 1}.{mi + 1}
                    </div>
                    <h4 className="text-[15px] font-semibold text-slate-900 leading-snug">{m.title}</h4>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{m.description}</p>
                    {m.tags && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {m.tags.map(tag => (
                          <span
                            key={tag}
                            className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>

      {/* North star / moat */}
      <section id="north-star" className="scroll-mt-24 bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-400">
            {NORTH_STAR.date} · North Star
          </p>
          <h2 className="mt-3 text-2xl sm:text-4xl font-semibold tracking-tight max-w-2xl">
            The completed moat
          </h2>
          <p className="mt-4 text-slate-400 max-w-2xl text-[15px] sm:text-base leading-relaxed">
            Three reinforcing pillars — consumer habit, utility revenue, and enterprise protocol — closing the loop
            on a highly defensible trajectory.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {MOAT_PILLARS.map((pillar, i) => {
              const Icon = PILLAR_ICONS[i] ?? Layers;
              return (
                <div
                  key={pillar.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:bg-white/[0.08] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold">{pillar.name}</h3>
                  <p className="text-sm text-emerald-400/90 mt-1 font-medium">{pillar.role}</p>
                  <p className="text-sm text-slate-400 mt-3 leading-relaxed">{pillar.description}</p>
                </div>
              );
            })}
          </div>

          {/* Flywheel */}
          <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-5">
              <Cpu className="w-5 h-5 text-emerald-400" />
              <h3 className="text-lg font-semibold">The sequential flywheel</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {FLYWHEEL.map((step, i) => (
                <div key={step} className="flex items-start gap-3 text-sm text-slate-300">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed pt-0.5">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Final metrics strip */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-white/10">
            {[
              { label: "Total activated users", value: fmt(NORTH_STAR.users) },
              { label: "Paid subscribers (10%)", value: fmt(NORTH_STAR.paidSubscribers) },
              { label: "Monthly recurring revenue", value: fmtMoney(NORTH_STAR.mrr) },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                <p className="text-2xl sm:text-3xl font-semibold mt-1 tabular-nums text-emerald-400">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            <span>Reelin AI, Inc. · Confidential product roadmap</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://investors.reelin.ai" className="hover:text-slate-900 inline-flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />
              Investor portal
            </a>
            <a href="https://softdroom.com" className="hover:text-slate-900">
              Softdroom Holdings
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
