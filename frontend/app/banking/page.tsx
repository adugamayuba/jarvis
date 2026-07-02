"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import {
  ACCOUNTS,
  BANKING_META,
  JUNE_2026_FLOW,
  TOTAL_BALANCE,
  TRANSACTIONS,
  type BankingTransaction,
} from "@/lib/bankingData";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Download,
  Landmark,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

function fmtMoney(n: number, signed = false) {
  const abs = Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (!signed) return `$${abs}`;
  if (n >= 0) return `+$${abs}`;
  return `−$${abs}`;
}

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function TransactionRow({ tx }: { tx: BankingTransaction }) {
  const incoming = tx.amount >= 0;
  return (
    <tr className="border-b border-[#ececec] last:border-0 hover:bg-[#fafafa] transition-colors">
      <td className="px-4 py-3.5 text-[13px] text-[#666] whitespace-nowrap tabular-nums">
        {fmtDate(tx.date)}
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
              incoming ? "bg-[#e8f5ee]" : "bg-[#f3f3f3]"
            )}
          >
            {incoming ? (
              <ArrowDownLeft className="w-3.5 h-3.5 text-[#1a7f4b]" />
            ) : (
              <ArrowUpRight className="w-3.5 h-3.5 text-[#666]" />
            )}
          </div>
          <div>
            <p className="text-[13px] font-medium text-[#111]">{tx.description}</p>
            <p className="text-[12px] text-[#888]">{tx.counterparty}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 text-[12px] text-[#888] hidden sm:table-cell">{tx.category}</td>
      <td className="px-4 py-3.5 text-[12px] text-[#888] hidden md:table-cell">
        •••{ACCOUNTS.find((a) => a.id === tx.accountId)?.lastFour}
      </td>
      <td
        className={cn(
          "px-4 py-3.5 text-[13px] font-medium text-right tabular-nums whitespace-nowrap",
          incoming ? "text-[#1a7f4b]" : "text-[#111]"
        )}
      >
        {fmtMoney(tx.amount, true)}
      </td>
    </tr>
  );
}

const NAV_ITEMS = ["Home", "Transactions", "Accounts", "Payments", "Cards"] as const;

export default function BankingPage() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState<(typeof NAV_ITEMS)[number]>("Home");
  const [accountFilter, setAccountFilter] = useState<string>("all");

  useEffect(() => {
    if (!isAdmin()) {
      router.replace("/");
    }
  }, [router]);

  const filteredTransactions = useMemo(() => {
    if (accountFilter === "all") return TRANSACTIONS;
    return TRANSACTIONS.filter((t) => t.accountId === accountFilter);
  }, [accountFilter]);

  if (!isAdmin()) return null;

  return (
    <div className="min-h-full bg-[#f4f5f7] text-[#111] font-[system-ui,'Segoe_UI',sans-serif] overflow-y-auto h-full">
      {/* Mercury-style top bar */}
      <header className="bg-white border-b border-[#e5e5e7] px-4 sm:px-6 h-12 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#5266eb] flex items-center justify-center">
              <Landmark className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-[14px] font-semibold text-[#111] tracking-tight">Mercury</span>
          </div>
          <span className="text-[#ddd] hidden sm:inline">|</span>
          <span className="text-[13px] text-[#666] hidden sm:inline">{BANKING_META.entity}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#999] hidden md:inline">Demo view · Jarvis dashboard</span>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-[12px] text-[#666] hover:text-[#111] px-2.5 py-1.5 rounded-md hover:bg-[#f4f5f7] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row min-h-[calc(100%-3rem)]">
        {/* Left nav — Mercury sidebar */}
        <aside className="lg:w-52 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-[#e5e5e7] px-2 py-3 lg:py-4">
          <nav className="flex lg:flex-col gap-0.5 overflow-x-auto lg:overflow-visible">
            {NAV_ITEMS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setActiveNav(item)}
                disabled={item !== "Home" && item !== "Transactions"}
                className={cn(
                  "px-3 py-2 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors text-left",
                  activeNav === item
                    ? "bg-[#eef0fd] text-[#5266eb]"
                    : item === "Home" || item === "Transactions"
                      ? "text-[#444] hover:bg-[#f4f5f7]"
                      : "text-[#bbb] cursor-not-allowed"
                )}
              >
                {item}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl">
          <div className="mb-6">
            <p className="text-[12px] text-[#888] mb-1">Total balance</p>
            <h1 className="text-[36px] sm:text-[42px] font-semibold tracking-tight text-[#111] tabular-nums leading-none">
              {fmtMoney(TOTAL_BALANCE)}
            </h1>
            <p className="text-[12px] text-[#999] mt-2">
              As of {new Date(BANKING_META.asOf + "T12:00:00").toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>

          {/* Account cards */}
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            {ACCOUNTS.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() =>
                  setAccountFilter(accountFilter === account.id ? "all" : account.id)
                }
                className={cn(
                  "text-left bg-white border rounded-xl p-4 transition-all",
                  accountFilter === account.id
                    ? "border-[#5266eb] ring-1 ring-[#5266eb]/20"
                    : "border-[#e5e5e7] hover:border-[#ccc]"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[13px] font-medium text-[#111]">{account.name}</p>
                  <span className="text-[11px] text-[#888] uppercase tracking-wide">
                    {account.type}
                  </span>
                </div>
                <p className="text-[22px] font-semibold tabular-nums text-[#111]">
                  {fmtMoney(account.balance)}
                </p>
                <p className="text-[12px] text-[#888] mt-1">•••• {account.lastFour}</p>
              </button>
            ))}
          </div>

          {/* Month summary */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white border border-[#e5e5e7] rounded-xl px-4 py-3">
              <p className="text-[11px] text-[#888] uppercase tracking-wide mb-1">Money in · Jun</p>
              <p className="text-[18px] font-semibold text-[#1a7f4b] tabular-nums">
                {fmtMoney(JUNE_2026_FLOW.in, true)}
              </p>
            </div>
            <div className="bg-white border border-[#e5e5e7] rounded-xl px-4 py-3">
              <p className="text-[11px] text-[#888] uppercase tracking-wide mb-1">Money out · Jun</p>
              <p className="text-[18px] font-semibold text-[#111] tabular-nums">
                {fmtMoney(-JUNE_2026_FLOW.out, true)}
              </p>
            </div>
          </div>

          {/* Transactions */}
          <div className="bg-white border border-[#e5e5e7] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#ececec] flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[14px] font-semibold text-[#111]">Recent transactions</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-[12px] text-[#666] border border-[#e5e5e7] rounded-md px-2.5 py-1.5 hover:bg-[#fafafa]"
                >
                  {accountFilter === "all" ? "All accounts" : "Filtered"}
                  <ChevronDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-[12px] text-[#666] border border-[#e5e5e7] rounded-md px-2.5 py-1.5 hover:bg-[#fafafa]"
                >
                  <SlidersHorizontal className="w-3 h-3" />
                  Filter
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 text-[12px] text-[#666] border border-[#e5e5e7] rounded-md px-2.5 py-1.5 hover:bg-[#fafafa]"
                >
                  <Search className="w-3 h-3" />
                  Search
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-[#ececec] text-left text-[11px] text-[#888] uppercase tracking-wide">
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium">Transaction</th>
                    <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Category</th>
                    <th className="px-4 py-2.5 font-medium hidden md:table-cell">Account</th>
                    <th className="px-4 py-2.5 font-medium text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-[11px] text-[#aaa] mt-4 text-center">
            Mercury-style demo for Jarvis · Live Mercury API sync coming soon
          </p>
        </main>
      </div>
    </div>
  );
}
