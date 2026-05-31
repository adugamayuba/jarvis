import { getDb } from "./firebase";
import { getSosvInsights, getSosvKnowledgeText, SOSV_APPLICATION_FORM } from "../data/sosvApplication";

const SOSV_DOC_ID = "sosv-application-2026";

/** Upsert SOSV application as a learned document in Firestore */
export async function seedSosvKnowledge(): Promise<void> {
  try {
    const db = getDb();
    const ref = db.collection("learnedDocuments").doc(SOSV_DOC_ID);
    const existing = await ref.get();

    const payload = {
      filename: "SOSV Application (May 2026).txt",
      summary: `Verified SOSV accelerator application for ${SOSV_APPLICATION_FORM.company.name} — contact ${SOSV_APPLICATION_FORM.contact.email}, program: ${SOSV_APPLICATION_FORM.answers.sosvProgram}.`,
      insights: getSosvInsights(),
      rawTextLength: getSosvKnowledgeText().length,
      rawTextPreview: getSosvKnowledgeText().substring(0, 2000),
      uploadedAt: existing.exists
        ? existing.data()?.uploadedAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mimeType: "text/plain",
      sizeBytes: getSosvKnowledgeText().length,
      source: "sosv-application",
    };

    await ref.set(payload, { merge: true });
    console.log(`✅ SOSV application knowledge ${existing.exists ? "updated" : "seeded"}`);
  } catch (err) {
    console.warn("⚠️  Could not seed SOSV knowledge:", (err as Error).message);
  }
}
