"use client";

import Image from "next/image";
import {
  CAMPAIGN_COUNT,
  CAMPAIGN_HISTORY,
  MAILING_LIST_SEGMENTS,
  MAILING_LIST_TOTAL,
  MARKETING_META,
  TOTAL_SENT,
} from "@/lib/marketingData";

function fmt(n: number) {
  return n.toLocaleString();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

export default function MarketingDashboardPage() {
  const avgOpen =
    CAMPAIGN_HISTORY.reduce((s, c) => s + c.openRate, 0) / CAMPAIGN_HISTORY.length;
  const avgClick =
    CAMPAIGN_HISTORY.reduce((s, c) => s + c.clickRate, 0) / CAMPAIGN_HISTORY.length;

  return (
    <div className="min-h-screen bg-white text-[#111] font-[system-ui,'Segoe_UI',sans-serif]">

      <header className="border-b border-[#e5e5e5] px-8 sm:px-14 h-11 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center gap-2">
          <Image src="/reelin-logo.png" alt="Reelin AI" width={18} height={18} className="rounded" />
          <span className="text-[13px] text-[#555]">Reelin AI</span>
          <span className="text-[#ccc] text-xs mx-1">/</span>
          <span className="text-[13px] text-[#999]">Email Marketing</span>
        </div>
        <span className="text-[12px] text-[#999]">{MARKETING_META.platform}</span>
      </header>

      <main className="max-w-5xl mx-auto px-8 sm:px-14 py-12 space-y-12">

        <div>
          <p className="text-[12px] text-[#999] uppercase tracking-widest mb-3">
            {MARKETING_META.reportingPeriod}
          </p>
          <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-[#111]">
            Email Marketing Dashboard
          </h1>
          <p className="mt-2 text-[14px] text-[#666]">
            Mailing list and campaign metrics for {MARKETING_META.company}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 border border-[#e5e5e5] rounded-lg p-6">
          {[
            { label: "Mailing list", value: fmt(MAILING_LIST_TOTAL) },
            { label: "Campaigns (3 mo)", value: fmt(CAMPAIGN_COUNT) },
            { label: "Total sent", value: fmt(TOTAL_SENT) },
            { label: "Avg open rate", value: pct(avgOpen) },
            { label: "Avg click rate", value: pct(avgClick) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[20px] font-semibold text-[#111] leading-none tabular-nums">{value}</p>
              <p className="text-[11px] text-[#999] mt-2">{label}</p>
            </div>
          ))}
        </div>

        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4">
            <p className="text-[11px] uppercase tracking-widest text-[#999]">Mailing list</p>
            <p className="text-[13px] text-[#666]">
              Combined total: <span className="font-semibold text-[#111]">{fmt(MAILING_LIST_TOTAL)}</span> prospects
            </p>
          </div>
          <div className="border border-[#e5e5e5] rounded-lg overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#fafafa] text-[#888] text-left">
                  <th className="px-5 py-3 font-medium">List</th>
                  <th className="px-5 py-3 font-medium">Source</th>
                  <th className="px-5 py-3 font-medium text-right">Prospect</th>
                </tr>
              </thead>
              <tbody>
                {MAILING_LIST_SEGMENTS.map((seg, i) => (
                  <tr
                    key={seg.name}
                    className={i < MAILING_LIST_SEGMENTS.length - 1 ? "border-b border-[#e5e5e5]" : ""}
                  >
                    <td className="px-5 py-3.5 text-[#111]">{seg.name}</td>
                    <td className="px-5 py-3.5 text-[#888]">{seg.source}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-[#111]">{fmt(seg.count)}</td>
                  </tr>
                ))}
                <tr className="border-t border-[#e5e5e5] bg-[#fafafa]">
                  <td className="px-5 py-3.5 font-semibold text-[#111]" colSpan={2}>
                    Combined total
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold tabular-nums text-[#111]">
                    {fmt(MAILING_LIST_TOTAL)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <p className="text-[11px] uppercase tracking-widest text-[#999] mb-4">
            Campaign history (last 3 months · {CAMPAIGN_COUNT} monthly campaigns)
          </p>
          <div className="border border-[#e5e5e5] rounded-lg overflow-x-auto">
            <table className="w-full text-[13px] min-w-[640px]">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#fafafa] text-[#888] text-left">
                  <th className="px-5 py-3 font-medium">Campaign</th>
                  <th className="px-5 py-3 font-medium">List</th>
                  <th className="px-5 py-3 font-medium">Sent</th>
                  <th className="px-5 py-3 font-medium text-right">Recipients</th>
                  <th className="px-5 py-3 font-medium text-right">Delivered</th>
                  <th className="px-5 py-3 font-medium text-right">Open rate</th>
                  <th className="px-5 py-3 font-medium text-right">Click rate</th>
                </tr>
              </thead>
              <tbody>
                {CAMPAIGN_HISTORY.map((c, i) => (
                  <tr
                    key={c.id}
                    className={i < CAMPAIGN_HISTORY.length - 1 ? "border-b border-[#e5e5e5]" : ""}
                  >
                    <td className="px-5 py-3.5 text-[#111] font-medium">{c.name}</td>
                    <td className="px-5 py-3.5 text-[#888]">{c.list}</td>
                    <td className="px-5 py-3.5 text-[#888] whitespace-nowrap">{fmtDate(c.sentAt)}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums">{fmt(c.recipients)}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums">{fmt(c.delivered)}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums">{pct(c.openRate)}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums">{pct(c.clickRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>

      <footer className="border-t border-[#e5e5e5] px-8 sm:px-14 py-5">
        <span className="text-[12px] text-[#bbb]">
          © 2026 Reelin AI, Inc. · {MARKETING_META.platform} · Confidential
        </span>
      </footer>
    </div>
  );
}
