"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Users,
  Mail,
  Send,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearToken } from "@/lib/auth";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/scraper", icon: Search, label: "Scraper" },
  { href: "/contacts", icon: Users, label: "Contacts" },
  { href: "/campaigns", icon: Mail, label: "Campaigns" },
  { href: "/bulk", icon: Send, label: "Bulk Send" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;

  function handleLogout() {
    clearToken();
    router.replace("/login");
  }

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

      <div className="px-2 py-3 border-t border-neutral-800/60">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800/50 transition-colors w-full"
        >
          <LogOut className="w-[15px] h-[15px] shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
