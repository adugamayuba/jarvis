import { Router, Request, Response } from "express";
import OpenAI from "openai";
import { getDb } from "../services/firebase";
import { analyzeApplicationForm, submitApplicationForm, FormField, REELIN_PROFILE } from "../services/browser";
import { matchFormField, APPLICATION_KNOWLEDGE, FORM_FIELD_MAP, validateMapping } from "../data/applicationFields";

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
  "sosv": { name: "SOSV", applyUrl: "https://sosv.com/apply/", website: "https://sosv.com" },
  "sosv indiebio": { name: "SOSV IndieBio", applyUrl: "https://sosv.com/apply/", website: "https://sosv.com" },
  "indiebio": { name: "SOSV IndieBio", applyUrl: "https://sosv.com/apply/", website: "https://sosv.com" },
  "hellos tomorrow": { name: "Hello Tomorrow", applyUrl: "https://sosv.com/apply/", website: "https://sosv.com" },
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
    const { fields, pageTitle, pageText, singleField } = req.body as {
      fields: Array<{
        label: string;
        type: string;
        selector: string;
        required: boolean;
        options?: string[];
        name?: string;
        fieldContext?: string;
        isRetry?: boolean;
      }>;
      pageTitle: string;
      pageText: string;
      singleField?: boolean;
    };

    if (!fields || fields.length === 0) {
      res.status(400).json({ success: false, error: "fields required" });
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      const mappedFields = fields.map(f => ({ ...f, suggestedValue: "" }));
      res.json({ success: true, data: { fields: mappedFields } });
      return;
    }

    const profile = JSON.stringify(REELIN_PROFILE, null, 2);
    const fieldMapKeys = Object.keys(FORM_FIELD_MAP).slice(0, 40).join(", ");

    // Single-field / pick-field retry — focused prompt with surrounding context
    if (singleField || (fields.length === 1 && fields[0].isRetry)) {
      const f = fields[0];
      const preMapped = matchFormField(f.label, f.name, undefined, { fieldIndex: 0, allFields: fields, fieldContext: f.fieldContext });

      const contextBlock = f.fieldContext
        ? `\nSURROUNDING FIELD CONTEXT (question text, hints, instructions near this input):\n${f.fieldContext}\n`
        : "";

      const prompt = `You are filling ONE missed field on an accelerator application for Reelin AI.

REELIN AI PROFILE:
${profile}

${APPLICATION_KNOWLEDGE}

APPROVED FIELD LABELS (use these exact values when labels match):
${fieldMapKeys}

CRITICAL RULES:
- First Name = Abel, Last Name = Adugam (NEVER swap these)
- Company name / organization name = Reelin AI (NEVER a person's name)
- Company website = https://reelin.ai (NOT LinkedIn URLs)
- Founder LinkedIn = Abel https://adugam.com | Ligia https://www.linkedin.com/in/ligia-t-8b4630225/
- Pitch deck link = https://docsend.com/view/raru36axy8gftwb4 (ONLY for deck fields)
- Founder 1: Abel Adugam, Founder & CEO, abel@reelin.ai
- Founder 2: Ligia Tica, Co-founder & Operations, ligia@reelin.ai
- For long textarea questions, use the FULL approved Q&A answers — never shorten or invent
- Video pitch URL fields = leave empty string (no video URL yet)
- Do NOT claim patents exist — we have NO formal patents filed yet
- Deck link = https://docsend.com/view/raru36axy8gftwb4

PAGE: "${pageTitle}"
PAGE CONTEXT: ${(pageText || "").substring(0, 500)}

FIELD TO FILL:
Label: "${f.label}"
Name: "${f.name || ""}"
Type: ${f.type}${f.required ? " (required)" : ""}${f.options?.length ? `\nOptions: [${f.options.join(", ")}]` : ""}
${contextBlock}
Read the label AND surrounding context carefully — accelerator forms often hide the real question in nearby text, not the input label alone.
If label is generic (e.g. "textbox"), use the Context above as the real question.

Respond with JSON: { "value": "your answer here" }
- For radio/select: choose the exact option text from the options list
- For text/textarea: use approved copy verbatim when available
- For checkboxes: return "true" or "false"
- For optional video pitch: return empty string ""`;

      const result = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 2000,
      });

      const json = JSON.parse(result.choices[0].message.content || "{}");
      const aiValue = (json.value ?? json.values?.["0"] ?? "") as string;
      const finalValue = preMapped || aiValue || "";
      const validated = validateMapping(
        `${f.label} ${f.fieldContext || ""}`.toLowerCase(),
        finalValue
      ) ? finalValue : (preMapped || "");

      res.json({
        success: true,
        data: {
          fields: [{
            ...f,
            suggestedValue: validated,
          }],
        },
      });
      return;
    }

    // Deterministic match first — approved copy beats AI guesses
    const preMapped = fields.map((f, i) => {
      return matchFormField(f.label, f.name, undefined, { fieldIndex: i, allFields: fields, fieldContext: f.fieldContext });
    });

    const unmatchedIndices = preMapped
      .map((v, i) => (v ? -1 : i))
      .filter(i => i >= 0);

    if (unmatchedIndices.length === 0) {
      const mappedFields = fields.map((f, i) => ({
        ...f,
        suggestedValue: preMapped[i] || "",
      }));
      res.json({ success: true, data: { fields: mappedFields } });
      return;
    }

    // Map each unmatched field individually — avoids AI mixing answers across fields
    const aiMapped = [...preMapped];
    await Promise.all(unmatchedIndices.map(async (i) => {
      const f = fields[i];
      const contextBlock = f.fieldContext
        ? `\nSURROUNDING FIELD CONTEXT (question text near this input):\n${f.fieldContext}\n`
        : "";

      const prompt = `You are filling ONE field on an accelerator application for Reelin AI.

REELIN AI PROFILE:
${profile}

${APPLICATION_KNOWLEDGE}

CRITICAL RULES:
- Company name → Reelin AI (NEVER a person name)
- Company website → https://reelin.ai (NOT LinkedIn)
- First name → Abel | Last name → Adugam
- Founder 1: Abel Adugam, abel@reelin.ai, LinkedIn https://adugam.com
- Founder 2: Ligia Tica, ligia@reelin.ai, LinkedIn https://www.linkedin.com/in/ligia-t-8b4630225/
- Pitch deck → https://docsend.com/view/raru36axy8gftwb4 ONLY for deck fields
- Video pitch → empty string
- Use FULL approved Q&A verbatim for long textarea questions
- Do NOT claim patents exist

PAGE: "${pageTitle}"

THIS FIELD ONLY:
Label: "${f.label}"
Name: "${f.name || ""}"
Type: ${f.type}${f.options?.length ? `\nOptions: [${f.options.join(", ")}]` : ""}
${contextBlock}
If label is generic ("textbox"), the Context above IS the question. Answer ONLY this field.

Respond with JSON: { "value": "answer" }`;

      try {
        const result = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 2000,
        });
        const json = JSON.parse(result.choices[0].message.content || "{}");
        const aiValue = (json.value ?? "") as string;
        const haystack = `${f.label} ${f.fieldContext || ""} ${f.name || ""}`.toLowerCase();
        const finalValue = preMapped[i] || aiValue || "";
        aiMapped[i] = validateMapping(haystack, finalValue) ? finalValue : (preMapped[i] || "");
      } catch {
        aiMapped[i] = preMapped[i] || "";
      }
    }));

    const mappedFields = fields.map((f, i) => ({
      ...f,
      suggestedValue: aiMapped[i] || "",
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
