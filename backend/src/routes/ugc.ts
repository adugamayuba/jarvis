import { Router, Request, Response } from "express";
import { getDb } from "../services/firebase";
import { postVideoToTikTok, searchTikTokCreators, launchTikTokSignup } from "../services/tiktokUgc";

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
    let query = db.collection("ugcCreators").orderBy("followers", "desc").limit(100);
    if (req.query.niche) query = query.where("niche", "==", req.query.niche) as typeof query;
    const snap = await query.get();
    res.json({ success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
