"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { portalLogin } from "@/lib/portal";
import { setToken, setRole, setPortalSession } from "@/lib/auth";
import { portalHomeHref } from "@/lib/investorPortalHost";
import { PortalLogo } from "@/components/portal/PortalLogo";
import { p } from "@/components/portal/portalTheme";
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
    <div className={`${p.shell} flex flex-col min-h-screen`}>
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 flex justify-center">
            <PortalLogo size="lg" />
          </div>

          <div className={`${p.card} ${p.cardPad}`}>
            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Sign in</h1>
            <p className={`${p.subtitle} mb-8`}>
              Access your cap table position, SAFE documents, and data room.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@fund.com"
                  autoFocus
                  className={p.input}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={p.input}
                />
              </div>
              {error && <p className={p.error}>{error}</p>}
              <button
                type="submit"
                disabled={loading || !email || !password}
                className={`${p.btnPrimary} w-full`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in
                  </>
                ) : (
                  "Continue"
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-slate-400 mt-8">
            Authorized investors only. Contact{" "}
            <a href="mailto:abel@reelin.ai" className="text-slate-600 hover:text-slate-900 underline underline-offset-2">
              abel@reelin.ai
            </a>{" "}
            for access.
          </p>
        </div>
      </div>
    </div>
  );
}
