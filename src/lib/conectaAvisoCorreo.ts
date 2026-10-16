/** Aviso por correo al colega cuando le llega un caso (o lo invitan a verlo). Mejor esfuerzo: si no hay
 * correo configurado, si se alcanza un límite o si el envío falla, el caso NO se ve afectado — solo queda
 * anotado en el caso (`avisoCorreo`) para decírselo a quien lo envió. */

import { createHash } from "node:crypto";
import { authAdmin, dbAdmin } from "./firebaseAdmin";
import { aplicarRateLimit, nowISO } from "./conectaServer";
import { correoCasoNuevo, correoInvitacionCaso, type CorreoArmado } from "./correoConecta";
import { correoConfigurado, enviarCorreo } from "./enviarCorreoServidor";
import { urlInvitacion } from "./invitacionesConecta";
import type { AvisoCorreoCaso, EstadoAvisoCorreo, Interconsulta } from "./moConecta";

/** Mensajes por remitente por hora, y una sola vez por colega cada tantos minutos (varios casos
 * enviados juntos al mismo colega generan UN correo, no uno por caso). */
const LIMITE_POR_HORA = 30;
const MINUTOS_ENTRE_AVISOS_AL_MISMO_COLEGA = 10;

async function nombreDelRemitente(uid: string): Promise<string> {
  const snap = await dbAdmin.collection("perfilesProfesionalesPublicos").doc(uid).get();
  return (snap.exists ? (snap.data()?.nombreCompleto as string) : "") || "";
}

async function enviarAviso(args: {
  remitenteUid: string;
  /** Identifica al colega para agrupar (su uid o su correo). */
  claveColega: string;
  para: string;
  correo: CorreoArmado;
}): Promise<EstadoAvisoCorreo> {
  if (!correoConfigurado()) return "no_configurado";
  if (!(await aplicarRateLimit(`aviso_correo_${args.remitenteUid}`, LIMITE_POR_HORA, 60))) return "limite";
  const clavePar = createHash("sha256").update(`${args.remitenteUid}|${args.claveColega}`).digest("hex").slice(0, 32);
  if (!(await aplicarRateLimit(`aviso_correo_par_${clavePar}`, 1, MINUTOS_ENTRE_AVISOS_AL_MISMO_COLEGA))) return "agrupado";
  try {
    await enviarCorreo({ para: args.para, ...args.correo });
    return "enviado";
  } catch (err) {
    console.error("No se pudo enviar el aviso por correo de MO Conecta", err);
    return "fallo";
  }
}

/** Queda anotado en el caso, sin tocar `actualizadoEl` (no es un cambio del caso). */
async function anotarAviso(interconsultaId: string, estado: EstadoAvisoCorreo): Promise<AvisoCorreoCaso> {
  const aviso: AvisoCorreoCaso = { estado, fecha: nowISO() };
  await dbAdmin.collection("interconsultas").doc(interconsultaId).set({ avisoCorreo: aviso }, { merge: true });
  return aviso;
}

/** Colega que ya tiene cuenta en MO: se le escribe a su correo de la cuenta. */
export async function avisarCasoNuevoPorCorreo(
  interconsulta: Pick<Interconsulta, "id" | "odontologoRemitenteUid" | "destinatarioUid">,
  origen: string
): Promise<AvisoCorreoCaso | null> {
  if (!interconsulta.destinatarioUid) return null;
  let estado: EstadoAvisoCorreo;
  try {
    const usuario = await authAdmin.getUser(interconsulta.destinatarioUid);
    if (!usuario.email) {
      estado = "fallo";
    } else {
      const [remitenteNombre, perfilDestino] = await Promise.all([
        nombreDelRemitente(interconsulta.odontologoRemitenteUid),
        dbAdmin.collection("perfilesProfesionalesPublicos").doc(interconsulta.destinatarioUid).get(),
      ]);
      estado = await enviarAviso({
        remitenteUid: interconsulta.odontologoRemitenteUid,
        claveColega: interconsulta.destinatarioUid,
        para: usuario.email,
        correo: correoCasoNuevo({
          remitenteNombre,
          destinatarioNombre: perfilDestino.exists ? (perfilDestino.data()?.nombreCompleto as string) : undefined,
          enlace: origen,
        }),
      });
    }
  } catch (err) {
    console.error("No se pudo avisar por correo al colega", err);
    estado = "fallo";
  }
  return anotarAviso(interconsulta.id, estado);
}

/** Colega que todavía no está en MO: se le manda el enlace de invitación (un solo uso). */
export async function avisarInvitacionPorCorreo(args: {
  remitenteUid: string;
  interconsultaId: string;
  correo: string;
  destinatarioNombre?: string;
  tokenCrudo: string;
  origen: string;
  venceEl: string;
}): Promise<AvisoCorreoCaso> {
  const correoNormalizado = args.correo.trim().toLowerCase();
  const remitenteNombre = await nombreDelRemitente(args.remitenteUid);
  const vence = new Date(args.venceEl);
  const estado = await enviarAviso({
    remitenteUid: args.remitenteUid,
    claveColega: correoNormalizado,
    para: correoNormalizado,
    correo: correoInvitacionCaso({
      remitenteNombre,
      destinatarioNombre: args.destinatarioNombre,
      enlace: urlInvitacion(args.tokenCrudo, args.origen),
      vence: Number.isNaN(vence.getTime()) ? undefined : vence.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }),
    }),
  });
  return anotarAviso(args.interconsultaId, estado);
}
