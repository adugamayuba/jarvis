import { Router, Request, Response } from "express";

interface IdParams extends Record<string, string> { id: string }
import { z } from "zod";
import { sendEmail, sendBulkEmails } from "../services/gmail";
import { getDb, COLLECTIONS } from "../services/firebase";
import { Campaign } from "../types";

const router = Router();

const SendEmailSchema = z.object({
  to: z.string().email(),
  fromName: z.string().min(1),
  fromEmail: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

const CampaignSchema = z.object({
  name: z.string().min(1),
  fromName: z.string().min(1),
  fromEmail: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  contactIds: z.array(z.string()).min(1, "Select at least one contact"),
});

// POST /api/email/send — send a single email
router.post("/send", async (req: Request, res: Response) => {
  try {
    const parsed = SendEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      });
      return;
    }

    const result = await sendEmail(parsed.data);
    if (!result.success) {
      res.status(500).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true, data: { messageId: result.messageId } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// POST /api/email/campaigns — create and send a campaign
router.post("/campaigns", async (req: Request, res: Response) => {
  try {
    const parsed = CampaignSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.issues.map((e) => e.message).join(", "),
      });
      return;
    }

    const { name, fromName, fromEmail, subject, body, contactIds } =
      parsed.data;
    const db = getDb();

    // Fetch selected contacts
    const contactDocs = await Promise.all(
      contactIds.map((id) =>
        db.collection(COLLECTIONS.CONTACTS).doc(id).get()
      )
    );

    interface ContactRecord {
      id: string;
      name?: string;
      email?: string;
      company?: string;
      title?: string;
    }

    const contacts: ContactRecord[] = contactDocs
      .filter((doc) => doc.exists)
      .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<ContactRecord, "id">) }));

    if (contacts.length === 0) {
      res
        .status(404)
        .json({ success: false, error: "No valid contacts found" });
      return;
    }

    // Create campaign record
    const campaign: Campaign = {
      name,
      fromName,
      fromEmail,
      subject,
      body,
      contactIds,
      status: "sending",
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const campaignRef = await db
      .collection(COLLECTIONS.CAMPAIGNS)
      .add(campaign);

    // Send emails asynchronously
    (async () => {
      const typedContacts = contacts.map((c) => ({
        name: c.name || "",
        email: c.email || "",
        company: c.company || "",
        title: c.title || "",
      }));

      const results = await sendBulkEmails(typedContacts, {
        fromName,
        fromEmail,
        subject,
        body,
      });

      const sentCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      // Mark contacts as emailed
      const batch = db.batch();
      for (let i = 0; i < contacts.length; i++) {
        const result = results[i];
        if (result?.success && contacts[i]?.id) {
          batch.update(db.collection(COLLECTIONS.CONTACTS).doc(contacts[i].id), {
            emailSent: true,
            emailSentAt: new Date().toISOString(),
            campaignId: campaignRef.id,
          });
        }
      }
      await batch.commit();

      await campaignRef.update({
        status: "sent",
        sentCount,
        failedCount,
        updatedAt: new Date().toISOString(),
      });

      console.log(
        `✅ Campaign ${campaignRef.id}: ${sentCount} sent, ${failedCount} failed`
      );
    })();

    res.status(202).json({
      success: true,
      data: { campaignId: campaignRef.id, contactCount: contacts.length },
      message: "Campaign started. Emails are being sent.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/email/campaigns — list campaigns
router.get("/campaigns", async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const snapshot = await db
      .collection(COLLECTIONS.CAMPAIGNS)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const campaigns = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json({ success: true, data: campaigns });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

// GET /api/email/campaigns/:id — get campaign details
router.get("/campaigns/:id", async (req: Request<IdParams>, res: Response) => {
  try {
    const db = getDb();
    const doc = await db
      .collection(COLLECTIONS.CAMPAIGNS)
      .doc(req.params.id)
      .get();

    if (!doc.exists) {
      res.status(404).json({ success: false, error: "Campaign not found" });
      return;
    }

    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
