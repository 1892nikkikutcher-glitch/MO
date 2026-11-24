/** Catálogo de procedimientos: valores base (costo al paciente, costo al
 * odontólogo, tiempo estimado) agrupados por especialidad. Es la fuente de
 * verdad que después alimentará presupuestos, comisiones y duración por
 * defecto en la Agenda. */

import type { UnidadCobro } from "./patientData";

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
  /** Cómo se cobra: por diente (lo habitual), superficie, arcada, sesión, procedimiento completo o paquete de precio
   * fijo. Ausente = por diente. */
  unidadCobro?: UnidadCobro;
  /** true si el costo al odontólogo todavía no se ha capturado (por ejemplo, un procedimiento que se agregó al
   * vuelo al presupuestar): se muestra como "sin configurar", no como $0, y no se usa para calcular comisiones. */
  costoSinConfigurar?: boolean;
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

/** Dónde caen los procedimientos que todavía no se ubican en su rama (por ejemplo, los de una lista de precios con grupos
 * que no son una especialidad): el dueño los acomoda después. */
export const ESPECIALIDAD_SIN_CLASIFICAR = "Sin clasificar";

export function esSinClasificar(p: Pick<Procedimiento, "especialidad">): boolean {
  const e = (p.especialidad ?? "").trim().toLowerCase();
  return e === "" || e === ESPECIALIDAD_SIN_CLASIFICAR.toLowerCase();
}

export function esEspecialidadPredefinida(especialidad: string): boolean {
  return (especialidadesPredefinidas as readonly string[]).includes(especialidad);
}

export type RamaCatalogo = {
  /** Nombre de la rama (la especialidad, o «Sin clasificar»). */
  nombre: string;
  sinClasificar: boolean;
  procedimientos: Procedimiento[];
  /** Precios al paciente de los que ya tienen precio (para mostrar «desde / hasta»). */
  desde: number | null;
  hasta: number | null;
};

/** Las ramas de la odontología con sus procedimientos: primero las predefinidas (aunque estén vacías, para que se vea
 * la estructura), luego las que la clínica creó, y «Sin clasificar» al frente si tiene algo por ubicar o al final si no. */
export function ramasDelCatalogo(procedimientos: Procedimiento[]): RamaCatalogo[] {
  const porNombre = new Map<string, Procedimiento[]>();
  const sin: Procedimiento[] = [];
  for (const p of procedimientos) {
    if (esSinClasificar(p)) sin.push(p);
    else porNombre.set(p.especialidad, [...(porNombre.get(p.especialidad) ?? []), p]);
  }
  const rama = (nombre: string, lista: Procedimiento[], sinClasificar: boolean): RamaCatalogo => {
    const precios = lista.map((p) => p.costoPaciente).filter((c) => c > 0);
    return {
      nombre,
      sinClasificar,
      procedimientos: [...lista].sort((a, b) => a.nombre.localeCompare(b.nombre)),
      desde: precios.length ? Math.min(...precios) : null,
      hasta: precios.length ? Math.max(...precios) : null,
    };
  };
  const predefinidas = especialidadesPredefinidas.map((e) => rama(e, porNombre.get(e) ?? [], false));
  const propias = [...porNombre.keys()]
    .filter((e) => !esEspecialidadPredefinida(e))
    .sort((a, b) => a.localeCompare(b))
    .map((e) => rama(e, porNombre.get(e) ?? [], false));
  const ramaSin = rama(ESPECIALIDAD_SIN_CLASIFICAR, sin, true);
  return sin.length > 0 ? [ramaSin, ...predefinidas, ...propias] : [...predefinidas, ...propias, ramaSin];
}
