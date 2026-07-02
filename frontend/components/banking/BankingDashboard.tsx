"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  BANKING_META,
  INITIAL_ACCOUNTS,
  INITIAL_TRANSACTIONS,
  getMonthFlow,
  type BankingAccount,
  type BankingTransaction,
} from "@/lib/bankingData";
import { MoneyFlowModal, type FlowResult, type FlowType } from "@/components/banking/MoneyFlowModal";
import { cn } from "@/lib/utils";
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

type View = "home" | "transactions" | "accounts";

const MONTHS = [
  { key: "2026-05", label: "May 2026" },
  { key: "2026-06", label: "Jun 2026" },
  { key: "2026-07", label: "Jul 2026" },
];

function fmtMoney(n: number, signed = false) {
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!signed) return `$${abs}`;
  if (n >= 0) return `+$${abs}`;
  return `−$${abs}`;
}

function fmtDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function txMethod(tx: BankingTransaction) {
  if (tx.category === "Funding") return "Wire";
  if (tx.category === "Revenue") return "ACH";
  if (tx.category === "Transfer") return "Internal";
  if (tx.category === "Payroll & contractors") return "ACH";
  if (tx.status === "pending") return "Pending";
  return "ACH";
}

function BalanceChart() {
  const points = [18, 22, 19, 24, 21, 26, 23, 25];
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-[88px]">
      <polyline fill="none" stroke="#6366f1" strokeWidth="1.5" vectorEffect="non-scaling-stroke" points={coords} />
    </svg>
  );
}

function MiniBars({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1 h-10 mt-3">
      {values.map((v, i) => (
        <div key={i} className="flex-1 rounded-sm" style={{ height: `${Math.max(8, (v / max) * 100)}%`, backgroundColor: color }} />
      ))}
    </div>
  );
}

