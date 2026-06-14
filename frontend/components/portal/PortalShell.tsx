"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken, getPortalName } from "@/lib/auth";
import { portalHref } from "@/lib/investorPortalHost";
import { cn } from "@/lib/utils";
import { PortalLogo } from "./PortalLogo";
import { PortalConfidentiality } from "./PortalConfidentiality";
import { PortalBottomNav } from "./PortalBottomNav";
import { p } from "./portalTheme";
import { LogOut } from "lucide-react";

const NAV = [
  { href: "/portal", label: "Overview" },
  { href: "/portal/cap-table", label: "Cap Table" },
  { href: "/portal/safe", label: "My SAFE" },
  { href: "/portal/data-room", label: "Data Room" },
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
    <div className={`${p.shell} flex flex-col min-h-screen`}>
      <header className={p.header}>
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-14 sm:h-[4.25rem] flex items-center justify-between gap-3">
          <Link href={portalHref("/portal")} className="hover:opacity-90 transition-opacity min-w-0">
            <PortalLogo size="sm" />
          </Link>
          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            {name && (
              <span className="text-sm sm:text-[15px] text-slate-600 hidden xs:block sm:block font-medium truncate max-w-[120px] sm:max-w-none">
                {name}
              </span>
            )}
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 text-sm sm:text-[15px] text-slate-500 hover:text-slate-900 transition-colors font-medium p-2 -mr-2"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
        <nav className="hidden md:flex max-w-6xl mx-auto px-4 sm:px-8 gap-8 overflow-x-auto border-t border-slate-100">
          {NAV.map(({ href, label }) => {
            const publicHref = portalHref(href);
            const active =
              href === "/portal"
                ? pathname === "/portal" || pathname === "/dashboard"
                : pathname.startsWith(href) || pathname === publicHref;
            return (
              <Link
                key={href}
                href={publicHref}
                className={cn(
                  "py-3.5 text-[15px] font-medium whitespace-nowrap transition-colors shrink-0",
                  active ? p.navActive : p.navIdle
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className={`${p.main} flex-1 pb-24 md:pb-10`}>{children}</main>
      <div className="hidden md:block">
        <PortalConfidentiality />
      </div>
      <div className="md:hidden pb-20">
        <PortalConfidentiality />
      </div>
      <PortalBottomNav />
    </div>
  );
}
