"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPortalUsers, createPortalUser, deletePortalUser, resetPortalPassword,
  getAdminCapTable, createCapTableEntry, deleteCapTableEntry,
  getAdminSafes, createSafe, deleteSafe, uploadSafeFile,
  getAdminDataRoom, createDataRoomDoc, deleteDataRoomDoc, uploadDataRoomFile,
  PortalUser, CapTableEntry, InvestorSafe, DataRoomDoc, PortalStage,
} from "@/lib/portal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Plus, Trash2, Key, Copy, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { investorLoginUrl } from "@/lib/investorPortalHost";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Tab = "users" | "cap-table" | "safes" | "data-room";

const TABS: { id: Tab; label: string }[] = [
  { id: "users", label: "Portal Users" },
  { id: "cap-table", label: "Cap Table" },
  { id: "safes", label: "SAFEs" },
  { id: "data-room", label: "Data Room" },
];

const STAGES: PortalStage[] = ["prospect", "discussing", "safe_sent", "safe_signed", "closed"];

function fmt(n: number) {
  if (!n) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function CredentialsDialog({ creds, onClose }: { creds: { email: string; password: string }; onClose: () => void }) {
  function copy() {
    navigator.clipboard.writeText(`Email: ${creds.email}\nPassword: ${creds.password}`);
    toast.success("Copied to clipboard");
  }
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-neutral-950 border-neutral-800 max-w-sm p-6">
        <h2 className="text-[15px] font-semibold text-white mb-1">Login credentials</h2>
        <p className="text-[12px] text-neutral-500 mb-4">Share these with the investor. Password is shown once.</p>
        <div className="space-y-2 bg-neutral-900 rounded-lg p-3 font-mono text-[12px]">
          <p className="text-neutral-300">Email: <span className="text-white">{creds.email}</span></p>
          <p className="text-neutral-300">Password: <span className="text-white">{creds.password}</span></p>
        </div>
        <p className="text-[11px] text-neutral-600 mt-2">Portal URL: {investorLoginUrl()}</p>
        <Button onClick={copy} className="w-full mt-4 bg-white text-neutral-900 hover:bg-neutral-200 h-8 text-[12px]">
          <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy credentials
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export function InvestorPortalAdmin({ embedded = false }: { embedded?: boolean }) {
  const [tab, setTab] = useState<Tab>("users");
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [userForm, setUserForm] = useState<Partial<PortalUser & { password?: string }>>({ stage: "discussing" });
  const [showUserModal, setShowUserModal] = useState(false);
  const [capForm, setCapForm] = useState<Partial<CapTableEntry>>({ holderType: "investor", instrument: "safe", status: "pending", visible: true });
  const [showCapModal, setShowCapModal] = useState(false);
  const [safeForm, setSafeForm] = useState<Partial<InvestorSafe>>({ status: "sent" });
  const [showSafeModal, setShowSafeModal] = useState(false);
  const [docForm, setDocForm] = useState<Partial<DataRoomDoc>>({ category: "other", visibility: "all" });
  const [showDocModal, setShowDocModal] = useState(false);
  const qc = useQueryClient();

  const usersQ = useQuery({ queryKey: ["portal-users"], queryFn: getPortalUsers });
  const capQ = useQuery({ queryKey: ["admin-cap-table"], queryFn: getAdminCapTable });
  const safesQ = useQuery({ queryKey: ["admin-safes"], queryFn: getAdminSafes });
  const docsQ = useQuery({ queryKey: ["admin-data-room"], queryFn: getAdminDataRoom });

  const createUserM = useMutation({
    mutationFn: createPortalUser,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["portal-users"] });
      setShowUserModal(false);
      setUserForm({ stage: "discussing" });
      if (res.data?.credentials) setCreds(res.data.credentials);
      toast.success("Portal user created");
    },
    onError: () => toast.error("Failed to create user"),
  });

  const deleteUserM = useMutation({
    mutationFn: deletePortalUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["portal-users"] }); toast.success("Deleted"); },
  });

  const resetPwM = useMutation({
    mutationFn: ({ id }: { id: string }) => resetPortalPassword(id),
    onSuccess: (res) => { if (res.data) setCreds(res.data); toast.success("Password reset"); },
  });

  const createCapM = useMutation({
    mutationFn: createCapTableEntry,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-cap-table"] }); setShowCapModal(false); toast.success("Added"); },
  });

  const deleteCapM = useMutation({
    mutationFn: deleteCapTableEntry,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-cap-table"] }); toast.success("Deleted"); },
  });

  const createSafeM = useMutation({
    mutationFn: createSafe,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-safes"] }); setShowSafeModal(false); toast.success("SAFE created"); },
  });

  const deleteSafeM = useMutation({
    mutationFn: deleteSafe,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-safes"] }); toast.success("Deleted"); },
  });

  const createDocM = useMutation({
    mutationFn: createDataRoomDoc,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-data-room"] }); setShowDocModal(false); toast.success("Document added"); },
  });

  const deleteDocM = useMutation({
    mutationFn: deleteDataRoomDoc,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-data-room"] }); toast.success("Deleted"); },
  });

  const users = usersQ.data?.data || [];
  const capEntries = capQ.data?.data || [];
  const safes = safesQ.data?.data || [];
  const docs = docsQ.data?.data || [];

  return (
    <div className={embedded ? "space-y-4" : "h-full overflow-auto p-6"}>
      <div className={embedded ? "" : "max-w-6xl mx-auto space-y-6"}>
        {!embedded && (
          <div>
            <h1 className="text-xl font-semibold text-white">Investor Portal</h1>
            <p className="text-[13px] text-neutral-500 mt-1">
              Manage investor logins, cap table, SAFEs, and data room documents
            </p>
          </div>
        )}

        <div className="flex gap-1 border-b border-neutral-800 pb-px overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-2 text-[12px] font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
                tab === t.id ? "border-white text-white" : "border-transparent text-neutral-500 hover:text-neutral-300"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "users" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-[13px] text-neutral-400">{users.length} portal users</p>
              <Button onClick={() => setShowUserModal(true)} className="bg-white text-neutral-900 hover:bg-neutral-200 h-8 text-[12px]">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add investor login
              </Button>
            </div>
            <div className="border border-neutral-800 rounded-xl overflow-hidden">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-neutral-500 border-b border-neutral-800 bg-neutral-900/50">
                    <th className="text-left px-4 py-2.5">Name</th>
                    <th className="text-left px-4 py-2.5">Email</th>
                    <th className="text-left px-4 py-2.5">Stage</th>
                    <th className="text-right px-4 py-2.5">Amount</th>
                    <th className="text-left px-4 py-2.5">Last login</th>
                    <th className="text-right px-4 py-2.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-neutral-800/50">
                      <td className="px-4 py-2.5 text-white">{u.name}</td>
                      <td className="px-4 py-2.5 text-neutral-400">{u.email}</td>
                      <td className="px-4 py-2.5 text-neutral-400 capitalize">{u.stage.replace("_", " ")}</td>
                      <td className="px-4 py-2.5 text-right text-neutral-300">{fmt(u.investmentAmount || 0)}</td>
                      <td className="px-4 py-2.5 text-neutral-500">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => resetPwM.mutate({ id: u.id })} className="p-1.5 text-neutral-500 hover:text-white" title="Reset password">
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteUserM.mutate(u.id)} className="p-1.5 text-neutral-500 hover:text-red-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-500">No portal users yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "cap-table" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowCapModal(true)} className="bg-white text-neutral-900 hover:bg-neutral-200 h-8 text-[12px]">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add entry
              </Button>
            </div>
            <div className="border border-neutral-800 rounded-xl overflow-hidden">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-neutral-500 border-b border-neutral-800">
                    <th className="text-left px-4 py-2.5">Holder</th>
                    <th className="text-left px-4 py-2.5">Type</th>
                    <th className="text-right px-4 py-2.5">Investment</th>
                    <th className="text-right px-4 py-2.5">Ownership</th>
                    <th className="text-left px-4 py-2.5">Status</th>
                    <th className="text-right px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {capEntries.map(e => (
                    <tr key={e.id} className="border-b border-neutral-800/50">
                      <td className="px-4 py-2.5 text-white">{e.holderName}</td>
                      <td className="px-4 py-2.5 text-neutral-400 capitalize">{e.holderType}</td>
                      <td className="px-4 py-2.5 text-right text-neutral-300">{fmt(e.investmentAmount || 0)}</td>
                      <td className="px-4 py-2.5 text-right text-neutral-300">{e.ownershipPct ? `${e.ownershipPct}%` : "—"}</td>
                      <td className="px-4 py-2.5 text-neutral-400 capitalize">{e.status}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => deleteCapM.mutate(e.id)} className="p-1.5 text-neutral-500 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "safes" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowSafeModal(true)} className="bg-white text-neutral-900 hover:bg-neutral-200 h-8 text-[12px]">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add SAFE
              </Button>
            </div>
            <div className="space-y-2">
              {safes.map(s => (
                <div key={s.id} className="border border-neutral-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] text-white font-medium">{s.investorName}</p>
                    <p className="text-[12px] text-neutral-500">{fmt(s.amount)} · {s.status}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white">
                      <Upload className="w-3.5 h-3.5" />
                      Upload PDF
                      <input type="file" accept=".pdf" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        await uploadSafeFile(s.id, file);
                        qc.invalidateQueries({ queryKey: ["admin-safes"] });
                        toast.success("Uploaded");
                      }} />
                    </label>
                    <button onClick={() => deleteSafeM.mutate(s.id)} className="p-1.5 text-neutral-500 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "data-room" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowDocModal(true)} className="bg-white text-neutral-900 hover:bg-neutral-200 h-8 text-[12px]">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add document
              </Button>
            </div>
            <div className="space-y-2">
              {docs.map(d => (
                <div key={d.id} className="border border-neutral-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-[13px] text-white font-medium">{d.title}</p>
                    <p className="text-[12px] text-neutral-500">{d.category} · {d.visibility}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white">
                      <Upload className="w-3.5 h-3.5" />
                      Upload
                      <input type="file" accept=".pdf,.txt" className="hidden" onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        await uploadDataRoomFile(d.id, file);
                        qc.invalidateQueries({ queryKey: ["admin-data-room"] });
                        toast.success("Uploaded");
                      }} />
                    </label>
                    <button onClick={() => deleteDocM.mutate(d.id)} className="p-1.5 text-neutral-500 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {creds && <CredentialsDialog creds={creds} onClose={() => setCreds(null)} />}

      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="bg-neutral-950 border-neutral-800 max-w-md p-6 gap-3">
          <h2 className="text-[15px] font-semibold text-white">Add investor login</h2>
          <Input placeholder="Name" value={userForm.name || ""} onChange={e => setUserForm(p => ({ ...p, name: e.target.value }))}
            className="bg-neutral-800/50 border-neutral-700 text-white h-8 text-[13px]" />
          <Input placeholder="Email" type="email" value={userForm.email || ""} onChange={e => setUserForm(p => ({ ...p, email: e.target.value }))}
            className="bg-neutral-800/50 border-neutral-700 text-white h-8 text-[13px]" />
          <Input placeholder="Password (auto-generated if empty)" value={userForm.password || ""} onChange={e => setUserForm(p => ({ ...p, password: e.target.value }))}
            className="bg-neutral-800/50 border-neutral-700 text-white h-8 text-[13px]" />
          <Input placeholder="Company / Fund" value={userForm.company || ""} onChange={e => setUserForm(p => ({ ...p, company: e.target.value }))}
            className="bg-neutral-800/50 border-neutral-700 text-white h-8 text-[13px]" />
          <Select value={userForm.stage || "discussing"} onValueChange={v => v && setUserForm(p => ({ ...p, stage: v as PortalStage }))}>
            <SelectTrigger className="bg-neutral-800/50 border-neutral-700 text-white h-8 text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-neutral-900 border-neutral-700">
              {STAGES.map(s => <SelectItem key={s} value={s} className="text-[12px] capitalize">{s.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Investment amount" type="number" value={userForm.investmentAmount || ""} onChange={e => setUserForm(p => ({ ...p, investmentAmount: Number(e.target.value) }))}
            className="bg-neutral-800/50 border-neutral-700 text-white h-8 text-[13px]" />
          <textarea placeholder="Last conversation notes" value={userForm.lastConversation || ""} onChange={e => setUserForm(p => ({ ...p, lastConversation: e.target.value }))}
            className="w-full bg-neutral-800/50 border border-neutral-700 rounded-md text-white text-[13px] p-2 min-h-[80px] resize-none" />
          <Button
            onClick={() => userForm.name && userForm.email && createUserM.mutate({
              name: userForm.name,
              email: userForm.email,
              password: userForm.password,
              company: userForm.company,
              stage: userForm.stage,
              lastConversation: userForm.lastConversation,
              investmentAmount: userForm.investmentAmount,
            })}
            className="bg-white text-neutral-900 hover:bg-neutral-200 h-8 text-[12px]"
          >
            Create login
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showCapModal} onOpenChange={setShowCapModal}>
        <DialogContent className="bg-neutral-950 border-neutral-800 max-w-md p-6 gap-3">
          <h2 className="text-[15px] font-semibold text-white">Add cap table entry</h2>
          <Input placeholder="Holder name" value={capForm.holderName || ""} onChange={e => setCapForm(p => ({ ...p, holderName: e.target.value }))}
            className="bg-neutral-800/50 border-neutral-700 text-white h-8 text-[13px]" />
          <Input placeholder="Company" value={capForm.company || ""} onChange={e => setCapForm(p => ({ ...p, company: e.target.value }))}
            className="bg-neutral-800/50 border-neutral-700 text-white h-8 text-[13px]" />
          <Input placeholder="Investment amount" type="number" value={capForm.investmentAmount || ""} onChange={e => setCapForm(p => ({ ...p, investmentAmount: Number(e.target.value) }))}
            className="bg-neutral-800/50 border-neutral-700 text-white h-8 text-[13px]" />
          <Input placeholder="Ownership %" type="number" value={capForm.ownershipPct || ""} onChange={e => setCapForm(p => ({ ...p, ownershipPct: Number(e.target.value) }))}
            className="bg-neutral-800/50 border-neutral-700 text-white h-8 text-[13px]" />
          <Button
            onClick={() => capForm.holderName && createCapM.mutate({
              holderName: capForm.holderName,
              holderType: capForm.holderType || "investor",
              company: capForm.company,
              investmentAmount: capForm.investmentAmount,
              ownershipPct: capForm.ownershipPct,
              instrument: capForm.instrument || "safe",
              status: capForm.status || "pending",
              visible: true,
            } as Omit<CapTableEntry, "id">)}
            className="bg-white text-neutral-900 hover:bg-neutral-200 h-8 text-[12px]"
          >
            Add entry
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showSafeModal} onOpenChange={setShowSafeModal}>
        <DialogContent className="bg-neutral-950 border-neutral-800 max-w-md p-6 gap-3">
          <h2 className="text-[15px] font-semibold text-white">Add SAFE</h2>
          <Select value={safeForm.portalUserId || ""} onValueChange={v => v && setSafeForm(p => ({ ...p, portalUserId: v }))}>
            <SelectTrigger className="bg-neutral-800/50 border-neutral-700 text-white h-8 text-[13px]"><SelectValue placeholder="Select investor" /></SelectTrigger>
            <SelectContent className="bg-neutral-900 border-neutral-700">
              {users.map(u => <SelectItem key={u.id} value={u.id} className="text-[12px]">{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input placeholder="Investor name" value={safeForm.investorName || ""} onChange={e => setSafeForm(p => ({ ...p, investorName: e.target.value }))}
            className="bg-neutral-800/50 border-neutral-700 text-white h-8 text-[13px]" />
          <Input placeholder="Amount" type="number" value={safeForm.amount || ""} onChange={e => setSafeForm(p => ({ ...p, amount: Number(e.target.value) }))}
            className="bg-neutral-800/50 border-neutral-700 text-white h-8 text-[13px]" />
          <Input placeholder="Valuation cap" type="number" value={safeForm.valuationCap || ""} onChange={e => setSafeForm(p => ({ ...p, valuationCap: Number(e.target.value) }))}
            className="bg-neutral-800/50 border-neutral-700 text-white h-8 text-[13px]" />
          <Button
            onClick={() => safeForm.portalUserId && safeForm.investorName && createSafeM.mutate({
              portalUserId: safeForm.portalUserId,
              investorName: safeForm.investorName,
              amount: safeForm.amount || 0,
              valuationCap: safeForm.valuationCap,
              status: safeForm.status || "sent",
            } as Omit<InvestorSafe, "id">)}
            className="bg-white text-neutral-900 hover:bg-neutral-200 h-8 text-[12px]"
          >
            Create SAFE
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showDocModal} onOpenChange={setShowDocModal}>
        <DialogContent className="bg-neutral-950 border-neutral-800 max-w-md p-6 gap-3">
          <h2 className="text-[15px] font-semibold text-white">Add data room document</h2>
          <Input placeholder="Title" value={docForm.title || ""} onChange={e => setDocForm(p => ({ ...p, title: e.target.value }))}
            className="bg-neutral-800/50 border-neutral-700 text-white h-8 text-[13px]" />
          <Input placeholder="Description" value={docForm.description || ""} onChange={e => setDocForm(p => ({ ...p, description: e.target.value }))}
            className="bg-neutral-800/50 border-neutral-700 text-white h-8 text-[13px]" />
          <Input placeholder="External URL (optional)" value={docForm.documentUrl || ""} onChange={e => setDocForm(p => ({ ...p, documentUrl: e.target.value }))}
            className="bg-neutral-800/50 border-neutral-700 text-white h-8 text-[13px]" />
          <Button
            onClick={() => docForm.title && createDocM.mutate({
              title: docForm.title,
              description: docForm.description,
              category: docForm.category || "other",
              visibility: docForm.visibility || "all",
              documentUrl: docForm.documentUrl,
            })}
            className="bg-white text-neutral-900 hover:bg-neutral-200 h-8 text-[12px]"
          >
            Add document
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
