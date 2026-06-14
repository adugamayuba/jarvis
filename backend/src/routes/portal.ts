import { Router, Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { getDb, COLLECTIONS } from "../services/firebase";
import { requireAuth, requireRole } from "../middleware/auth";
import { hashPassword, generatePassword } from "../lib/password";
import {
  notifyFireAndForget,
  emailNewPortalUser,
  emailStageChange,
  emailCapTableChange,
  emailSafeUpdate,
  emailDataRoomUpdate,
  resolveInvestorEmail,
} from "../services/portalEmail";
import type {
  CapTableEntry,
  DataRoomDocument,
  InvestorSafe,
  PortalStage,
} from "../types/portal";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

interface IdParams extends Record<string, string> { id: string }

const PortalUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  name: z.string().min(1),
  company: z.string().optional().default(""),
  investorId: z.string().optional().default(""),
  stage: z.enum(["prospect", "discussing", "safe_sent", "safe_signed", "closed"]).default("discussing"),
  lastConversation: z.string().optional().default(""),
  investmentAmount: z.number().optional().default(0),
  active: z.boolean().optional().default(true),
});

const CapTableSchema = z.object({
  holderName: z.string().min(1),
  holderType: z.enum(["founder", "investor", "advisor", "option_pool", "parent", "other"]).default("investor"),
  company: z.string().optional().default(""),
  email: z.string().optional().default(""),
  portalUserId: z.string().optional().default(""),
  ownershipPct: z.number().optional().default(0),
  shares: z.number().optional().default(0),
  sharesLabel: z.string().optional().default(""),
  investmentAmount: z.number().optional().default(0),
  instrument: z.enum(["common", "preferred", "safe", "convertible_note", "options"]).default("safe"),
  status: z.enum(["active", "pending", "discussing"]).default("pending"),
  visible: z.boolean().optional().default(true),
  notes: z.string().optional().default(""),
  description: z.string().optional().default(""),
  sortOrder: z.number().optional().default(0),
  profileImageUrl: z.string().optional().default(""),
  valuationAtInvestment: z.number().optional().default(0),
  websiteUrl: z.string().optional().default(""),
});

const SafeSchema = z.object({
  portalUserId: z.string().min(1),
  investorName: z.string().min(1),
  amount: z.number().min(0),
  valuationCap: z.number().optional(),
  discount: z.number().optional(),
  status: z.enum(["draft", "sent", "signed", "funded"]).default("sent"),
  signedAt: z.string().optional().default(""),
  safeNotes: z.string().optional().default(""),
  documentTitle: z.string().optional().default(""),
  documentUrl: z.string().optional().default(""),
});

const DataRoomSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  category: z.enum(["financials", "legal", "product", "pitch", "other"]).default("other"),
  visibility: z.enum(["all", "specific"]).default("all"),
  allowedPortalUserIds: z.array(z.string()).optional().default([]),
  documentUrl: z.string().optional().default(""),
});

function stripPassword(user: Record<string, unknown>) {
  const { passwordHash, ...rest } = user;
  return rest;
}

function canAccessDoc(doc: DataRoomDocument, portalUserId: string): boolean {
  if (doc.visibility === "all") return true;
  return (doc.allowedPortalUserIds || []).includes(portalUserId);
}

function publicCapEntry(entry: CapTableEntry & { id: string }) {
  return {
    id: entry.id,
    holderName: entry.holderName,
    holderType: entry.holderType,
    company: entry.company || "",
    profileImageUrl: entry.profileImageUrl || "",
    ownershipPct: entry.ownershipPct || 0,
    shares: entry.shares || 0,
    sharesLabel: entry.sharesLabel || "",
    investmentAmount: entry.investmentAmount || 0,
    valuationAtInvestment: entry.valuationAtInvestment || 0,
    instrument: entry.instrument,
    status: entry.status,
    notes: entry.notes || "",
    description: entry.description || "",
    websiteUrl: entry.websiteUrl || "",
  };
}

function mapCapTableEntries(
  docs: Array<{ id: string; data: () => FirebaseFirestore.DocumentData }>
): ReturnType<typeof publicCapEntry>[] {
  return docs
    .map(d => ({ id: d.id, ...(d.data() as CapTableEntry) }))
    .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99))
    .map(publicCapEntry);
}

// ── Investor routes ───────────────────────────────────────────────────────────