function TransactionsTable({
  rows,
  accounts,
  emptyMessage,
}: {
  rows: BankingTransaction[];
  accounts: BankingAccount[];
  emptyMessage?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-4 sm:px-5 py-8 text-center text-[13px] text-[#999]">
        {emptyMessage ?? "No transactions match your filters."}
      </p>
    );
  }

  return (
    <>
      {/* Mobile card list */}
      <div className="md:hidden divide-y divide-[#f0f0f0]">
        {rows.map((tx) => {
          const incoming = tx.amount >= 0;
          const acct = accounts.find((a) => a.id === tx.accountId);
          return (
            <div key={tx.id} className="px-4 py-3.5 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-[#f3f3f4] flex items-center justify-center shrink-0 mt-0.5">
                {incoming ? (
                  <ArrowDownLeft className="w-4 h-4 text-[#888]" />
                ) : (
                  <ArrowUpRight className="w-4 h-4 text-[#888]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-medium text-[#111] truncate">{tx.counterparty}</p>
                  <p className="text-[13px] font-semibold tabular-nums whitespace-nowrap shrink-0">
                    {fmtMoney(tx.amount, true)}
                  </p>
                </div>
                <p className="text-[12px] text-[#999] truncate mt-0.5">{tx.description}</p>
                <p className="text-[11px] text-[#aaa] mt-1.5">
                  {fmtDate(tx.date)} · {acct?.type === "checking" ? "Checking" : "Savings"} •• {acct?.lastFour} · {txMethod(tx)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-[640px] text-[13px]">
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
            {rows.map((tx) => {
              const incoming = tx.amount >= 0;
              const acct = accounts.find((a) => a.id === tx.accountId);
              return (
                <tr key={tx.id} className="border-b border-[#f5f5f5] last:border-0 hover:bg-[#fafafa]">
                  <td className="px-5 py-3.5 text-[#888] tabular-nums whitespace-nowrap">{fmtDate(tx.date)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#f3f3f4] flex items-center justify-center shrink-0">
                        {incoming ? <ArrowDownLeft className="w-3.5 h-3.5 text-[#888]" /> : <ArrowUpRight className="w-3.5 h-3.5 text-[#888]" />}
                      </div>
                      <div>
                        <p className="font-medium text-[#111]">{tx.counterparty}</p>
                        <p className="text-[12px] text-[#999]">{tx.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium tabular-nums whitespace-nowrap">{fmtMoney(tx.amount, true)}</td>
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
    </>
  );
}

export function BankingDashboard() {
  const [accounts, setAccounts] = useState<BankingAccount[]>(() =>
    INITIAL_ACCOUNTS.map((a) => ({ ...a }))
  );
  const [transactions, setTransactions] = useState<BankingTransaction[]>(() =>
    INITIAL_TRANSACTIONS.map((t) => ({ ...t }))
  );
  const [view, setView] = useState<View>("home");
  const [flow, setFlow] = useState<FlowType | null>(null);
  const [flowOpen, setFlowOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [txTab, setTxTab] = useState("Recent");
  const [monthIdx, setMonthIdx] = useState(2);
  const [balanceMode, setBalanceMode] = useState<"chart" | "table">("chart");

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const checking = accounts.find((a) => a.type === "checking")!;
  const savings = accounts.find((a) => a.type === "savings")!;
  const month = MONTHS[monthIdx];
  const monthFlow = getMonthFlow(transactions, month.key);

  function openFlow(type: FlowType) {
    setFlow(type);
    setFlowOpen(true);
  }

  function handleFlowComplete(result: FlowResult) {
    const today = new Date().toISOString().slice(0, 10);
    const mkId = () => `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    if (result.type === "send") {
      setAccounts((prev) =>
        prev.map((a) => (a.id === result.accountId ? { ...a, balance: a.balance - result.amount } : a))
      );
      setTransactions((prev) => [
        {
          id: mkId(),
          date: today,
          description: result.memo || "Outgoing payment",
          counterparty: result.counterparty,
          category: "Payment",
          amount: -result.amount,
          status: "completed",
          accountId: result.accountId,
        },
        ...prev,
      ]);
      toast.success(`Sent ${fmtMoney(result.amount)} to ${result.counterparty}`);
    }

    if (result.type === "transfer") {
      setAccounts((prev) =>
        prev.map((a) => {
          if (a.id === result.fromId) return { ...a, balance: a.balance - result.amount };
          if (a.id === result.toId) return { ...a, balance: a.balance + result.amount };
          return a;
        })
      );
      setTransactions((prev) => [
        {
          id: mkId(),
          date: today,
          description: "Transfer out",
          counterparty: "Internal transfer",
          category: "Transfer",
          amount: -result.amount,
          status: "completed",
          accountId: result.fromId,
        },
        {
          id: mkId() + "b",
          date: today,
          description: "Transfer in",
          counterparty: "Internal transfer",
          category: "Transfer",
          amount: result.amount,
          status: "completed",
          accountId: result.toId,
        },
        ...prev,
      ]);
      toast.success(`Transferred ${fmtMoney(result.amount)}`);
    }

    if (result.type === "deposit") {
      setAccounts((prev) =>
        prev.map((a) => (a.id === result.accountId ? { ...a, balance: a.balance + result.amount } : a))
      );
      setTransactions((prev) => [
        {
          id: mkId(),
          date: today,
          description: result.source,
          counterparty: result.source,
          category: "Revenue",
          amount: result.amount,
          status: "completed",
          accountId: result.accountId,
        },
        ...prev,
      ]);
      toast.success(`Deposit of ${fmtMoney(result.amount)} recorded`);
    }

    if (result.type === "request") {
      setTransactions((prev) => [
        {
          id: mkId(),
          date: today,
          description: result.note || "Payment request",
          counterparty: result.email,
          category: "Request",
          amount: result.amount,
          status: "pending",
          accountId: checking.id,
        },
        ...prev,
      ]);
      toast.success(`Request sent to ${result.email}`);
    }

    if (result.type === "upload-bill") {
      setTransactions((prev) => [
        {
          id: mkId(),
          date: today,
          description: `Bill — ${result.fileName}`,
          counterparty: result.vendor,
          category: "Software",
          amount: -result.amount,
          status: "pending",
          accountId: checking.id,
        },
        ...prev,
      ]);
      toast.success(`Bill from ${result.vendor} queued for payment`);
    }
  }

  const filteredTx = useMemo(() => {
    let list = [...transactions];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (t) => t.counterparty.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      );
    }
    if (txTab === "Monthly money in") list = list.filter((t) => t.amount > 0);
    if (txTab === "Monthly money out") list = list.filter((t) => t.amount < 0);
    if (view === "home" && txTab === "Recent") list = list.slice(0, 8);
    return list;
  }, [transactions, search, txTab, view]);

  const sidebarMain = [
    { label: "Home", icon: Home, view: "home" as View },
    { label: "Tasks", icon: List, action: () => toast.message("No open tasks") },
    { label: "Command", icon: LayoutGrid, action: () => toast.message("Command center coming soon") },
  ];

  const sidebarFinance = [
    { label: "Accounts", icon: Wallet, view: "accounts" as View },
    { label: "Transactions", icon: ArrowLeftRight, view: "transactions" as View },
    { label: "Cards", icon: CreditCard, action: () => toast.message("No cards issued yet") },
    { label: "Team", icon: Users, action: () => toast.message("Team settings") },
    { label: "Payments", icon: Send, action: () => openFlow("send") },
    { label: "Invoicing", icon: FileUp, action: () => openFlow("request") },
    { label: "Reimbursements", icon: HandCoins, action: () => toast.message("Reimbursements") },
  ];

  const mobileNav = [
    { label: "Home", icon: Home, view: "home" as View },
    { label: "Accounts", icon: Wallet, view: "accounts" as View },
    { label: "Activity", icon: ArrowLeftRight, view: "transactions" as View },
    { label: "Send", icon: Send, action: () => openFlow("send") },
  ];

  return (
    <>
      <div className="min-h-screen bg-[#f7f7f8] text-[#1a1a1a] font-[system-ui,-apple-system,BlinkMacSystemFont,'Segoe_UI',sans-serif] flex">
        <aside className="hidden lg:flex w-[220px] shrink-0 bg-white border-r border-[#ebebec] flex-col">
          <div className="px-4 py-4 border-b border-[#ebebec]">
            <div className="flex items-center gap-2 mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="10" stroke="#6366f1" strokeWidth="1.5" />
                <path d="M8 12h8M12 8v8" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="text-[15px] font-semibold tracking-tight text-[#6366f1]">Mercury</span>
            </div>
            <button type="button" className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-[#f7f7f8]">
              <Image src="/reelin-logo.png" alt="" width={18} height={18} className="rounded" />
              <span className="text-[13px] font-medium truncate flex-1 text-left">Reelin AI</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#999]" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
            <div className="space-y-0.5">
              {sidebarMain.map(({ label, icon: Icon, view: v, action }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => (v ? setView(v) : action?.())}
                  className={cn(
                    "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors",
                    v && view === v ? "bg-[#f3f3f4] text-[#111]" : "text-[#555] hover:bg-[#f7f7f8]"
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
                {sidebarFinance.map(({ label, icon: Icon, view: v, action }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => (v ? setView(v) : action?.())}
                    className={cn(
                      "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-[13px] transition-colors",
                      v && view === v ? "bg-[#f3f3f4] text-[#111] font-medium" : "text-[#555] hover:bg-[#f7f7f8]"
                    )}
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
                <button type="button" onClick={() => toast.message("Insights")} className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-[13px] text-[#555] hover:bg-[#f7f7f8]">
                  <Sparkles className="w-4 h-4 opacity-70" /> Insights
                </button>
                <button type="button" onClick={() => openFlow("upload-bill")} className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-[13px] text-[#555] hover:bg-[#f7f7f8]">
                  <Bookmark className="w-4 h-4 opacity-70" /> Bill Pay
                </button>
                <button type="button" onClick={() => setView("accounts")} className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-[13px] text-[#555] hover:bg-[#f7f7f8]">
                  <Wallet className="w-4 h-4 opacity-70" />
                  <span className="flex-1 text-left">Checking •• {checking.lastFour}</span>
                  <span className="text-[12px] text-[#888] tabular-nums">{fmtMoney(checking.balance)}</span>
                </button>
              </div>
            </div>
          </nav>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          {/* Mobile top bar */}
          <div className="lg:hidden bg-white border-b border-[#ebebec] px-4 py-3 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden>
                  <circle cx="12" cy="12" r="10" stroke="#6366f1" strokeWidth="1.5" />
                  <path d="M8 12h8M12 8v8" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <Image src="/reelin-logo.png" alt="" width={16} height={16} className="rounded shrink-0" />
                <span className="text-[13px] font-medium truncate">Reelin AI</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openFlow("move-money")}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-[#666] hover:bg-[#f7f7f8]"
                  aria-label="Move money"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-full bg-[#dbeafe] text-[#2563eb] text-[11px] font-semibold flex items-center justify-center">
                  {BANKING_META.userInitials}
                </div>
              </div>
            </div>
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#aaa]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search for anything"
                className="w-full h-9 pl-9 pr-3 text-[13px] bg-[#f7f7f8] border border-[#ebebec] rounded-lg text-[#111] placeholder:text-[#aaa] outline-none focus:border-[#5263ff]"
              />
            </div>
          </div>

          {/* Desktop header */}
          <header className="hidden lg:flex h-14 bg-white border-b border-[#ebebec] px-6 items-center gap-4 shrink-0">
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#aaa]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search for anything"
                  className="w-full h-9 pl-9 pr-3 text-[13px] bg-[#f7f7f8] border border-[#ebebec] rounded-lg text-[#111] placeholder:text-[#aaa] outline-none focus:border-[#5263ff]"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => openFlow("move-money")}
              className="inline-flex items-center gap-2 h-9 px-3 text-[13px] font-medium text-[#444] border border-[#ebebec] rounded-lg hover:bg-[#fafafa]"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Move money
            </button>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => openFlow("send")} className="w-9 h-9 flex items-center justify-center rounded-lg text-[#666] hover:bg-[#f7f7f8]">
                <Send className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => toast.message("Help center")} className="w-9 h-9 flex items-center justify-center rounded-lg text-[#666] hover:bg-[#f7f7f8]">
                <CircleHelp className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => toast.message("No new notifications")} className="w-9 h-9 flex items-center justify-center rounded-lg text-[#666] hover:bg-[#f7f7f8]">
                <Bell className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => toast.message("Account settings")} className="w-9 h-9 flex items-center justify-center rounded-lg text-[#666] hover:bg-[#f7f7f8]">
                <Settings className="w-4 h-4" />
              </button>
              <div className="w-8 h-8 rounded-full bg-[#dbeafe] text-[#2563eb] text-[12px] font-semibold flex items-center justify-center ml-1">
                {BANKING_META.userInitials}
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
            {view === "home" && (
              <>
                <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-tight text-[#111] mb-4 sm:mb-5">
                  Welcome, {BANKING_META.userFirstName}
                </h1>
                <div className="-mx-4 px-4 sm:mx-0 sm:px-0 mb-6 overflow-x-auto">
                  <div className="flex items-center gap-2 w-max sm:w-auto sm:flex-wrap pb-1 sm:pb-0">
                  <button type="button" onClick={() => openFlow("send")} className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-[#5263ff] text-white text-[13px] font-medium hover:bg-[#4455ee] shrink-0">
                    <Send className="w-3.5 h-3.5" /> Send
                  </button>
                  {[
                    { label: "Transfer", flow: "transfer" as FlowType },
                    { label: "Deposit", flow: "deposit" as FlowType },
                    { label: "Request", flow: "request" as FlowType },
                    { label: "Upload bill", flow: "upload-bill" as FlowType },
                  ].map(({ label, flow: f }) => (
                    <button key={label} type="button" onClick={() => openFlow(f)} className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-white border border-[#ebebec] text-[13px] font-medium text-[#444] hover:bg-[#fafafa] shrink-0">
                      {label}
                    </button>
                  ))}
                  <button type="button" onClick={() => toast.message("Customize your home widgets")} className="hidden sm:inline-flex ml-auto text-[13px] text-[#666] hover:text-[#111] shrink-0">
                    Customize
                  </button>
                  </div>
                </div>
              </>
            )}

            {view === "transactions" && (
              <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-tight text-[#111] mb-5">Transactions</h1>
            )}

            {view === "accounts" && (
              <>
                <h1 className="text-[22px] sm:text-[28px] font-semibold tracking-tight text-[#111] mb-5">Accounts</h1>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {[
                    { name: "Credit Card", lastFour: "", balance: 0, id: null },
                    { name: "Checking", lastFour: checking.lastFour, balance: checking.balance, id: checking.id },
                    { name: "Savings", lastFour: savings.lastFour, balance: savings.balance, id: savings.id },
                  ].map((acct) => (
                    <div key={acct.name} className="bg-white border border-[#ebebec] rounded-xl p-5">
                      <p className="text-[13px] text-[#888] mb-1">{acct.name}{acct.lastFour ? ` •• ${acct.lastFour}` : ""}</p>
                      <p className="text-[26px] font-semibold tabular-nums mb-4">{fmtMoney(acct.balance)}</p>
                      {acct.id && (
                        <div className="flex gap-2">
                          <button type="button" onClick={() => openFlow("deposit")} className="text-[12px] px-3 py-1.5 rounded-md border border-[#ebebec] hover:bg-[#fafafa]">Deposit</button>
                          <button type="button" onClick={() => openFlow("transfer")} className="text-[12px] px-3 py-1.5 rounded-md border border-[#ebebec] hover:bg-[#fafafa]">Transfer</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {view === "home" && (
              <div className="grid lg:grid-cols-2 gap-4 mb-4">
                <div className="bg-white border border-[#ebebec] rounded-xl p-4 sm:p-5">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-[#666]">Mercury balance</span>
                      <span className="w-4 h-4 rounded-full bg-[#5263ff] text-white text-[10px] flex items-center justify-center">✓</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#aaa]">
                      <button type="button" onClick={() => setBalanceMode("chart")} className={cn("p-0.5 rounded", balanceMode === "chart" && "text-[#5263ff]")}><LayoutGrid className="w-4 h-4" /></button>
                      <button type="button" onClick={() => setBalanceMode("table")} className={cn("p-0.5 rounded", balanceMode === "table" && "text-[#5263ff]")}><List className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <p className="text-[26px] sm:text-[32px] font-semibold tabular-nums tracking-tight mb-3">{fmtMoney(totalBalance)}</p>
                  <button type="button" className="inline-flex items-center gap-1 text-[12px] text-[#666] border border-[#ebebec] rounded-md px-2 py-1 mb-3">
                    Last 30 days <ChevronDown className="w-3 h-3" />
                  </button>
                  {balanceMode === "chart" ? (
                    <BalanceChart />
                  ) : (
                    <div className="space-y-2 text-[12px]">
                      {accounts.map((a) => (
                        <div key={a.id} className="flex justify-between"><span>{a.name}</span><span className="tabular-nums">{fmtMoney(a.balance)}</span></div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-6 mt-3 text-[12px]">
                    <span className="text-[#1a7f4b] tabular-nums">↗ {fmtMoney(monthFlow.in)}</span>
                    <span className="text-[#666] tabular-nums">↘ {fmtMoney(-monthFlow.out)}</span>
                  </div>
                </div>

                <div className="bg-white border border-[#ebebec] rounded-xl p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[13px] font-medium text-[#666]">Accounts</span>
                    <div className="flex items-center gap-1 text-[#888]">
                      <button type="button" onClick={() => openFlow("deposit")} className="p-1 hover:bg-[#f7f7f8] rounded"><Plus className="w-4 h-4" /></button>
                      <button type="button" onClick={() => setView("accounts")} className="p-1 hover:bg-[#f7f7f8] rounded"><MoreHorizontal className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {[
                    { name: "Credit Card", lastFour: "", balance: 0 },
                    { name: "Checking", lastFour: checking.lastFour, balance: checking.balance },
                    { name: "Savings", lastFour: savings.lastFour, balance: savings.balance },
                  ].map((acct) => (
                    <div key={acct.name} className="flex items-center gap-3 py-1 mb-2">
                      <div className="w-8 h-8 rounded-full bg-[#f3f3f4] flex items-center justify-center shrink-0"><Wallet className="w-4 h-4 text-[#888]" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-[#111]">{acct.name}{acct.lastFour ? ` •• ${acct.lastFour}` : ""}</p>
                      </div>
                      <p className="text-[13px] font-medium tabular-nums">{fmtMoney(acct.balance)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {view === "home" && (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[15px] font-semibold text-[#111]">Money movement</h2>
                    <div className="flex items-center gap-2 text-[13px] text-[#666]">
                      <button type="button" disabled={monthIdx === 0} onClick={() => setMonthIdx((i) => i - 1)} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                      <span>{month.label}</span>
                      <button type="button" disabled={monthIdx === MONTHS.length - 1} onClick={() => setMonthIdx((i) => i + 1)} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-white border border-[#ebebec] rounded-xl p-5">
                      <p className="text-[12px] text-[#888] mb-1">Money in</p>
                      <p className="text-[28px] font-semibold tabular-nums mb-1">{fmtMoney(monthFlow.in)}</p>
                      <p className="text-[12px] text-[#999]">Incoming transfers</p>
                      <MiniBars values={[40, 55, 48, 62, 50, 58]} color="#86efac" />
                    </div>
                    <div className="bg-white border border-[#ebebec] rounded-xl p-5">
                      <p className="text-[12px] text-[#888] mb-1">Money out</p>
                      <p className="text-[28px] font-semibold tabular-nums mb-1">{fmtMoney(monthFlow.out)}</p>
                      <p className="text-[12px] text-[#999]">Outgoing transfers</p>
                      <MiniBars values={[70, 65, 80, 55, 75, 68]} color="#d4d4d8" />
                    </div>
                  </div>
                </div>
              </>
            )}

            {(view === "home" || view === "transactions") && (
              <div className="bg-white border border-[#ebebec] rounded-xl overflow-hidden">
                <div className="px-4 sm:px-5 py-4 border-b border-[#ebebec] flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-[15px] font-semibold text-[#111]">Transactions</h2>
                  {view === "home" && (
                    <button type="button" onClick={() => setView("transactions")} className="text-[13px] text-[#5263ff] font-medium hover:underline">
                      View all →
                    </button>
                  )}
                </div>
                <div className="px-4 sm:px-5 py-3 border-b border-[#ebebec] overflow-x-auto">
                  <div className="flex gap-2 w-max sm:w-auto sm:flex-wrap pb-0.5 sm:pb-0">
                  {["Recent", "My transactions", "Monthly money in", "Monthly money out"].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setTxTab(tab)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors whitespace-nowrap shrink-0",
                        txTab === tab ? "bg-[#f3f3f4] text-[#111]" : "text-[#666] hover:bg-[#fafafa]"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                  </div>
                </div>
                <TransactionsTable rows={filteredTx} accounts={accounts} />
              </div>
            )}
          </main>

          {/* Mobile bottom nav */}
          <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#ebebec] pb-[env(safe-area-inset-bottom)]">
            <div className="grid grid-cols-4">
              {mobileNav.map(({ label, icon: Icon, view: v, action }) => {
                const active = v ? view === v : false;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => (v ? setView(v) : action?.())}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                      active ? "text-[#5263ff]" : "text-[#888]"
                    )}
                  >
                    <Icon className={cn("w-5 h-5", active && "text-[#5263ff]")} />
                    {label}
                  </button>
                );
              })}
            </div>
          </nav>
        </div>
      </div>

      <MoneyFlowModal
        open={flowOpen}
        flow={flow}
        accounts={accounts}
        onClose={() => { setFlowOpen(false); setFlow(null); }}
        onComplete={handleFlowComplete}
      />
    </>
  );
}
