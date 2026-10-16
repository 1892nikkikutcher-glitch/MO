/** Correos de aviso de MO Conecta (puro: arma el texto, no envía nada). Por privacidad NUNCA llevan datos
 * del paciente ni del caso: solo quién lo envió y a dónde entrar. */

import { INFRAESTRUCTURA_DATOS_CONECTA, RESPONSABLE_PROTECCION_DATOS_CONECTA } from "./moConecta";

export type CorreoArmado = { asunto: string; texto: string; html: string };

export function escaparHtml(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const PIE = `Protegido por ${RESPONSABLE_PROTECCION_DATOS_CONECTA} · ${INFRAESTRUCTURA_DATOS_CONECTA}`;
const AVISO_PRIVACIDAD = "Por privacidad, este correo no incluye ningún dato del paciente: ahí los verás solo al entrar con tu cuenta.";

function plantillaHtml(titulo: string, parrafos: string[], textoBoton: string, enlace: string): string {
  const cuerpo = parrafos.map((p) => `<p style="margin:0 0 14px;line-height:1.5">${p}</p>`).join("");
  return `<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1c2430">
<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px">
<h2 style="margin:0 0 16px;font-size:20px">${titulo}</h2>${cuerpo}
<p style="margin:22px 0"><a href="${escaparHtml(enlace)}" style="background:#e6a817;color:#1c2430;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px;display:inline-block">${escaparHtml(textoBoton)}</a></p>
<p style="margin:0 0 8px;font-size:12px;color:#5b6573">Si el botón no funciona, copia este enlace en tu navegador:<br>${escaparHtml(enlace)}</p>
<p style="margin:18px 0 0;font-size:12px;color:#5b6573">${escaparHtml(AVISO_PRIVACIDAD)}</p>
<p style="margin:8px 0 0;font-size:11px;color:#8a93a0">${escaparHtml(PIE)}</p>
</div></body></html>`;
}

/** Para un colega que ya tiene cuenta en MO: le llegó un caso. */
export function correoCasoNuevo(args: { remitenteNombre: string; destinatarioNombre?: string; enlace: string }): CorreoArmado {
  const remitente = args.remitenteNombre.trim() || "Un colega";
  const saludo = args.destinatarioNombre?.trim() ? `Hola, ${args.destinatarioNombre.trim()}.` : "Hola.";
  const asunto = `${remitente} te envió un caso por MO Conecta`;
  const lineas = [
    `${remitente} te envió un caso de interconsulta por MO Conecta.`,
    "Entra a MO para verlo y responder.",
  ];
  const texto = [saludo, "", ...lineas, "", args.enlace, "", AVISO_PRIVACIDAD, "Si no esperabas este correo, puedes ignorarlo.", "", PIE].join("\n");
  const html = plantillaHtml(
    escaparHtml(asunto),
    [escaparHtml(saludo), ...lineas.map(escaparHtml)],
    "Abrir MO Conecta",
    args.enlace
  );
  return { asunto, texto, html };
}

/** Para un colega que todavía no está en MO: lo invitan a ver el caso con un enlace de un solo uso. */
export function correoInvitacionCaso(args: { remitenteNombre: string; destinatarioNombre?: string; enlace: string; vence?: string }): CorreoArmado {
  const remitente = args.remitenteNombre.trim() || "Un colega";
  const saludo = args.destinatarioNombre?.trim() ? `Hola, ${args.destinatarioNombre.trim()}.` : "Hola.";
  const asunto = `${remitente} te invitó a ver un caso en MO Conecta`;
  const lineas = [
    `${remitente} quiere compartir contigo un caso de interconsulta por MO Conecta, la red de odontólogos de MO.`,
    "Abre el enlace, crea tu cuenta con este mismo correo y podrás ver el caso y responder." + (args.vence ? ` El enlace es de un solo uso y vence el ${args.vence}.` : " El enlace es de un solo uso."),
  ];
  const texto = [saludo, "", ...lineas, "", args.enlace, "", AVISO_PRIVACIDAD, "Si no esperabas este correo, puedes ignorarlo.", "", PIE].join("\n");
  const html = plantillaHtml(escaparHtml(asunto), [escaparHtml(saludo), ...lineas.map(escaparHtml)], "Ver el caso", args.enlace);
  return { asunto, texto, html };
}
