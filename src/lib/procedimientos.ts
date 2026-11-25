/** Catálogo de procedimientos: valores base (costo al paciente, costo al
 * odontólogo, tiempo estimado) agrupados por especialidad. Es la fuente de
 * verdad que después alimentará presupuestos, comisiones y duración por
 * defecto en la Agenda. */

import type { UnidadCobro } from "./patientData";

export const especialidadesPredefinidas = [
  "Odontología General",
  "O. Preventiva",
  "Operatoria Dental",
  "Ortodoncia y Ortopedia",
  "Endodoncia",
  "Periodoncia",
  "Cirugía Bucal",
  "Odontopediatría",
  "Prótesis",
  "Estética Dental",
  "Implantología",
] as const;

/** Ramas base que cambiaron de nombre: lo que se guardó con el nombre de antes se lee (y se migra) con el de ahora. */
export const ESPECIALIDADES_RENOMBRADAS: Record<string, string> = {
  Ortodoncia: "Ortodoncia y Ortopedia",
  "Cirugía Oral y Maxilofacial": "Cirugía Bucal",
};

/** El nombre actual de una especialidad (el mismo si nunca se renombró). */
export function especialidadVigente(especialidad: string): string {
  return ESPECIALIDADES_RENOMBRADAS[(especialidad ?? "").trim()] ?? especialidad;
}

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
    const nombre = especialidadVigente(p.especialidad);
    const lista = grupos.get(nombre) ?? [];
    lista.push(p);
    grupos.set(nombre, lista);
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

/** La tarjeta que junta todos los tratamientos del catálogo (no es una rama: no se renombra ni recibe tratamientos arrastrados). */
export const RAMA_TODOS = "Todos los tratamientos";

export type OrdenProcedimientos = "nombre-asc" | "nombre-desc" | "precio-asc" | "precio-desc";

export const opcionesOrdenProcedimientos: { valor: OrdenProcedimientos; etiqueta: string }[] = [
  { valor: "nombre-asc", etiqueta: "Alfabético (A–Z)" },
  { valor: "nombre-desc", etiqueta: "Alfabético (Z–A)" },
  { valor: "precio-asc", etiqueta: "Precio: menor a mayor" },
  { valor: "precio-desc", etiqueta: "Precio: mayor a menor" },
];

/** Una copia ordenada. Por precio se usa el costo al paciente; los que todavía no tienen precio ($0) van al final en ambos sentidos,
 * y a igual precio se desempata por nombre. */
export function ordenarProcedimientos(lista: Procedimiento[], orden: OrdenProcedimientos): Procedimiento[] {
  const porNombre = (a: Procedimiento, b: Procedimiento) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
  return [...lista].sort((a, b) => {
    if (orden === "nombre-asc") return porNombre(a, b);
    if (orden === "nombre-desc") return porNombre(b, a);
    const sinA = !(a.costoPaciente > 0);
    const sinB = !(b.costoPaciente > 0);
    if (sinA !== sinB) return sinA ? 1 : -1;
    const dif = orden === "precio-asc" ? a.costoPaciente - b.costoPaciente : b.costoPaciente - a.costoPaciente;
    return dif !== 0 ? dif : porNombre(a, b);
  });
}

export function esSinClasificar(p: Pick<Procedimiento, "especialidad">): boolean {
  const e = (p.especialidad ?? "").trim().toLowerCase();
  return e === "" || e === ESPECIALIDAD_SIN_CLASIFICAR.toLowerCase();
}

export function esEspecialidadPredefinida(especialidad: string): boolean {
  return (especialidadesPredefinidas as readonly string[]).includes(especialidad);
}

