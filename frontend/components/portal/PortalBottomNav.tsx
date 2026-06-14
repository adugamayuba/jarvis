"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { portalHref } from "@/lib/investorPortalHost";
import { cn } from "@/lib/utils";
import { LayoutDashboard, PieChart, FileText, FolderOpen } from "lucide-react";

const NAV = [
  { href: "/portal", icon: LayoutDashboard, label: "Overview" },
  { href: "/portal/cap-table", icon: PieChart, label: "Cap Table" },
  { href: "/portal/safe", icon: FileText, label: "SAFE" },
  { href: "/portal/data-room", icon: FolderOpen, label: "Data Room" },
] as const;

export function PortalBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 safe-area-pb shadow-[0_-4px_24px_rgba(15,23,42,0.06)]">
      <div className="grid grid-cols-4">
        {NAV.map(({ href, icon: Icon, label }) => {
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
                "flex flex-col items-center justify-center gap-1 py-2.5 px-1 min-h-[3.5rem] transition-colors",
                active ? "text-slate-900" : "text-slate-400"
              )}
            >
              <Icon className={cn("w-5 h-5", active && "stroke-[2.5px]")} />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
