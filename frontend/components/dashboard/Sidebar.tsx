"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Users,
  Mail,
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
    <aside className="w-56 shrink-0 flex flex-col border-r border-neutral-800/60 h-screen bg-neutral-950">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-neutral-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" fill="#0a0a0a" stroke="#0a0a0a" strokeWidth="0.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">Jarvis</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-px">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors",
                active
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
              )}
            >
              <Icon className="w-[15px] h-[15px] shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-neutral-800/60">
        <p className="text-[11px] text-neutral-600 font-mono">v1.0.0</p>
      </div>
    </aside>
  );
}
