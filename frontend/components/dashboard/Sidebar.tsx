"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Users,
  Mail,
  Zap,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/scraper", icon: Search, label: "Scraper" },
  { href: "/contacts", icon: Users, label: "Contacts" },
  { href: "/campaigns", icon: Mail, label: "Campaigns" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-[#0d0d14] border-r border-white/[0.06] h-screen">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/[0.06]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-white tracking-tight text-[15px]">
          Jarvis
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                active
                  ? "bg-violet-500/15 text-violet-300"
                  : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0",
                  active ? "text-violet-400" : "text-white/40 group-hover:text-white/60"
                )}
              />
              <span className="flex-1">{label}</span>
              {active && (
                <ChevronRight className="w-3.5 h-3.5 text-violet-400/60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/[0.06]">
        <p className="text-[11px] text-white/20 font-mono">v1.0.0</p>
      </div>
    </aside>
  );
}
