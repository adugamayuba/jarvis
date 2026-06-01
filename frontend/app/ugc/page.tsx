"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2, Plus, Trash2, ExternalLink, RefreshCw, Video, Users,
  Send, Cookie, AlertCircle, CheckCircle2, Clock,
} from "lucide-react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TikTokAccount {
  id: string;
  username: string;
  displayName: string;
  email: string;
  status: string;
  hasCookies: boolean;
  notes: string;
  postsCount: number;
  createdAt: string;
}

interface UgcVideo {
  id: string;
  title: string;
  videoUrl: string;
  caption: string;
  hashtags: string[];
  notes: string;
  createdAt: string;
}

interface UgcPost {
  id: string;
  accountId: string;
  accountUsername: string;
  videoId: string;
  videoUrl: string;
  caption: string;
  hashtags: string[];
  status: string;
  error?: string;
  tiktokUrl?: string;
  createdAt: string;
  postedAt?: string;
}

interface UgcCreator {
  id: string;
  username: string;
  name: string;
  bio: string;
  followers: number;
  profileUrl: string;
  niche: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400",
  needs_cookies: "bg-amber-500/15 text-amber-400",
  pending_verification: "bg-sky-500/15 text-sky-400",
  queued: "bg-neutral-500/15 text-neutral-400",
  posting: "bg-sky-500/15 text-sky-400",
  posted: "bg-emerald-500/15 text-emerald-400",
  failed: "bg-red-500/15 text-red-400",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide", STATUS_COLORS[status] || STATUS_COLORS.queued)}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function UgcPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("accounts");

  // Account form
  const [accUsername, setAccUsername] = useState("");
  const [accEmail, setAccEmail] = useState("");
  const [accPassword, setAccPassword] = useState("");
  const [accCookies, setAccCookies] = useState("");
  const [accNotes, setAccNotes] = useState("");
  const [editingCookiesId, setEditingCookiesId] = useState<string | null>(null);
  const [cookieInput, setCookieInput] = useState("");

  // Video form
  const [vidTitle, setVidTitle] = useState("");
  const [vidUrl, setVidUrl] = useState("");
  const [vidCaption, setVidCaption] = useState("");
  const [vidHashtags, setVidHashtags] = useState("");

  // Post form
  const [postAccountId, setPostAccountId] = useState("");
  const [postVideoId, setPostVideoId] = useState("");
  const [postCaption, setPostCaption] = useState("");
  const [bulkAccountIds, setBulkAccountIds] = useState<string[]>([]);

  // Creator search
  const [creatorNiche, setCreatorNiche] = useState("");
  const [creatorJobId, setCreatorJobId] = useState<string | null>(null);

