import { Router, Request, Response } from "express";
import { findPeopleEmailsOnPage } from "../services/pagePeopleFinder";

const router = Router();

interface PeopleEmailBody {
  pageUrl: string;
  pageTitle: string;
  pageText: string;
  candidateNames?: string[];
  onPageEmails?: Array<{ name?: string; email: string }>;
}

// POST /api/extension/people-emails — extract people from page + find emails via Google
router.post("/people-emails", async (req: Request, res: Response) => {
  try {
    const { pageUrl, pageTitle, pageText, candidateNames, onPageEmails } = req.body as PeopleEmailBody;

    if (!pageUrl || !pageText) {
      res.status(400).json({ success: false, error: "pageUrl and pageText are required" });
      return;
    }

    if (!process.env.APIFY_API_TOKEN) {
      res.status(500).json({ success: false, error: "APIFY_API_TOKEN not configured on backend" });
      return;
    }

    console.log(`🔍 Extension people-email scan: ${pageUrl} (${candidateNames?.length || 0} candidates)`);

    const result = await findPeopleEmailsOnPage({
      pageUrl,
      pageTitle: pageTitle || "",
      pageText,
      candidateNames,
      onPageEmails,
    });

    const found = result.people.filter(p => p.email).length;
    res.json({
      success: true,
      data: result,
      message: `Found ${found}/${result.people.length} emails for ${result.company || "this page"}`,
    });
  } catch (err) {
    console.error("Extension people-emails error:", err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
