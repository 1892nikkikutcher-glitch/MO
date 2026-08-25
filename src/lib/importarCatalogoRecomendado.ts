/** Lógica pura (sin Firebase) para importar el catálogo recomendado al
 * catálogo real de una clínica: clasifica cada plantilla contra lo que la
 * clínica ya tiene, sin duplicar ni pisar nada. Framework-free a propósito
 * — es lo que se prueba con Vitest. */

import type { Procedimiento } from "./procedimientos";
import type { PlantillaProcedimiento } from "./catalogoRecomendado";

export type Clasificacion = "nuevo" | "ya_existe" | "posible_duplicado";

export type Candidato = {
  plantilla: PlantillaProcedimiento;
  clasificacion: Clasificacion;
  /** id del procedimiento existente con el que coincide (exacto o posible duplicado). */
  coincidenciaId?: string;
  coincidenciaNombre?: string;
  /** 0-1, solo presente en "posible_duplicado". */
  similitud?: number;
};

const UMBRAL_DUPLICADO = 0.82;

const DIACRITICOS_COMBINABLES = /[̀-ͯ]/g;

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(DIACRITICOS_COMBINABLES, "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ");
}

function distanciaLevenshtein(a: string, b: string): number {
  const filas = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: filas }, () => new Array(cols).fill(0));
  for (let i = 0; i < filas; i++) d[i][0] = i;
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < filas; i++) {
    for (let j = 1; j < cols; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + costo);
    }
  }
  return d[filas - 1][cols - 1];
}

export function similitudNombres(a: string, b: string): number {
  const na = normalizar(a);
  const nb = normalizar(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const dist = distanciaLevenshtein(na, nb);
  return 1 - dist / Math.max(na.length, nb.length, 1);
}

/** Clasifica cada plantilla contra el catálogo actual de la clínica.
 *
 * - "ya_existe": ya hay un procedimiento con `origenPlantillaId` igual al
 *   código de la plantilla — coincidencia exacta y única señal de
 *   deduplicación al reimportar.
 * - "posible_duplicado": solo se compara contra procedimientos SIN código
 *   (creados a mano por la clínica), por similitud de nombre — informativo,
 *   nunca bloquea la importación.
 * - "nuevo": no hay coincidencia de ningún tipo. */
export function clasificarPlantillas(
  plantillas: PlantillaProcedimiento[],
  existentes: Procedimiento[]
): Candidato[] {
  const porCodigo = new Map<string, Procedimiento>();
  const sinCodigo: Procedimiento[] = [];
  existentes.forEach((p) => {
    if (p.origenPlantillaId) porCodigo.set(p.origenPlantillaId, p);
    else sinCodigo.push(p);
  });

  return plantillas.map((plantilla) => {
    const exacto = porCodigo.get(plantilla.codigo);
    if (exacto) {
      return {
        plantilla,
        clasificacion: "ya_existe" as const,
        coincidenciaId: exacto.id,
        coincidenciaNombre: exacto.nombre,
      };
    }

    let mejor: { p: Procedimiento; sim: number } | null = null;
    for (const p of sinCodigo) {
      const sim = similitudNombres(plantilla.nombre, p.nombre);
      if (sim >= UMBRAL_DUPLICADO && (!mejor || sim > mejor.sim)) {
        mejor = { p, sim };
      }
    }
    if (mejor) {
      return {
        plantilla,
        clasificacion: "posible_duplicado" as const,
        coincidenciaId: mejor.p.id,
        coincidenciaNombre: mejor.p.nombre,
        similitud: mejor.sim,
      };
    }

    return { plantilla, clasificacion: "nuevo" as const };
  });
}

/** Id determinista para un procedimiento creado desde una plantilla —
 * distinto del `proc${Date.now()}` que usa el formulario manual. Determinista
 * a propósito: un doble envío o una reimportación accidental sobrescribe el
 * mismo documento en vez de crear uno nuevo. */
export function idDesdeCodigo(codigo: string): string {
  return `proc_${codigo}`;
}

/** Arma el procedimiento real (sin id) que se va a escribir en Firestore a
 * partir de una plantilla — sin precios, listo para que la clínica los
 * configure. */
export function crearProcedimientoDesdeTemplate(
  plantilla: PlantillaProcedimiento,
  ahora: string
): Omit<Procedimiento, "id"> {
  return {
    nombre: plantilla.nombre,
    especialidad: plantilla.especialidadSugerida,
    costoPaciente: 0,
    costoOdontologo: 0,
    duracionMinutos: plantilla.duracionMinutosSugerida,
    activo: true,
    visibilidad: "interna",
    origenPlantillaId: plantilla.codigo,
    creadoEl: ahora,
    actualizadoEl: ahora,
  };
}
