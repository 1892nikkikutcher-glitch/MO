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
