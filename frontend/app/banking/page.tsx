"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { BankingDashboard } from "@/components/banking/BankingDashboard";

export default function BankingPage() {
  const router = useRouter();

  useEffect(() => {
    if (!isAdmin()) router.replace("/");
  }, [router]);

  if (!isAdmin()) return null;

  return <BankingDashboard />;
}
