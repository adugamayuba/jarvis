import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

function createGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
}

export interface EmailPayload {
  to: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
}

export interface BulkEmailResult {
  email: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

function getSignature(): string {
  return process.env.GMAIL_SIGNATURE || `\n\n--\nAbel Adugam\nCEO, Softdroom Holdings\nadugamhq@gmail.com`;
}

// Encode email to RFC 2822 format then base64url
function buildRawEmail(payload: EmailPayload): string {
  const bodyWithSig = payload.body + getSignature();
  const lines = [
    `From: "${payload.fromName}" <${payload.fromEmail}>`,
    `To: ${payload.to}`,
    `Subject: ${payload.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    ``,
    bodyWithSig,
  ];

  const raw = lines.join("\r\n");
  // base64url encode
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Replace {{variable}} placeholders
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export async function sendEmail(payload: EmailPayload): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const gmail = createGmailClient();
    const raw = buildRawEmail(payload);

    const res = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw },
    });

    return { success: true, messageId: res.data.id ?? undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Gmail send error:", message);
    return { success: false, error: message };
  }
}

export interface GmailDraft {
  id: string;
  subject: string;
  body: string;
  snippet: string;
}

// Fetch Gmail drafts to use as templates
export async function getDrafts(): Promise<GmailDraft[]> {
  const gmail = createGmailClient();
  const list = await gmail.users.drafts.list({ userId: "me", maxResults: 20 });
  const drafts = list.data.drafts || [];

  const full = await Promise.all(
    drafts.map((d) =>
      gmail.users.drafts.get({ userId: "me", id: d.id!, format: "full" })
    )
  );

  return full.map((res) => {
    const msg = res.data.message!;
    const headers = msg.payload?.headers || [];
    const subject = headers.find((h) => h.name === "Subject")?.value || "(no subject)";

    // Extract plain text body
    let body = "";
    const parts = msg.payload?.parts || [];
    const textPart = parts.find((p) => p.mimeType === "text/plain");
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, "base64").toString("utf-8");
    } else if (msg.payload?.body?.data) {
      body = Buffer.from(msg.payload.body.data, "base64").toString("utf-8");
    }

    return {
      id: res.data.id!,
      subject,
      body,
      snippet: msg.snippet || "",
    };
  });
}

export async function sendBulkEmails(
  contacts: Array<{
    name: string;
    email: string;
    company?: string;
    title?: string;
  }>,
  template: {
    fromName: string;
    fromEmail: string;
    subject: string;
    body: string;
  },
  delayMs = 500
): Promise<BulkEmailResult[]> {
  const results: BulkEmailResult[] = [];

  for (const contact of contacts) {
    if (!contact.email) {
      results.push({ email: contact.email, success: false, error: "No email address" });
      continue;
    }

    const vars: Record<string, string> = {
      name: contact.name || "",
      firstName: contact.name?.split(" ")[0] || "",
      company: contact.company || "",
      title: contact.title || "",
    };

    const result = await sendEmail({
      to: contact.email,
      fromName: template.fromName,
      fromEmail: template.fromEmail,
      subject: interpolate(template.subject, vars),
      body: interpolate(template.body, vars),
    });

    results.push({
      email: contact.email,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });

    // Respect Gmail sending limits (~100/day free, 500 with Workspace)
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
