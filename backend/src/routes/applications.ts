import { Router, Request, Response } from "express";
import { getDb } from "../services/firebase";
import { analyzeApplicationForm, submitApplicationForm, FormField } from "../services/browser";

interface AppIdParams extends Record<string, string> { id: string }

const router = Router();

// POST /api/applications/analyze — analyze a form and return field preview
router.post("/analyze", async (req: Request, res: Response) => {
  const { url } = req.body as { url: string };
  if (!url) { res.status(400).json({ success: false, error: "url required" }); return; }

  try {
    const preview = await analyzeApplicationForm(url);
    res.json({ success: true, data: preview });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/applications/submit — fill + submit a form
router.post("/submit", async (req: Request, res: Response) => {
  const { url, fields, dryRun, applicationId } = req.body as {
    url: string;
    fields: Array<{ selector: string; value: string; type: string }>;
    dryRun?: boolean;
    applicationId?: string;
  };

  if (!url || !fields) {
    res.status(400).json({ success: false, error: "url and fields required" });
    return;
  }

  try {
    const result = await submitApplicationForm(url, fields, dryRun ?? false);

    // Save to Firestore if this is a real submission
    if (!dryRun && applicationId) {
      const db = getDb();
      await db.collection("applications").doc(applicationId).update({
        status: result.success ? "submitted" : "filled",
        submittedAt: new Date().toISOString(),
        screenshot: result.screenshot,
        message: result.message,
      });
    }

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/applications — save a new application
router.post("/", async (req: Request, res: Response) => {
  try {
    const { url, name, deadline, notes, fields } = req.body as {
      url: string;
      name: string;
      deadline?: string;
      notes?: string;
      fields?: FormField[];
    };

    const db = getDb();
    const ref = await db.collection("applications").add({
      url,
      name,
      deadline: deadline || null,
      notes: notes || "",
      fields: fields || [],
      status: "draft",
      createdAt: new Date().toISOString(),
    });

    res.json({ success: true, data: { id: ref.id } });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/applications — list all
router.get("/", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection("applications").orderBy("createdAt", "desc").limit(100).get();
    res.json({ success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// PATCH /api/applications/:id — update
router.patch("/:id", async (req: Request<AppIdParams>, res: Response) => {
  try {
    const db = getDb();
    await db.collection("applications").doc(req.params.id).update({
      ...req.body as Record<string, unknown>,
      updatedAt: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// DELETE /api/applications/:id
router.delete("/:id", async (req: Request<AppIdParams>, res: Response) => {
  try {
    const db = getDb();
    await db.collection("applications").doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
