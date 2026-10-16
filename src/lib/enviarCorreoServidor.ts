import nodemailer from "nodemailer";

/** Envío de correo desde el servidor por SMTP (sirve con Gmail, Resend, Brevo, SendGrid... — el que
 * configures). Se activa solo si están puestas estas variables de entorno en Vercel:
 *   SMTP_HOST, SMTP_PORT (587 por defecto), SMTP_USER, SMTP_PASS y, opcional, CORREO_REMITENTE
 *   (ej. "MO Conecta <avisos@tudominio.com>"; si falta se usa SMTP_USER). Sin ellas, MO simplemente no
 *   manda correos (los avisos por WhatsApp siguen igual). */
export function correoConfigurado(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function enviarCorreo(args: { para: string; asunto: string; texto: string; html: string }): Promise<void> {
  if (!correoConfigurado()) throw new Error("El correo no está configurado.");
  const puerto = Number(process.env.SMTP_PORT || 587);
  const transporte = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: puerto,
    secure: puerto === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporte.sendMail({
    from: process.env.CORREO_REMITENTE || `MO Conecta <${process.env.SMTP_USER}>`,
    to: args.para,
    subject: args.asunto,
    text: args.texto,
    html: args.html,
  });
}
