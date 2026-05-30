import { Router, Request, Response } from "express";
import OpenAI from "openai";
import { getDb } from "../services/firebase";
import { analyzeApplicationForm, submitApplicationForm, FormField, REELIN_PROFILE } from "../services/browser";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface AppIdParams extends Record<string, string> { id: string }

const router = Router();

// Comprehensive accelerator database
const ACCELERATOR_DB: Record<string, { name: string; applyUrl: string; website: string }> = {
  "y combinator": { name: "Y Combinator", applyUrl: "https://www.ycombinator.com/apply", website: "https://ycombinator.com" },
  "yc": { name: "Y Combinator", applyUrl: "https://www.ycombinator.com/apply", website: "https://ycombinator.com" },
  "ycombinator": { name: "Y Combinator", applyUrl: "https://www.ycombinator.com/apply", website: "https://ycombinator.com" },
  "techstars": { name: "Techstars", applyUrl: "https://www.techstars.com/apply", website: "https://techstars.com" },
  "500 global": { name: "500 Global", applyUrl: "https://500.co/accelerator", website: "https://500.co" },
  "500": { name: "500 Global", applyUrl: "https://500.co/accelerator", website: "https://500.co" },
  "antler": { name: "Antler", applyUrl: "https://www.antler.co/apply", website: "https://antler.co" },
  "seedcamp": { name: "Seedcamp", applyUrl: "https://seedcamp.com/apply/", website: "https://seedcamp.com" },
  "plug and play": { name: "Plug and Play", applyUrl: "https://www.plugandplaytechcenter.com/apply/", website: "https://plugandplaytechcenter.com" },
  "pnp": { name: "Plug and Play", applyUrl: "https://www.plugandplaytechcenter.com/apply/", website: "https://plugandplaytechcenter.com" },
  "masschallenge": { name: "MassChallenge", applyUrl: "https://masschallenge.org/apply", website: "https://masschallenge.org" },
  "founder institute": { name: "Founder Institute", applyUrl: "https://fi.co/apply", website: "https://fi.co" },
  "fi": { name: "Founder Institute", applyUrl: "https://fi.co/apply", website: "https://fi.co" },
  "a16z": { name: "a16z Speedrun", applyUrl: "https://speedrun.a16z.com/apply", website: "https://a16z.com" },
  "a16z speedrun": { name: "a16z Speedrun", applyUrl: "https://speedrun.a16z.com/apply", website: "https://a16z.com" },
  "andreessen horowitz": { name: "a16z Speedrun", applyUrl: "https://speedrun.a16z.com/apply", website: "https://a16z.com" },
  "sequoia arc": { name: "Sequoia Arc", applyUrl: "https://arc.sequoiacap.com/apply", website: "https://sequoiacap.com" },
  "sequoia": { name: "Sequoia Arc", applyUrl: "https://arc.sequoiacap.com/apply", website: "https://sequoiacap.com" },
  "soma capital": { name: "Soma Capital", applyUrl: "https://somacap.com/apply", website: "https://somacap.com" },
  "soma": { name: "Soma Capital", applyUrl: "https://somacap.com/apply", website: "https://somacap.com" },
  "pioneer": { name: "Pioneer", applyUrl: "https://pioneer.app/apply", website: "https://pioneer.app" },
  "neo": { name: "Neo", applyUrl: "https://neo.com/apply", website: "https://neo.com" },
  "hf0": { name: "HF0", applyUrl: "https://www.hf0.com/apply", website: "https://hf0.com" },
  "residency": { name: "HF0 Residency", applyUrl: "https://www.hf0.com/apply", website: "https://hf0.com" },
  "ai grant": { name: "AI Grant", applyUrl: "https://aigrant.com/apply", website: "https://aigrant.com" },
  "entrepreneur first": { name: "Entrepreneur First", applyUrl: "https://www.joinef.com/apply", website: "https://joinef.com" },
  "ef": { name: "Entrepreneur First", applyUrl: "https://www.joinef.com/apply", website: "https://joinef.com" },
  "lsvp": { name: "Lightspeed", applyUrl: "https://lsvp.com/ignite", website: "https://lsvp.com" },
  "lightspeed": { name: "Lightspeed Ignite", applyUrl: "https://lsvp.com/ignite", website: "https://lsvp.com" },
  "betaworks": { name: "Betaworks", applyUrl: "https://betaworks.com/camps", website: "https://betaworks.com" },
  "dreamit": { name: "Dreamit Ventures", applyUrl: "https://www.dreamit.com/apply", website: "https://dreamit.com" },
  "startx": { name: "StartX", applyUrl: "https://startx.com/apply", website: "https://startx.com" },
  "nyu": { name: "NYU Endless Frontier Labs", applyUrl: "https://endlessfrontierlabs.com/apply/", website: "https://endlessfrontierlabs.com" },
  "nvidia inception": { name: "NVIDIA Inception", applyUrl: "https://www.nvidia.com/en-us/startups/", website: "https://nvidia.com" },
  "nvidia": { name: "NVIDIA Inception", applyUrl: "https://www.nvidia.com/en-us/startups/", website: "https://nvidia.com" },
  "microsoft for startups": { name: "Microsoft for Startups", applyUrl: "https://www.microsoft.com/en-us/startups", website: "https://microsoft.com" },
  "aws activate": { name: "AWS Activate", applyUrl: "https://aws.amazon.com/activate/", website: "https://aws.amazon.com" },
  "google for startups": { name: "Google for Startups", applyUrl: "https://startup.google.com/programs/accelerator/", website: "https://startup.google.com" },
};

