"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Search, Users, Mail,
  Send, LogOut, Zap, TrendingUp, Menu, X, Upload, Star, BookOpen, Video,
  Building2, Briefcase, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearToken, getRole } from "@/lib/auth";
import { getGrowthHubSubsidiaries } from "@/lib/subsidiaries";

const reelinPipelineItems = [
  { href: "/scraper", icon: Search, label: "Scraper" },
  { href: "/import", icon: Upload, label: "Import & Emails" },
  { href: "/contacts", icon: Users, label: "Contacts" },
  { href: "/campaigns", icon: Mail, label: "Campaigns" },
  { href: "/bulk", icon: Send, label: "Bulk Send" },
  { href: "/investors", icon: TrendingUp, label: "Investors" },
  { href: "/applications", icon: Send, label: "Applications" },
  { href: "/documents", icon: BookOpen, label: "Documents" },
];

const sharedOpsItems = [
  { href: "/jarvis", icon: Zap, label: "Jarvis AI" },
  { href: "/influencers-finder", icon: Star, label: "Influencers" },
  { href: "/ugc", icon: Video, label: "UGC" },
];

const cofounderNavItems = [
  { href: "/influencers-finder", icon: Star, label: "Influencer Finder" },
];

function NavLink({
  href,
  icon: Icon,
  label,
  active,
  onClose,
  indent,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClose?: () => void;
  indent?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-2.5 py-2 rounded-md text-[13px] font-medium transition-colors",
        indent ? "pl-5 pr-2.5" : "px-2.5",
        active ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
      )}
    >
      <Icon className="w-[15px] h-[15px] shrink-0" />
      {label}
    </Link>
  );
}

function NavLinks({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const role = getRole();
  const growthHubs = getGrowthHubSubsidiaries();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  function handleLogout() {
    clearToken();
    router.replace("/login");
  }

  if (role === "cofounder") {
    return (
      <>
        <div className="px-4 py-3 border-b border-neutral-800/60">
          <p className="text-[11px] text-neutral-600 uppercase tracking-widest">Co-founder Access</p>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-px">
          {cofounderNavItems.map(({ href, icon, label }) => (
            <NavLink key={href} href={href} icon={icon} label={label} active={isActive(href)} onClose={onClose} />
          ))}
        </nav>
        <div className="px-2 py-3 border-t border-neutral-800/60">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800/50 transition-colors w-full"
          >
            <LogOut className="w-[15px] h-[15px] shrink-0" />
            Sign out
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <nav className="flex-1 px-2 py-3 space-y-4 overflow-y-auto">
        {/* Holdings */}
        <div>
          <p className="px-2.5 mb-1 text-[10px] font-medium text-neutral-600 uppercase tracking-widest">
            Softdroom Holdings
          </p>
          <NavLink
            href="/"
            icon={Building2}
            label="Command Center"
            active={pathname === "/"}
            onClose={onClose}
          />
        </div>

        {/* Subsidiaries with growth hubs */}
        <div>
          <p className="px-2.5 mb-1 text-[10px] font-medium text-neutral-600 uppercase tracking-widest">
            Subsidiaries
          </p>
          <div className="space-y-px">
            {growthHubs.map(sub => (
              <NavLink
                key={sub.slug}
                href={`/subsidiaries/${sub.slug}`}
                icon={sub.slug === "swiftdroom" ? Briefcase : Sparkles}
                label={sub.name}
                active={pathname.startsWith(`/subsidiaries/${sub.slug}`)}
                onClose={onClose}
                indent
              />
            ))}
          </div>
        </div>

        {/* Reelin pipeline */}
        <div>
          <p className="px-2.5 mb-1 text-[10px] font-medium text-neutral-600 uppercase tracking-widest">
            Reelin AI · Pipeline
          </p>
          <div className="space-y-px">
            {reelinPipelineItems.map(({ href, icon, label }) => (
              <NavLink key={href} href={href} icon={icon} label={label} active={isActive(href)} onClose={onClose} indent />
            ))}
          </div>
        </div>

        {/* Shared ops */}
        <div>
          <p className="px-2.5 mb-1 text-[10px] font-medium text-neutral-600 uppercase tracking-widest">
            Operations
          </p>
          <div className="space-y-px">
            {sharedOpsItems.map(({ href, icon, label }) => (
              <NavLink key={href} href={href} icon={icon} label={label} active={isActive(href)} onClose={onClose} indent />
            ))}
          </div>
        </div>
      </nav>

      <div className="px-2 py-3 border-t border-neutral-800/60 shrink-0">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800/50 transition-colors w-full"
        >
          <LogOut className="w-[15px] h-[15px] shrink-0" />
          Sign out
        </button>
      </div>
    </>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center shrink-0">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" fill="#0a0a0a" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white tracking-tight truncate">Jarvis</p>
        <p className="text-[9px] text-neutral-600 truncate">Softdroom Holdings</p>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname === "/login") return null;

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-neutral-950 border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <Brand />
        <button onClick={() => setMobileOpen(true)} className="text-neutral-400 hover:text-white transition-colors">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col h-full z-10">
            <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-800">
              <Brand />
              <button onClick={() => setMobileOpen(false)} className="text-neutral-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <NavLinks onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-neutral-800/60 h-screen bg-neutral-950">
        <div className="px-4 py-4 border-b border-neutral-800/60 shrink-0">
          <Brand />
        </div>
        <NavLinks />
      </aside>
    </>
  );
}
