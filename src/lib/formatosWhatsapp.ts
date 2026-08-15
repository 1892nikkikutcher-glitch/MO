/** Plantillas de mensajes de WhatsApp, editables desde Administración >
 * Formatos WhatsApp. Usan marcadores {{clave}} que se sustituyen con los
 * datos reales de la cita antes de enviarse. */

export type FormatosWhatsApp = {
  confirmacionCita: string;
  encuestaSatisfaccion: string;
};

export const formatosWhatsAppInicial: FormatosWhatsApp = {
  confirmacionCita: `¡Hola, qué tal! Escribimos de *{{clinica}}* para confirmar la cita de *{{paciente}}* programada para el día *{{fecha}}* a las *{{hora}}* para *{{procedimiento}}*.

Costo estimado: *{{costo}}*

Le pedimos confirmar su asistencia respondiendo este mensaje. En caso de no confirmar, la cita podría ser cancelada sin previo aviso.

Si necesita reagendar o cancelar, agradecemos su aviso oportuno antes de las 04:00 pm del día anterior, para poder ofrecer el espacio a otro paciente y administrar mejor nuestros tiempos.

*Tolerancia máxima de 15 min. Anticipe sus tiempos para trámites en administración.*

¡Agradecemos su cooperación para atenderle como se merece, que tenga un lindo día!

*Horario de recepción:*
*Lun - vie 10:00 h a 18:00 h*
*Sáb 15:00 h a 18:00 h*`,
  encuestaSatisfaccion: `¡Hola *{{paciente}}*! Somos de *{{clinica}}*.

Gracias por confiarnos su *{{procedimiento}}*. Nos encantaría conocer su experiencia:

¿Qué calificación le daría a su atención, del 1 al 5? Y si gusta, cuéntenos qué podemos mejorar.

¡Gracias por su tiempo!`,
};

export function renderPlantilla(plantilla: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (texto, [clave, valor]) => texto.split(`{{${clave}}}`).join(valor),
    plantilla
  );
}

const MESES_LARGO = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function formatFechaLarga(fechaISO: string): string {
  const d = new Date(`${fechaISO}T00:00:00`);
  if (Number.isNaN(d.getTime())) return fechaISO;
  return `${d.getDate()} de ${MESES_LARGO[d.getMonth()]} de ${d.getFullYear()}`;
}

export function formatHora12(hora24: string): string {
  const [hStr, mStr] = hora24.split(":");
  let h = Number(hStr);
  if (Number.isNaN(h)) return hora24;
  const m = (mStr ?? "00").padStart(2, "0");
  const sufijo = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${m} ${sufijo}`;
}
