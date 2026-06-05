import * as admin from "firebase-admin";
import { getDb, COLLECTIONS } from "../services/firebase";

export type OutreachAudience =
  | "investor"
  | "journalist"
  | "swiftdroom-b2c"
  | "swiftdroom-b2b";

export const OUTREACH_AUDIENCES: OutreachAudience[] = [
  "investor",
  "journalist",
  "swiftdroom-b2c",
  "swiftdroom-b2b",
];

const AUDIENCE_TAG: Record<OutreachAudience, string> = {
  investor: "audience:investor",
  journalist: "audience:journalist",
  "swiftdroom-b2c": "swiftdroom-b2c",
  "swiftdroom-b2b": "swiftdroom-b2b",
};

export function isOutreachAudience(value: unknown): value is OutreachAudience {
  return typeof value === "string" && OUTREACH_AUDIENCES.includes(value as OutreachAudience);
}

/** Infer audience from explicit field, legacy tags, or scrape source. */
export function inferAudience(data: Record<string, unknown>): OutreachAudience {
  if (isOutreachAudience(data.audience)) return data.audience;

  const tags = (data.tags as string[] | undefined) || [];

  if (
    tags.includes("swiftdroom-b2b") ||
    tags.includes("swiftdroom-partner") ||
    tags.includes("swiftdroom-institution")
  ) {
    return "swiftdroom-b2b";
  }
  if (tags.includes("swiftdroom-b2c") || tags.includes("swiftdroom-user")) {
    return "swiftdroom-b2c";
  }
  if (data.source === "techcrunch" || tags.includes("journalist")) {
    return "journalist";
  }

  return "investor";
}

export function audienceFromScrapeSource(source: string): OutreachAudience {
  if (source === "techcrunch") return "journalist";
  return "investor";
}

export function matchesOutreachAudience(
  data: Record<string, unknown>,
  audience: string
): boolean {
  if (!isOutreachAudience(audience)) return false;
  return inferAudience(data) === audience;
}

export function mergeAudienceTags(
  audience: OutreachAudience,
  existingTags: string[] = []
): string[] {
  const canonical = AUDIENCE_TAG[audience];
  const stripped = existingTags.filter(
    t =>
      !t.startsWith("audience:") &&
      t !== "swiftdroom-b2c" &&
      t !== "swiftdroom-b2b" &&
      t !== "swiftdroom-user" &&
      t !== "swiftdroom-partner" &&
      t !== "swiftdroom-institution" &&
      t !== "journalist"
  );
  const extras =
    audience === "journalist" && !stripped.includes("journalist")
      ? ["journalist"]
      : [];
  return [...new Set([...stripped, canonical, ...extras])];
}

export function applyAudienceToPayload(
  payload: Record<string, unknown>,
  audience: OutreachAudience
): Record<string, unknown> {
  const tags = mergeAudienceTags(audience, (payload.tags as string[] | undefined) || []);
  return { ...payload, audience, tags };
}

export function audienceConflictMessage(
  existing: OutreachAudience,
  incoming: OutreachAudience,
  email?: string
): string {
  const who = email ? ` (${email})` : "";
  return `Contact${who} already belongs to "${existing}" outreach — cannot save as "${incoming}"`;
}

export async function findContactDocByEmail(
  db: admin.firestore.Firestore,
  email: string
): Promise<admin.firestore.QueryDocumentSnapshot | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return null;

  const byPrimary = await db
    .collection(COLLECTIONS.CONTACTS)
    .where("email", "==", normalized)
    .limit(1)
    .get();
  if (!byPrimary.empty) return byPrimary.docs[0];

  const byEmailsArray = await db
    .collection(COLLECTIONS.CONTACTS)
    .where("emails", "array-contains", normalized)
    .limit(1)
    .get();
  if (!byEmailsArray.empty) return byEmailsArray.docs[0];

  return null;
}

export type UpsertContactResult =
  | { action: "created"; id: string }
  | { action: "updated"; id: string }
  | { action: "skipped_conflict"; reason: string; existingId?: string };

/** Save or merge a contact while enforcing a single outreach audience per email. */
export async function upsertContactWithAudience(
  db: admin.firestore.Firestore,
  opts: {
    docId?: string;
    payload: Record<string, unknown>;
    audience: OutreachAudience;
    primaryEmail?: string;
  }
): Promise<UpsertContactResult> {
  const now = new Date().toISOString();
  const email =
    (opts.primaryEmail || (opts.payload.email as string) || "").trim().toLowerCase();

  let targetRef: admin.firestore.DocumentReference | null = null;
  let existingData: Record<string, unknown> | null = null;

  if (opts.docId) {
    const ref = db.collection(COLLECTIONS.CONTACTS).doc(opts.docId);
    const snap = await ref.get();
    if (snap.exists) {
      targetRef = ref;
      existingData = snap.data() as Record<string, unknown>;
    } else {
      targetRef = ref;
    }
  }

  if (!targetRef && email.includes("@")) {
    const byEmail = await findContactDocByEmail(db, email);
    if (byEmail) {
      targetRef = byEmail.ref;
      existingData = byEmail.data() as Record<string, unknown>;
    }
  }

  if (!targetRef) {
    targetRef = opts.docId
      ? db.collection(COLLECTIONS.CONTACTS).doc(opts.docId)
      : db.collection(COLLECTIONS.CONTACTS).doc();
  }

  if (existingData) {
    const existingAudience = inferAudience(existingData);
    if (existingAudience !== opts.audience) {
      return {
        action: "skipped_conflict",
        reason: audienceConflictMessage(existingAudience, opts.audience, email),
        existingId: targetRef.id,
      };
    }
  }

  const base: Record<string, unknown> = {
    ...opts.payload,
    updatedAt: now,
  };
  if (!existingData) {
    base.createdAt = now;
    if (base.emailSent === undefined) base.emailSent = false;
  }

  const finalPayload = applyAudienceToPayload(base, opts.audience);
  await targetRef.set(finalPayload, { merge: true });

  return {
    action: existingData ? "updated" : "created",
    id: targetRef.id,
  };
}

/** Backfill audience field on contacts missing it (in-memory batch updates). */
export async function backfillContactAudiences(
  db: admin.firestore.Firestore,
  maxDocs = 20000
): Promise<{ scanned: number; updated: number }> {
  let updated = 0;
  let scanned = 0;
  let lastId: string | null = null;
  const pageSize = 400;

  while (scanned < maxDocs) {
    let query: admin.firestore.Query = db
      .collection(COLLECTIONS.CONTACTS)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(pageSize);
    if (lastId) query = query.startAfter(lastId);

    const snap = await query.get();
    if (snap.empty) break;

    const batch = db.batch();
    let batchCount = 0;

    for (const doc of snap.docs) {
      scanned++;
      const data = doc.data() as Record<string, unknown>;
      const inferred = inferAudience(data);
      const tags = (data.tags as string[] | undefined) || [];
      if (data.audience === inferred && tags.includes(AUDIENCE_TAG[inferred])) {
        continue;
      }
      const patched = applyAudienceToPayload({ ...data }, inferred);
      batch.update(doc.ref, {
        audience: patched.audience,
        tags: patched.tags,
        updatedAt: new Date().toISOString(),
      });
      batchCount++;
      updated++;
    }

    if (batchCount > 0) await batch.commit();
    lastId = snap.docs[snap.docs.length - 1].id;
    if (snap.docs.length < pageSize) break;
  }

  return { scanned, updated };
}
