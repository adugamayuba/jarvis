import fs from "fs";
import path from "path";
import { initFirebase, getDb, COLLECTIONS } from "../src/services/firebase";

const WIRE_DOCS = [
  {
    id: "wire-reelin-checking",
    filename: "reelin-ai-inc_Wire-Details-Checking-9997.pdf",
    title: "Reelin AI Inc. — Wire Details (Checking)",
    description: "Official wire transfer instructions for Reelin AI Inc. checking account.",
  },
  {
    id: "wire-mercury-bank-letter",
    filename: "mercury-bank-letter-9997.pdf",
    title: "Mercury Bank Letter",
    description: "Bank verification letter for Reelin AI Inc.",
  },
  {
    id: "wire-instructions",
    filename: "download.pdf",
    title: "Wire Transfer Instructions",
    description: "Additional wire transfer documentation for Reelin AI Inc.",
  },
] as const;

async function seedWireDocuments() {
  initFirebase();
  const db = getDb();
  const now = new Date().toISOString();
  const wireDir = process.env.WIRE_DOCS_DIR || path.resolve(__dirname, "../../documents/wire");

  for (const doc of WIRE_DOCS) {
    const filePath = path.join(wireDir, doc.filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  Missing file: ${filePath}`);
      continue;
    }

    const buffer = fs.readFileSync(filePath);
    const ref = db.collection(COLLECTIONS.DATA_ROOM).doc(doc.id);

    await ref.set({
      title: doc.title,
      description: doc.description,
      category: "wire",
      visibility: "all",
      allowedPortalUserIds: [],
      documentBase64: buffer.toString("base64"),
      documentMimeType: "application/pdf",
      sizeBytes: buffer.length,
      uploadedAt: now,
      updatedAt: now,
    }, { merge: true });

    console.log(`✅ Uploaded ${doc.title} (${(buffer.length / 1024).toFixed(1)} KB)`);
  }

  console.log("✅ Wire documents seeded to investor portal");
}

seedWireDocuments().catch((err) => {
  console.error("❌ Wire seed failed:", err);
  process.exit(1);
});
