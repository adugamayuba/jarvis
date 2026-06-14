"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken, getPortalName } from "@/lib/auth";
import { portalHref } from "@/lib/investorPortalHost";
import { cn } from "@/lib/utils";
import { LayoutDashboard, PieChart, FileText, FolderOpen, LogOut } from "lucide-react";

const NAV = [
  { href: "/portal", icon: LayoutDashboard, label: "Overview" },
  { href: "/portal/cap-table", icon: PieChart, label: "Cap Table" },
  { href: "/portal/safe", icon: FileText, label: "My SAFE" },
  { href: "/portal/data-room", icon: FolderOpen, label: "Data Room" },
] as const;

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const name = getPortalName();

  function logout() {
    clearToken();
    router.replace(portalHref("/portal/login"));
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      <header className="border-b border-neutral-800 bg-neutral-950/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
              <span className="text-[11px] font-bold text-neutral-900">R</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white leading-none">Reelin AI</p>
              <p className="text-[11px] text-neutral-500 mt-0.5">Investor Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {name && <span className="text-[12px] text-neutral-400 hidden sm:block">{name}</span>}
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-[12px] text-neutral-400 hover:text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 flex gap-1 pb-2 overflow-x-auto">
          {NAV.map(({ href, icon: Icon, label }) => {
            const publicHref = portalHref(href);
            const active = href === "/portal"
              ? pathname === "/portal" || pathname === "/dashboard"
              : pathname.startsWith(href) || pathname === publicHref;
            return (
              <Link
                key={href}
                href={publicHref}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap transition-colors",
                  active ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
      </main>
    </div>
  );
}
