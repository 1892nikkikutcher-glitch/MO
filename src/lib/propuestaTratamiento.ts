/** Propuesta de plan de tratamiento y presupuesto a partir del odontograma: lo que está
 * marcado "por tratar" (rojo, o sin color en diagnósticos anteriores) se ofrece ya listo,
 * con sus dientes y el tratamiento sugerido, para que el profesional solo confirme.
 * MO propone; no decide: el profesional ve y puede cambiar el tratamiento, la prioridad y
 * qué incluir antes de crear nada, y el presupuesto se abre para revisarlo antes de guardarse.
 * Pura (sin Firestore). */

import {
  todosLosDiagnosticosOdontograma,
  type ColorOdontograma,
  type EstadoDiagnosticoOdontograma,
  type HistoriaClinicaTemplate,
  type RespuestasHistoriaClinica,
} from "./historiaClinica";
import type { SuperficieDental } from "./odontograma";
import type { PlanTratamientoItem } from "./planTratamiento";
import { normalizarTexto } from "./reportes";

export type PropuestaTratamiento = {
  preguntaId: string;
  diagnosticoId: string;
  dientes: number[];
  superficiesPorDiente?: Record<number, SuperficieDental[]>;
  diagnostico: string;
  estado: EstadoDiagnosticoOdontograma | undefined;
  color?: ColorOdontograma;
  /** Con qué arranca la propuesta: el tratamiento sugerido por el médico al anotar el hallazgo,
   * el de su plan, o (si no había) uno del catálogo según el diagnóstico. Puede venir vacío. */
  tratamientoInicial: string;
  /** true si `tratamientoInicial` lo propuso MO según el diagnóstico (no lo escribió el médico). */
  tratamientoDeducido?: boolean;
  /** Si el hallazgo ya tiene un plan "tratar en clínica" activo que todavía no se cotizó:
   * se cotiza ese mismo, sin crear otro. */
  planExistente?: PlanTratamientoItem;
  /** Por qué todavía no se puede incluir (un hallazgo en sospecha no genera tratamiento). */
  bloqueo?: string;
};

/** Palabras del diagnóstico → palabras con las que buscar el tratamiento en el catálogo del
 * consultorio, en orden de prioridad. Solo sugiere procedimientos que YA existen en el catálogo
 * (así el precio sale solo y nunca se inventa un tratamiento); el profesional siempre lo revisa. */
const REGLAS_TRATAMIENTO: { diagnostico: string[]; catalogo: string[] }[] = [
  { diagnostico: ["pulpitis", "necrosis", "absceso", "periapical", "endodon", "conducto"], catalogo: ["endodoncia", "conducto"] },
  { diagnostico: ["resto radicular", "raiz residual", "no restaurable", "exodoncia", "extraccion", "tercer molar", "cordal", "retenid"], catalogo: ["extraccion", "exodoncia"] },
  { diagnostico: ["periodontitis", "bolsa", "movilidad", "recesion"], catalogo: ["curetaje", "raspado", "periodon"] },
  { diagnostico: ["gingivitis", "sarro", "calculo", "placa", "profilaxis", "gingival"], catalogo: ["profilaxis", "limpieza"] },
  { diagnostico: ["ausencia", "edentulo", "perdida dental", "diente faltante"], catalogo: ["implante", "puente", "protesis"] },
  { diagnostico: ["corona", "desajuste", "provisional"], catalogo: ["corona"] },
  { diagnostico: ["apinamiento", "maloclusion", "diastema", "mordida", "rotado", "giroversion"], catalogo: ["ortodoncia", "brackets"] },
  { diagnostico: ["mancha", "pigmentacion", "fluorosis", "blanqueamiento"], catalogo: ["blanqueamiento"] },
  { diagnostico: ["fisura", "sellador"], catalogo: ["sellador"] },
  { diagnostico: ["caries", "cariosa", "cavidad", "obturacion", "fractura", "desgaste", "abfraccion", "erosion"], catalogo: ["resina", "obturacion"] },
];

