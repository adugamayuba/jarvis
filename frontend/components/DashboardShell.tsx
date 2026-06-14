"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { isInvestorPortalHost } from "@/lib/investorPortalHost";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortal = pathname.startsWith("/portal") || isInvestorPortalHost();

  if (isPortal) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden pt-12 md:pt-0">{children}</main>
    </div>
  );
}