router.get("/dashboard", requireRole("investor"), async (req: Request, res: Response) => {
  try {
    const portalUserId = req.auth!.portalUserId!;
    const db = getDb();

    const userDoc = await db.collection(COLLECTIONS.PORTAL_USERS).doc(portalUserId).get();
    if (!userDoc.exists) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }
    const user = userDoc.data()!;

    const safeSnap = await db.collection(COLLECTIONS.INVESTOR_SAFES)
      .where("portalUserId", "==", portalUserId)
      .limit(1)
      .get();

    const capSnap = await db.collection(COLLECTIONS.CAP_TABLE)
      .where("visible", "==", true)
      .get();

    const dataRoomSnap = await db.collection(COLLECTIONS.DATA_ROOM)
      .orderBy("uploadedAt", "desc")
      .get();

    const safe = safeSnap.empty ? null : { id: safeSnap.docs[0].id, ...(safeSnap.docs[0].data() as InvestorSafe) };
    const capTable = mapCapTableEntries(capSnap.docs);

    const dataRoom = dataRoomSnap.docs
      .map(d => ({ id: d.id, ...(d.data() as DataRoomDocument) }))
      .filter(doc => canAccessDoc(doc, portalUserId))
      .map(({ documentBase64, ...rest }) => rest);

    res.json({
      success: true,
      data: {
        profile: {
          name: user.name,
          email: user.email,
          company: user.company || "",
          stage: user.stage as PortalStage,
          lastConversation: user.lastConversation || "",
          investmentAmount: user.investmentAmount || 0,
        },
        safe: safe ? {
          id: safe.id,
          amount: safe.amount,
          valuationCap: safe.valuationCap,
          discount: safe.discount,
          status: safe.status,
          signedAt: safe.signedAt,
          safeNotes: safe.safeNotes,
          documentTitle: safe.documentTitle,
          documentUrl: safe.documentUrl,
          hasDocument: !!(safe.documentUrl || safe.documentBase64),
        } : null,
        capTable,
        dataRoomCount: dataRoom.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.get("/cap-table", requireRole("investor"), async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.CAP_TABLE).where("visible", "==", true).get();
    const entries = mapCapTableEntries(snap.docs);
    res.json({ success: true, data: entries });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.get("/my-safe", requireRole("investor"), async (req: Request, res: Response) => {
  try {
    const portalUserId = req.auth!.portalUserId!;
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.INVESTOR_SAFES)
      .where("portalUserId", "==", portalUserId)
      .limit(1)
      .get();

    if (snap.empty) {
      res.json({ success: true, data: null });
      return;
    }

    const doc = snap.docs[0];
    const safe = doc.data() as InvestorSafe;
    res.json({
      success: true,
      data: {
        id: doc.id,
        amount: safe.amount,
        valuationCap: safe.valuationCap,
        discount: safe.discount,
        status: safe.status,
        signedAt: safe.signedAt,
        safeNotes: safe.safeNotes,
        documentTitle: safe.documentTitle,
        documentUrl: safe.documentUrl,
        hasDocument: !!(safe.documentUrl || safe.documentBase64),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.get("/data-room", requireRole("investor"), async (req: Request, res: Response) => {
  try {
    const portalUserId = req.auth!.portalUserId!;
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.DATA_ROOM).orderBy("uploadedAt", "desc").get();
    const docs = snap.docs
      .map(d => ({ id: d.id, ...(d.data() as DataRoomDocument) }))
      .filter(doc => canAccessDoc(doc, portalUserId))
      .map(doc => {
        const hasFile = !!(doc.documentUrl || doc.documentBase64);
        const { documentBase64: _b64, ...rest } = doc;
        return { ...rest, hasFile };
      });
    res.json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.get("/data-room/:id/file", requireRole("investor"), async (req: Request<IdParams>, res: Response) => {
  try {
    const portalUserId = req.auth!.portalUserId!;
    const db = getDb();
    const doc = await db.collection(COLLECTIONS.DATA_ROOM).doc(req.params.id).get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    const data = doc.data() as DataRoomDocument;
    if (!canAccessDoc(data, portalUserId)) {
      res.status(403).json({ success: false, error: "Access denied" });
      return;
    }
    if (data.documentUrl) {
      res.json({ success: true, data: { type: "url", url: data.documentUrl, title: data.title } });
      return;
    }
    if (data.documentBase64) {
      res.json({
        success: true,
        data: {
          type: "base64",
          content: data.documentBase64,
          mimeType: data.documentMimeType || "application/pdf",
          title: data.title,
        },
      });
      return;
    }
    res.status(404).json({ success: false, error: "No file attached" });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.get("/safe/file", requireRole("investor"), async (req: Request, res: Response) => {
  try {
    const portalUserId = req.auth!.portalUserId!;
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.INVESTOR_SAFES)
      .where("portalUserId", "==", portalUserId)
      .limit(1)
      .get();
    if (snap.empty) {
      res.status(404).json({ success: false, error: "No SAFE on file" });
      return;
    }
    const data = snap.docs[0].data() as InvestorSafe;
    if (data.documentUrl) {
      res.json({ success: true, data: { type: "url", url: data.documentUrl, title: data.documentTitle || "SAFE" } });
      return;
    }
    if (data.documentBase64) {
      res.json({
        success: true,
        data: {
          type: "base64",
          content: data.documentBase64,
          mimeType: data.documentMimeType || "application/pdf",
          title: data.documentTitle || "SAFE",
        },
      });
      return;
    }
    res.status(404).json({ success: false, error: "No SAFE document attached" });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

// ── Admin routes ──────────────────────────────────────────────────────────────

router.get("/admin/users", requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.PORTAL_USERS).orderBy("createdAt", "desc").get();
    const users = snap.docs.map(d => stripPassword({ id: d.id, ...d.data() }));
    res.json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.post("/admin/users", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const parsed = PortalUserSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues.map(e => e.message).join(", ") });
      return;
    }

    const plainPassword = parsed.data.password || generatePassword();
    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const db = getDb();

    const existing = await db.collection(COLLECTIONS.PORTAL_USERS)
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();
    if (!existing.empty) {
      res.status(409).json({ success: false, error: "Email already registered" });
      return;
    }

    const now = new Date().toISOString();
    const passwordHash = await hashPassword(plainPassword);
    const { password: _, ...rest } = parsed.data;

    const ref = await db.collection(COLLECTIONS.PORTAL_USERS).add({
      ...rest,
      email: normalizedEmail,
      passwordHash,
      createdAt: now,
      updatedAt: now,
    });

    res.status(201).json({
      success: true,
      data: {
        id: ref.id,
        ...rest,
        email: normalizedEmail,
        credentials: { email: normalizedEmail, password: plainPassword },
      },
    });

    notifyFireAndForget(emailNewPortalUser(rest.name, normalizedEmail, rest.stage));
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.patch("/admin/users/:id", requireRole("admin"), async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    const ref = db.collection(COLLECTIONS.PORTAL_USERS).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }

    const updates: Record<string, unknown> = { ...req.body, updatedAt: new Date().toISOString() };
    delete updates.passwordHash;
    delete updates.password;
    if (typeof updates.email === "string") {
      updates.email = updates.email.trim().toLowerCase();
    }

    const prev = doc.data()!;
    await ref.update(updates);
    res.json({ success: true, data: { id: req.params.id, ...prev, ...updates } });

    if (updates.stage && updates.stage !== prev.stage) {
      notifyFireAndForget(
        emailStageChange(prev.name as string, prev.email as string, updates.stage as string)
      );
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.post("/admin/users/:id/reset-password", requireRole("admin"), async (req: Request<IdParams>, res: Response) => {
  try {
    const { password } = req.body as { password?: string };
    const plainPassword = password || generatePassword();
    const db = getDb();
    const ref = db.collection(COLLECTIONS.PORTAL_USERS).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }

    const passwordHash = await hashPassword(plainPassword);
    const now = new Date().toISOString();
    await ref.update({ passwordHash, updatedAt: now });

    res.json({
      success: true,
      data: {
        email: doc.data()!.email,
        password: plainPassword,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.delete("/admin/users/:id", requireRole("admin"), async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    await db.collection(COLLECTIONS.PORTAL_USERS).doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.get("/admin/cap-table", requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.CAP_TABLE).orderBy("sortOrder", "asc").get();
    const entries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, data: entries });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.post("/admin/cap-table", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const parsed = CapTableSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues.map(e => e.message).join(", ") });
      return;
    }
    const now = new Date().toISOString();
    const db = getDb();
    const ref = await db.collection(COLLECTIONS.CAP_TABLE).add({
      ...parsed.data,
      createdAt: now,
      updatedAt: now,
    });
    res.status(201).json({ success: true, data: { id: ref.id, ...parsed.data } });
    notifyFireAndForget(emailCapTableChange("entry added", parsed.data.holderName));
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.patch("/admin/cap-table/:id", requireRole("admin"), async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    const ref = db.collection(COLLECTIONS.CAP_TABLE).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    const prev = doc.data()!;
    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    await ref.update(updates);
    res.json({ success: true, data: { id: req.params.id, ...prev, ...updates } });
    notifyFireAndForget(emailCapTableChange("entry updated", (prev.holderName as string) || req.params.id));
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.delete("/admin/cap-table/:id", requireRole("admin"), async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    const ref = db.collection(COLLECTIONS.CAP_TABLE).doc(req.params.id);
    const doc = await ref.get();
    const name = doc.exists ? (doc.data()?.holderName as string) : req.params.id;
    await ref.delete();
    res.json({ success: true });
    if (name) notifyFireAndForget(emailCapTableChange("entry removed", name));
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.get("/admin/safes", requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.INVESTOR_SAFES).orderBy("createdAt", "desc").get();
    const safes = snap.docs.map(d => {
      const data = d.data() as InvestorSafe;
      const { documentBase64: _, ...rest } = data;
      return { id: d.id, ...rest, hasDocument: !!(data.documentUrl || data.documentBase64) };
    });
    res.json({ success: true, data: safes });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.post("/admin/safes", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const parsed = SafeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues.map(e => e.message).join(", ") });
      return;
    }
    const now = new Date().toISOString();
    const db = getDb();
    const ref = await db.collection(COLLECTIONS.INVESTOR_SAFES).add({
      ...parsed.data,
      createdAt: now,
      updatedAt: now,
    });
    res.status(201).json({ success: true, data: { id: ref.id, ...parsed.data } });
    notifyFireAndForget(
      (async () => {
        const email = await resolveInvestorEmail(parsed.data.portalUserId);
        await emailSafeUpdate(
          parsed.data.investorName,
          email,
          "created",
          `Amount: $${parsed.data.amount.toLocaleString()} · Status: ${parsed.data.status}`
        );
      })()
    );
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.patch("/admin/safes/:id", requireRole("admin"), async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    const ref = db.collection(COLLECTIONS.INVESTOR_SAFES).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    const prev = doc.data() as InvestorSafe;
    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    await ref.update(updates);
    res.json({ success: true, data: { id: req.params.id, ...prev, ...updates } });
    notifyFireAndForget(
      (async () => {
        const email = await resolveInvestorEmail(prev.portalUserId);
        const statusNote = updates.status ? `New status: ${updates.status}` : "Details updated";
        await emailSafeUpdate(prev.investorName, email, "updated", statusNote);
      })()
    );
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.post("/admin/safes/:id/upload", requireRole("admin"), upload.single("file"), async (req: Request<IdParams>, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: "File required" });
      return;
    }
    const db = getDb();
    const ref = db.collection(COLLECTIONS.INVESTOR_SAFES).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    const safe = doc.data() as InvestorSafe;
    await ref.update({
      documentBase64: req.file.buffer.toString("base64"),
      documentMimeType: req.file.mimetype,
      documentTitle: req.file.originalname,
      updatedAt: new Date().toISOString(),
    });
    res.json({ success: true, data: { id: req.params.id, documentTitle: req.file.originalname } });
    notifyFireAndForget(
      (async () => {
        const email = await resolveInvestorEmail(safe.portalUserId);
        await emailSafeUpdate(
          safe.investorName,
          email,
          "document uploaded",
          `Document: ${req.file!.originalname}`
        );
      })()
    );
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.delete("/admin/safes/:id", requireRole("admin"), async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    await db.collection(COLLECTIONS.INVESTOR_SAFES).doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.get("/admin/data-room", requireRole("admin"), async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.DATA_ROOM).orderBy("uploadedAt", "desc").get();
    const docs = snap.docs.map(d => {
      const data = d.data() as DataRoomDocument;
      const { documentBase64: _, ...rest } = data;
      return { id: d.id, ...rest, hasFile: !!(data.documentUrl || data.documentBase64) };
    });
    res.json({ success: true, data: docs });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.post("/admin/data-room", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const parsed = DataRoomSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues.map(e => e.message).join(", ") });
      return;
    }
    const now = new Date().toISOString();
    const db = getDb();
    const ref = await db.collection(COLLECTIONS.DATA_ROOM).add({
      ...parsed.data,
      uploadedAt: now,
      updatedAt: now,
    });
    res.status(201).json({ success: true, data: { id: ref.id, ...parsed.data } });
    notifyFireAndForget(emailDataRoomUpdate(parsed.data.title, "document added"));
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.post("/admin/data-room/:id/upload", requireRole("admin"), upload.single("file"), async (req: Request<IdParams>, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: "File required" });
      return;
    }
    const db = getDb();
    const ref = db.collection(COLLECTIONS.DATA_ROOM).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    const roomDoc = doc.data() as DataRoomDocument;
    await ref.update({
      documentBase64: req.file.buffer.toString("base64"),
      documentMimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      updatedAt: new Date().toISOString(),
    });
    res.json({ success: true, data: { id: req.params.id, sizeBytes: req.file.size } });
    notifyFireAndForget(
      emailDataRoomUpdate(roomDoc.title, `file uploaded (${req.file.originalname})`)
    );
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.patch("/admin/data-room/:id", requireRole("admin"), async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    const ref = db.collection(COLLECTIONS.DATA_ROOM).doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    await ref.update(updates);
    res.json({ success: true, data: { id: req.params.id, ...doc.data(), ...updates } });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

router.delete("/admin/data-room/:id", requireRole("admin"), async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    await db.collection(COLLECTIONS.DATA_ROOM).doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Error" });
  }
});

export default router;
