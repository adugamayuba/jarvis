import * as admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

let db: admin.firestore.Firestore;

export function initFirebase() {
  if (admin.apps.length > 0) {
    db = admin.firestore();
    return;
  }

  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });

  db = admin.firestore();
  console.log("✅ Firebase initialized");
}

export function getDb() {
  if (!db) {
    throw new Error("Firebase not initialized. Call initFirebase() first.");
  }
  return db;
}

export const COLLECTIONS = {
  CONTACTS: "contacts",
  CAMPAIGNS: "campaigns",
  SCRAPE_JOBS: "scrapeJobs",
} as const;
