import { Resend } from "resend";
import { getDb, COLLECTIONS } from "./firebase";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM = process.env.RESEND_FROM || "Reelin AI <notifications@reelin.ai>";
const PORTAL_URL = process.env.INVESTOR_PORTAL_URL || "https://investors.reelin.ai";

function adminEmails(): string[] {
  return (process.env.PORTAL_NOTIFY_EMAILS || "abel@reelin.ai")
    .split(",")
    .map(e => e.trim())
    .filter(Boolean);
}

function emailShell(title: string, body: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;color:#0f172a;">
      <div style="padding:24px 0;border-bottom:1px solid #e2e8f0;margin-bottom:24px;">
        <strong style="font-size:18px;">Reelin AI</strong>
        <span style="color:#64748b;font-size:14px;margin-left:8px;">Investor Portal</span>
      </div>
      <h1 style="font-size:20px;font-weight:600;margin:0 0 16px;">${title}</h1>
      <div style="font-size:15px;line-height:1.65;color:#475569;">${body}</div>
      <p style="margin-top:32px;padding-top:24px;border-top:1px solid #e2e8f0;font-size:13px;color:#94a3b8;">
        <a href="${PORTAL_URL}" style="color:#475569;">${PORTAL_URL}</a><br/>
        Confidential · Reelin AI, Inc.
      </p>
    </div>
  `;
}

async function send(to: string[], subject: string, html: string): Promise<void> {
  if (!resend || to.length === 0) {
    if (!resend) console.warn("⚠️  RESEND_API_KEY not set — skipping email:", subject);
    return;
  }
  await resend.emails.send({ from: FROM, to, subject, html });
}

export function notifyFireAndForget(promise: Promise<void>): void {
  promise.catch(err => console.warn("⚠️  Portal email failed:", (err as Error).message));
}

export async function getActivePortalEmails(): Promise<string[]> {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.PORTAL_USERS).where("active", "==", true).get();
  return snap.docs.map(d => d.data().email as string).filter(Boolean);
}

export async function notifyAdmins(title: string, body: string): Promise<void> {
  await send(adminEmails(), `[Reelin Portal] ${title}`, emailShell(title, body));
}

export async function notifyInvestor(email: string, title: string, body: string): Promise<void> {
  await send([email], `[Reelin AI] ${title}`, emailShell(title, body));
}

export async function notifyAllInvestors(title: string, body: string): Promise<void> {
  const emails = await getActivePortalEmails();
  if (emails.length === 0) return;
  await send(emails, `[Reelin AI] ${title}`, emailShell(title, body));
}

export async function emailInvestorLogin(name: string, email: string): Promise<void> {
  const time = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  await notifyInvestor(
    email,
    "Sign-in to your Reelin investor portal",
    `<p>Hi ${name},</p>
     <p>We noticed you signed in to your Reelin investors portal on ${time} ET.</p>
     <p>If this wasn't you, please contact us immediately at
     <a href="mailto:abel@reelin.ai">abel@reelin.ai</a>.</p>
     <p><a href="${PORTAL_URL}">Return to portal →</a></p>`
  );
}

export async function emailNewPortalUser(name: string, email: string, stage: string): Promise<void> {
  await notifyAdmins(
    "New portal account created",
    `<p>Portal account created for <strong>${name}</strong> (${email}).</p>
     <p>Stage: ${stage.replace(/_/g, " ")}</p>`
  );
  await notifyInvestor(
    email,
    "Your investor portal is ready",
    `<p>Hello ${name},</p>
     <p>Your Reelin AI investor portal account is active. Sign in at
     <a href="${PORTAL_URL}">${PORTAL_URL}</a> with the credentials provided by our team.</p>`
  );
}

export async function emailStageChange(name: string, email: string, stage: string): Promise<void> {
  const label = stage.replace(/_/g, " ");
  await notifyAdmins(
    "Investor status updated",
    `<p><strong>${name}</strong> status changed to <strong>${label}</strong>.</p>`
  );
  await notifyInvestor(
    email,
    "Your investment status was updated",
    `<p>Hello ${name},</p>
     <p>Your status has been updated to <strong>${label}</strong>.</p>
     <p><a href="${PORTAL_URL}">View portal →</a></p>`
  );
}

export async function emailCapTableChange(action: string, holderName: string): Promise<void> {
  const body = `<p>Cap table ${action}: <strong>${holderName}</strong></p>
    <p><a href="${PORTAL_URL}/cap-table">View cap table →</a></p>`;
  await notifyAdmins(`Cap table ${action}`, body);
  await notifyAllInvestors("Cap table updated", body);
}

export async function emailSafeUpdate(
  investorName: string,
  investorEmail: string | undefined,
  action: string,
  details: string
): Promise<void> {
  const body = `<p>SAFE ${action} for <strong>${investorName}</strong>.</p><p>${details}</p>
    <p><a href="${PORTAL_URL}/safe">View SAFE →</a></p>`;
  await notifyAdmins(`SAFE ${action}`, body);
  if (investorEmail) await notifyInvestor(investorEmail, `Your SAFE was ${action}`, body);
}

export async function emailDataRoomUpdate(title: string, action: string): Promise<void> {
  const body = `<p>Data room ${action}: <strong>${title}</strong></p>
    <p><a href="${PORTAL_URL}/data-room">Open data room →</a></p>`;
  await notifyAdmins(`Data room ${action}`, body);
  await notifyAllInvestors("New data room material", body);
}

export async function resolveInvestorEmail(portalUserId: string): Promise<string | undefined> {
  const db = getDb();
  const doc = await db.collection(COLLECTIONS.PORTAL_USERS).doc(portalUserId).get();
  return doc.exists ? (doc.data()?.email as string) : undefined;
}
