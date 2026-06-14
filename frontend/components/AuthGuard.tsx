"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isLoggedIn, getRole } from "@/lib/auth";
import { isInvestorPortalHost } from "@/lib/investorPortalHost";

const COFOUNDER_ALLOWED = ["/influencers-finder", "/login"];
const PUBLIC_PATHS = ["/login", "/portal/login", "/"];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/portal/login")) return true;
  return false;
}

function isPortalArea(pathname: string): boolean {
  if (isInvestorPortalHost()) {
    return !pathname.startsWith("/api");
  }
  return pathname.startsWith("/portal");
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const onInvestorSite = isInvestorPortalHost();

    if (onInvestorSite && isLoggedIn() && getRole() === "investor" && pathname === "/") {
      router.replace("/dashboard");
      return;
    }

    if (isPublicPath(pathname) && (!isLoggedIn() || pathname === "/login" || pathname === "/portal/login" || (onInvestorSite && pathname === "/" && getRole() !== "investor"))) {
      setChecked(true);
      return;
    }

    if (!isLoggedIn()) {
      if (isPortalArea(pathname)) {
        router.replace(onInvestorSite ? "/" : "/portal/login");
      } else {
        router.replace("/login");
      }
      return;
    }

    const role = getRole();

    if (role === "investor") {
      if (!isPortalArea(pathname)) {
        router.replace(onInvestorSite ? "/dashboard" : "/portal");
        return;
      }
      setChecked(true);
      return;
    }

    if (isPortalArea(pathname)) {
      router.replace(role === "cofounder" ? "/influencers-finder" : "/");
      return;
    }

    if (role === "cofounder" && !COFOUNDER_ALLOWED.some(p => pathname.startsWith(p))) {
      router.replace("/influencers-finder");
      return;
    }

    setChecked(true);
  }, [pathname, router]);

  if (!checked) return null;
  return <>{children}</>;
}
