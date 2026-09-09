import "server-only";
import nodemailer from "nodemailer";

let _transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    _transporter = nodemailer.createTransport({
      host: "localhost",
      port: 25,
      secure: false,
      ignoreTLS: true,
    });
  } else {
    _transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: { user, pass },
    });
  }
  return _transporter;
}

function isSmtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function textToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  account?: { host: string; port: number; user: string; pass: string; email: string },
  fromEmail?: string,
  fromName?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const sender = fromEmail && fromEmail.includes("@") ? fromEmail : null;
  const displayName = fromName || "SupplyAI";

  if (account) {
    try {
      const transporter = nodemailer.createTransport({
        host: account.host,
        port: account.port,
        secure: account.port === 465,
        auth: { user: account.user, pass: account.pass },
      });
      const html = body.includes("<") ? body : textToHtml(body);
      const info = await transporter.sendMail({
        from: `"${displayName}" <${sender || account.email}>`,
        to,
        subject,
        html,
      });
      return { success: true, messageId: info.messageId };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : "发送失败" };
    }
  }

  if (!isSmtpConfigured()) {
    return { success: true, messageId: "local-dev-no-smtp" };
  }

  try {
    const transporter = getTransporter();
    const html = body.includes("<") ? body : textToHtml(body);
    const info = await transporter.sendMail({
      from: `"${displayName}" <${sender || process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "发送失败" };
  }
}
