"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { BankingAccount } from "@/lib/bankingData";
import { PAYEES } from "@/lib/bankingData";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

export type FlowType = "send" | "transfer" | "deposit" | "request" | "upload-bill" | "move-money";

export type FlowResult =
  | { type: "send"; accountId: string; amount: number; counterparty: string; memo: string }
  | { type: "transfer"; fromId: string; toId: string; amount: number }
  | { type: "deposit"; accountId: string; amount: number; source: string }
  | { type: "request"; email: string; amount: number; note: string }
  | { type: "upload-bill"; vendor: string; amount: number; fileName: string };

const FLOW_TITLES: Record<FlowType, string> = {
  send: "Send money",
  transfer: "Transfer between accounts",
  deposit: "Record a deposit",
  request: "Request payment",
  "upload-bill": "Upload a bill",
  "move-money": "Move money",
};

function fmtMoney(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

type Props = {
  open: boolean;
  flow: FlowType | null;
  accounts: BankingAccount[];
  onClose: () => void;
  onComplete: (result: FlowResult) => void;
};

export function MoneyFlowModal({ open, flow, accounts, onClose, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  const [payee, setPayee] = useState(PAYEES[0]);
  const [customPayee, setCustomPayee] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [fromId, setFromId] = useState(accounts[0]?.id ?? "");
  const [toId, setToId] = useState(accounts[1]?.id ?? "");
  const [source, setSource] = useState("Wire transfer");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [vendor, setVendor] = useState("");
  const [fileName, setFileName] = useState("");

  const parsedAmount = parseFloat(amount.replace(/,/g, "")) || 0;
  const transferAccounts = accounts.filter((a) => a.type !== "credit-card" as never);
  const counterparty = customPayee.trim() || payee;

  useEffect(() => {
    if (open) {
      setStep(0);
      setDone(false);
      setAmount("");
      setMemo("");
      setNote("");
      setEmail("");
      setVendor("");
      setFileName("");
      setAccountId(accounts[0]?.id ?? "");
      setFromId(accounts[0]?.id ?? "");
      setToId(accounts[1]?.id ?? accounts[0]?.id ?? "");
    }
  }, [open, flow, accounts]);

  if (!flow) return null;

  function close() {
    onClose();
  }

  function finish(result: FlowResult) {
    setDone(true);
    onComplete(result);
  }

  function handlePrimary() {
    if (flow === "send") {
      if (step === 0) return setStep(1);
      if (step === 1) {
        if (parsedAmount <= 0) return;
        return setStep(2);
      }
      if (step === 2) {
        finish({ type: "send", accountId, amount: parsedAmount, counterparty, memo });
        return;
      }
    }

    if (flow === "transfer" || flow === "move-money") {
      if (step === 0) {
        if (parsedAmount <= 0 || fromId === toId) return;
        return setStep(1);
      }
      finish({ type: "transfer", fromId, toId, amount: parsedAmount });
      return;
    }

    if (flow === "deposit") {
      if (step === 0) {
        if (parsedAmount <= 0) return;
        return setStep(1);
      }
      finish({ type: "deposit", accountId, amount: parsedAmount, source });
      return;
    }

    if (flow === "request") {
      if (step === 0) {
        if (!email.trim() || parsedAmount <= 0) return;
        return setStep(1);
      }
      finish({ type: "request", email: email.trim(), amount: parsedAmount, note });
      return;
    }

    if (flow === "upload-bill") {
      if (step === 0) {
        if (!vendor.trim() || parsedAmount <= 0) return;
        return setStep(1);
      }
      finish({
        type: "upload-bill",
        vendor: vendor.trim(),
        amount: parsedAmount,
        fileName: fileName.trim() || "invoice.pdf",
      });
    }
  }

  const primaryDisabled =
    (flow === "send" && step === 1 && parsedAmount <= 0) ||
    ((flow === "transfer" || flow === "move-money") && step === 0 && (parsedAmount <= 0 || fromId === toId)) ||
    (flow === "deposit" && step === 0 && parsedAmount <= 0) ||
    (flow === "request" && step === 0 && (!email.trim() || parsedAmount <= 0)) ||
    (flow === "upload-bill" && step === 0 && (!vendor.trim() || parsedAmount <= 0));

  const primaryLabel = done
    ? "Done"
    : step === 0 && (flow === "transfer" || flow === "move-money")
      ? "Review transfer"
      : step === 0
        ? "Continue"
        : flow === "send" && step === 1
          ? "Review"
          : "Confirm";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent
        className="sm:max-w-md w-[calc(100%-1rem)] max-h-[90vh] overflow-y-auto bg-white text-[#111] border-[#ebebec] ring-[#ebebec] fixed bottom-0 sm:bottom-auto sm:top-1/2 left-1/2 -translate-x-1/2 translate-y-0 sm:-translate-y-1/2 rounded-t-2xl sm:rounded-xl rounded-b-none sm:rounded-b-xl p-4 sm:p-6"
        showCloseButton={!done}
      >
        {done ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="w-12 h-12 text-[#5263ff] mx-auto mb-3" />
            <DialogTitle className="text-[18px] font-semibold mb-1">All set</DialogTitle>
            <DialogDescription className="text-[#666]">
              {flow === "send" && `Payment to ${counterparty} is processing.`}
              {flow === "transfer" && "Your transfer has been submitted."}
              {flow === "move-money" && "Your transfer has been submitted."}
              {flow === "deposit" && "Deposit recorded to your account."}
              {flow === "request" && `Payment request sent to ${email}.`}
              {flow === "upload-bill" && `Bill from ${vendor} uploaded for payment.`}
            </DialogDescription>
            <button
              type="button"
              onClick={close}
              className="mt-6 h-9 px-5 rounded-lg bg-[#5263ff] text-white text-[13px] font-medium hover:bg-[#4455ee]"
            >
              Back to dashboard
            </button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-[17px] font-semibold">{FLOW_TITLES[flow]}</DialogTitle>
              <DialogDescription className="text-[#888]">
                Step {step + 1} of {flow === "send" || flow === "deposit" || flow === "request" || flow === "upload-bill" ? 3 : 2}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-1">
              {flow === "send" && step === 0 && (
                <>
                  <p className="text-[12px] font-medium text-[#666]">Recipient</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PAYEES.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => { setPayee(p); setCustomPayee(""); }}
                        className={cn(
                          "text-left px-3 py-2 rounded-lg border text-[12px] transition-colors",
                          payee === p && !customPayee
                            ? "border-[#5263ff] bg-[#eef0fd]"
                            : "border-[#ebebec] hover:bg-[#fafafa]"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                  <Input
                    placeholder="Or enter name / company"
                    value={customPayee}
                    onChange={(e) => setCustomPayee(e.target.value)}
                    className="h-9 bg-white border-[#ebebec]"
                  />
                </>
              )}

              {flow === "send" && step === 1 && (
                <>
                  <label className="block text-[12px] font-medium text-[#666]">Amount</label>
                  <Input
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-10 text-[18px] bg-white border-[#ebebec]"
                  />
                  <label className="block text-[12px] font-medium text-[#666]">From account</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-[#ebebec] px-2 text-[13px] bg-white"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ••{a.lastFour} ({fmtMoney(a.balance)})
                      </option>
                    ))}
                  </select>
                  <label className="block text-[12px] font-medium text-[#666]">Memo (optional)</label>
                  <Input
                    placeholder="What's this for?"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    className="h-9 bg-white border-[#ebebec]"
                  />
                </>
              )}

              {flow === "send" && step === 2 && (
                <div className="rounded-lg border border-[#ebebec] p-4 space-y-2 text-[13px]">
                  <div className="flex justify-between"><span className="text-[#888]">To</span><span>{counterparty}</span></div>
                  <div className="flex justify-between"><span className="text-[#888]">Amount</span><span className="font-medium">{fmtMoney(parsedAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-[#888]">From</span><span>{accounts.find((a) => a.id === accountId)?.name}</span></div>
                  {memo && <div className="flex justify-between"><span className="text-[#888]">Memo</span><span>{memo}</span></div>}
                </div>
              )}

              {(flow === "transfer" || flow === "move-money") && step === 0 && (
                <>
                  <label className="block text-[12px] font-medium text-[#666]">From</label>
                  <select
                    value={fromId}
                    onChange={(e) => setFromId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-[#ebebec] px-2 text-[13px] bg-white"
                  >
                    {transferAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ••{a.lastFour}</option>
                    ))}
                  </select>
                  <label className="block text-[12px] font-medium text-[#666]">To</label>
                  <select
                    value={toId}
                    onChange={(e) => setToId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-[#ebebec] px-2 text-[13px] bg-white"
                  >
                    {transferAccounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ••{a.lastFour}</option>
                    ))}
                  </select>
                  <label className="block text-[12px] font-medium text-[#666]">Amount</label>
                  <Input
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-10 text-[18px] bg-white border-[#ebebec]"
                  />
                </>
              )}

              {(flow === "transfer" || flow === "move-money") && step === 1 && (
                <div className="rounded-lg border border-[#ebebec] p-4 space-y-2 text-[13px]">
                  <div className="flex justify-between"><span className="text-[#888]">Amount</span><span className="font-medium">{fmtMoney(parsedAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-[#888]">From</span><span>{accounts.find((a) => a.id === fromId)?.name}</span></div>
                  <div className="flex justify-between"><span className="text-[#888]">To</span><span>{accounts.find((a) => a.id === toId)?.name}</span></div>
                </div>
              )}

              {flow === "deposit" && step === 0 && (
                <>
                  <label className="block text-[12px] font-medium text-[#666]">To account</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full h-9 rounded-lg border border-[#ebebec] px-2 text-[13px] bg-white"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name} ••{a.lastFour}</option>
                    ))}
                  </select>
                  <label className="block text-[12px] font-medium text-[#666]">Amount</label>
                  <Input
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-10 text-[18px] bg-white border-[#ebebec]"
                  />
                  <label className="block text-[12px] font-medium text-[#666]">Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full h-9 rounded-lg border border-[#ebebec] px-2 text-[13px] bg-white"
                  >
                    {["Wire transfer", "ACH", "Investor wire", "Stripe payout"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </>
              )}

              {flow === "deposit" && step === 1 && (
                <div className="rounded-lg border border-[#ebebec] p-4 space-y-2 text-[13px]">
                  <div className="flex justify-between"><span className="text-[#888]">Amount</span><span className="font-medium text-[#1a7f4b]">{fmtMoney(parsedAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-[#888]">Account</span><span>{accounts.find((a) => a.id === accountId)?.name}</span></div>
                  <div className="flex justify-between"><span className="text-[#888]">Source</span><span>{source}</span></div>
                </div>
              )}

              {flow === "request" && step === 0 && (
                <>
                  <label className="block text-[12px] font-medium text-[#666]">Request from (email)</label>
                  <Input
                    type="email"
                    placeholder="client@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-9 bg-white border-[#ebebec]"
                  />
                  <label className="block text-[12px] font-medium text-[#666]">Amount</label>
                  <Input
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-10 text-[18px] bg-white border-[#ebebec]"
                  />
                  <label className="block text-[12px] font-medium text-[#666]">Note</label>
                  <Input
                    placeholder="Invoice # or description"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="h-9 bg-white border-[#ebebec]"
                  />
                </>
              )}

              {flow === "request" && step === 1 && (
                <div className="rounded-lg border border-[#ebebec] p-4 space-y-2 text-[13px]">
                  <div className="flex justify-between"><span className="text-[#888]">Email</span><span>{email}</span></div>
                  <div className="flex justify-between"><span className="text-[#888]">Amount</span><span className="font-medium">{fmtMoney(parsedAmount)}</span></div>
                  {note && <div className="flex justify-between"><span className="text-[#888]">Note</span><span>{note}</span></div>}
                </div>
              )}

              {flow === "upload-bill" && step === 0 && (
                <>
                  <label className="block text-[12px] font-medium text-[#666]">Vendor</label>
                  <Input
                    placeholder="Vendor name"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className="h-9 bg-white border-[#ebebec]"
                  />
                  <label className="block text-[12px] font-medium text-[#666]">Amount due</label>
                  <Input
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-10 text-[18px] bg-white border-[#ebebec]"
                  />
                  <label className="block text-[12px] font-medium text-[#666]">Bill file</label>
                  <Input
                    type="file"
                    accept=".pdf,.png,.jpg"
                    onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                    className="h-9 bg-white border-[#ebebec] text-[12px]"
                  />
                </>
              )}

              {flow === "upload-bill" && step === 1 && (
                <div className="rounded-lg border border-[#ebebec] p-4 space-y-2 text-[13px]">
                  <div className="flex justify-between"><span className="text-[#888]">Vendor</span><span>{vendor}</span></div>
                  <div className="flex justify-between"><span className="text-[#888]">Amount</span><span className="font-medium">{fmtMoney(parsedAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-[#888]">File</span><span>{fileName || "invoice.pdf"}</span></div>
                </div>
              )}
            </div>

            <DialogFooter className="border-t-0 bg-transparent p-0 pt-2 flex-col-reverse sm:flex-row gap-2">
              {step > 0 && !done && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="h-10 sm:h-9 w-full sm:w-auto px-4 rounded-lg border border-[#ebebec] text-[13px] font-medium hover:bg-[#fafafa]"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                disabled={primaryDisabled}
                onClick={handlePrimary}
                className="h-10 sm:h-9 w-full sm:w-auto px-4 rounded-lg bg-[#5263ff] text-white text-[13px] font-medium hover:bg-[#4455ee] disabled:opacity-40 sm:ml-auto"
              >
                {primaryLabel}
              </button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
