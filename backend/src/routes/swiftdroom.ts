import { Router, Request, Response } from "express";
import axios from "axios";

const router = Router();

const SWIFTDROOM_API_URL = (
  process.env.SWIFTDROOM_API_URL || "https://swiftdroom.com"
).replace(/\/$/, "");

export interface SwiftdroomAdminStats {
  totalUsers: number;
  newUsersThisMonth: number;
  newUsersLastMonth: number;
  userGrowthRate: number;
  activeSubscribers: number;
  conversionRate: number;
  mrr: number;
  arr: number;
  planBreakdown: { starter: number; pro: number; business: number };
  totalApplications: number;
  applicationsThisMonth: number;
  monthlySignups: Array<{ month: string; count: number }>;
}

// GET /api/swiftdroom/stats — proxy live MRR from Swiftdroom admin API
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const token = process.env.SWIFTDROOM_ADMIN_API_TOKEN?.trim();
    if (!token) {
      res.status(503).json({
        success: false,
        error: "SWIFTDROOM_ADMIN_API_TOKEN not configured on Jarvis backend",
      });
      return;
    }

    const upstream = await axios.get<SwiftdroomAdminStats>(
      `${SWIFTDROOM_API_URL}/api/admin/stats`,
      {
        headers: { "x-api-token": token },
        timeout: 15_000,
      }
    );

    res.json({
      success: true,
      data: {
        ...upstream.data,
        syncedAt: new Date().toISOString(),
        source: SWIFTDROOM_API_URL,
      },
    });
  } catch (err) {
    const message = axios.isAxiosError(err)
      ? err.response?.data?.error || err.message
      : err instanceof Error ? err.message : "Unknown error";
    console.error("Swiftdroom stats proxy error:", message);
    res.status(502).json({ success: false, error: message });
  }
});

export default router;
