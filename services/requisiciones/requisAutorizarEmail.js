/**
 * Correo para autorización de requisición.
 *
 * Usa las mismas variables que api-sql142 (controllers/email/email.js) para no duplicar .env:
 *   SMTP_USER, SMTP_PASS (obligatorios)
 *   SMTP_FROM (opcional)
 *   SMTP_SERVICE — ej. gmail (si no defines SMTP_HOST)
 *   SMTP_HOST, SMTP_PORT — servidor SMTP propio (si no usas SMTP_SERVICE)
 * Si no hay SMTP_HOST ni SMTP_SERVICE, se usa service "gmail" como en el correo histórico.
 *
 * Retrocompatibilidad (solo api2): REQUIS_SMTP_HOST, REQUIS_SMTP_PORT, REQUIS_SMTP_USER, REQUIS_SMTP_PASS, REQUIS_SMTP_FROM.
 *
 * Otras:
 *   REQUIS_MAIL_BCC — copia oculta opcional (si está vacío, no hay BCC)
 *   REQUIS_MAIL_SKIP=1 — no enviar correos
 *   REQUIS_SKIP_DRIVE_UPLOAD=1 — sin Drive ni insertaRuta (PDF solo por correo si aplica)
 *   REQUIS_EMAIL_ATTACH_PDF=0 — correo sin adjunto PDF
 */
const nodemailer = require("nodemailer");

function smtpUser() {
  return (process.env.SMTP_USER || process.env.REQUIS_SMTP_USER || "").trim();
}

function smtpPass() {
  return (process.env.SMTP_PASS || process.env.REQUIS_SMTP_PASS || "").trim();
}

function smtpConfigured() {
  return Boolean(smtpUser() && smtpPass());
}

function createTransporter() {
  const user = smtpUser();
  const pass = smtpPass();
  if (!user || !pass) {
    throw new Error(
      "Configura SMTP_USER y SMTP_PASS (o REQUIS_SMTP_*) en el .env de api2-sql142"
    );
  }

  const host = (
    process.env.SMTP_HOST ||
    process.env.REQUIS_SMTP_HOST ||
    ""
  ).trim();
  const port = parseInt(
    process.env.SMTP_PORT || process.env.REQUIS_SMTP_PORT || "587",
    10
  );
  const service = (process.env.SMTP_SERVICE || "").trim();

  if (host) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  if (service) {
    return nodemailer.createTransport({
      service,
      auth: { user, pass },
    });
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

function defaultFrom() {
  const f = (process.env.SMTP_FROM || process.env.REQUIS_SMTP_FROM || "").trim();
  return f || smtpUser() || "noreply@localhost";
}

/** Destinatarios desde respuesta getCorreos (formato variable). */
function emailsFromGetCorreosPayload(data) {
  if (data == null) return "";
  if (typeof data === "string") return data.trim();

  if (data.datos != null) {
    const d = data.datos;
    if (typeof d === "string") return d.trim();
    if (d && typeof d.correos === "string") return d.correos.trim();
    if (d && typeof d.email === "string") return d.email.trim();
  }
  if (typeof data.correos === "string") return data.correos.trim();
  if (Array.isArray(data)) {
    const parts = data
      .map((x) => (x && (x.email || x.Email || x.correo)) || "")
      .filter(Boolean);
    if (parts.length) return parts.join(", ");
  }
  return "";
}

async function sendAutorizadoEmail({ to, cc, subject, html, attachments }) {
  if (!smtpConfigured()) return { skipped: true };

  const transporter = createTransporter();
  const from = defaultFrom();

  const mail = {
    from,
    to,
    cc: cc || undefined,
    subject,
    html,
  };
  const bcc = (process.env.REQUIS_MAIL_BCC || "").trim();
  if (bcc) {
    mail.bcc = bcc;
  }
  if (attachments && attachments.length) {
    mail.attachments = attachments;
  }

  await transporter.sendMail(mail);
  return { skipped: false };
}

module.exports = {
  smtpConfigured,
  emailsFromGetCorreosPayload,
  sendAutorizadoEmail,
};
