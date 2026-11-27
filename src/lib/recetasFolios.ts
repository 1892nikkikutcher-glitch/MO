import type { Receta } from "@/lib/patientData";
import type { RecetaLogEntry } from "@/lib/recetasLog";

/** Un cambio de folio en una receta guardada en el expediente de un paciente. */
export type CambioFolioReceta = { patientId: string; recetaId: string; folioAnterior: string; folioNuevo: string };

export type PlanRenumeracion = {
  /** Recetas del expediente cuyo folio cambia. */
  cambios: CambioFolioReceta[];
  /** Bitácora completa ya renumerada y sin filas repetidas. */
  bitacora: RecetaLogEntry[];
  /** Valor para `folioReceta.siguiente`: el que sigue al último folio asignado. */
  siguiente: number;
  /** Filas de la bitácora que se fusionaron con otra por ser la misma receta repetida. */
  repetidasFusionadas: number;
};

/** ¿Los folios de la bitácora (en orden de creación) son 1, 2, 3… sin repetir ni saltarse? */
export function foliosIrregulares(bitacora: RecetaLogEntry[]): boolean {
  const ordenados = [...bitacora].sort((a, b) => a.creadoEn.localeCompare(b.creadoEn));
  return ordenados.some((fila, i) => fila.folio !== String(i + 1));
}

/**
 * Calcula cómo dejar los folios consecutivos (1, 2, 3…) y sin repetir, en el orden en que se
 * expidieron las recetas. Función pura: no toca Firestore.
 *
 * - Las filas repetidas de la bitácora (mismo paciente y mismo folio, o el mismo id) cuentan como UNA
 *   receta: eran reintentos de envío, no recetas distintas.
 * - Cada fila se liga con su receta del expediente por id; si esa receta ya no existe con ese id
 *   (un reintento la reemplazó), por paciente + folio.
 * - Una fila sin receta en el expediente se conserva en la bitácora (se expidió) y recibe su número,
 *   pero no hay nada que actualizar en el expediente.
 */
export function planificarRenumeracion(
  bitacora: RecetaLogEntry[],
  recetasPorPaciente: Record<string, Receta[]>
): PlanRenumeracion {
  type Grupo = { filas: RecetaLogEntry[]; receta?: Receta };
  const grupos: Grupo[] = [];
  const porClave = new Map<string, Grupo>();

  const clavesDe = (fila: RecetaLogEntry) => [`id:${fila.patientId}:${fila.id}`, `folio:${fila.patientId}:${fila.folio}`];

  // El orden de recorrido es el de creación, para que el grupo "ancla" sea el reintento más antiguo.
  const ordenadas = [...bitacora].sort((a, b) => a.creadoEn.localeCompare(b.creadoEn) || a.id.localeCompare(b.id));
  for (const fila of ordenadas) {
    const claves = clavesDe(fila);
    let grupo = claves.map((c) => porClave.get(c)).find(Boolean);
    if (!grupo) {
      grupo = { filas: [] };
      grupos.push(grupo);
    }
    grupo.filas.push(fila);
    for (const c of claves) porClave.set(c, grupo);
  }

  for (const grupo of grupos) {
    const { patientId } = grupo.filas[0];
    const lista = recetasPorPaciente[patientId] ?? [];
    grupo.receta =
      lista.find((r) => grupo.filas.some((f) => f.id === r.id)) ??
      lista.find((r) => grupo.filas.some((f) => f.folio === r.folio));
  }

  // Orden de expedición: por la fecha de creación más antigua del grupo.
  grupos.sort((a, b) => a.filas[0].creadoEn.localeCompare(b.filas[0].creadoEn) || a.filas[0].id.localeCompare(b.filas[0].id));

  const cambios: CambioFolioReceta[] = [];
  const nuevaBitacora: RecetaLogEntry[] = grupos.map((grupo, i) => {
    const folioNuevo = String(i + 1);
    const base = grupo.filas[0];
    if (grupo.receta && grupo.receta.folio !== folioNuevo) {
      cambios.push({ patientId: base.patientId, recetaId: grupo.receta.id, folioAnterior: grupo.receta.folio, folioNuevo });
    }
    // La fila que queda lleva el id de la receta del expediente, para que "Ver receta" la encuentre directo.
    return { ...base, id: grupo.receta?.id ?? base.id, folio: folioNuevo };
  });

  return {
    cambios,
    bitacora: nuevaBitacora,
    siguiente: nuevaBitacora.length + 1,
    repetidasFusionadas: bitacora.length - nuevaBitacora.length,
  };
}
