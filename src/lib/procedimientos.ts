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

export type Procedimiento = {
  id: string;
  nombre: string;
  especialidad: string;
  costoPaciente: number;
  costoOdontologo: number;
  duracionMinutos: number;
};

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
