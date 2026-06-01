import { Router, Request, Response } from "express";
import { getDb } from "../services/firebase";
import { postVideoToTikTok, searchTikTokCreators, launchTikTokSignup } from "../services/tiktokUgc";
import {
  getYouTubeAuthUrl,
  exchangeYouTubeCode,
  uploadVideoToYouTube,
  searchYouTubeChannels,
  launchYouTubeSignup,
} from "../services/youtubeUgc";

interface IdParams extends Record<string, string> { id: string }
interface JobIdParams extends Record<string, string> { jobId: string }

const router = Router();

// ── Accounts ──────────────────────────────────────────────────────────────────

// GET /api/ugc/accounts
router.get("/accounts", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection("tiktokAccounts").orderBy("createdAt", "desc").limit(100).get();
    const accounts = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        username: data.username,
        displayName: data.displayName,
        email: data.email,
        status: data.status,
        hasCookies: !!data.cookies,
        notes: data.notes,
        postsCount: data.postsCount || 0,
        createdAt: data.createdAt,
      };
    });
    res.json({ success: true, data: accounts });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/ugc/accounts — add account (manual or after signup)
router.post("/accounts", async (req: Request, res: Response) => {
  try {
    const { username, displayName, email, cookies, notes, password } = req.body as {
      username?: string;
      displayName?: string;
      email?: string;
      cookies?: string;
      notes?: string;
      password?: string;
    };

    if (!username?.trim()) {
      res.status(400).json({ success: false, error: "username is required" });
      return;
    }

    const db = getDb();
    const doc = await db.collection("tiktokAccounts").add({
      username: username.trim().replace(/^@/, ""),
      displayName: displayName || username,
      email: email || "",
      cookies: cookies || "",
      password: password || "", // stored for Apify fallback — user opts in
      notes: notes || "",
      status: cookies ? "active" : "needs_cookies",
      postsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    res.json({ success: true, data: { id: doc.id }, message: "Account added" });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// PATCH /api/ugc/accounts/:id — update cookies, status, notes
router.patch("/accounts/:id", async (req: Request<IdParams>, res: Response) => {
  try {
    const { cookies, status, notes, displayName } = req.body as {
      cookies?: string;
      status?: string;
      notes?: string;
      displayName?: string;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (cookies !== undefined) {
      updates.cookies = cookies;
      if (cookies) updates.status = "active";
    }
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (displayName) updates.displayName = displayName;

    const db = getDb();
    await db.collection("tiktokAccounts").doc(req.params.id).update(updates);
    res.json({ success: true, message: "Account updated" });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// DELETE /api/ugc/accounts/:id
router.delete("/accounts/:id", async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    await db.collection("tiktokAccounts").doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/ugc/accounts/register — launch browser for TikTok signup
router.post("/accounts/register", async (req: Request, res: Response) => {
  try {
    const { email, password, username, notes } = req.body as {
      email: string;
      password: string;
      username?: string;
      notes?: string;
    };

    if (!email || !password) {
      res.status(400).json({ success: false, error: "email and password required" });
      return;
    }

    const db = getDb();
    const doc = await db.collection("tiktokAccounts").add({
      username: (username || email.split("@")[0]).replace(/^@/, ""),
      displayName: username || email.split("@")[0],
      email,
      password,
      cookies: "",
      notes: notes || "Pending manual verification",
      status: "pending_verification",
      postsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Launch signup in background (non-blocking — browser stays open on server)
    launchTikTokSignup(email, password).catch(console.error);

    res.json({
      success: true,
      data: { id: doc.id },
      message: "Account created in Jarvis. Complete TikTok signup in the browser, then paste session cookies.",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Videos ────────────────────────────────────────────────────────────────────

// GET /api/ugc/videos
router.get("/videos", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection("ugcVideos").orderBy("createdAt", "desc").limit(100).get();
    const videos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: videos });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/ugc/videos — add video by URL
router.post("/videos", async (req: Request, res: Response) => {
  try {
    const { title, videoUrl, caption, hashtags, notes } = req.body as {
      title?: string;
      videoUrl: string;
      caption?: string;
      hashtags?: string[];
      notes?: string;
    };

    if (!videoUrl?.trim()) {
      res.status(400).json({ success: false, error: "videoUrl is required (public HTTPS MP4 URL)" });
      return;
    }

    const db = getDb();
    const doc = await db.collection("ugcVideos").add({
      title: title || "Untitled",
      videoUrl: videoUrl.trim(),
      caption: caption || "",
      hashtags: hashtags || [],
      notes: notes || "",
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, data: { id: doc.id }, message: "Video added to library" });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// DELETE /api/ugc/videos/:id
router.delete("/videos/:id", async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    await db.collection("ugcVideos").doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// ── Posts ─────────────────────────────────────────────────────────────────────

// GET /api/ugc/posts
router.get("/posts", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection("ugcPosts").orderBy("createdAt", "desc").limit(100).get();
    const posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: posts });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/ugc/posts — queue a post (single account)
router.post("/posts", async (req: Request, res: Response) => {
  try {
    const { accountId, videoId, caption, hashtags, scheduledAt, publishNow } = req.body as {
      accountId: string;
      videoId: string;
      caption?: string;
      hashtags?: string[];
      scheduledAt?: string;
      publishNow?: boolean;
    };

    if (!accountId || !videoId) {
      res.status(400).json({ success: false, error: "accountId and videoId required" });
      return;
    }

    const db = getDb();
    const [accountDoc, videoDoc] = await Promise.all([
      db.collection("tiktokAccounts").doc(accountId).get(),
      db.collection("ugcVideos").doc(videoId).get(),
    ]);

    if (!accountDoc.exists) { res.status(404).json({ success: false, error: "Account not found" }); return; }
    if (!videoDoc.exists) { res.status(404).json({ success: false, error: "Video not found" }); return; }

    const account = accountDoc.data()!;
    const video = videoDoc.data()!;

    const postRef = await db.collection("ugcPosts").add({
      platform: "tiktok",
      accountId,
      accountUsername: account.username,
      videoId,
      videoUrl: video.videoUrl,
      caption: caption || video.caption || "",
      hashtags: hashtags || video.hashtags || [],
      status: publishNow ? "posting" : "queued",
      scheduledAt: scheduledAt || null,
      createdAt: new Date().toISOString(),
    });

    if (publishNow) {
      // Fire and forget
      publishPost(postRef.id).catch(console.error);
    }

    res.json({ success: true, data: { id: postRef.id }, message: publishNow ? "Posting started" : "Queued" });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/ugc/posts/bulk — post same video to multiple accounts
router.post("/posts/bulk", async (req: Request, res: Response) => {
  try {
    const { accountIds, videoId, caption, hashtags } = req.body as {
      accountIds: string[];
      videoId: string;
      caption?: string;
      hashtags?: string[];
    };

    if (!accountIds?.length || !videoId) {
      res.status(400).json({ success: false, error: "accountIds and videoId required" });
      return;
    }

    const db = getDb();
    const videoDoc = await db.collection("ugcVideos").doc(videoId).get();
    if (!videoDoc.exists) { res.status(404).json({ success: false, error: "Video not found" }); return; }
    const video = videoDoc.data()!;

    const postIds: string[] = [];
    for (const accountId of accountIds) {
      const accountDoc = await db.collection("tiktokAccounts").doc(accountId).get();
      if (!accountDoc.exists) continue;

      const postRef = await db.collection("ugcPosts").add({
        platform: "tiktok",
        accountId,
        accountUsername: accountDoc.data()!.username,
        videoId,
        videoUrl: video.videoUrl,
        caption: caption || video.caption || "",
        hashtags: hashtags || video.hashtags || [],
        status: "queued",
        createdAt: new Date().toISOString(),
      });
      postIds.push(postRef.id);
    }

    // Process queue in background
    processPostQueue().catch(console.error);

    res.json({
      success: true,
      data: { postIds, count: postIds.length },
      message: `Queued ${postIds.length} posts — processing in background`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/ugc/posts/:id/publish — publish a queued post now
router.post("/posts/:id/publish", async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    await db.collection("ugcPosts").doc(req.params.id).update({ status: "posting" });
    publishPost(req.params.id).catch(console.error);
    res.json({ success: true, message: "Publishing..." });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/ugc/posts/process-queue — process all queued posts
router.post("/posts/process-queue", async (_req: Request, res: Response) => {
  processPostQueue().catch(console.error);
  res.json({ success: true, message: "Processing queue..." });
});

async function publishPost(postId: string): Promise<void> {
  const db = getDb();
  const postRef = db.collection("ugcPosts").doc(postId);
  const postDoc = await postRef.get();
  if (!postDoc.exists) return;

  const post = postDoc.data()!;
  const platform = (post.platform as string) || "tiktok";

  if (platform === "youtube") {
    await publishYouTubePost(postId);
    return;
  }
  const accountDoc = await db.collection("tiktokAccounts").doc(post.accountId).get();
  if (!accountDoc.exists) {
    await postRef.update({ status: "failed", error: "Account not found", updatedAt: new Date().toISOString() });
    return;
  }

  const account = accountDoc.data()!;
  const cookies = account.cookies as string;
  if (!cookies?.trim()) {
    await postRef.update({ status: "failed", error: "No session cookies — export from browser and paste in account settings", updatedAt: new Date().toISOString() });
    return;
  }

  await postRef.update({ status: "posting", updatedAt: new Date().toISOString() });

  const result = await postVideoToTikTok({
    cookies,
    videoUrl: post.videoUrl as string,
    caption: post.caption as string,
    hashtags: post.hashtags as string[],
  });

  if (result.success) {
    await postRef.update({
      status: "posted",
      tiktokUrl: result.videoUrl || "",
      postedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await db.collection("tiktokAccounts").doc(post.accountId).update({
      postsCount: (account.postsCount || 0) + 1,
      updatedAt: new Date().toISOString(),
    });
  } else {
    await postRef.update({
      status: "failed",
      error: result.error || "Unknown error",
      updatedAt: new Date().toISOString(),
    });
  }
}

async function processPostQueue(): Promise<void> {
  const db = getDb();
  const snap = await db.collection("ugcPosts").where("status", "==", "queued").limit(10).get();
  for (const doc of snap.docs) {
    await publishPost(doc.id);
    // Delay between posts to avoid rate limits
    await new Promise(r => setTimeout(r, 30_000));
  }
}

// ── Creator search ────────────────────────────────────────────────────────────

// POST /api/ugc/search-creators
router.post("/search-creators", async (req: Request, res: Response) => {
  try {
    const { niche, maxResults = 30 } = req.body as { niche: string; maxResults?: number };
    if (!niche) { res.status(400).json({ success: false, error: "niche required" }); return; }

    const db = getDb();
    const jobRef = db.collection("ugcJobs").doc();
    await jobRef.set({
      type: "creator_search",
      niche,
      status: "running",
      total: 0,
      found: 0,
      startedAt: new Date().toISOString(),
    });

    res.status(202).json({ success: true, data: { jobId: jobRef.id } });

    (async () => {
      try {
        const creators = await searchTikTokCreators(niche, maxResults);
        const batch = db.batch();
        for (const c of creators) {
          const ref = db.collection("ugcCreators").doc();
          batch.set(ref, { ...c, niche, createdAt: new Date().toISOString() });
        }
        if (creators.length) await batch.commit();
        await jobRef.update({
          status: "completed",
          total: creators.length,
          found: creators.length,
          completedAt: new Date().toISOString(),
        });
      } catch (err) {
        await jobRef.update({
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          completedAt: new Date().toISOString(),
        });
      }
    })();
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/ugc/jobs/:jobId
router.get("/jobs/:jobId", async (req: Request<JobIdParams>, res: Response) => {
  try {
    const db = getDb();
    const doc = await db.collection("ugcJobs").doc(req.params.jobId).get();
    if (!doc.exists) { res.status(404).json({ success: false, error: "Job not found" }); return; }
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/ugc/creators
router.get("/creators", async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection("ugcCreators").orderBy("followers", "desc").limit(200).get();
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Array<{ id: string; platform?: string; followers?: number }>;
    if (req.query.platform) {
      const platform = String(req.query.platform);
      items = items.filter(c => (c.platform || "tiktok") === platform);
    }
    res.json({ success: true, data: items.slice(0, 100) });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// ── YouTube Accounts ──────────────────────────────────────────────────────────

// GET /api/ugc/youtube/accounts
router.get("/youtube/accounts", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection("youtubeAccounts").orderBy("createdAt", "desc").limit(100).get();
    const accounts = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        channelId: data.channelId,
        channelTitle: data.channelTitle,
        email: data.email,
        status: data.status,
        hasOAuth: !!data.refreshToken,
        notes: data.notes,
        postsCount: data.postsCount || 0,
        createdAt: data.createdAt,
      };
    });
    res.json({ success: true, data: accounts });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/ugc/youtube/accounts
router.post("/youtube/accounts", async (req: Request, res: Response) => {
  try {
    const { channelTitle, email, refreshToken, notes } = req.body as {
      channelTitle?: string;
      email?: string;
      refreshToken?: string;
      notes?: string;
    };

    const db = getDb();
    const doc = await db.collection("youtubeAccounts").add({
      channelId: "",
      channelTitle: channelTitle || email?.split("@")[0] || "YouTube Channel",
      email: email || "",
      refreshToken: refreshToken || "",
      notes: notes || "",
      status: refreshToken ? "active" : "needs_oauth",
      postsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    res.json({ success: true, data: { id: doc.id }, message: "YouTube account added" });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/ugc/youtube/accounts/register
router.post("/youtube/accounts/register", async (req: Request, res: Response) => {
  try {
    const { email, password, channelTitle, notes } = req.body as {
      email: string;
      password: string;
      channelTitle?: string;
      notes?: string;
    };

    if (!email || !password) {
      res.status(400).json({ success: false, error: "email and password required" });
      return;
    }

    const db = getDb();
    const doc = await db.collection("youtubeAccounts").add({
      channelId: "",
      channelTitle: channelTitle || email.split("@")[0],
      email,
      password,
      refreshToken: "",
      notes: notes || "Pending Google signup + OAuth",
      status: "pending_verification",
      postsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    launchYouTubeSignup(email, password).catch(console.error);

    res.json({
      success: true,
      data: { id: doc.id },
      message: "Account saved. Complete Google signup, then Connect with Google to enable posting.",
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/ugc/youtube/oauth/connect/:id — returns auth URL
router.get("/youtube/oauth/connect/:id", async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    const doc = await db.collection("youtubeAccounts").doc(req.params.id).get();
    if (!doc.exists) { res.status(404).json({ success: false, error: "Account not found" }); return; }

    const authUrl = getYouTubeAuthUrl(req.params.id);
    res.json({ success: true, data: { authUrl } });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/ugc/youtube/oauth/callback
router.get("/youtube/oauth/callback", async (req: Request, res: Response) => {
  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
  try {
    const { code, state, error } = req.query as { code?: string; state?: string; error?: string };
    if (error) {
      res.redirect(`${frontendUrl}/ugc?platform=youtube&oauth=error&message=${encodeURIComponent(error)}`);
      return;
    }
    if (!code || !state) {
      res.redirect(`${frontendUrl}/ugc?platform=youtube&oauth=error&message=missing_code`);
      return;
    }

    const tokens = await exchangeYouTubeCode(code);
    const db = getDb();
    await db.collection("youtubeAccounts").doc(state).update({
      channelId: tokens.channelId,
      channelTitle: tokens.channelTitle,
      refreshToken: tokens.refreshToken,
      status: "active",
      updatedAt: new Date().toISOString(),
    });

    res.redirect(`${frontendUrl}/ugc?platform=youtube&oauth=success&channel=${encodeURIComponent(tokens.channelTitle)}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.redirect(`${frontendUrl}/ugc?platform=youtube&oauth=error&message=${encodeURIComponent(msg)}`);
  }
});

// PATCH /api/ugc/youtube/accounts/:id
router.patch("/youtube/accounts/:id", async (req: Request<IdParams>, res: Response) => {
  try {
    const { refreshToken, status, notes, channelTitle } = req.body as {
      refreshToken?: string;
      status?: string;
      notes?: string;
      channelTitle?: string;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (refreshToken !== undefined) {
      updates.refreshToken = refreshToken;
      if (refreshToken) updates.status = "active";
    }
    if (status) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (channelTitle) updates.channelTitle = channelTitle;

    const db = getDb();
    await db.collection("youtubeAccounts").doc(req.params.id).update(updates);
    res.json({ success: true, message: "Account updated" });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// DELETE /api/ugc/youtube/accounts/:id
router.delete("/youtube/accounts/:id", async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    await db.collection("youtubeAccounts").doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/ugc/youtube/posts
router.post("/youtube/posts", async (req: Request, res: Response) => {
  try {
    const { accountId, videoId, title, caption, hashtags, privacyStatus, publishNow } = req.body as {
      accountId: string;
      videoId: string;
      title?: string;
      caption?: string;
      hashtags?: string[];
      privacyStatus?: "public" | "private" | "unlisted";
      publishNow?: boolean;
    };

    if (!accountId || !videoId) {
      res.status(400).json({ success: false, error: "accountId and videoId required" });
      return;
    }

    const db = getDb();
    const [accountDoc, videoDoc] = await Promise.all([
      db.collection("youtubeAccounts").doc(accountId).get(),
      db.collection("ugcVideos").doc(videoId).get(),
    ]);

    if (!accountDoc.exists) { res.status(404).json({ success: false, error: "YouTube account not found" }); return; }
    if (!videoDoc.exists) { res.status(404).json({ success: false, error: "Video not found" }); return; }

    const account = accountDoc.data()!;
    const video = videoDoc.data()!;

    const postRef = await db.collection("ugcPosts").add({
      platform: "youtube",
      accountId,
      accountUsername: account.channelTitle,
      videoId,
      videoUrl: video.videoUrl,
      title: title || video.title || "Untitled",
      caption: caption || video.caption || "",
      hashtags: hashtags || video.hashtags || [],
      privacyStatus: privacyStatus || "public",
      status: publishNow ? "posting" : "queued",
      createdAt: new Date().toISOString(),
    });

    if (publishNow) publishYouTubePost(postRef.id).catch(console.error);

    res.json({ success: true, data: { id: postRef.id }, message: publishNow ? "Uploading to YouTube..." : "Queued" });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/ugc/youtube/posts/bulk
router.post("/youtube/posts/bulk", async (req: Request, res: Response) => {
  try {
    const { accountIds, videoId, title, caption, hashtags, privacyStatus } = req.body as {
      accountIds: string[];
      videoId: string;
      title?: string;
      caption?: string;
      hashtags?: string[];
      privacyStatus?: "public" | "private" | "unlisted";
    };

    if (!accountIds?.length || !videoId) {
      res.status(400).json({ success: false, error: "accountIds and videoId required" });
      return;
    }

    const db = getDb();
    const videoDoc = await db.collection("ugcVideos").doc(videoId).get();
    if (!videoDoc.exists) { res.status(404).json({ success: false, error: "Video not found" }); return; }
    const video = videoDoc.data()!;

    const postIds: string[] = [];
    for (const accountId of accountIds) {
      const accountDoc = await db.collection("youtubeAccounts").doc(accountId).get();
      if (!accountDoc.exists) continue;

      const postRef = await db.collection("ugcPosts").add({
        platform: "youtube",
        accountId,
        accountUsername: accountDoc.data()!.channelTitle,
        videoId,
        videoUrl: video.videoUrl,
        title: title || video.title || "Untitled",
        caption: caption || video.caption || "",
        hashtags: hashtags || video.hashtags || [],
        privacyStatus: privacyStatus || "public",
        status: "queued",
        createdAt: new Date().toISOString(),
      });
      postIds.push(postRef.id);
    }

    processPostQueue().catch(console.error);
    res.json({ success: true, data: { postIds, count: postIds.length }, message: `Queued ${postIds.length} YouTube uploads` });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/ugc/youtube/search-channels
router.post("/youtube/search-channels", async (req: Request, res: Response) => {
  try {
    const { query, maxResults = 20 } = req.body as { query: string; maxResults?: number };
    if (!query) { res.status(400).json({ success: false, error: "query required" }); return; }

    const db = getDb();
    const jobRef = db.collection("ugcJobs").doc();
    await jobRef.set({
      type: "youtube_channel_search",
      niche: query,
      platform: "youtube",
      status: "running",
      total: 0,
      found: 0,
      startedAt: new Date().toISOString(),
    });

    res.status(202).json({ success: true, data: { jobId: jobRef.id } });

    (async () => {
      try {
        const channels = await searchYouTubeChannels(query, maxResults);
        const batch = db.batch();
        for (const c of channels) {
          const ref = db.collection("ugcCreators").doc();
          batch.set(ref, { ...c, niche: query, createdAt: new Date().toISOString() });
        }
        if (channels.length) await batch.commit();
        await jobRef.update({ status: "completed", total: channels.length, found: channels.length, completedAt: new Date().toISOString() });
      } catch (err) {
        await jobRef.update({
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          completedAt: new Date().toISOString(),
        });
      }
    })();
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

async function publishYouTubePost(postId: string): Promise<void> {
  const db = getDb();
  const postRef = db.collection("ugcPosts").doc(postId);
  const postDoc = await postRef.get();
  if (!postDoc.exists) return;

  const post = postDoc.data()!;
  const accountDoc = await db.collection("youtubeAccounts").doc(post.accountId as string).get();
  if (!accountDoc.exists) {
    await postRef.update({ status: "failed", error: "YouTube account not found", updatedAt: new Date().toISOString() });
    return;
  }

  const account = accountDoc.data()!;
  const refreshToken = account.refreshToken as string;
  if (!refreshToken?.trim()) {
    await postRef.update({ status: "failed", error: "No OAuth token — click Connect with Google", updatedAt: new Date().toISOString() });
    return;
  }

  await postRef.update({ status: "posting", updatedAt: new Date().toISOString() });

  const result = await uploadVideoToYouTube({
    refreshToken,
    videoUrl: post.videoUrl as string,
    title: (post.title as string) || (post.caption as string) || "Untitled",
    description: post.caption as string,
    tags: post.hashtags as string[],
    privacyStatus: (post.privacyStatus as "public" | "private" | "unlisted") || "public",
  });

  if (result.success) {
    await postRef.update({
      status: "posted",
      youtubeUrl: result.videoUrl || "",
      postedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await db.collection("youtubeAccounts").doc(post.accountId as string).update({
      postsCount: (account.postsCount || 0) + 1,
      updatedAt: new Date().toISOString(),
    });
  } else {
    await postRef.update({
      status: "failed",
      error: result.error || "Upload failed",
      updatedAt: new Date().toISOString(),
    });
  }
}

export default router;
