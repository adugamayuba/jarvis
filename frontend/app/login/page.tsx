"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { setToken, setRole } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(password);
      if (res.success && res.data?.token) {
        setToken(res.data.token);
        const role = res.data.role || "admin";
        setRole(role as "admin" | "cofounder");
        // Co-founders go straight to influencer finder
        router.replace(role === "cofounder" ? "/influencers-finder" : "/");
      } else {
        setError(res.error || "Invalid password");
      }
    } catch {
      setError("Invalid password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2.5 justify-center mb-10">
          <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 4V10L7 13L1 10V4L7 1Z" fill="#0a0a0a" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-base font-semibold text-white tracking-tight">Jarvis</span>
        </div>

        <div className="border border-neutral-800 rounded-xl p-7">
          <h1 className="text-[15px] font-semibold text-white mb-1">Sign in</h1>
          <p className="text-[13px] text-neutral-500 mb-6">Enter your password to access the dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="bg-neutral-800/50 border-neutral-700 text-white placeholder:text-neutral-600 h-9 text-[13px]"
            />
            {error && (
              <p className="text-[12px] text-red-400">{error}</p>
            )}
            <Button
              type="submit"
              disabled={loading || !password}
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
