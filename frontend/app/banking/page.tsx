"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
  ArrowLeftRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CreditCard,
  FileUp,
  HandCoins,
  Home,
  LayoutGrid,
  List,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Users,
  Wallet,
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

function txMethod(tx: BankingTransaction) {
  if (tx.category === "Funding") return "Wire";
  if (tx.category === "Revenue") return "ACH";
  if (tx.category === "Transfer") return "Internal";
  if (tx.category === "Payroll & contractors") return "ACH";
  return "Card";
}

function BalanceChart() {
  const points = [18, 22, 19, 24, 21, 26, 23, 25];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const coords = points
    .map((v, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 100 - ((v - min) / range) * 80 - 10;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-[88px]">
      <polyline
        fill="none"
        stroke="#6366f1"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        points={coords}
      />
    </svg>
  );
}

function MiniBars({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1 h-10 mt-3">
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm"
          style={{ height: `${Math.max(8, (v / max) * 100)}%`, backgroundColor: color }}
        />
      ))}
    </div>
  );
}

const SIDEBAR_MAIN = [
  { label: "Home", icon: Home, active: true },
  { label: "Tasks", icon: List },
  { label: "Command", icon: LayoutGrid },
];

const SIDEBAR_FINANCE = [
  { label: "Accounts", icon: Wallet },
  { label: "Transactions", icon: ArrowLeftRight },
  { label: "Cards", icon: CreditCard },
  { label: "Team", icon: Users },
  { label: "Payments", icon: Send },
  { label: "Invoicing", icon: FileUp },
  { label: "Reimbursements", icon: HandCoins },
];

const SIDEBAR_BOOKMARKS = [
  { label: "Insights", icon: Sparkles },
  { label: "Bill Pay", icon: Bookmark },
  { label: "Credit Card", icon: CreditCard, meta: "$0.00" },
  {
    label: `Checking •• ${ACCOUNTS[0].lastFour}`,
    icon: Wallet,
    meta: fmtMoney(ACCOUNTS[0].balance),
  },
];

