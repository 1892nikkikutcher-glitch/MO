/** Laboratorios dentales cercanos al consultorio a los que se envían
 * trabajos de prótesis, ortodoncia u otros — directorio de contacto,
 * separado del seguimiento de órdenes de trabajo por paciente (ver
 * SolicitudLaboratorio en patientData.ts). */

export type LaboratorioDental = {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  notas: string;
};

export function limpiarTelefono(telefono: string): string {
  return telefono.replace(/\D/g, "");
}

/** Mensaje de WhatsApp para contactar a un laboratorio dental registrado. */
export function buildMensajeLaboratorioDental(
  clinicaNombre: string,
  laboratorio: LaboratorioDental
): string {
  return `Hola, te escribo desde ${clinicaNombre || "el consultorio"} para enviar un trabajo a ${laboratorio.nombre}. ¿Me confirmas disponibilidad?`;
}

/** Se muestran como chips seleccionables (ver OrdenTrabajoDialog en
 * LaboratorioDental.tsx) — "Otro" en ENTREGA_OPCIONES se resuelve ahí con
 * su propio texto libre antes de llegar a `entregaItems`, así que este
 * módulo nunca necesita distinguirlo de los demás. */
export const ENTREGA_OPCIONES = ["Antagonista", "Registro oclusal", "Porta impresiones", "Otro"] as const;
export const ETAPA_OPCIONES = [
  "Prueba de resina",
  "Rodillos",
  "Metales",
  "Dientes",
  "Color",
  "Bizcocho",
  "Terminado",
] as const;

/** Orden de trabajo para un laboratorio — ephemeral, solo vive mientras se
 * arma el mensaje de WhatsApp (a diferencia de SolicitudLaboratorio en
 * patientData.ts, que sí se guarda por paciente). Todo campo salvo
 * medico/paciente/trabajo es opcional — buildMensajeOrdenTrabajo omite en
 * el mensaje cualquiera que llegue vacío. */
export type OrdenTrabajoLaboratorio = {
  numeroOrden: string;
  fechaIngreso: string;
  fechaEntrega: string;
  medico: string;
  paciente: string;
  trabajo: string;
  dientes: number[];
  especificaciones: string;
  entregaItems: string[];
  etapaItems: string[];
};

/** Mensaje de WhatsApp con la orden de trabajo completa para el
 * laboratorio — siempre cierra preguntando por el costo. */
export function buildMensajeOrdenTrabajo(clinicaNombre: string, orden: OrdenTrabajoLaboratorio): string {
  const lineas: string[] = [`Hola, te envío una orden de trabajo desde ${clinicaNombre || "el consultorio"}.`];

  if (orden.numeroOrden.trim()) lineas.push(`N° de orden: ${orden.numeroOrden.trim()}`);
  if (orden.fechaIngreso.trim()) lineas.push(`Fecha de ingreso: ${orden.fechaIngreso.trim()}`);
  if (orden.fechaEntrega.trim()) lineas.push(`Fecha de entrega: ${orden.fechaEntrega.trim()}`);
  lineas.push(`Doctor(a): ${orden.medico}`);
  lineas.push(`Paciente: ${orden.paciente.trim()}`);
  lineas.push(`Trabajo a realizar: ${orden.trabajo.trim()}`);

  if (orden.dientes.length > 0) {
    lineas.push(`Órgano(s) dental(es): OD ${[...orden.dientes].sort((a, b) => a - b).join(", ")}`);
  }
  if (orden.especificaciones.trim()) lineas.push(`Especificaciones: ${orden.especificaciones.trim()}`);
  if (orden.entregaItems.length > 0) lineas.push(`Se entrega: ${orden.entregaItems.join(", ")}`);
  if (orden.etapaItems.length > 0) lineas.push(`Etapa: ${orden.etapaItems.join(", ")}`);

  lineas.push("¿Me confirmas el costo?");
  return lineas.join("\n");
}
