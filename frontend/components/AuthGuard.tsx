"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isLoggedIn, getRole } from "@/lib/auth";

// Pages co-founders can access
const COFOUNDER_ALLOWED = ["/influencers-finder", "/login"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (pathname === "/login") {
      setChecked(true);
      return;
    }
    if (!isLoggedIn()) {
      router.replace("/login");
      return;
    }
    const role = getRole();
    if (role === "cofounder" && !COFOUNDER_ALLOWED.some(p => pathname.startsWith(p))) {
      router.replace("/influencers-finder");
      return;
    }
    setChecked(true);
  }, [pathname, router]);

  if (!checked) return null;
  return <>{children}</>;
}