/** Nombre de rama listo para guardar: espacios limpios y la primera letra en mayúscula. */
export function normalizarNombreRama(nombre: string): string {
  const t = nombre.replace(/\s+/g, " ").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

/** Para comparar nombres de rama sin que importen mayúsculas, acentos ni espacios sobrantes. */
const claveRama = (nombre: string) =>
  nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** null si el nombre sirve para una rama; si no, el motivo en palabras de quien lo escribe. `existentes` son los
 * nombres de todas las ramas; `actual` es la rama que se está renombrando (puede conservar su propio nombre). */
export function validarNombreRama(nombre: string, existentes: string[], actual?: string): string | null {
  // Un nombre anterior de una rama base («Ortodoncia») cuenta como esa rama («Ortodoncia y Ortopedia»).
  const limpio = especialidadVigente(normalizarNombreRama(nombre));
  if (!limpio) return "Escribe el nombre de la rama.";
  if (limpio.length > 60) return "El nombre es muy largo (máximo 60 letras).";
  if (claveRama(limpio) === claveRama(ESPECIALIDAD_SIN_CLASIFICAR)) return "«Sin clasificar» ya existe y no se puede repetir.";
  if (claveRama(limpio) === claveRama(RAMA_TODOS)) return "«Todos los tratamientos» es la tarjeta que junta todo y no se puede usar como nombre de rama.";
  const choca = existentes.some((e) => claveRama(e) === claveRama(limpio) && !(actual && claveRama(actual) === claveRama(e)));
  return choca ? "Ya existe una rama con ese nombre." : null;
}

/** Guarda con el nombre actual lo que quedó con el nombre anterior de una rama base. Devuelve la MISMA lista si no hay nada
 * que cambiar (así quien la llama sabe que no hace falta guardar). */
export function migrarEspecialidadesRenombradas(procedimientos: Procedimiento[], ahora: string): Procedimiento[] {
  if (!procedimientos.some((p) => especialidadVigente(p.especialidad) !== p.especialidad)) return procedimientos;
  return procedimientos.map((p) => {
    const vigente = especialidadVigente(p.especialidad);
    return vigente === p.especialidad ? p : { ...p, especialidad: vigente, actualizadoEl: ahora };
  });
}

/** Pasa a otro nombre de rama todos los procedimientos de `de`. */
export function renombrarRama(procedimientos: Procedimiento[], de: string, a: string, ahora: string): Procedimiento[] {
  return procedimientos.map((p) => (p.especialidad === de ? { ...p, especialidad: a, actualizadoEl: ahora } : p));
}

/** Al quitar una rama, sus procedimientos no se pierden: pasan a «Sin clasificar». */
export function quitarRama(procedimientos: Procedimiento[], rama: string, ahora: string): Procedimiento[] {
  return renombrarRama(procedimientos, rama, ESPECIALIDAD_SIN_CLASIFICAR, ahora);
}

export type RamaCatalogo = {
  /** Nombre de la rama (la especialidad, o «Sin clasificar»). */
  nombre: string;
  sinClasificar: boolean;
  /** true si la creó la clínica (se puede renombrar y quitar); las ramas base y «Sin clasificar» no. */
  propia: boolean;
  procedimientos: Procedimiento[];
  /** Precios al paciente de los que ya tienen precio (para mostrar «desde / hasta»). */
  desde: number | null;
  hasta: number | null;
};

/** Las ramas de la odontología con sus procedimientos: primero las predefinidas (aunque estén vacías, para que se vea
 * la estructura), luego las que la clínica creó, y «Sin clasificar» al frente si tiene algo por ubicar o al final si no. */
export function ramasDelCatalogo(procedimientos: Procedimiento[], ramasPropias: string[] = []): RamaCatalogo[] {
  const porNombre = new Map<string, Procedimiento[]>();
  const sin: Procedimiento[] = [];
  for (const p of procedimientos) {
    if (esSinClasificar(p)) {
      sin.push(p);
    } else {
      const nombre = especialidadVigente(p.especialidad);
      porNombre.set(nombre, [...(porNombre.get(nombre) ?? []), p]);
    }
  }
  // Las ramas que la clínica creó aparecen aunque todavía no tengan procedimientos.
  for (const nombre of ramasPropias) {
    const limpio = especialidadVigente(normalizarNombreRama(nombre));
    if (limpio && !esEspecialidadPredefinida(limpio) && claveRama(limpio) !== claveRama(ESPECIALIDAD_SIN_CLASIFICAR) && !porNombre.has(limpio)) {
      porNombre.set(limpio, []);
    }
  }
  const rama = (nombre: string, lista: Procedimiento[], sinClasificar: boolean): RamaCatalogo => {
    const precios = lista.map((p) => p.costoPaciente).filter((c) => c > 0);
    return {
      nombre,
      sinClasificar,
      propia: !sinClasificar && !esEspecialidadPredefinida(nombre),
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
