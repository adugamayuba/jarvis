"use client";

import { useQuery } from "@tanstack/react-query";
import { getContacts, getCampaigns, getScrapeJobs } from "@/lib/api";
import {
  Users,
  Mail,
  Search,
  CheckCircle2,
  TrendingUp,
  Clock,
  Zap,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(
            "w-9 h-9 rounded-lg flex items-center justify-center",
            color
          )}
        >
          <Icon className="w-4.5 h-4.5" />
        </div>
        <TrendingUp className="w-4 h-4 text-white/20" />
      </div>
      <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
      <p className="text-sm text-white/50">{label}</p>
      {sub && <p className="text-xs text-white/30 mt-1">{sub}</p>}
    </div>
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
  const totalSent = campaigns.reduce(
    (sum, c) => sum + (c.sentCount || 0),
    0
  );

  const quickActions = [
    {
      href: "/scraper",
      icon: Search,
      label: "Scrape new leads",
      desc: "Import from Crunchbase",
      color: "bg-violet-500/10 text-violet-400",
    },
    {
      href: "/contacts",
      icon: Users,
      label: "View contacts",
      desc: `${contacts.length} contacts ready`,
      color: "bg-blue-500/10 text-blue-400",
    },
    {
      href: "/campaigns",
      icon: Mail,
      label: "Send campaign",
      desc: "Reach out at scale",
      color: "bg-emerald-500/10 text-emerald-400",
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-violet-400" />
          <span className="text-xs font-mono text-violet-400 uppercase tracking-widest">
            Jarvis
          </span>
        </div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">
          Your AI-powered outreach command center
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Total Contacts"
          value={contacts.length}
          sub="Across all sources"
          color="bg-violet-500/10 text-violet-400"
        />
        <StatCard
          icon={CheckCircle2}
          label="Emails Sent"
          value={emailsSent}
          sub={`${totalSent} total deliveries`}
          color="bg-emerald-500/10 text-emerald-400"
        />
        <StatCard
          icon={Mail}
          label="Campaigns"
          value={campaigns.length}
          sub={`${campaigns.filter((c) => c.status === "sent").length} completed`}
          color="bg-blue-500/10 text-blue-400"
        />
        <StatCard
          icon={Clock}
          label="Active Scrapes"
          value={activeJobs}
          sub={`${jobs.length} total jobs`}
          color="bg-amber-500/10 text-amber-400"
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {quickActions.map(({ href, icon: Icon, label, desc, color }) => (
            <Link
              key={href}
              href={href}
              className="bg-[#0d0d14] border border-white/[0.06] rounded-xl p-4 flex items-center gap-4 hover:border-white/[0.12] hover:bg-white/[0.02] transition-all group"
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  color
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{label}</p>
                <p className="text-xs text-white/40">{desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Jobs */}
      <div>
        <h2 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-3">
          Recent Scrape Jobs
        </h2>
        <div className="bg-[#0d0d14] border border-white/[0.06] rounded-xl overflow-hidden">
          {jobs.length === 0 ? (
            <div className="p-8 text-center">
              <Search className="w-8 h-8 text-white/10 mx-auto mb-2" />
              <p className="text-white/30 text-sm">No scrape jobs yet</p>
              <Link
                href="/scraper"
                className="text-violet-400 text-sm hover:underline mt-1 inline-block"
              >
                Start your first scrape →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {jobs.slice(0, 5).map((job) => (
                <div
                  key={job.id}
                  className="px-5 py-3.5 flex items-center gap-4"
                >
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      job.status === "completed"
                        ? "bg-emerald-400"
                        : job.status === "running"
                        ? "bg-amber-400 animate-pulse"
                        : job.status === "failed"
                        ? "bg-red-400"
                        : "bg-white/20"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">{job.url}</p>
                    <p className="text-xs text-white/30">
                      {job.source} ·{" "}
                      {job.contactsFound !== undefined
                        ? `${job.contactsFound} contacts`
                        : job.status}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      job.status === "completed"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : job.status === "running"
                        ? "bg-amber-500/10 text-amber-400"
                        : job.status === "failed"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-white/5 text-white/40"
                    )}
                  >
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
