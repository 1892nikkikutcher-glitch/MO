/** Plantillas de mensajes de WhatsApp, editables desde Administración >
 * Formatos WhatsApp. Usan marcadores {{clave}} que se sustituyen con los
 * datos reales de la cita antes de enviarse. */

import type { CitaAgenda } from "@/lib/patientData";

export type FormatosWhatsApp = {
  confirmacionCita: string;
  encuestaSatisfaccion: string;
  reciboPago: string;
};

export const formatosWhatsAppInicial: FormatosWhatsApp = {
  confirmacionCita: `¡Hola, qué tal! Escribimos de *{{clinica}}* para confirmar la cita de *{{paciente}}* programada para el día *{{fecha}}* a las *{{hora}}* para *{{procedimiento}}*.

Costo estimado: *{{costo}}*

Le pedimos confirmar su asistencia respondiendo este mensaje. En caso de no confirmar, la cita podría ser cancelada sin previo aviso.

Por favor responda con una de estas opciones:
🟢 *Confirmo cita*
🟡 *Reagendar*
🔴 *Cancelar*

Si necesita reagendar o cancelar, agradecemos su aviso oportuno antes de las 04:00 pm del día anterior, para poder ofrecer el espacio a otro paciente y administrar mejor nuestros tiempos.

*Tolerancia máxima de 10 min. Anticipe sus tiempos para trámites en administración.*

¡Agradecemos su cooperación para atenderle como se merece, que tenga un lindo día!

*Horario de recepción:*
*Lun - vie 10:00 h a 18:00 h*
*Sáb 15:00 h a 18:00 h*`,
  encuestaSatisfaccion: `¡Hola *{{paciente}}*! Somos de *{{clinica}}*.

Gracias por confiarnos su *{{procedimiento}}*. Nos encantaría conocer su experiencia:

¿Qué calificación le daría a su atención, del 1 al 5? Y si gusta, cuéntenos qué podemos mejorar.

¡Gracias por su tiempo!`,
  reciboPago: `*Recibo de Pago*
*{{clinica}}*

Paciente: {{paciente}}
Fecha: {{fecha}}
Médico: {{medico}}
Forma de pago: {{formaPago}}

{{conceptos}}

*Total: {{total}}*{{proximaCita}}

¡Gracias por su confianza!`,
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

/** Suma meses a una fecha "YYYY-MM-DD" armándola por componentes en hora
 * local — `new Date("YYYY-MM-DD")` la interpreta como medianoche UTC, lo
 * que corre un día hacia atrás en timezones detrás de UTC (México). */
function sumarMeses(fechaISO: string, meses: number): string {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const fecha = new Date(y, m - 1 + meses, d);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

/** Texto listo para insertar en {{proximaCita}} del recibo de pago: la
 * siguiente cita agendada de ESTE paciente (fecha de hoy en adelante, sin
 * contar canceladas ni reagendadas — una reagendada deja su fecha vieja
 * intacta en su propio registro, así que contarla mostraría la fecha
 * equivocada). Si no tiene ninguna, en vez de dejar la línea vacía sugiere
 * una fecha tentativa de control a 6 meses de la fecha del pago — es solo
 * texto informativo, nunca agenda una cita real. */
export function buildProximaCitaTexto(citas: CitaAgenda[], patientId: string, fechaPago: string): string {
  const hoy = new Date();
  const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;

  const proxima = citas
    .filter(
      (c) =>
        c.patientId === patientId &&
        c.estatus !== "Cancelada" &&
        c.estatus !== "Reagendada" &&
        c.fecha >= hoyISO
    )
    .sort((a, b) => (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio))[0];

  if (proxima) {
    return `\n\nSu próxima cita es el ${formatFechaLarga(proxima.fecha)} a las ${formatHora12(proxima.horaInicio)}.`;
  }

  const tentativa = sumarMeses(fechaPago, 6);
  return `\n\nAún no tiene una próxima cita agendada — le sugerimos un control aproximadamente el ${formatFechaLarga(
    tentativa
  )} (6 meses después de esta visita). Contáctenos para agendarla.`;
}
