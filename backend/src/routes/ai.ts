import { Router, Request, Response } from "express";

interface IdParams extends Record<string, string> { id: string }
import { z } from "zod";
import { chat, listConversations, getConversation, ABEL_PROFILE, research } from "../services/ai";
import { getDb, COLLECTIONS } from "../services/firebase";

const router = Router();

const ChatSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
});

// POST /api/ai/chat
router.post("/chat", async (req: Request, res: Response) => {
  try {
    const parsed = ChatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues.map(e => e.message).join(", ") });
      return;
    }

    const { message, conversationId } = parsed.data;
    const result = await chat(message, conversationId);
    res.json({ success: true, data: result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/ai/conversations
router.get("/conversations", async (_req: Request, res: Response) => {
  try {
    const conversations = await listConversations();
    res.json({ success: true, data: conversations });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/ai/conversations/:id
router.get("/conversations/:id", async (req: Request<IdParams>, res: Response) => {
  try {
    const conv = await getConversation(req.params.id);
    if (!conv) { res.status(404).json({ success: false, error: "Not found" }); return; }
    res.json({ success: true, data: conv });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: msg });
  }
});

// DELETE /api/ai/conversations/:id
router.delete("/conversations/:id", async (req: Request<IdParams>, res: Response) => {
  try {
    await getDb().collection(COLLECTIONS.CONVERSATIONS).doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: msg });
  }
});

// GET /api/ai/profile — Abel's profile
router.get("/profile", async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: { profile: ABEL_PROFILE } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: msg });
  }
});

// POST /api/ai/research
router.post("/research", async (req: Request, res: Response) => {
  try {
    const { query } = req.body as { query: string };
    if (!query) { res.status(400).json({ success: false, error: "query required" }); return; }
    const result = await research(query);
    res.json({ success: true, data: { result } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: msg });
  }
});

export default router;
