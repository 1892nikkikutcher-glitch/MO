/** Con qué colega se comparte un caso de MO Conecta, para mostrarlo en las
 * listas. Pura (sin Firestore): recibe el caso, el directorio ya cargado y, si
 * el colega todavía no aceptó, el resumen de la invitación que el remitente
 * creó (ver /api/conecta/invitaciones). */

import type { Interconsulta } from "./moConecta";

export type ResumenInvitacionDeCaso = {
  destinatarioNombre: string | null;
  destinatarioCorreo: string | null;
  canal: string;
  estado: "activa" | "reclamada" | "vencida" | "cancelada";
  creadoEl: string;
  venceEl: string;
};

export type ColegaDelCaso = { nombre: string; detalle: string; pendiente: boolean };

const viaDeCanal: Record<string, string> = {
  whatsapp: "WhatsApp",
  correo: "correo",
  copiar_enlace: "enlace copiado",
};

/** El colega que ya aceptó (por su perfil), o, si todavía no, a quien se
 * invitó (nombre y correo que escribió el remitente), o "colega por
 * confirmar" si nunca se dio ese dato. */
export function colegaDelCaso(
  caso: Pick<Interconsulta, "odontologoRemitenteUid" | "destinatarioUid">,
  uid: string,
  directorio: { uid: string; nombreCompleto: string }[],
  invitacion: ResumenInvitacionDeCaso | undefined
): ColegaDelCaso {
  const otroUid = caso.odontologoRemitenteUid === uid ? caso.destinatarioUid : caso.odontologoRemitenteUid;
  if (otroUid) {
    return {
      nombre: directorio.find((p) => p.uid === otroUid)?.nombreCompleto ?? "un colega",
      detalle: "",
      pendiente: false,
    };
  }
  const nombre = invitacion?.destinatarioNombre || invitacion?.destinatarioCorreo || "colega por confirmar";
  const correo = invitacion?.destinatarioNombre ? invitacion.destinatarioCorreo ?? "" : "";
  const via = invitacion ? viaDeCanal[invitacion.canal] ?? invitacion.canal : "";
  const estado = !invitacion
    ? "Aún sin colega asignado"
    : invitacion.estado === "activa"
      ? `Invitación enviada por ${via}: pendiente de que la acepte`
      : invitacion.estado === "vencida"
        ? "La invitación venció sin que la aceptara — genera un enlace nuevo"
        : invitacion.estado === "cancelada"
          ? "La invitación fue cancelada"
          : "";
  return { nombre, detalle: [correo, estado].filter(Boolean).join(" · "), pendiente: true };
}
