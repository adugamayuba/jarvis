import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "adminpassword";
const COFOUNDER_PASSWORD = process.env.COFOUNDER_PASSWORD || "cofounderpassword";
const JWT_SECRET = process.env.JWT_SECRET || "jarvis-secret-key-change-in-prod";

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

// POST /api/auth/verify
router.post("/verify", (req: Request, res: Response) => {
  const { token } = req.body as { token: string };
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { role: string };
    res.json({ success: true, data: { role: payload.role } });
  } catch {
    res.status(401).json({ success: false, error: "Invalid token" });
  }
});

export default router;
