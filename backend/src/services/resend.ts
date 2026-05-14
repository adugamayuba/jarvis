import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

export interface EmailPayload {
  to: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
  contactName?: string;
}

export interface BulkEmailResult {
  email: string;
  success: boolean;
  messageId?: string;
  error?: string;
}

// Replace template variables like {{name}}, {{company}}, etc.
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || "");
}

export async function sendEmail(payload: EmailPayload): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const htmlBody = payload.body
      .split("\n")
      .map((line) => `<p>${line}</p>`)
      .join("");

    const { data, error } = await resend.emails.send({
      from: `${payload.fromName} <${payload.fromEmail}>`,
      to: [payload.to],
      subject: payload.subject,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${payload.subject}</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            ${htmlBody}
          </body>
        </html>
      `,
      text: payload.body,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
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
  delayMs = 300
): Promise<BulkEmailResult[]> {
  const results: BulkEmailResult[] = [];

  for (const contact of contacts) {
    if (!contact.email) {
      results.push({
        email: contact.email,
        success: false,
        error: "No email address",
      });
      continue;
    }

    const vars: Record<string, string> = {
      name: contact.name || "",
      firstName: contact.name?.split(" ")[0] || "",
      company: contact.company || "",
      title: contact.title || "",
    };

    const interpolatedSubject = interpolate(template.subject, vars);
    const interpolatedBody = interpolate(template.body, vars);

    const result = await sendEmail({
      to: contact.email,
      fromName: template.fromName,
      fromEmail: template.fromEmail,
      subject: interpolatedSubject,
      body: interpolatedBody,
      contactName: contact.name,
    });

    results.push({
      email: contact.email,
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });

    // Rate limiting delay between sends
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}
