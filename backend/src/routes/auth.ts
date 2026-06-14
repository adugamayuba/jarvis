import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getDb, COLLECTIONS } from "../services/firebase";
import { verifyPassword } from "../lib/password";
import { JWT_SECRET } from "../middleware/auth";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "adminpassword";
const COFOUNDER_PASSWORD = process.env.COFOUNDER_PASSWORD || "cofounderpassword";

// POST /api/auth/login
router.post("/login", (req: Request, res: Response) => {
  const { password } = req.body as { password: string };

  if (!password) {
    res.status(401).json({ success: false, error: "Password required" });
    return;
  }

  if (password === ADMIN_PASSWORD) {
    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ success: true, data: { token, role: "admin" } });
    return;
  }

  if (password === COFOUNDER_PASSWORD) {
    const token = jwt.sign({ role: "cofounder" }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ success: true, data: { token, role: "cofounder" } });
    return;
  }

  res.status(401).json({ success: false, error: "Invalid password" });
});

// POST /api/auth/portal-login — per-investor email + password
router.post("/portal-login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email?.trim() || !password) {
      res.status(400).json({ success: false, error: "Email and password required" });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = getDb();
    const snap = await db.collection(COLLECTIONS.PORTAL_USERS)
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (snap.empty) {
      res.status(401).json({ success: false, error: "Invalid email or password" });
      return;
    }

    const doc = snap.docs[0];
    const user = doc.data();

    if (!user.active) {
      res.status(403).json({ success: false, error: "Account deactivated. Contact Reelin AI." });
      return;
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, error: "Invalid email or password" });
      return;
    }

    const now = new Date().toISOString();
    await doc.ref.update({ lastLoginAt: now, updatedAt: now });

    const token = jwt.sign(
      {
        role: "investor",
        portalUserId: doc.id,
        email: user.email,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      data: {
        token,
        role: "investor",
        portalUserId: doc.id,
        name: user.name,
        email: user.email,
        company: user.company || "",
        stage: user.stage,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Login failed" });
  }
});

// POST /api/auth/verify
router.post("/verify", (req: Request, res: Response) => {
  const { token } = req.body as { token: string };
  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      role: string;
      portalUserId?: string;
      email?: string;
      name?: string;
    };
    res.json({
      success: true,
      data: {
        role: payload.role,
        portalUserId: payload.portalUserId,
        email: payload.email,
        name: payload.name,
      },
    });
  } catch {
    res.status(401).json({ success: false, error: "Invalid token" });
  }
});

export default router;
