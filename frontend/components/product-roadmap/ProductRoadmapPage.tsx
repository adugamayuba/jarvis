"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  FLYWHEEL_STEPS,
  MOAT_PILLARS,
  NORTH_STAR,
  ROADMAP_META,
  ROADMAP_QUARTERS,
  USER_MILESTONES,
} from "@/lib/roadmapData";
import { ArrowUpRight, ChevronDown, Zap, BarChart3, Lock, Globe } from "lucide-react";

/* ─── helpers ─────────────────────────────────────────────────── */
function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}
function fmtMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

/* ─── animated counter ────────────────────────────────────────── */
function useCountUp(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);
      setValue(Math.floor(ease * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

/* ─── intersection hook ───────────────────────────────────────── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/* ─── animated stat ───────────────────────────────────────────── */
function AnimatedStat({ value, prefix = "", suffix = "", label }: { value: number; prefix?: string; suffix?: string; label: string }) {
  const { ref, inView } = useInView(0.3);
  const count = useCountUp(value, 1600, inView);
  const display = value >= 1_000_000
    ? `${prefix}${(count / 1_000_000).toFixed(count >= 1_000_000 ? 1 : 0)}M${suffix}`
    : value >= 1_000
      ? `${prefix}${Math.floor(count / 1000)}K${suffix}`
      : `${prefix}${count}${suffix}`;
  return (
    <div ref={ref} className={cn("transition-all duration-700", inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
      <p className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tighter text-white tabular-nums">{display}</p>
      <p className="text-sm text-slate-400 mt-2 font-medium">{label}</p>
    </div>
  );
}

/* ─── quarter card ────────────────────────────────────────────── */
function QuarterCard({ q, index, active }: { q: typeof ROADMAP_QUARTERS[0]; index: number; active: boolean }) {
  const { ref, inView } = useInView(0.1);
  const [expanded, setExpanded] = useState<number | null>(null);
  const isLeft = index % 2 === 0;

  return (
    <div
      ref={ref}
      className={cn(
        "relative grid lg:grid-cols-2 gap-0 lg:gap-16 items-start transition-all duration-700",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
      )}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      {/* Timeline node (desktop) */}
      <div className="hidden lg:flex absolute left-1/2 top-0 -translate-x-1/2 z-10 flex-col items-center">
        <div
          className={cn(
            "w-5 h-5 rounded-full ring-4 ring-[#0a0a0f] transition-all duration-500 mt-1",
            active ? "scale-125 ring-8" : "scale-100"
          )}
          style={{ backgroundColor: q.color, boxShadow: active ? `0 0 24px ${q.color}80` : "none" }}
        />
      </div>

      {/* Content — alternates sides on desktop */}
      <div className={cn("lg:col-span-1", isLeft ? "lg:text-right lg:pr-12" : "lg:col-start-2 lg:pl-12")}>
        {/* Mobile node */}
        <div className="flex items-center gap-3 lg:hidden mb-4">
          <div className="w-4 h-4 rounded-full ring-4 ring-[#0a0a0f]" style={{ backgroundColor: q.color }} />
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: q.color }}>{q.halfLabel}</span>
        </div>

        <div className={cn("space-y-1", isLeft ? "lg:items-end lg:flex lg:flex-col" : "")}>
          <p className="text-xs font-bold uppercase tracking-[0.18em]" style={{ color: q.color }}>{q.halfLabel} · {q.period}</p>
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
            {q.emoji} {q.label}
          </h3>
          <p className="text-xl sm:text-2xl font-semibold" style={{ color: q.color }}>{q.headline}</p>
        </div>

        <p className="mt-4 text-[15px] text-slate-400 leading-relaxed max-w-sm" style={isLeft ? { marginLeft: "auto" } : {}}>
          {q.subheadline}
        </p>

        <div
          className={cn(
            "mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold",
            isLeft ? "lg:ml-auto" : ""
          )}
          style={{ backgroundColor: `${q.color}18`, color: q.color, border: `1px solid ${q.color}30` }}
        >
          <BarChart3 className="w-4 h-4" />
          Target: {fmt(q.userTarget)} users
        </div>
      </div>

      {/* Milestones */}
      <div className={cn("mt-6 lg:mt-0 space-y-3", !isLeft ? "lg:col-start-1 lg:row-start-1 lg:pl-0 lg:pr-12" : "lg:pl-12")}>
        {q.milestones.map((m, mi) => (
          <button
            key={m.title}
            type="button"
            onClick={() => setExpanded(expanded === mi ? null : mi)}
            className="w-full text-left rounded-2xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/10 transition-all duration-200 overflow-hidden group"
          >
            <div className="p-4 sm:p-5 flex items-start gap-4">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                style={{ backgroundColor: `${q.color}25`, color: q.color }}
              >
                {mi + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[15px] font-semibold text-white leading-snug">{m.title}</p>
                  <ChevronDown className={cn("w-4 h-4 shrink-0 transition-transform duration-300", expanded === mi ? "rotate-180" : "")} style={{ color: q.color }} />
                </div>
                {m.emphasis && (
                  <p className="text-sm font-medium mt-0.5" style={{ color: q.color }}>{m.emphasis}</p>
                )}
                {expanded === mi && (
                  <p className="text-sm text-slate-400 mt-3 leading-relaxed border-t border-white/[0.06] pt-3">{m.description}</p>
                )}
                {m.tags && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {m.tags.map(tag => (
                      <span key={tag} className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/[0.06] text-slate-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── main page ───────────────────────────────────────────────── */
export function ProductRoadmapPage() {
  const [activeIdx, setActiveIdx] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const { ref: heroRef, inView: heroInView } = useInView(0.2);

  /* active quarter tracking */
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    ROADMAP_QUARTERS.forEach((_, i) => {
      const el = sectionRefs.current[i];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([e]) => { if (e.isIntersecting) setActiveIdx(i); },
        { rootMargin: "-35% 0px -50% 0px" }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach(o => o.disconnect());
  }, []);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const maxUsers = NORTH_STAR.users;
  const PILLAR_ICONS = [Zap, BarChart3, Lock];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white selection:bg-emerald-500/30 selection:text-white">

      {/* ── Sticky nav ── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/reelin-logo.png" alt="Reelin AI" width={28} height={28} className="rounded-lg" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight">Reelin AI</span>
              <span className="hidden sm:block text-xs text-slate-500 font-medium">/ Product Roadmap</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden md:flex items-center gap-1">
              {ROADMAP_QUARTERS.map((q, i) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => scrollTo(q.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                    activeIdx === i ? "text-white bg-white/10" : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {q.label}
                </button>
              ))}
            </nav>
            <a
              href="https://investors.reelin.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1"
            >
              Investor Portal <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 pt-14 overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60" />
        {/* Radial glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] rounded-full bg-violet-500/5 blur-[100px] pointer-events-none" />

        <div
          ref={heroRef}
          className="relative max-w-4xl mx-auto text-center space-y-6"
        >
          <div className={cn("inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-emerald-400 animate-fade-in", heroInView ? "opacity-100" : "opacity-0")}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Technical & Product Roadmap · {ROADMAP_META.span}
          </div>

          <h1 className={cn("text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tighter leading-[1.0] animate-fade-up", heroInView ? "opacity-100" : "opacity-0")}>
            {ROADMAP_META.title}
          </h1>

          <p className={cn("text-base sm:text-lg lg:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed animate-fade-up delay-200", heroInView ? "opacity-100" : "opacity-0")}>
            {ROADMAP_META.tagline}
          </p>

          {/* KPI row */}
          <div className={cn("grid grid-cols-1 sm:grid-cols-3 gap-px mt-12 rounded-2xl overflow-hidden border border-white/[0.08] animate-fade-up delay-300", heroInView ? "opacity-100" : "opacity-0")}>
            {[
              { value: NORTH_STAR.users, prefix: "", suffix: "", label: "Activated users by July 2027" },
              { value: NORTH_STAR.mrr, prefix: "$", suffix: "", label: "Monthly recurring revenue target" },
              { value: NORTH_STAR.paidSubscribers, prefix: "", suffix: "", label: "Paid subscribers at 10% conversion" },
            ].map(({ value, prefix, suffix, label }) => (
              <div key={label} className="bg-white/[0.03] hover:bg-white/[0.05] transition-colors px-6 sm:px-8 py-7">
                <AnimatedStat value={value} prefix={prefix} suffix={suffix} label={label} />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollTo(ROADMAP_QUARTERS[0].id)}
            className={cn("mt-6 inline-flex flex-col items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors animate-fade-up delay-500", heroInView ? "opacity-100" : "opacity-0")}
          >
            <span className="text-xs font-medium uppercase tracking-widest">Begin</span>
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </button>
        </div>
      </section>

      {/* ── User growth bar chart ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center mb-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400 mb-3">Growth Trajectory</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">From 0 to 500,000 in 12 months</h2>
          <p className="text-slate-400 mt-3 text-[15px] max-w-xl mx-auto">Each quarter unlocks the next revenue stream. There are no gaps in the flywheel.</p>
        </div>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 sm:p-10">
          <div className="flex items-end justify-between gap-3 sm:gap-6 h-40 sm:h-56">
            {USER_MILESTONES.map(({ quarter, users, label }, i) => {
              const pct = (users / maxUsers) * 100;
              const q = ROADMAP_QUARTERS[i];
              const color = q?.color ?? "#10b981";
              const isFinal = i === USER_MILESTONES.length - 1;
              return (
                <button
                  key={quarter}
                  type="button"
                  onClick={() => q && scrollTo(q.id)}
                  className="flex-1 flex flex-col items-center gap-2 group"
                >
                  <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs sm:text-sm font-bold tabular-nums" style={{ color }}>{fmt(users)}</span>
                  </div>
                  <div className="w-full flex items-end justify-center h-28 sm:h-44">
                    <div
                      className="w-full max-w-[4rem] rounded-t-xl transition-all duration-300 group-hover:opacity-80 relative overflow-hidden"
                      style={{ height: `${Math.max(pct, 6)}%`, backgroundColor: isFinal ? "#10b981" : color, opacity: isFinal ? 1 : 0.7 }}
                    >
                      <div className="absolute inset-0 animate-shimmer" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] sm:text-xs font-bold text-white">{quarter}</p>
                    <p className="text-[9px] sm:text-[11px] text-slate-500 hidden sm:block">{label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Timeline ── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-400 mb-3">The Roadmap</p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Execution by design</h2>
          <p className="text-slate-400 mt-3 text-[15px] max-w-xl mx-auto">Click any milestone card to expand the full strategic rationale.</p>
        </div>

        <div className="relative">
          {/* Vertical timeline line (desktop) */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent -translate-x-1/2" />

          <div className="space-y-20 sm:space-y-28">
            {ROADMAP_QUARTERS.map((q, i) => (
              <article
                key={q.id}
                id={q.id}
                ref={el => { sectionRefs.current[i] = el; }}
                className="scroll-mt-20"
              >
                <QuarterCard q={q} index={i} active={activeIdx === i} />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── North star ── */}
      <section className="relative mt-16 sm:mt-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f] via-emerald-950/20 to-[#0a0a0f] pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400 mb-4">July 2027 · The North Star</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tighter max-w-3xl mx-auto leading-tight">
              The completed moat.<br />
              <span className="text-emerald-400">Three pillars. No gaps.</span>
            </h2>
            <p className="text-slate-400 mt-5 text-[15px] sm:text-base max-w-2xl mx-auto leading-relaxed">
              The cash generated by Swiftdroom and native brand placement in 2026 completely cash-flows
              the heavy engineering required for the 2027 robotics and spatial expansion.
              This is not a bet. This is a blueprint.
            </p>
          </div>

          {/* Moat pillars */}
          <div className="grid gap-4 sm:grid-cols-3 mb-14">
            {MOAT_PILLARS.map((pillar, i) => {
              const Icon = PILLAR_ICONS[i] ?? Globe;
              return (
                <div
                  key={pillar.id}
                  className="group rounded-2xl border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/10 transition-all duration-300 p-6 sm:p-7"
                >
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold">{pillar.name}</h3>
                  <p className="text-sm text-emerald-400/90 mt-1 font-semibold">{pillar.role}</p>
                  <p className="text-sm text-slate-400 mt-3 leading-relaxed">{pillar.description}</p>
                  <p className="mt-4 text-xs font-bold uppercase tracking-widest text-emerald-500">{pillar.metric}</p>
                </div>
              );
            })}
          </div>

          {/* Flywheel */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 sm:p-10 mb-14">
            <div className="text-center mb-8">
              <h3 className="text-xl font-bold">The Sequential Flywheel</h3>
              <p className="text-slate-400 text-sm mt-2">Every phase funds the next. No single point of failure.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FLYWHEEL_STEPS.map(({ step, title, body }) => (
                <div key={step} className="relative rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
                  <p className="text-3xl font-black text-white/10 mb-3">{step}</p>
                  <p className="text-[15px] font-semibold text-white">{title}</p>
                  <p className="text-sm text-slate-400 mt-2 leading-relaxed">{body}</p>
                  {/* connector arrow (not last) */}
                  {step !== "04" && (
                    <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <ArrowUpRight className="w-3 h-3 text-emerald-400 rotate-90" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Final KPI strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-0 sm:divide-x divide-white/[0.08] rounded-2xl border border-white/[0.07] bg-white/[0.02] px-6 sm:px-0 py-8 sm:py-10">
            {[
              { value: NORTH_STAR.users, prefix: "", suffix: "", label: "Total activated users" },
              { value: NORTH_STAR.paidSubscribers, prefix: "", suffix: "", label: "Paid subscribers at 10% conversion" },
              { value: NORTH_STAR.mrr, prefix: "$", suffix: "", label: "Monthly recurring revenue" },
            ].map(({ value, prefix, suffix, label }) => (
              <div key={label} className="text-center sm:px-10">
                <AnimatedStat value={value} prefix={prefix} suffix={suffix} label={label} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.06] mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600">
          <div className="flex items-center gap-3">
            <Image src="/reelin-logo.png" alt="Reelin AI" width={22} height={22} className="rounded-md opacity-50" />
            <span>Reelin AI, Inc. · Confidential</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="https://investors.reelin.ai" className="hover:text-slate-300 transition-colors inline-flex items-center gap-1">
              Investor Portal <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
            <a href="https://softdroom.com" className="hover:text-slate-300 transition-colors">Softdroom Holdings</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
