"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { NORTH_STAR, ROADMAP_QUARTERS, FLYWHEEL_STEPS } from "@/lib/roadmapData";

function useCountUp(target: number, duration = 1400, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let t0: number | null = null;
    const tick = (ts: number) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      setValue(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, start]);
  return value;
}

function KPI({ value, prefix = "", label, started }: { value: number; prefix?: string; label: string; started: boolean }) {
  const n = useCountUp(value, 1200, started);
  const display = value >= 1_000_000
    ? `${prefix}${(n / 1_000_000).toFixed(n >= 1_000_000 ? 1 : 0)}M`
    : `${prefix}${Math.floor(n / 1000)}K`;
  return (
    <div>
      <p className="text-[2rem] sm:text-[2.5rem] font-semibold tracking-tight text-white tabular-nums leading-none">{display}</p>
      <p className="text-sm text-neutral-500 mt-2">{label}</p>
    </div>
  );
}

const QUARTER_COLORS = ["#16a34a", "#7c3aed", "#ea580c", "#2563eb"];

export function ProductRoadmapPage() {
  const [started, setStarted] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStarted(true); obs.disconnect(); }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white font-[system-ui,'Segoe_UI',sans-serif]">

      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-40 h-12 flex items-center justify-between px-6 sm:px-10 bg-[#0d0d0d]/90 backdrop-blur-sm border-b border-white/[0.07]">
        <div className="flex items-center gap-2.5">
          <Image src="/reelin-logo.png" alt="Reelin AI" width={22} height={22} className="rounded" />
          <span className="text-[13px] font-medium text-neutral-300">Reelin AI</span>
          <span className="text-neutral-700 text-xs mx-1">/</span>
          <span className="text-[13px] text-neutral-600">Roadmap 2026–27</span>
        </div>
        <a href="https://investors.reelin.ai" target="_blank" rel="noopener noreferrer"
          className="text-[12px] text-neutral-600 hover:text-neutral-300 transition-colors">
          Investor portal ↗
        </a>
      </header>

      {/* Hero */}
      <section ref={heroRef} className="pt-28 pb-20 px-6 sm:px-10 max-w-5xl mx-auto">
        <p className="text-[13px] text-neutral-500 mb-5">July 2026 — July 2027</p>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.08] text-white max-w-xl">
          12 months to<br />category ownership.
        </h1>
        <p className="mt-5 text-[15px] text-neutral-400 max-w-sm leading-relaxed">
          A sequential flywheel — each phase funds and feeds the next.
        </p>

        {/* KPIs */}
        <div ref={heroRef} className="mt-14 flex flex-wrap gap-12 sm:gap-16">
          <KPI value={NORTH_STAR.users} label="Registered users" started={started} />
          <KPI value={NORTH_STAR.mrr} prefix="$" label="Monthly recurring revenue" started={started} />
          <KPI value={NORTH_STAR.paidSubscribers} label="Paid subscribers" started={started} />
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-white/[0.07] mx-6 sm:mx-10" />

      {/* Timeline — vertical stack */}
      <section className="px-6 sm:px-10 max-w-5xl mx-auto py-16 sm:py-20">
        <div className="relative">
          {/* Vertical rule */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-white/[0.07]" />

          <div className="space-y-16 sm:space-y-20">
            {ROADMAP_QUARTERS.map((q, i) => (
              <div key={q.id} className="relative pl-8">
                {/* Node */}
                <div
                  className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 border-[#0d0d0d]"
                  style={{ backgroundColor: QUARTER_COLORS[i] }}
                />

                {/* Header row */}
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-6">
                  <span className="text-[13px] font-medium" style={{ color: QUARTER_COLORS[i] }}>{q.label}</span>
                  <span className="text-[13px] text-neutral-600">{q.period}</span>
                  <span className="text-[13px] text-neutral-500">· {q.userTarget >= 1000 ? `${q.userTarget / 1000}K` : q.userTarget} users</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-semibold text-white mb-6 tracking-tight">{q.headline}</h2>

                {/* Milestones grid */}
                <div className="grid sm:grid-cols-3 gap-3">
                  {q.milestones.map(m => (
                    <div
                      key={m.title}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-white/10 hover:bg-white/[0.04] transition-colors"
                    >
                      <p className="text-[13px] font-medium text-white mb-1">{m.title}</p>
                      {m.emphasis && (
                        <p className="text-[12px]" style={{ color: `${QUARTER_COLORS[i]}bb` }}>{m.emphasis}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* July 2027 cap */}
            <div className="relative pl-8">
              <div className="absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border-2 border-[#0d0d0d] bg-white" />
              <div className="flex flex-wrap items-baseline gap-x-4 mb-4">
                <span className="text-[13px] font-medium text-white">July 2027</span>
                <span className="text-[13px] text-neutral-600">North Star</span>
              </div>
              <div className="flex flex-wrap gap-6">
                {["500K users", "$1.5M MRR", "50K paid subscribers"].map(s => (
                  <span key={s} className="text-[13px] text-neutral-300 font-medium">{s}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="border-t border-white/[0.07] mx-6 sm:mx-10" />

      {/* Three pillars */}
      <section className="px-6 sm:px-10 max-w-5xl mx-auto py-16 sm:py-20">
        <p className="text-[13px] text-neutral-500 mb-10">Revenue architecture</p>
        <div className="grid sm:grid-cols-3 gap-px bg-white/[0.06] rounded-xl overflow-hidden">
          {[
            {
              name: "Reelin AI / VR", sub: "Consumer",
              bullets: ["Twin social network", "3D spatial avatars", "Daily engagement loop"],
            },
            {
              name: "Swiftdroom", sub: "SaaS",
              bullets: ["AI job application agent", "Marketplace agent", "Subscription revenue"],
            },
            {
              name: "Reelin ID API", sub: "B2B Protocol",
              bullets: ["On-chain agent credentials", "Human vs. bot verification", "Enterprise licensing"],
            },
          ].map(p => (
            <div key={p.name} className="bg-[#0d0d0d] px-6 py-7">
              <p className="text-[11px] text-neutral-600 font-medium mb-3 uppercase tracking-wide">{p.sub}</p>
              <p className="text-[15px] font-semibold text-white mb-4">{p.name}</p>
              <ul className="space-y-2">
                {p.bullets.map(b => (
                  <li key={b} className="text-[13px] text-neutral-400 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-neutral-600 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Flywheel */}
      <section className="px-6 sm:px-10 max-w-5xl mx-auto pb-20 sm:pb-24">
        <p className="text-[13px] text-neutral-500 mb-8">How each phase funds the next</p>
        <div className="flex flex-col sm:flex-row gap-3">
          {FLYWHEEL_STEPS.map(({ step, title, body }, i) => (
            <div key={step} className="flex-1 flex gap-3 items-start">
              <div className="shrink-0 mt-0.5">
                <span className="text-[11px] text-neutral-600 font-mono">{step}</span>
              </div>
              <div>
                <p className="text-[13px] font-medium text-white">{title}</p>
                <p className="text-[12px] text-neutral-600 mt-1 leading-relaxed">{body.split(" — ")[0]}</p>
              </div>
              {i < FLYWHEEL_STEPS.length - 1 && (
                <span className="text-neutral-700 hidden sm:block self-center shrink-0 ml-1">→</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.07] px-6 sm:px-10 py-6 flex items-center justify-between">
        <span className="text-[12px] text-neutral-700">© 2026 Reelin AI, Inc. Confidential.</span>
        <div className="flex gap-5">
          <a href="https://investors.reelin.ai" className="text-[12px] text-neutral-700 hover:text-neutral-400 transition-colors">Investor portal</a>
          <a href="https://softdroom.com" className="text-[12px] text-neutral-700 hover:text-neutral-400 transition-colors">Softdroom</a>
        </div>
      </footer>
    </div>
  );
}
