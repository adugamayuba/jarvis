"use client";

import { useQuery } from "@tanstack/react-query";
import { getContacts, getCampaigns, getScrapeJobs } from "@/lib/api";
import { Users, Mail, Search, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ScrapeJob } from "@/types";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="border border-neutral-800 rounded-lg px-5 py-4 bg-neutral-900/40">
      <p className="text-2xl font-semibold text-white tabular-nums">{value}</p>
      <p className="text-[13px] text-neutral-400 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-neutral-600 mt-1">{sub}</p>}
    </div>
  );
}

function StatusDot({ status }: { status: ScrapeJob["status"] }) {
  return (
    <span
      className={cn(
        "inline-block w-1.5 h-1.5 rounded-full shrink-0",
        status === "completed" ? "bg-emerald-500" :
        status === "running" ? "bg-amber-400 animate-pulse" :
        status === "failed" ? "bg-red-500" : "bg-neutral-600"
      )}
    />
  );
}

export default function DashboardPage() {
  const { data: contactsData } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => getContacts({ limit: 1000 }),
  });
  const { data: campaignsData } = useQuery({
    queryKey: ["campaigns"],
    queryFn: getCampaigns,
  });
  const { data: jobsData } = useQuery({
    queryKey: ["scrapeJobs"],
    queryFn: getScrapeJobs,
  });

  const contacts = contactsData?.data || [];
  const campaigns = campaignsData?.data || [];
  const jobs = jobsData?.data || [];

  const emailsSent = contacts.filter((c) => c.emailSent).length;
  const activeJobs = jobs.filter((j) => j.status === "running").length;
  const totalSent = campaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0);

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Overview</h1>
        <p className="text-[13px] text-neutral-500 mt-0.5">Your outreach pipeline at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
        <StatCard label="Total Contacts" value={contacts.length} sub="across all sources" />
        <StatCard label="Emails Sent" value={emailsSent} sub={`${totalSent} deliveries`} />
        <StatCard label="Campaigns" value={campaigns.length} sub={`${campaigns.filter(c => c.status === "sent").length} completed`} />
        <StatCard label="Active Scrapes" value={activeJobs} sub={`${jobs.length} total`} />
      </div>

      {/* Actions */}
      <div className="mb-10">
        <h2 className="text-[11px] font-medium text-neutral-500 uppercase tracking-widest mb-3">Get started</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { href: "/scraper", icon: Search, label: "Scrape leads", desc: "Import from Crunchbase" },
            { href: "/contacts", icon: Users, label: "Contacts", desc: `${contacts.length} in your list` },
            { href: "/campaigns", icon: Mail, label: "Send campaign", desc: "Outreach at scale" },
          ].map(({ href, icon: Icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="border border-neutral-800 rounded-lg px-4 py-3.5 hover:border-neutral-700 hover:bg-neutral-800/30 transition-all group"
            >
              <Icon className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300 mb-2.5 transition-colors" />
              <p className="text-[13px] font-medium text-neutral-200">{label}</p>
              <p className="text-[12px] text-neutral-500 mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Jobs */}
      <div>
        <h2 className="text-[11px] font-medium text-neutral-500 uppercase tracking-widest mb-3">Recent scrapes</h2>
        <div className="border border-neutral-800 rounded-lg overflow-hidden">
          {jobs.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-[13px] text-neutral-500">No scrape jobs yet.</p>
              <Link href="/scraper" className="text-[13px] text-neutral-400 hover:text-white underline underline-offset-2 mt-1 inline-block transition-colors">
                Start your first scrape
              </Link>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-800">
                  <th className="px-4 py-2.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wider w-2/3">URL</th>
                  <th className="px-4 py-2.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Source</th>
                  <th className="px-4 py-2.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Contacts</th>
                  <th className="px-4 py-2.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {jobs.slice(0, 6).map((job) => (
                  <tr key={job.id} className="hover:bg-neutral-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-[13px] text-neutral-300 truncate max-w-sm font-mono">{job.url}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] text-neutral-500 capitalize">{job.source}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] text-neutral-400">
                        {job.contactsFound ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusDot status={job.status} />
                        <span className="text-[12px] text-neutral-500 capitalize">{job.status}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
