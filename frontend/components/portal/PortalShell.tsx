"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearToken, getPortalName } from "@/lib/auth";
import { portalHref } from "@/lib/investorPortalHost";
import { cn } from "@/lib/utils";
import { PortalLogo } from "./PortalLogo";
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
    <div className={p.shell}>
      <header className={p.header}>
        <div className="max-w-6xl mx-auto px-6 sm:px-8 h-[4.25rem] flex items-center justify-between">
          <PortalLogo size="sm" />
          <div className="flex items-center gap-5">
            {name && (
              <span className="text-[15px] text-slate-600 hidden sm:block font-medium">{name}</span>
            )}
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 text-[15px] text-slate-500 hover:text-slate-900 transition-colors font-medium"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-6 sm:px-8 flex gap-8 overflow-x-auto border-t border-slate-100 pt-0">
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
                  "text-[15px] font-medium whitespace-nowrap transition-colors shrink-0",
                  active ? p.navActive : p.navIdle
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className={p.main}>{children}</main>
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-6 sm:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-sm text-slate-500">Reelin AI · Confidential investor materials</p>
          <p className="text-sm text-slate-400">investors.reelin.ai</p>
        </div>
      </footer>
    </div>
  );
}
