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

function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractBodyFromPayload(payload: { mimeType?: string | null; body?: { data?: string | null }; parts?: Array<{ mimeType?: string | null; body?: { data?: string | null }; parts?: unknown[] }> } | undefined): string {
  if (!payload) return "";

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }

  if (payload.mimeType === "text/html" && payload.body?.data) {
    return htmlToPlainText(Buffer.from(payload.body.data, "base64").toString("utf-8"));
  }

  const parts = payload.parts || [];
  const plain = parts.find(p => p.mimeType === "text/plain");
  if (plain) return extractBodyFromPayload(plain as typeof payload);

  const html = parts.find(p => p.mimeType === "text/html");
  if (html) return extractBodyFromPayload(html as typeof payload);

  for (const part of parts) {
    const nested = extractBodyFromPayload(part as typeof payload);
    if (nested.trim()) return nested;
  }

  if (payload.body?.data) {
    const raw = Buffer.from(payload.body.data, "base64").toString("utf-8");
    return payload.mimeType?.includes("html") ? htmlToPlainText(raw) : raw;
  }

  return "";
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
    const body = extractBodyFromPayload(msg.payload as Parameters<typeof extractBodyFromPayload>[0]);

    return {
      id: res.data.id!,
      subject,
      body: body || msg.snippet || "",
      snippet: msg.snippet || "",
    };
  });
}

export async function sendBulkEmails(
  contacts: Array<{
    name: string;
    email: string;
    emails?: string[];   // all known emails — sends to each one
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
    // Collect all unique emails for this contact
    const allEmails = [...new Set([
      ...(contact.email ? [contact.email] : []),
      ...(contact.emails || []),
    ])].filter(Boolean);

    if (allEmails.length === 0) {
      results.push({ email: "", success: false, error: "No email address" });
      continue;
    }

    const vars: Record<string, string> = {
      name: contact.name || "",
      firstName: contact.name?.split(" ")[0] || "",
      company: contact.company || "",
      title: contact.title || "",
    };

    const subject = interpolate(template.subject, vars);
    const body = interpolate(template.body, vars);

    // Send to each known email address
    for (const emailAddr of allEmails) {
      const result = await sendEmail({
        to: emailAddr,
        fromName: template.fromName,
        fromEmail: template.fromEmail,
        subject,
        body,
      });

      results.push({
        email: emailAddr,
        success: result.success,
        messageId: result.messageId,
        error: result.error,
      });

      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  return results;
}