export default function BankingPage() {
  const router = useRouter();
  const [txTab, setTxTab] = useState("Recent");

  useEffect(() => {
    if (!isAdmin()) router.replace("/");
  }, [router]);

  const recentTx = useMemo(() => TRANSACTIONS.slice(0, 8), []);

  if (!isAdmin()) return null;

  const checking = ACCOUNTS.find((a) => a.type === "checking")!;
  const savings = ACCOUNTS.find((a) => a.type === "savings")!;

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-[#1a1a1a] font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] flex">
      {/* Mercury sidebar */}
      <aside className="hidden lg:flex w-[220px] shrink-0 bg-white border-r border-[#ebebec] flex-col">
        <div className="px-4 py-4 border-b border-[#ebebec]">
          <div className="flex items-center gap-2 mb-4">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="10" stroke="#6366f1" strokeWidth="1.5" />
              <path d="M8 12h8M12 8v8" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-[15px] font-semibold tracking-tight text-[#6366f1]">Mercury</span>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-[#f7f7f8] transition-colors"
          >
            <Image src="/reelin-logo.png" alt="" width={18} height={18} className="rounded" />
            <span className="text-[13px] font-medium truncate flex-1 text-left">Reelin AI</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#999]" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
          <div className="space-y-0.5">
            {SIDEBAR_MAIN.map(({ label, icon: Icon, active }) => (
              <button
                key={label}
                type="button"
                className={cn(
                  "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors",
                  active ? "bg-[#f3f3f4] text-[#111]" : "text-[#555] hover:bg-[#f7f7f8]"
                )}
              >
                <Icon className="w-4 h-4 shrink-0 opacity-70" />
                {label}
              </button>
            ))}
          </div>

          <div>
            <p className="px-2.5 mb-1 text-[11px] font-medium text-[#999]">Financials</p>
            <div className="space-y-0.5">
              {SIDEBAR_FINANCE.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-[13px] text-[#555] hover:bg-[#f7f7f8] transition-colors"
                >
                  <Icon className="w-4 h-4 shrink-0 opacity-70" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="px-2.5 mb-1 text-[11px] font-medium text-[#999]">Bookmarks</p>
            <div className="space-y-0.5">
              {SIDEBAR_BOOKMARKS.map(({ label, icon: Icon, meta }) => (
                <button
                  key={label}
                  type="button"
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-[13px] text-[#555] hover:bg-[#f7f7f8] transition-colors"
                >
                  <Icon className="w-4 h-4 shrink-0 opacity-70" />
                  <span className="truncate flex-1 text-left">{label}</span>
                  {meta && <span className="text-[12px] text-[#888] tabular-nums">{meta}</span>}
                </button>
              ))}
            </div>
          </div>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-[#ebebec] px-4 sm:px-6 flex items-center gap-4 shrink-0">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#aaa]" />
              <input
                readOnly
                placeholder="Search for anything"
                className="w-full h-9 pl-9 pr-3 text-[13px] bg-[#f7f7f8] border border-[#ebebec] rounded-lg text-[#666] placeholder:text-[#aaa] outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            className="hidden sm:inline-flex items-center gap-2 h-9 px-3 text-[13px] font-medium text-[#444] border border-[#ebebec] rounded-lg hover:bg-[#fafafa]"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Move money
          </button>
          <div className="flex items-center gap-1">
            {[Send, CircleHelp, Bell, Settings].map((Icon, i) => (
              <button
                key={i}
                type="button"
                className="w-9 h-9 flex items-center justify-center rounded-lg text-[#666] hover:bg-[#f7f7f8]"
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
            <div className="w-8 h-8 rounded-full bg-[#dbeafe] text-[#2563eb] text-[12px] font-semibold flex items-center justify-center ml-1">
              AA
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <h1 className="text-[28px] font-semibold tracking-tight text-[#111] mb-5">Welcome, Abel</h1>

          {/* Action pills */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <button
              type="button"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-[#5263ff] text-white text-[13px] font-medium hover:bg-[#4455ee]"
            >
              <Send className="w-3.5 h-3.5" />
              Send
            </button>
            {["Transfer", "Deposit", "Request", "Upload bill"].map((label) => (
              <button
                key={label}
                type="button"
                className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-white border border-[#ebebec] text-[13px] font-medium text-[#444] hover:bg-[#fafafa]"
              >
                {label}
              </button>
            ))}
            <button type="button" className="ml-auto text-[13px] text-[#666] hover:text-[#111]">
              Customize
            </button>
          </div>

          {/* Balance + Accounts row */}
          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-white border border-[#ebebec] rounded-xl p-5">
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-medium text-[#666]">Mercury balance</span>
                  <span className="w-4 h-4 rounded-full bg-[#5263ff] text-white text-[10px] flex items-center justify-center">
                    ✓
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[#aaa]">
                  <LayoutGrid className="w-4 h-4" />
                  <List className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[32px] font-semibold tabular-nums tracking-tight mb-3">
                {fmtMoney(TOTAL_BALANCE)}
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[12px] text-[#666] border border-[#ebebec] rounded-md px-2 py-1 mb-3"
              >
                Last 30 days
                <ChevronDown className="w-3 h-3" />
              </button>
              <BalanceChart />
              <div className="flex gap-6 mt-3 text-[12px]">
                <span className="text-[#1a7f4b] tabular-nums">↗ {fmtMoney(JUNE_2026_FLOW.in)}</span>
                <span className="text-[#666] tabular-nums">↘ {fmtMoney(-JUNE_2026_FLOW.out)}</span>
              </div>
            </div>

            <div className="bg-white border border-[#ebebec] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[13px] font-medium text-[#666]">Accounts</span>
                <div className="flex items-center gap-1 text-[#888]">
                  <button type="button" className="p-1 hover:bg-[#f7f7f8] rounded">
                    <Plus className="w-4 h-4" />
                  </button>
                  <button type="button" className="p-1 hover:bg-[#f7f7f8] rounded">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { name: "Credit Card", lastFour: "", balance: 0, icon: "card" },
                  { name: "Checking", lastFour: checking.lastFour, balance: checking.balance, icon: "check" },
                  { name: "Savings", lastFour: savings.lastFour, balance: savings.balance, icon: "save" },
                ].map((acct) => (
                  <div key={acct.name} className="flex items-center gap-3 py-1">
                    <div className="w-8 h-8 rounded-full bg-[#f3f3f4] flex items-center justify-center shrink-0">
                      <Wallet className="w-4 h-4 text-[#888]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#111]">
                        {acct.name}
                        {acct.lastFour ? ` •• ${acct.lastFour}` : ""}
                      </p>
                    </div>
                    <p className="text-[13px] font-medium tabular-nums text-[#111]">
                      {fmtMoney(acct.balance)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Money movement */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-semibold text-[#111]">Money movement</h2>
              <div className="flex items-center gap-2 text-[13px] text-[#666]">
                <button type="button" className="p-1 hover:bg-white rounded">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>Jul 2026</span>
                <button type="button" className="p-1 hover:bg-white rounded">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-white border border-[#ebebec] rounded-xl p-5">
                <p className="text-[12px] text-[#888] mb-1">Money in</p>
                <p className="text-[28px] font-semibold tabular-nums text-[#111] mb-1">
                  {fmtMoney(JUNE_2026_FLOW.in)}
                </p>
                <p className="text-[12px] text-[#999]">Incoming transfers this month</p>
                <p className="text-[11px] text-[#aaa] mt-4 mb-0.5">Last 3 months average</p>
                <p className="text-[13px] font-medium text-[#111] tabular-nums">$3.2K</p>
                <MiniBars values={[40, 55, 48, 62, 50, 58]} color="#86efac" />
              </div>
              <div className="bg-white border border-[#ebebec] rounded-xl p-5">
                <p className="text-[12px] text-[#888] mb-1">Money out</p>
                <p className="text-[28px] font-semibold tabular-nums text-[#111] mb-1">
                  {fmtMoney(JUNE_2026_FLOW.out)}
                </p>
                <p className="text-[12px] text-[#999]">Outgoing transfers this month</p>
                <p className="text-[11px] text-[#aaa] mt-4 mb-0.5">Last 3 months average</p>
                <p className="text-[13px] font-medium text-[#111] tabular-nums">−$4.5K</p>
                <MiniBars values={[70, 65, 80, 55, 75, 68]} color="#d4d4d8" />
              </div>
            </div>
          </div>

          {/* Transactions */}
          <div className="bg-white border border-[#ebebec] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#ebebec] flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[15px] font-semibold text-[#111]">Transactions</h2>
              <button type="button" className="text-[13px] text-[#5263ff] font-medium hover:underline">
                View all →
              </button>
            </div>
            <div className="px-5 py-3 border-b border-[#ebebec] flex flex-wrap gap-2">
              {["Recent", "My transactions", "Monthly money in", "Monthly money out"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTxTab(tab)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors",
                    txTab === tab
                      ? "bg-[#f3f3f4] text-[#111]"
                      : "text-[#666] hover:bg-[#fafafa]"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-[13px]">
                <thead>
                  <tr className="border-b border-[#ebebec] text-left text-[11px] text-[#999] uppercase tracking-wide">
                    <th className="px-5 py-2.5 font-medium w-[100px]">Date</th>
                    <th className="px-5 py-2.5 font-medium">To/From</th>
                    <th className="px-5 py-2.5 font-medium text-right w-[120px]">Amount</th>
                    <th className="px-5 py-2.5 font-medium w-[140px]">Account</th>
                    <th className="px-5 py-2.5 font-medium w-[100px]">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTx.map((tx) => {
                    const incoming = tx.amount >= 0;
                    const acct = ACCOUNTS.find((a) => a.id === tx.accountId);
                    return (
                      <tr
                        key={tx.id}
                        className="border-b border-[#f5f5f5] last:border-0 hover:bg-[#fafafa]"
                      >
                        <td className="px-5 py-3.5 text-[#888] tabular-nums whitespace-nowrap">
                          {fmtDate(tx.date)}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#f3f3f4] flex items-center justify-center shrink-0">
                              {incoming ? (
                                <ArrowDownLeft className="w-3.5 h-3.5 text-[#888]" />
                              ) : (
                                <ArrowUpRight className="w-3.5 h-3.5 text-[#888]" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-[#111]">{tx.counterparty}</p>
                              <p className="text-[12px] text-[#999]">{tx.description}</p>
                            </div>
                          </div>
                        </td>
                        <td
                          className={cn(
                            "px-5 py-3.5 text-right font-medium tabular-nums whitespace-nowrap",
                            incoming ? "text-[#111]" : "text-[#111]"
                          )}
                        >
                          {fmtMoney(tx.amount, true)}
                        </td>
                        <td className="px-5 py-3.5 text-[#666]">
                          {acct?.type === "checking" ? "Checking" : "Savings"} •• {acct?.lastFour}
                        </td>
                        <td className="px-5 py-3.5 text-[#666]">{txMethod(tx)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="sr-only">{BANKING_META.entity}</p>
        </main>
      </div>
    </div>
  );
}
