/** Máquina de estados pura de una migración de expediente (arquitectura MO
 * Conecta v3, §11) — separada de cualquier función que toque Firestore para
 * poder probarla con Vitest sin emulador. `migracionesExpediente.ts` (Fase
 * 2, todavía no escrito) envuelve estas funciones dentro de las
 * transacciones/lotes reales. */

import type { Timestamp } from "firebase-admin/firestore";

export type ProgresoSeccionMigracion = {
  copiados: number;
  total: number;
  estado: "pendiente" | "en_progreso" | "completo" | "error";
  error?: string;
};

export type MigracionExpediente = {
  id: string; // clinicaOrigenId_patientIdOrigen — determinístico, ver v3 §11
  patientIdOrigen: string;
  clinicaOrigenId: string;
  /** uid de quien disparó `iniciarMigracion` — el plan (v3 §11 paso 2) no
   * lo nombra explícitamente, pero crear la participación responsable_
   * principal (participaciones.ts) exige un `createdBy`, y el expediente
   * (expedienteClinico.ts) exige un `responsablePrincipalUid`; ninguno de
   * los dos puede inventarse, así que se registra aquí en el momento en
   * que sí se conoce. */
  iniciadoPorUid?: string;
  pacienteGlobalId?: string;
  expedienteId?: string;
  estado: MigracionEstado;
  progresoPorSeccion: Record<string, ProgresoSeccionMigracion>;
  intentos: number;
  creadoEl: Timestamp;
  actualizadoEl: Timestamp;
  error?: string;
  alertaOperativaVisible?: boolean;
};

export type MigracionEstado =
  | "iniciada"
  | "preparando"
  | "copiando"
  | "validando"
  | "congelado"
  | "sincronizando_final"
  | "migrado"
  | "fallido_antes_congelamiento"
  | "fallido_despues_congelamiento"
  | "reversion_pendiente";

/** Orden de avance normal — de aquí sale qué es "un paso adelante" válido.
 * Los estados de fallo/reversión son ramas, no forman parte de este orden. */
const ORDEN_MIGRACION: MigracionEstado[] = [
  "iniciada",
  "preparando",
  "copiando",
  "validando",
  "congelado",
  "sincronizando_final",
  "migrado",
];

const ESTADOS_TERMINALES: MigracionEstado[] = ["migrado", "reversion_pendiente"];

/** true desde "congelado" en adelante (inclusive) — el punto donde la
 * escritura clínica local se bloquea por regla (v3 §9/§12). Un fallo
 * ANTES de este punto nunca bloqueó nada; un fallo DESPUÉS sí, y por eso
 * exige la recuperación explícita de v3 §11.4 en vez de un reintento
 * silencioso. */
export function migracionYaCongeloOrigen(estado: MigracionEstado): boolean {
  const idx = ORDEN_MIGRACION.indexOf(estado);
  const idxCongelado = ORDEN_MIGRACION.indexOf("congelado");
  if (estado === "fallido_despues_congelamiento" || estado === "reversion_pendiente") return true;
  if (estado === "fallido_antes_congelamiento") return false;
  return idx !== -1 && idx >= idxCongelado;
}

/** true si `actual` → `siguiente` es una transición válida de la máquina
 * de estados de migración. Avance estrictamente secuencial (nunca se
 * saltan etapas) salvo las ramas explícitas de fallo/reversión. */
export function puedeAvanzarMigracion(actual: MigracionEstado, siguiente: MigracionEstado): boolean {
  if (actual === siguiente) return false;
  if (ESTADOS_TERMINALES.includes(actual)) return false;

  if (siguiente === "fallido_antes_congelamiento") {
    return !migracionYaCongeloOrigen(actual);
  }
  if (siguiente === "fallido_despues_congelamiento") {
    return migracionYaCongeloOrigen(actual);
  }
  if (siguiente === "reversion_pendiente") {
    // Excepcional y manual — puede declararse desde cualquier estado no
    // terminal (v3 §11.4/§12), nunca automático.
    return true;
  }
  if (actual === "fallido_antes_congelamiento" || actual === "fallido_despues_congelamiento") {
    // Reanudar tras un fallo continúa desde donde estaba, nunca reinicia
    // desde "iniciada" (v3 §11 — idempotencia por id determinístico).
    return false;
  }

  const idxActual = ORDEN_MIGRACION.indexOf(actual);
  const idxSiguiente = ORDEN_MIGRACION.indexOf(siguiente);
  if (idxActual === -1 || idxSiguiente === -1) return false;
  return idxSiguiente === idxActual + 1;
}

/** true si una función orquestadora (migracionesExpediente.ts, Fase 2)
 * puede hacer el trabajo de llegar a `destino` en este momento — cubre dos
 * casos válidos: una transición fresca (`puedeAvanzarMigracion`) o un
 * REINTENTO del mismo paso (`actual === destino`, ej. el proceso se
 * interrumpió a medio copiar lotes). `puedeAvanzarMigracion` por sí sola
 * rechaza el segundo caso (`actual === siguiente` siempre es `false`), y
 * por diseño: esa función responde "¿es un AVANCE válido?", no "¿puedo
 * seguir intentando este paso?" — son preguntas distintas, cada una con un
 * único dueño. */
export function puedeContinuarHacia(actual: MigracionEstado, destino: MigracionEstado): boolean {
  // Un estado TERMINAL nunca "se reintenta a sí mismo" — no hay trabajo
  // pendiente que retomar (distinto de un estado intermedio interrumpido a
  // medias). Mismo criterio que ya usa puedeAvanzarMigracion para rechazar
  // cualquier transición de salida de un estado terminal.
  if (actual === destino) return !ESTADOS_TERMINALES.includes(actual);
  return puedeAvanzarMigracion(actual, destino);
}

/** Refleja la tabla de fuente canónica de v3 §12 — true si este estado
 * exige bloquear escritura clínica en el origen local. Debe coincidir
 * exactamente con `migracionYaCongeloOrigen`, expuesta aparte con un
 * nombre que refleja su uso real (la regla de Firestore lo consulta por
 * este significado, no por "¿ya pasamos el punto X del enum?"). */
export function migracionBloqueaEscrituraLocal(estado: MigracionEstado | undefined): boolean {
  if (estado === undefined) return false; // no_migrado
  return migracionYaCongeloOrigen(estado);
}