  const { data: accounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["ugc-accounts"],
    queryFn: async () => (await axios.get("/api/ugc/accounts")).data.data as TikTokAccount[],
  });

  const { data: videos = [], isLoading: loadingVideos } = useQuery({
    queryKey: ["ugc-videos"],
    queryFn: async () => (await axios.get("/api/ugc/videos")).data.data as UgcVideo[],
  });

  const { data: posts = [], refetch: refetchPosts } = useQuery({
    queryKey: ["ugc-posts"],
    queryFn: async () => (await axios.get("/api/ugc/posts")).data.data as UgcPost[],
    refetchInterval: (q) => {
      const data = q.state.data as UgcPost[] | undefined;
      return data?.some(p => p.status === "posting" || p.status === "queued") ? 5000 : false;
    },
  });

  const { data: creators = [] } = useQuery({
    queryKey: ["ugc-creators"],
    queryFn: async () => (await axios.get("/api/ugc/creators")).data.data as UgcCreator[],
  });

  const { data: creatorJob } = useQuery({
    queryKey: ["ugc-job", creatorJobId],
    queryFn: async () => creatorJobId ? (await axios.get(`/api/ugc/jobs/${creatorJobId}`)).data.data : null,
    enabled: !!creatorJobId,
    refetchInterval: (q) => q.state.data?.status === "running" ? 4000 : false,
  });

  async function refreshAll() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["ugc-accounts"] }),
      qc.invalidateQueries({ queryKey: ["ugc-videos"] }),
      qc.invalidateQueries({ queryKey: ["ugc-posts"] }),
      qc.invalidateQueries({ queryKey: ["ugc-creators"] }),
    ]);
  }

  async function addAccount(manual = true) {
    if (!accUsername.trim() && !accEmail.trim()) { toast.error("Username or email required"); return; }
    try {
      const endpoint = manual ? "/api/ugc/accounts" : "/api/ugc/accounts/register";
      const payload = manual
        ? { username: accUsername, email: accEmail, cookies: accCookies, notes: accNotes }
        : { email: accEmail, password: accPassword, username: accUsername, notes: accNotes };

      const res = await axios.post(endpoint, payload);
      if (res.data.success) {
        toast.success(res.data.message || "Account added");
        setAccUsername(""); setAccEmail(""); setAccPassword(""); setAccCookies(""); setAccNotes("");
        qc.invalidateQueries({ queryKey: ["ugc-accounts"] });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add account");
    }
  }

  async function saveCookies(accountId: string) {
    try {
      await axios.patch(`/api/ugc/accounts/${accountId}`, { cookies: cookieInput });
      toast.success("Cookies saved — account is now active");
      setEditingCookiesId(null);
      setCookieInput("");
      qc.invalidateQueries({ queryKey: ["ugc-accounts"] });
    } catch {
      toast.error("Failed to save cookies");
    }
  }

  async function deleteAccount(id: string) {
    if (!confirm("Delete this account?")) return;
    await axios.delete(`/api/ugc/accounts/${id}`);
    qc.invalidateQueries({ queryKey: ["ugc-accounts"] });
    toast.success("Account deleted");
  }

  async function addVideo() {
    if (!vidUrl.trim()) { toast.error("Video URL required (public HTTPS MP4)"); return; }
    try {
      const res = await axios.post("/api/ugc/videos", {
        title: vidTitle || "Untitled",
        videoUrl: vidUrl,
        caption: vidCaption,
        hashtags: vidHashtags.split(/[\s,]+/).filter(Boolean),
      });
      if (res.data.success) {
        toast.success("Video added to library");
        setVidTitle(""); setVidUrl(""); setVidCaption(""); setVidHashtags("");
        qc.invalidateQueries({ queryKey: ["ugc-videos"] });
      }
    } catch {
      toast.error("Failed to add video");
    }
  }

  async function deleteVideo(id: string) {
    if (!confirm("Delete this video?")) return;
    await axios.delete(`/api/ugc/videos/${id}`);
    qc.invalidateQueries({ queryKey: ["ugc-videos"] });
  }

  async function publishPost(publishNow = true) {
    if (!postAccountId || !postVideoId) { toast.error("Select account and video"); return; }
    try {
      const res = await axios.post("/api/ugc/posts", {
        accountId: postAccountId,
        videoId: postVideoId,
        caption: postCaption,
        publishNow,
      });
      if (res.data.success) {
        toast.success(publishNow ? "Posting started" : "Queued");
        setPostCaption("");
        refetchPosts();
      }
    } catch {
      toast.error("Failed to queue post");
    }
  }

  async function bulkPost() {
    if (!bulkAccountIds.length || !postVideoId) { toast.error("Select accounts and a video"); return; }
    try {
      const res = await axios.post("/api/ugc/posts/bulk", {
        accountIds: bulkAccountIds,
        videoId: postVideoId,
        caption: postCaption,
      });
      if (res.data.success) {
        toast.success(`Queued ${res.data.data.count} posts`);
        refetchPosts();
      }
    } catch {
      toast.error("Bulk post failed");
    }
  }

  async function retryPost(id: string) {
    await axios.post(`/api/ugc/posts/${id}/publish`);
    toast.success("Retrying post...");
    refetchPosts();
  }

  async function processQueue() {
    await axios.post("/api/ugc/posts/process-queue");
    toast.success("Processing queue...");
    refetchPosts();
  }

  async function searchCreators() {
    if (!creatorNiche.trim()) { toast.error("Enter a niche/hashtag"); return; }
    try {
      const res = await axios.post("/api/ugc/search-creators", { niche: creatorNiche, maxResults: 30 });
      if (res.data.success) {
        setCreatorJobId(res.data.data.jobId);
        toast.success("Searching TikTok creators...");
      }
    } catch {
      toast.error("Search failed");
    }
  }

  function toggleBulkAccount(id: string) {
    setBulkAccountIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const activeAccounts = accounts.filter(a => a.hasCookies);

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">UGC / TikTok</h1>
            <p className="text-sm text-neutral-500 mt-1">
              Manage TikTok accounts, video library, and automated posting via Apify.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshAll} className="border-neutral-800 text-neutral-400">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
          </Button>
        </div>

        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex gap-3 text-sm text-amber-200/80">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <p className="font-medium text-amber-300">How account setup works</p>
            <p className="mt-1 text-amber-200/70 text-[13px] leading-relaxed">
              TikTok requires phone verification — full auto-signup isn&apos;t reliable. Create accounts manually or use
              &quot;Launch Signup&quot;, complete verification, then export session cookies from your browser
              (DevTools → Application → Cookies → tiktok.com) and paste them here. Posting uses Apify browser automation with those cookies.
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-neutral-900 border border-neutral-800">
            <TabsTrigger value="accounts" className="text-xs"><Users className="w-3.5 h-3.5 mr-1.5" />Accounts</TabsTrigger>
            <TabsTrigger value="videos" className="text-xs"><Video className="w-3.5 h-3.5 mr-1.5" />Videos</TabsTrigger>
            <TabsTrigger value="posts" className="text-xs"><Send className="w-3.5 h-3.5 mr-1.5" />Posts</TabsTrigger>
            <TabsTrigger value="creators" className="text-xs"><Users className="w-3.5 h-3.5 mr-1.5" />Creators</TabsTrigger>
          </TabsList>

          {/* ── Accounts ── */}
          <TabsContent value="accounts" className="space-y-6 mt-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 space-y-3">
                <h3 className="text-sm font-medium text-white">Add account manually</h3>
                <Input placeholder="@username" value={accUsername} onChange={e => setAccUsername(e.target.value)} className="bg-neutral-950 border-neutral-800" />
                <Input placeholder="email@example.com" value={accEmail} onChange={e => setAccEmail(e.target.value)} className="bg-neutral-950 border-neutral-800" />
                <Textarea placeholder="Session cookies (JSON or Netscape format)" value={accCookies} onChange={e => setAccCookies(e.target.value)} rows={3} className="bg-neutral-950 border-neutral-800 text-xs font-mono" />
                <Input placeholder="Notes (optional)" value={accNotes} onChange={e => setAccNotes(e.target.value)} className="bg-neutral-950 border-neutral-800" />
                <Button onClick={() => addAccount(true)} className="w-full bg-white text-black hover:bg-neutral-200">
                  <Plus className="w-4 h-4 mr-1.5" /> Add Account
                </Button>
              </div>

              <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 space-y-3">
                <h3 className="text-sm font-medium text-white">Launch TikTok signup</h3>
                <p className="text-xs text-neutral-500">Opens browser on the server with pre-filled email/password. Complete phone + captcha, then paste cookies.</p>
                <Input placeholder="email@example.com" value={accEmail} onChange={e => setAccEmail(e.target.value)} className="bg-neutral-950 border-neutral-800" />
                <Input type="password" placeholder="Password" value={accPassword} onChange={e => setAccPassword(e.target.value)} className="bg-neutral-950 border-neutral-800" />
                <Input placeholder="@username (optional)" value={accUsername} onChange={e => setAccUsername(e.target.value)} className="bg-neutral-950 border-neutral-800" />
                <Button onClick={() => addAccount(false)} variant="outline" className="w-full border-neutral-700">
                  Launch Signup Browser
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-900/60">
                <span className="text-sm font-medium text-white">{accounts.length} accounts</span>
                <span className="text-xs text-neutral-500 ml-2">({activeAccounts.length} with cookies)</span>
              </div>
              {loadingAccounts ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-neutral-500" /></div>
              ) : accounts.length === 0 ? (
                <p className="p-8 text-center text-sm text-neutral-500">No accounts yet</p>
              ) : (
                <div className="divide-y divide-neutral-800/60">
                  {accounts.map(acc => (
                    <div key={acc.id} className="px-4 py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">@{acc.username}</span>
                          <StatusBadge status={acc.status} />
                          {acc.hasCookies && <Cookie className="w-3.5 h-3.5 text-emerald-500" />}
                        </div>
                        <p className="text-xs text-neutral-500 mt-0.5">{acc.email} · {acc.postsCount} posts</p>
                        {acc.notes && <p className="text-xs text-neutral-600 mt-0.5 truncate">{acc.notes}</p>}
                        {editingCookiesId === acc.id && (
                          <div className="mt-2 space-y-2">
                            <Textarea value={cookieInput} onChange={e => setCookieInput(e.target.value)} placeholder="Paste cookies here..." rows={3} className="bg-neutral-950 border-neutral-700 text-xs font-mono" />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => saveCookies(acc.id)}>Save Cookies</Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingCookiesId(null)}>Cancel</Button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!acc.hasCookies && editingCookiesId !== acc.id && (
                          <Button size="sm" variant="outline" className="border-neutral-700 text-xs" onClick={() => { setEditingCookiesId(acc.id); setCookieInput(""); }}>
                            Add Cookies
                          </Button>
                        )}
                        <a href={`https://www.tiktok.com/@${acc.username}`} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost"><ExternalLink className="w-3.5 h-3.5" /></Button>
                        </a>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={() => deleteAccount(acc.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Videos ── */}
          <TabsContent value="videos" className="space-y-6 mt-4">
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 space-y-3 max-w-xl">
              <h3 className="text-sm font-medium text-white">Add video to library</h3>
              <p className="text-xs text-neutral-500">Provide a public HTTPS URL to an MP4 file (e.g. Firebase Storage, S3, or CDN).</p>
              <Input placeholder="Title" value={vidTitle} onChange={e => setVidTitle(e.target.value)} className="bg-neutral-950 border-neutral-800" />
              <Input placeholder="https://...video.mp4" value={vidUrl} onChange={e => setVidUrl(e.target.value)} className="bg-neutral-950 border-neutral-800" />
              <Textarea placeholder="Default caption" value={vidCaption} onChange={e => setVidCaption(e.target.value)} rows={2} className="bg-neutral-950 border-neutral-800" />
              <Input placeholder="Hashtags (space or comma separated)" value={vidHashtags} onChange={e => setVidHashtags(e.target.value)} className="bg-neutral-950 border-neutral-800" />
              <Button onClick={addVideo} className="bg-white text-black hover:bg-neutral-200">
                <Plus className="w-4 h-4 mr-1.5" /> Add Video
              </Button>
            </div>

            <div className="rounded-lg border border-neutral-800 overflow-hidden">
              {loadingVideos ? (
                <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-neutral-500" /></div>
              ) : videos.length === 0 ? (
                <p className="p-8 text-center text-sm text-neutral-500">No videos in library</p>
              ) : (
                <div className="divide-y divide-neutral-800/60">
                  {videos.map(v => (
                    <div key={v.id} className="px-4 py-3 flex items-center gap-4">
                      <Video className="w-5 h-5 text-neutral-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{v.title}</p>
                        <p className="text-xs text-neutral-500 truncate">{v.videoUrl}</p>
                        {v.caption && <p className="text-xs text-neutral-600 mt-0.5 truncate">{v.caption}</p>}
                      </div>
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteVideo(v.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Posts ── */}
          <TabsContent value="posts" className="space-y-6 mt-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 space-y-3">
                <h3 className="text-sm font-medium text-white">Post to one account</h3>
                <select value={postAccountId} onChange={e => setPostAccountId(e.target.value)} className="w-full rounded-md bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm text-white">
                  <option value="">Select account</option>
                  {activeAccounts.map(a => <option key={a.id} value={a.id}>@{a.username}</option>)}
                </select>
                <select value={postVideoId} onChange={e => setPostVideoId(e.target.value)} className="w-full rounded-md bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm text-white">
                  <option value="">Select video</option>
                  {videos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
                </select>
                <Textarea placeholder="Caption override (optional)" value={postCaption} onChange={e => setPostCaption(e.target.value)} rows={2} className="bg-neutral-950 border-neutral-800" />
                <Button onClick={() => publishPost(true)} className="w-full bg-white text-black hover:bg-neutral-200">
                  <Send className="w-4 h-4 mr-1.5" /> Post Now
                </Button>
              </div>

              <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 space-y-3">
                <h3 className="text-sm font-medium text-white">Bulk post to multiple accounts</h3>
                <p className="text-xs text-neutral-500">Same video posted to all selected accounts (30s delay between each).</p>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {activeAccounts.map(a => (
                    <button key={a.id} onClick={() => toggleBulkAccount(a.id)}
                      className={cn("text-xs px-2.5 py-1 rounded-full border transition-colors",
                        bulkAccountIds.includes(a.id) ? "border-white bg-white/10 text-white" : "border-neutral-700 text-neutral-500")}>
                      @{a.username}
                    </button>
                  ))}
                </div>
                <select value={postVideoId} onChange={e => setPostVideoId(e.target.value)} className="w-full rounded-md bg-neutral-950 border border-neutral-800 px-3 py-2 text-sm text-white">
                  <option value="">Select video</option>
                  {videos.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}
                </select>
                <Button onClick={bulkPost} variant="outline" className="w-full border-neutral-700">
                  Queue Bulk Post ({bulkAccountIds.length} accounts)
                </Button>
                <Button onClick={processQueue} variant="ghost" className="w-full text-neutral-400">
                  <Clock className="w-4 h-4 mr-1.5" /> Process Queue
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-neutral-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-800 bg-neutral-900/60 flex justify-between">
                <span className="text-sm font-medium text-white">Post history</span>
                <Badge variant="outline" className="border-neutral-700 text-neutral-400">{posts.length} total</Badge>
              </div>
              {posts.length === 0 ? (
                <p className="p-8 text-center text-sm text-neutral-500">No posts yet</p>
              ) : (
                <div className="divide-y divide-neutral-800/60">
                  {posts.map(p => (
                    <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                      {p.status === "posted" ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> :
                       p.status === "failed" ? <AlertCircle className="w-4 h-4 text-red-400 shrink-0" /> :
                       <Loader2 className={cn("w-4 h-4 shrink-0", p.status === "posting" && "animate-spin text-sky-400")} />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white">@{p.accountUsername}</span>
                          <StatusBadge status={p.status} />
                        </div>
                        <p className="text-xs text-neutral-500 truncate">{p.caption || p.videoUrl}</p>
                        {p.error && <p className="text-xs text-red-400 mt-0.5">{p.error}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {p.tiktokUrl && (
                          <a href={p.tiktokUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost"><ExternalLink className="w-3.5 h-3.5" /></Button>
                          </a>
                        )}
                        {p.status === "failed" && (
                          <Button size="sm" variant="outline" className="border-neutral-700 text-xs" onClick={() => retryPost(p.id)}>Retry</Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Creators ── */}
          <TabsContent value="creators" className="space-y-6 mt-4">
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-4 space-y-3 max-w-xl">
              <h3 className="text-sm font-medium text-white">Find TikTok creators by niche</h3>
              <div className="flex gap-2">
                <Input placeholder="e.g. AI startup, reelin, ugc creator" value={creatorNiche} onChange={e => setCreatorNiche(e.target.value)} className="bg-neutral-950 border-neutral-800" />
                <Button onClick={searchCreators} disabled={creatorJob?.status === "running"} className="bg-white text-black hover:bg-neutral-200 shrink-0">
                  {creatorJob?.status === "running" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                </Button>
              </div>
              {creatorJob && (
                <p className="text-xs text-neutral-500">
                  Job: {creatorJob.status} {creatorJob.status === "completed" && `— found ${creatorJob.found}`}
                  {creatorJob.error && <span className="text-red-400"> · {creatorJob.error}</span>}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-neutral-800 overflow-hidden">
              {creators.length === 0 ? (
                <p className="p-8 text-center text-sm text-neutral-500">Search for creators to populate this list</p>
              ) : (
                <div className="divide-y divide-neutral-800/60">
                  {creators.map(c => (
                    <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">@{c.username}</span>
                          <span className="text-xs text-neutral-500">{formatFollowers(c.followers)} followers</span>
                        </div>
                        <p className="text-xs text-neutral-500 truncate">{c.bio || c.niche}</p>
                      </div>
                      <a href={c.profileUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost"><ExternalLink className="w-3.5 h-3.5" /></Button>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
