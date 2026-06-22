"use client";

import Image from "next/image";
import { ROADMAP_QUARTERS, FLYWHEEL_STEPS } from "@/lib/roadmapData";

export function ProductRoadmapPage() {
  return (
    <div className="min-h-screen bg-white text-[#111] font-[system-ui,'Segoe_UI',sans-serif]">

      {/* Nav */}
      <header className="border-b border-[#e5e5e5] px-8 sm:px-14 h-11 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <Image src="/reelin-logo.png" alt="Reelin AI" width={18} height={18} className="rounded" />
          <span className="text-[13px] text-[#555]">Reelin AI</span>
          <span className="text-[#ccc] text-xs mx-1">/</span>
          <span className="text-[13px] text-[#999]">Product Roadmap</span>
        </div>
        <a
          href="https://investors.reelin.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] text-[#999] hover:text-[#111] transition-colors"
        >
          Investor portal ↗
        </a>
      </header>

      <main className="max-w-3xl mx-auto px-8 sm:px-14 py-14">

        {/* Header */}
        <div className="mb-12">
          <p className="text-[12px] text-[#999] uppercase tracking-widest mb-4">July 2026 – July 2027</p>
          <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-tight leading-snug text-[#111]">
            Reelin AI — Product Roadmap
          </h1>
          <p className="mt-3 text-[14px] text-[#666] leading-relaxed max-w-lg">
            12-month execution plan across consumer, SaaS, and B2B protocol. Each phase funds the next.
          </p>

          {/* North Star */}
          <div className="mt-8 flex flex-wrap gap-8 border-t border-[#e5e5e5] pt-7">
            {[
              { value: "500K", label: "Registered users" },
              { value: "$1.5M", label: "Monthly recurring revenue" },
              { value: "50K", label: "Paid subscribers" },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="text-[22px] font-semibold text-[#111] leading-none">{value}</p>
                <p className="text-[12px] text-[#999] mt-1.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-[#e5e5e5] mb-12" />

        {/* Timeline */}
        <section className="mb-14">
          <p className="text-[11px] uppercase tracking-widest text-[#999] mb-8">Quarterly milestones</p>

          <div className="space-y-12">
            {ROADMAP_QUARTERS.map((q) => (
              <div key={q.id}>
                {/* Quarter header */}
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-[13px] font-semibold text-[#111]">{q.label}</span>
                  <span className="text-[12px] text-[#aaa]">{q.period}</span>
                  <span className="text-[12px] text-[#aaa]">
                    · {q.userTarget >= 1000 ? `${q.userTarget / 1000}K` : q.userTarget} users
                  </span>
                </div>
                <p className="text-[18px] font-semibold text-[#111] mb-1">{q.headline}</p>
                <p className="text-[13px] text-[#777] mb-5 leading-relaxed max-w-xl">{q.subheadline}</p>

                {/* Milestones */}
                <div className="space-y-0 border border-[#e5e5e5] rounded-lg overflow-hidden">
                  {q.milestones.map((m, idx) => (
                    <div
                      key={m.title}
                      className={`px-5 py-4 ${idx < q.milestones.length - 1 ? "border-b border-[#e5e5e5]" : ""}`}
                    >
                      <div className="flex items-baseline gap-3 mb-1">
                        <span className="text-[13px] font-medium text-[#111]">{m.title}</span>
                        {m.emphasis && (
                          <span className="text-[12px] text-[#888]">— {m.emphasis}</span>
                        )}
                      </div>
                      <p className="text-[12px] text-[#888] leading-relaxed">{m.description}</p>
                    </div>
                  ))}
                </div>

                {q.revenueNote && (
                  <p className="mt-3 text-[12px] text-[#aaa] leading-relaxed">{q.revenueNote}</p>
                )}
              </div>
            ))}

            {/* North star cap */}
            <div className="pt-2 border-t border-[#e5e5e5]">
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-[13px] font-semibold text-[#111]">July 2027</span>
                <span className="text-[12px] text-[#aaa]">North Star</span>
              </div>
              <div className="flex flex-wrap gap-6 mt-1">
                {["500K users", "$1.5M MRR", "50K paid subscribers"].map((s) => (
                  <span key={s} className="text-[13px] text-[#555]">{s}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <hr className="border-[#e5e5e5] mb-12" />

        {/* Revenue architecture */}
        <section className="mb-14">
          <p className="text-[11px] uppercase tracking-widest text-[#999] mb-6">Revenue architecture</p>
          <div className="space-y-0 border border-[#e5e5e5] rounded-lg overflow-hidden">
            {[
              {
                name: "Reelin AI / VR",
                sub: "Consumer",
                bullets: ["Twin social network", "3D spatial avatars", "Daily engagement loop"],
              },
              {
                name: "Swiftdroom",
                sub: "SaaS",
                bullets: ["AI job application agent", "Marketplace agent", "Subscription revenue"],
              },
              {
                name: "Reelin ID API",
                sub: "B2B Protocol",
                bullets: ["On-chain agent credentials", "Human vs. bot verification", "Enterprise licensing"],
              },
            ].map((p, i, arr) => (
              <div
                key={p.name}
                className={`px-5 py-5 ${i < arr.length - 1 ? "border-b border-[#e5e5e5]" : ""}`}
              >
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-[13px] font-semibold text-[#111]">{p.name}</span>
                  <span className="text-[11px] text-[#aaa] uppercase tracking-wide">{p.sub}</span>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  {p.bullets.map((b) => (
                    <span key={b} className="text-[12px] text-[#888]">{b}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-[#e5e5e5] mb-12" />

        {/* Flywheel */}
        <section className="mb-14">
          <p className="text-[11px] uppercase tracking-widest text-[#999] mb-6">How each phase funds the next</p>
          <div className="space-y-4">
            {FLYWHEEL_STEPS.map(({ step, title, body }) => (
              <div key={step} className="flex gap-5">
                <span className="text-[11px] font-mono text-[#ccc] w-5 shrink-0 pt-0.5">{step}</span>
                <div>
                  <p className="text-[13px] font-medium text-[#111] mb-0.5">{title}</p>
                  <p className="text-[12px] text-[#888] leading-relaxed">{body.split(" — ")[0]}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#e5e5e5] px-8 sm:px-14 py-5 flex items-center justify-between">
        <span className="text-[12px] text-[#bbb]">© 2026 Reelin AI, Inc. Confidential.</span>
        <div className="flex gap-5">
          <a href="https://investors.reelin.ai" className="text-[12px] text-[#bbb] hover:text-[#555] transition-colors">
            Investor portal
          </a>
          <a href="https://softdroom.com" className="text-[12px] text-[#bbb] hover:text-[#555] transition-colors">
            Softdroom
          </a>
        </div>
      </footer>

    </div>
  );
}
