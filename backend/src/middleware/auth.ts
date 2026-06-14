import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "jarvis-secret-key-change-in-prod";

export type AuthRole = "admin" | "cofounder" | "investor";

export interface JwtPayload {
  role: AuthRole;
  portalUserId?: string;
  email?: string;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

function extractPayload(req: Request): JwtPayload | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7);
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const payload = extractPayload(req);
  if (!payload) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }
  req.auth = payload;
  next();
}

export function requireRole(...roles: AuthRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const payload = extractPayload(req);
    if (!payload) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }
    if (!roles.includes(payload.role)) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }
    req.auth = payload;
    next();
  };
}

export { JWT_SECRET };
