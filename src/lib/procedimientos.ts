/** Catálogo de procedimientos: valores base (costo al paciente, costo al
 * odontólogo, tiempo estimado) agrupados por especialidad. Es la fuente de
 * verdad que después alimentará presupuestos, comisiones y duración por
 * defecto en la Agenda. */

export const especialidadesPredefinidas = [
  "Odontología General",
  "Ortodoncia",
  "Endodoncia",
  "Periodoncia",
  "Cirugía Oral y Maxilofacial",
  "Odontopediatría",
  "Prótesis",
  "Estética Dental",
  "Implantología",
  "Radiología",
] as const;

export type VisibilidadProcedimiento = "interna" | "publica";

export type Procedimiento = {
  id: string;
  nombre: string;
  especialidad: string;
  costoPaciente: number;
  costoOdontologo: number;
  duracionMinutos: number;
  /** Ausente o true = activo. Desactivar oculta el procedimiento del picker
   * de Nuevo Presupuesto sin borrarlo (a diferencia de eliminar, que sí es
   * permanente). */
  activo?: boolean;
  /** "interna" (solo uso del consultorio) o "publica". Hoy no existe ninguna
   * pantalla de paciente en la plataforma que lea este campo — se guarda
   * correctamente para cuando exista, sin efecto visible todavía. */
  visibilidad?: VisibilidadProcedimiento;
  precioPromocional?: number;
  /** Costo de insumos/laboratorio — distinto de costoOdontologo, que es la
   * comisión del odontólogo. */
  costoInterno?: number;
  notasInternas?: string;
  /** Código permanente del catálogo recomendado (ej. "CON-VAL") si este
   * procedimiento se creó a partir de una plantilla — es la clave que evita
   * duplicados al reimportar. Ausente = creado manualmente por la clínica. */
  origenPlantillaId?: string;
  creadoEl?: string;
  actualizadoEl?: string;
};

export function esProcedimientoActivo(p: Procedimiento): boolean {
  return p.activo !== false;
}

export function agruparPorEspecialidad(
  procedimientos: Procedimiento[]
): { especialidad: string; procedimientos: Procedimiento[] }[] {
  const grupos = new Map<string, Procedimiento[]>();
  procedimientos.forEach((p) => {
    const lista = grupos.get(p.especialidad) ?? [];
    lista.push(p);
    grupos.set(p.especialidad, lista);
  });
  return Array.from(grupos.entries())
    .map(([especialidad, lista]) => ({
      especialidad,
      procedimientos: lista.sort((a, b) => a.nombre.localeCompare(b.nombre)),
    }))
    .sort((a, b) => a.especialidad.localeCompare(b.especialidad));
}

export function formatDuracion(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}
