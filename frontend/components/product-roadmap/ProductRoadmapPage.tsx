"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { NORTH_STAR, ROADMAP_QUARTERS, FLYWHEEL_STEPS } from "@/lib/roadmapData";
import { ArrowRight } from "lucide-react";

function useCountUp(target: number, duration = 1600, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const p = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setValue(Math.floor(ease * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

function Stat({ value, prefix = "", suffix = "", label, started }: { value: number; prefix?: string; suffix?: string; label: string; started: boolean }) {
  const count = useCountUp(value, 1400, started);
  const display = value >= 1_000_000
    ? `${prefix}${(count / 1_000_000).toFixed(count >= 1_000_000 ? 1 : 0)}M`
    : value >= 1_000
      ? `${prefix}${Math.floor(count / 1000)}K`
      : `${prefix}${count}`;
  return (
    <div>
      <p className="text-3xl sm:text-4xl font-bold tracking-tighter text-white tabular-nums">{display}{suffix}</p>
      <p className="text-xs text-slate-500 mt-1.5 font-medium uppercase tracking-wider">{label}</p>
    </div>
  );
}

export function ProductRoadmapPage() {
  const [started, setStarted] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [lineWidth, setLineWidth] = useState(0);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setStarted(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    if (heroRef.current) obs.observe(heroRef.current);
    return () => obs.disconnect();
  }, []);

  // Animate the connecting line as user scrolls the timeline
  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const windowW = window.innerWidth;
      const scrolled = Math.max(0, windowW - rect.left);
      const total = rect.width;
      setLineWidth(Math.min(100, (scrolled / total) * 100));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#080810] text-white overflow-x-hidden [color-scheme:dark]">

      {/* ── Nav ── */}
      <nav className="fixed top-0 inset-x-0 z-50 h-12 flex items-center justify-between px-5 sm:px-8 bg-[#080810]/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="flex items-center gap-2.5">
          <Image src="/reelin-logo.png" alt="Reelin AI" width={24} height={24} className="rounded-md" />
          <span className="text-sm font-semibold">Reelin AI</span>
          <span className="text-white/20 mx-1">/</span>
          <span className="text-xs text-slate-500 font-medium">12-Month Roadmap</span>
        </div>
        <a href="https://investors.reelin.ai" target="_blank" rel="noopener noreferrer"
          className="text-xs text-slate-500 hover:text-white transition-colors font-medium">
          Investor Portal →
        </a>
      </nav>

      {/* ── Hero ── */}
      <section ref={heroRef} className="relative flex flex-col items-center justify-center min-h-[92vh] px-5 sm:px-8 pt-12">
        {/* background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full bg-emerald-500/[0.04] blur-[100px]" />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          {/* badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-400 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            July 2026 – July 2027
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tighter leading-[1.05] mb-5">
            From Zero<br />to Category Ownership
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-lg mx-auto leading-relaxed mb-14">
            A 12-month flywheel where every phase funds the next — scaling to 500K users and $1.5M MRR.
          </p>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-px rounded-2xl overflow-hidden border border-white/[0.07] bg-white/[0.05] max-w-xl mx-auto">
            <div className="bg-[#080810] px-5 py-6">
              <Stat value={NORTH_STAR.users} label="Users" started={started} />
            </div>
            <div className="bg-[#080810] px-5 py-6 border-x border-white/[0.07]">
              <Stat value={NORTH_STAR.mrr} prefix="$" label="MRR target" started={started} />
            </div>
            <div className="bg-[#080810] px-5 py-6">
              <Stat value={NORTH_STAR.paidSubscribers} label="Paid subscribers" started={started} />
            </div>
          </div>

          <p className="mt-5 text-xs text-slate-600 font-medium">Scroll to explore the roadmap →</p>
        </div>
      </section>

      {/* ── Timeline (horizontal scroll on mobile, full-width on desktop) ── */}
      <section className="px-5 sm:px-8 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600 mb-8">Execution Timeline</p>

          {/* Scrollable track */}
          <div
            ref={timelineRef}
            className="overflow-x-auto pb-6 -mx-5 px-5 sm:mx-0 sm:px-0"
            style={{ scrollbarWidth: "none" }}
          >
            <div className="relative flex gap-0 min-w-max sm:min-w-0 sm:grid sm:grid-cols-4">

              {/* Connecting line */}
              <div className="absolute top-[2.15rem] left-4 right-4 h-px bg-white/[0.06] sm:left-8 sm:right-8 z-0" />

              {ROADMAP_QUARTERS.map((q, i) => (
                <div key={q.id} className="relative z-10 flex-1 min-w-[240px] sm:min-w-0 px-4 sm:px-8 first:pl-0 last:pr-0">

                  {/* Node + connector */}
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="w-[18px] h-[18px] rounded-full ring-4 ring-[#080810] shrink-0 transition-all duration-500"
                      style={{
                        backgroundColor: q.color,
                        boxShadow: `0 0 16px ${q.color}60`,
                      }}
                    />
                    {i < ROADMAP_QUARTERS.length - 1 && (
                      <div className="h-px flex-1 hidden sm:block" style={{ backgroundColor: `${q.color}25` }} />
                    )}
                  </div>

                  {/* Quarter label */}
                  <div className="mb-4">
                    <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: q.color }}>
                      {q.label}
                    </p>
                    <p className="text-[10px] text-slate-600 font-medium">{q.period}</p>
                    <h3 className="text-lg font-bold text-white mt-2 leading-tight">{q.headline}</h3>
                  </div>

                  {/* Milestone bullets */}
                  <ul className="space-y-2.5 mb-5">
                    {q.milestones.map(m => (
                      <li key={m.title} className="flex items-start gap-2">
                        <span className="mt-[5px] w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: q.color }} />
                        <div>
                          <p className="text-[13px] font-semibold text-white/90 leading-snug">{m.title}</p>
                          {m.emphasis && (
                            <p className="text-[11px] font-medium mt-0.5" style={{ color: `${q.color}cc` }}>{m.emphasis}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* User target chip */}
                  <div
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold"
                    style={{ backgroundColor: `${q.color}15`, color: q.color, border: `1px solid ${q.color}25` }}
                  >
                    Target: {q.userTarget >= 1000 ? `${q.userTarget / 1000}K` : q.userTarget} users
                  </div>
                </div>
              ))}

              {/* North Star cap */}
              <div className="relative z-10 flex-none min-w-[180px] sm:min-w-0 px-4 sm:pl-8 sm:pr-0 flex flex-col">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-[18px] h-[18px] rounded-full ring-4 ring-[#080810] bg-emerald-400 shrink-0"
                    style={{ boxShadow: "0 0 20px rgba(52,211,153,0.6)" }} />
                </div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 mb-1">July 2027</p>
                <p className="text-[10px] text-slate-600 font-medium mb-2">North Star</p>
                <p className="text-lg font-bold text-white leading-tight mb-4">The Completed Moat</p>
                <div className="space-y-1.5">
                  <p className="text-xs text-slate-300 font-semibold">500K users</p>
                  <p className="text-xs text-slate-300 font-semibold">$1.5M MRR</p>
                  <p className="text-xs text-slate-300 font-semibold">50K paid subscribers</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Three pillars ── */}
      <section className="px-5 sm:px-8 py-12 sm:py-16 border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600 mb-8">Revenue Architecture</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { name: "Reelin AI / VR", role: "Consumer habit engine", metric: "500K users", color: "#10b981",
                bullets: ["Twin-to-Twin social network", "3D spatial VR avatars", "Daily engagement loop"] },
              { name: "Swiftdroom", role: "Fast-cash SaaS engine", metric: "$1.5M MRR", color: "#8b5cf6",
                bullets: ["AI job application agent", "Independent marketplace agent", "Predictable subscription revenue"] },
              { name: "Reelin ID API", role: "B2B infrastructure protocol", metric: "Enterprise TAM", color: "#3b82f6",
                bullets: ["On-chain agent credentials", "Human vs. bot verification API", "Usage-based enterprise licensing"] },
            ].map(p => (
              <div key={p.name} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-white/10 transition-colors">
                <div className="w-2 h-2 rounded-full mb-4" style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}80` }} />
                <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: p.color }}>{p.role}</p>
                <h4 className="text-lg font-bold text-white mb-1">{p.name}</h4>
                <p className="text-xs font-bold text-slate-500 mb-4">{p.metric}</p>
                <ul className="space-y-2">
                  {p.bullets.map(b => (
                    <li key={b} className="flex items-center gap-2 text-[13px] text-slate-400">
                      <ArrowRight className="w-3 h-3 shrink-0" style={{ color: p.color }} />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Flywheel strip ── */}
      <section className="px-5 sm:px-8 py-10 sm:py-14 border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-600 mb-6">The Flywheel</p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-0 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {FLYWHEEL_STEPS.map(({ step, title }, i) => (
              <div key={step} className="flex items-center gap-3 sm:gap-0 shrink-0">
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 min-w-[180px]">
                  <span className="text-2xl font-black text-white/10 tabular-nums leading-none">{step}</span>
                  <p className="text-[13px] font-semibold text-white/80 leading-snug">{title}</p>
                </div>
                {i < FLYWHEEL_STEPS.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-slate-700 shrink-0 mx-3" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="px-5 sm:px-8 py-6 border-t border-white/[0.05] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Image src="/reelin-logo.png" alt="Reelin AI" width={18} height={18} className="rounded-sm opacity-40" />
          <span className="text-xs text-slate-700">Reelin AI, Inc. · Confidential</span>
        </div>
        <div className="flex gap-5 text-xs text-slate-700">
          <a href="https://investors.reelin.ai" className="hover:text-slate-400 transition-colors">Investor Portal</a>
          <a href="https://softdroom.com" className="hover:text-slate-400 transition-colors">Softdroom Holdings</a>
        </div>
      </footer>
    </div>
  );
}
