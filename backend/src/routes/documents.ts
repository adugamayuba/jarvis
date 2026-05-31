import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import OpenAI from "openai";
import { getDb } from "../services/firebase";

// pdf-parse has no proper ESM types — use require
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;

const router = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Store files in memory (Railway has ephemeral disk, we save to Firestore instead)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "text/plain"];
    if (allowed.includes(file.mimetype) || file.originalname.endsWith(".pdf") || file.originalname.endsWith(".txt")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and TXT files are supported"));
    }
  },
});

interface ExtractedInsight {
  category: string;
  content: string;
}

async function extractInsights(text: string, filename: string): Promise<ExtractedInsight[]> {
  if (!process.env.OPENAI_API_KEY) return [];

  const prompt = `You are analyzing a document for Reelin AI — an autonomous AI social network founded by Abel Adugam.

Document: "${filename}"

Content (first 8000 chars):
${text.substring(0, 8000)}

Extract ALL key information that could be useful for:
1. Filling out accelerator applications
2. Responding to investor questions  
3. Describing the company, product, team, traction, market

Return a JSON array of insights:
{
  "insights": [
    { "category": "product", "content": "..." },
    { "category": "traction", "content": "..." },
    { "category": "team", "content": "..." },
    { "category": "market", "content": "..." },
    { "category": "financials", "content": "..." },
    { "category": "pitch", "content": "..." }
  ]
}

Only include categories that have real data. Be specific and preserve exact numbers/metrics.`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: 2000,
  });

  const json = JSON.parse(res.choices[0].message.content || "{}");
  return json.insights || [];
}

async function buildSummary(text: string, filename: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return text.substring(0, 500);

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{
      role: "user",
      content: `Summarize this document in 2-3 sentences. Document: "${filename}"\n\n${text.substring(0, 3000)}`
    }],
    max_tokens: 200,
  });

  return res.choices[0].message.content || "";
}

// POST /api/documents/upload
router.post("/upload", (req: Request, res: Response, next: NextFunction) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      const message = err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
        ? "File too large — max 20MB"
        : err.message;
      res.status(400).json({ success: false, error: message });
      return;
    }
    next();
  });
}, async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: "No file uploaded" });
      return;
    }

    const db = getDb();
    const filename = req.file.originalname;
    let rawText = "";

    // Parse PDF or read TXT
    if (req.file.mimetype === "application/pdf" || filename.endsWith(".pdf")) {
      const parsed = await pdfParse(req.file.buffer);
      rawText = parsed.text;
    } else {
      rawText = req.file.buffer.toString("utf-8");
    }

    if (!rawText.trim()) {
      res.status(400).json({ success: false, error: "Could not extract text from file" });
      return;
    }

    console.log(`Parsed "${filename}": ${rawText.length} chars`);

    // Extract insights and summary in parallel
    const [insights, summary] = await Promise.all([
      extractInsights(rawText, filename),
      buildSummary(rawText, filename),
    ]);

    // Save to Firestore
    const docRef = await db.collection("learnedDocuments").add({
      filename,
      summary,
      insights,
      rawTextLength: rawText.length,
      rawTextPreview: rawText.substring(0, 1000),
      uploadedAt: new Date().toISOString(),
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    });

    console.log(`Saved document "${filename}" with ${insights.length} insights`);

    res.json({
      success: true,
      data: {
        id: docRef.id,
        filename,
        summary,
        insights,
        charCount: rawText.length,
      },
      message: `Parsed ${rawText.length.toLocaleString()} characters, extracted ${insights.length} insights`,
    });
  } catch (err) {
    console.error("Document upload error:", err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/documents — list all uploaded documents
router.get("/", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection("learnedDocuments").orderBy("uploadedAt", "desc").limit(50).get();
    const docs = snap.docs.map(d => ({
      id: d.id,
      filename: d.data().filename,
      summary: d.data().summary,
      insights: d.data().insights,
      charCount: d.data().rawTextLength,
      uploadedAt: d.data().uploadedAt,
      sizeBytes: d.data().sizeBytes,
    }));
    res.json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/documents/context — get all insights as a combined context string (used by AI)
router.get("/context", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection("learnedDocuments").orderBy("uploadedAt", "desc").limit(20).get();

    const contextParts: string[] = [];
    for (const doc of snap.docs) {
      const d = doc.data();
      const insightLines = (d.insights as ExtractedInsight[] || [])
        .map(i => `  [${i.category}] ${i.content}`)
        .join("\n");
      contextParts.push(`--- ${d.filename} ---\n${insightLines}`);
    }

    res.json({ success: true, data: { context: contextParts.join("\n\n") } });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// DELETE /api/documents/:id
router.delete("/:id", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const db = getDb();
    await db.collection("learnedDocuments").doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