/** El procedimiento del catálogo que mejor corresponde a un diagnóstico, o "" si no hay uno claro.
 * Entre varios candidatos gana el que comparte más palabras con el diagnóstico (ej. "clase II"),
 * y a igualdad el de nombre más corto. */
export function sugerirTratamientoDelCatalogo(diagnostico: string, nombresCatalogo: string[]): string {
  const d = normalizarTexto(diagnostico);
  if (!d) return "";
  // Las clases se escriben con numeral romano (I, II, V…): una letra suelta también cuenta.
  const tokens = d.split(/[^a-z0-9]+/).filter(Boolean);
  for (const regla of REGLAS_TRATAMIENTO) {
    if (!regla.diagnostico.some((k) => d.includes(k))) continue;
    for (const palabra of regla.catalogo) {
      const candidatos = nombresCatalogo.filter((n) => normalizarTexto(n).includes(palabra));
      if (candidatos.length === 0) continue;
      const puntaje = (n: string) => {
        const nombre = normalizarTexto(n);
        return tokens.filter((t) => t.length >= 3 || /^[ivx]+$/.test(t) ? new RegExp(`(^|[^a-z0-9])${t}([^a-z0-9]|$)`).test(nombre) : false).length;
      };
      return candidatos.slice().sort((a, b) => puntaje(b) - puntaje(a) || a.length - b.length)[0];
    }
  }
  return "";
}

export const MOTIVO_SOSPECHA =
  "Está en sospecha: confírmalo en Historia Clínica antes de tratarlo.";

/** Hallazgos del odontograma que faltan por tratar y todavía no están en un plan o
 * presupuesto. Se omiten: los descartados, sin diagnóstico, los pintados en azul (ya
 * realizados), los ya ligados a un presupuesto, y los que ya tienen una decisión distinta de
 * tratar (referir, vigilar, sin tratamiento) o ya se cotizaron o completaron. */
export function propuestaDesdeOdontograma(
  template: HistoriaClinicaTemplate,
  respuestas: RespuestasHistoriaClinica,
  planes: PlanTratamientoItem[],
  /** Nombres del catálogo de procedimientos activos, para sugerir un tratamiento cuando el
   * hallazgo no trae uno. */
  nombresCatalogo: string[] = []
): PropuestaTratamiento[] {
  const propuesta: PropuestaTratamiento[] = [];
  for (const { preguntaId, diagnostico: d } of todosLosDiagnosticosOdontograma(template, respuestas)) {
    if (d.estado === "descartado" || !d.diagnostico?.trim()) continue;
    if (d.color === "azul") continue;
    if (d.presupuestoId) continue;
    if (!d.dientes || d.dientes.length === 0) continue;

    const planesDelHallazgo = planes.filter((p) => p.diagnosticoId === d.id && p.estadoClinico !== "cancelado");
    let planExistente: PlanTratamientoItem | undefined;
    if (planesDelHallazgo.length > 0) {
      // Ya hay una decisión: solo sigue siendo propuesta si es "tratar" y aún no se cotizó.
      const sinCotizar = planesDelHallazgo.find(
        (p) => p.destino === "tratamiento_clinica" && p.estadoClinico === "activo" && (p.presupuestosVinculados ?? []).length === 0
      );
      if (!sinCotizar || planesDelHallazgo.some((p) => (p.presupuestosVinculados ?? []).length > 0)) continue;
      planExistente = sinCotizar;
    }

    const propio = (planExistente?.tratamiento || d.tratamientoSugerido || "").trim();
    const deducido = propio ? "" : sugerirTratamientoDelCatalogo(d.diagnostico, nombresCatalogo);
    propuesta.push({
      preguntaId,
      diagnosticoId: d.id,
      dientes: d.dientes,
      superficiesPorDiente: d.superficiesPorDiente,
      diagnostico: d.diagnostico.trim(),
      estado: d.estado,
      color: d.color,
      tratamientoInicial: propio || deducido,
      ...(deducido ? { tratamientoDeducido: true } : {}),
      planExistente,
      bloqueo: d.estado === "sospecha" ? MOTIVO_SOSPECHA : undefined,
    });
  }
  return propuesta;
}
