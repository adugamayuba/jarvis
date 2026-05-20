import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "adminpassword";
const JWT_SECRET = process.env.JWT_SECRET || "jarvis-secret-key-change-in-prod";

// POST /api/auth/login
router.post("/login", (req: Request, res: Response) => {
  const { password } = req.body as { password: string };

  if (!password || password !== ADMIN_PASSWORD) {
    res.status(401).json({ success: false, error: "Invalid password" });
    return;
  }

  const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ success: true, data: { token } });
});

// POST /api/auth/verify
router.post("/verify", (req: Request, res: Response) => {
  const { token } = req.body as { token: string };
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({ success: true });
  } catch {
    res.status(401).json({ success: false, error: "Invalid token" });
  }
});

export default router;
