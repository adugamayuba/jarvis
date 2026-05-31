import { getDb } from "./firebase";
import { getTrainingInsights, getTrainingKnowledgeText, REELIN_COMPANY } from "../data/trainingData";

const TRAINING_DOC_ID = "reelin-application-qa-2026";

/** Upsert verified Q&A as a learned document in Firestore */
export async function seedTrainingKnowledge(): Promise<void> {
  try {
    const db = getDb();
    const ref = db.collection("learnedDocuments").doc(TRAINING_DOC_ID);
    const existing = await ref.get();

    const payload = {
      filename: "Reelin AI Application Q&A.txt",
      summary: `Verified accelerator application Q&A for ${REELIN_COMPANY.name} — problem, tech, team, GTM, funding, and pitch answers.`,
      insights: getTrainingInsights(),
      rawTextLength: getTrainingKnowledgeText().length,
      rawTextPreview: getTrainingKnowledgeText().substring(0, 2000),
      uploadedAt: existing.exists
        ? existing.data()?.uploadedAt || new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mimeType: "text/plain",
      sizeBytes: getTrainingKnowledgeText().length,
      source: "application-qa",
    };

    await ref.set(payload, { merge: true });
    console.log(`✅ Application Q&A training data ${existing.exists ? "updated" : "seeded"}`);
  } catch (err) {
    console.warn("⚠️  Could not seed training knowledge:", (err as Error).message);
  }
}
