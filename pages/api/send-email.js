import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { subject, message, to } = req.body || {};

  if (!subject || !message) {
    return res.status(400).json({ error: "Subject and message are required" });
  }

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return res.status(200).json({ skipped: true, reason: "SMTP is not configured" });
  }

  const transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || user,
    to: to || process.env.ADMIN_EMAIL || user,
    subject,
    text: message,
  });

  return res.status(200).json({ ok: true });
}
