"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, Search, Users, Mail,
  Send, LogOut, Zap, TrendingUp, Menu, X, Upload, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearToken, getRole } from "@/lib/auth";

const adminNavItems = [
  { href: "/jarvis", icon: Zap, label: "Jarvis AI" },
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/investors", icon: TrendingUp, label: "Investors" },
  { href: "/import", icon: Upload, label: "Import & Emails" },
  { href: "/scraper", icon: Search, label: "Scraper" },
  { href: "/contacts", icon: Users, label: "Contacts" },
  { href: "/campaigns", icon: Mail, label: "Campaigns" },
  { href: "/bulk", icon: Send, label: "Bulk Send" },
  { href: "/influencers-finder", icon: Star, label: "Influencers" },
];

const cofounderNavItems = [
  { href: "/influencers-finder", icon: Star, label: "Influencer Finder" },
];

function NavLinks({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const role = getRole();
  const navItems = role === "cofounder" ? cofounderNavItems : adminNavItems;

  function handleLogout() {
    clearToken();
    router.replace("/login");
  }

  return (
    <>
      {role === "cofounder" && (
        <div className="px-4 py-3 border-b border-neutral-800/60">
          <p className="text-[11px] text-neutral-600 uppercase tracking-widest">Co-founder Access</p>
        </div>
      )}
      <nav className="flex-1 px-2 py-3 space-y-px">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} onClick={onClose}
              className={cn(
                "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors",
                active ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
              )}>
              <Icon className="w-[15px] h-[15px] shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-2 py-3 border-t border-neutral-800/60">
        <button onClick={handleLogout}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13px] font-medium text-neutral-600 hover:text-neutral-300 hover:bg-neutral-800/50 transition-colors w-full">
          <LogOut className="w-[15px] h-[15px] shrink-0" />
          Sign out
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname === "/login") return null;

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-neutral-950 border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" fill="#0a0a0a" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-white">Jarvis</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="text-neutral-400 hover:text-white transition-colors">
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-neutral-950 border-r border-neutral-800 flex flex-col h-full z-10">
            <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" fill="#0a0a0a" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-sm font-semibold text-white">Jarvis</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-neutral-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <NavLinks onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r border-neutral-800/60 h-screen bg-neutral-950">
        <div className="px-4 py-4 border-b border-neutral-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" fill="#0a0a0a" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">Jarvis</span>
          </div>
        </div>
        <NavLinks />
      </aside>
    </>
  );
}
