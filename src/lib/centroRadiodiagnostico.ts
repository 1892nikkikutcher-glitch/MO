/** Centros de radiodiagnóstico (radiografías, tomografías, etc.) cercanos al
 * consultorio a los que se refiere a los pacientes para estudios de imagen. */

export type CentroRadiodiagnostico = {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  notas: string;
};

export function limpiarTelefono(telefono: string): string {
  return telefono.replace(/\D/g, "");
}

/** Mensaje de WhatsApp para referir un estudio de imagen a un centro de
 * radiodiagnóstico registrado. */
export function buildMensajeCentroRadiodiagnostico(
  clinicaNombre: string,
  centro: CentroRadiodiagnostico
): string {
  return `Hola, te escribo desde ${clinicaNombre || "el consultorio"} para referir a un paciente a ${centro.nombre} para un estudio de imagen. ¿Me confirmas disponibilidad?`;
}