function resolveInput(input: string): { url: string; name: string } | null {
  const trimmed = input.trim();

  // Already a URL
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return { url: trimmed, name: "" };
  }

  // Try exact match first (lowercase)
  const key = trimmed.toLowerCase();
  const match = ACCELERATOR_DB[key];
  if (match) return { url: match.applyUrl, name: match.name };

  // Partial match
  for (const [k, v] of Object.entries(ACCELERATOR_DB)) {
    if (k.includes(key) || key.includes(k)) {
      return { url: v.applyUrl, name: v.name };
    }
  }

  return null;
}

// GET /api/applications/lookup?q=techstars — resolve name to URL
router.get("/lookup", (req: Request, res: Response) => {
  const q = (req.query.q as string || "").trim();
  if (!q) { res.status(400).json({ success: false, error: "q required" }); return; }

  const result = resolveInput(q);
  if (result) {
    res.json({ success: true, data: result });
  } else {
    // Return all known accelerators as suggestions
    const suggestions = Object.values(ACCELERATOR_DB)
      .filter((v, i, self) => self.findIndex(x => x.name === v.name) === i) // dedupe
      .map(v => ({ name: v.name, url: v.applyUrl }));
    res.json({ success: false, error: "Not found", data: { suggestions } });
  }
});

// GET /api/applications/accelerators — list all known accelerators
router.get("/accelerators", (_req: Request, res: Response) => {
  const list = Object.values(ACCELERATOR_DB)
    .filter((v, i, self) => self.findIndex(x => x.name === v.name) === i)
    .map(v => ({ name: v.name, url: v.applyUrl, website: v.website }));
  res.json({ success: true, data: list });
});

// GET /api/applications/profile — return Reelin AI profile for extension
router.get("/profile", (_req: Request, res: Response) => {
  res.json({ success: true, data: REELIN_PROFILE });
});

// POST /api/applications/map-fields — used by Chrome extension to AI-map fields
router.post("/map-fields", async (req: Request, res: Response) => {
  try {
    const { fields, pageTitle, pageText } = req.body as {
      fields: Array<{ label: string; type: string; selector: string; required: boolean; options?: string[]; name?: string }>;
      pageTitle: string;
      pageText: string;
    };

    if (!fields || fields.length === 0) {
      res.status(400).json({ success: false, error: "fields required" });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      // Return fields without AI mapping if no API key
      const mappedFields = fields.map(f => ({ ...f, suggestedValue: "" }));
      res.json({ success: true, data: { fields: mappedFields } });
      return;
    }

    const profile = JSON.stringify(REELIN_PROFILE, null, 2);

    // Batch map all fields in one OpenAI call
    const fieldDescriptions = fields.map((f, i) =>
      `${i}. Label: "${f.label}" | Type: ${f.type}${f.options?.length ? ` | Options: [${f.options.join(", ")}]` : ""}`
    ).join("\n");

    const prompt = `You are filling out an accelerator application for Reelin AI.

REELIN AI PROFILE:
${profile}

PAGE: "${pageTitle}"
CONTEXT: ${pageText.substring(0, 500)}

FORM FIELDS:
${fieldDescriptions}

For each field (0 to ${fields.length - 1}), provide the best value to fill in.
- For radio/select: choose the exact option text from the options list
- For text: write concise, compelling answers using the profile
- For checkboxes: return "true" or "false"

Respond with JSON: { "values": ["value0", "value1", ...] }`;

    const result = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const json = JSON.parse(result.choices[0].message.content || "{}");
    const values: string[] = json.values || [];

    const mappedFields = fields.map((f, i) => ({
      ...f,
      suggestedValue: values[i] || "",
    }));

    res.json({ success: true, data: { fields: mappedFields } });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

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
