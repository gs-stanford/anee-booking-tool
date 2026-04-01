import nodemailer from "nodemailer";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = String(process.env.SMTP_SECURE ?? "false").toLowerCase() === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  if (!host || !port || !from) {
    return null;
  }

  return {
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    from
  };
}

export function isMailConfigured() {
  return getSmtpConfig() !== null;
}

export async function sendEmail({ to, subject, text, html }: SendEmailInput) {
  const config = getSmtpConfig();

  if (!config) {
    throw new Error("SMTP is not configured.");
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth
  });

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    text,
    html
  });
}
