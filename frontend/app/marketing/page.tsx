"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { getCampaigns } from "@/lib/api";
import {
  CAMPAIGN_HISTORY,
  FEATURED_EMAILS,
  MAILING_LIST_SEGMENTS,
  MAILING_LIST_TOTAL,
  MARKETING_META,
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
  const { data: campaignsData } = useQuery({
    queryKey: ["campaigns"],
    queryFn: getCampaigns,
  });

  const liveCampaigns = campaignsData?.data || [];
  const totalDelivered = CAMPAIGN_HISTORY.reduce((s, c) => s + c.delivered, 0);
  const avgOpen =
    CAMPAIGN_HISTORY.reduce((s, c) => s + c.openRate, 0) / CAMPAIGN_HISTORY.length;

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
            Mailing lists, campaigns, and delivery history for {MARKETING_META.company}
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border border-[#e5e5e5] rounded-lg p-6">
          {[
            { label: "Total mailing list", value: fmt(MAILING_LIST_TOTAL) },
            { label: "Campaigns (12 mo)", value: fmt(CAMPAIGN_HISTORY.length) },
            { label: "Emails delivered", value: fmt(totalDelivered) },
            { label: "Avg open rate", value: pct(avgOpen) },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[22px] font-semibold text-[#111] leading-none tabular-nums">{value}</p>
              <p className="text-[12px] text-[#999] mt-2">{label}</p>
            </div>
          ))}
        </div>

        {/* Featured emails */}
        <section>
          <p className="text-[11px] uppercase tracking-widest text-[#999] mb-4">Recent emails</p>
          <div className="space-y-3">
            {FEATURED_EMAILS.map((email) => (
              <div
                key={email.id}
                className="border border-[#e5e5e5] rounded-lg overflow-hidden"
              >
                <div className="px-5 py-3 border-b border-[#e5e5e5] bg-[#fafafa] flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-[#111] truncate">{email.subject}</p>
                    <p className="text-[12px] text-[#888] mt-0.5">
                      {email.fromName} &lt;{email.fromEmail}&gt;
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-[12px] text-[#888] shrink-0">
                    <span>{fmtDate(email.sentAt)}</span>
                    <span>{fmt(email.recipients)} recipients</span>
                    <span className="text-[#16a34a] capitalize">{email.status}</span>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <p className="text-[11px] text-[#aaa] mb-2">{email.list}</p>
                  <p className="text-[13px] text-[#555] leading-relaxed whitespace-pre-line line-clamp-4">
                    {email.preview}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <hr className="border-[#e5e5e5]" />

        {/* Mailing list */}
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
                  <th className="px-5 py-3 font-medium text-right">Subscribers</th>
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

        <hr className="border-[#e5e5e5]" />

        {/* Campaign history */}
        <section>
          <p className="text-[11px] uppercase tracking-widest text-[#999] mb-4">Campaign history (last 12 months)</p>
          <div className="border border-[#e5e5e5] rounded-lg overflow-x-auto">
            <table className="w-full text-[13px] min-w-[720px]">
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
                    <td className="px-5 py-3.5">
                      <p className="text-[#111] font-medium">{c.name}</p>
                      <p className="text-[12px] text-[#888] mt-0.5 truncate max-w-[220px]">{c.subject}</p>
                    </td>
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

        {liveCampaigns.length > 0 && (
          <section>
            <p className="text-[11px] uppercase tracking-widest text-[#999] mb-4">Live Jarvis campaigns</p>
            <div className="border border-[#e5e5e5] rounded-lg divide-y divide-[#e5e5e5]">
              {liveCampaigns.slice(0, 5).map((c) => (
                <div key={c.id} className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-medium text-[#111]">{c.name}</p>
                    <p className="text-[12px] text-[#888] mt-0.5">{c.subject}</p>
                  </div>
                  <div className="text-[12px] text-[#888] tabular-nums">
                    {c.sentCount ?? 0} sent · {c.status}
                    {c.createdAt ? ` · ${fmtDate(c.createdAt)}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      <footer className="border-t border-[#e5e5e5] px-8 sm:px-14 py-5">
        <span className="text-[12px] text-[#bbb]">
          © 2026 Reelin AI, Inc. · {MARKETING_META.platform} · Confidential
        </span>
      </footer>
    </div>
  );
}
