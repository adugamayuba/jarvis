"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { portalLogin } from "@/lib/portal";
import { setToken, setRole, setPortalSession } from "@/lib/auth";
import { portalHomeHref } from "@/lib/investorPortalHost";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function PortalLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await portalLogin(email.trim(), password);
      if (res.success && res.data?.token) {
        setToken(res.data.token);
        setRole("investor");
        setPortalSession({
          portalUserId: res.data.portalUserId,
          name: res.data.name,
          email: res.data.email,
        });
        router.replace(portalHomeHref());
      } else {
        setError(res.error || "Invalid email or password");
      }
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-10">
          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
            <span className="text-sm font-bold text-neutral-900">R</span>
          </div>
          <div>
            <p className="text-base font-semibold text-white tracking-tight leading-none">Reelin AI</p>
            <p className="text-[12px] text-neutral-500 mt-0.5">Investor Portal</p>
          </div>
        </div>

        <div className="border border-neutral-800 rounded-xl p-7">
          <h1 className="text-[15px] font-semibold text-white mb-1">Investor sign in</h1>
          <p className="text-[13px] text-neutral-500 mb-6">Use the email and password provided by Reelin AI</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoFocus
              className="bg-neutral-800/50 border-neutral-700 text-white placeholder:text-neutral-600 h-9 text-[13px]"
            />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="bg-neutral-800/50 border-neutral-700 text-white placeholder:text-neutral-600 h-9 text-[13px]"
            />
            {error && <p className="text-[12px] text-red-400">{error}</p>}
            <Button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-white text-neutral-900 hover:bg-neutral-200 text-[13px] font-medium h-9"
            >
              {loading ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Signing in...</> : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
