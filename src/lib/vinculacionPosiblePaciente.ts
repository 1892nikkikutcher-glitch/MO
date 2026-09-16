/** Candidato de identidad antes de confirmar que dos registros locales (o un
 * registro local y un `PacienteGlobal` ya existente) son la misma persona
 * (arquitectura MO Conecta v3, §3/§11.1) — nunca se fusiona automáticamente.
 * `conflictoGrave` (sexo o fecha de nacimiento contradictorios) bloquea la
 * confirmación por el flujo normal y exige un rol elevado. */

import type { Timestamp } from "firebase-admin/firestore";

export type EstadoVinculacionPosible = "sugerido" | "confirmado" | "descartado";

export type VinculacionPosiblePaciente = {
  id: string;
  pacienteGlobalIdSugerido: string;
  clinicaOrigenId: string;
  patientIdOrigen: string;
  estado: EstadoVinculacionPosible;
  confianza: number; // 0-100
  evidenciasCoincidentes: string[];
  evidenciasContradictorias: string[];
  conflictoGrave: boolean;
  revisadoPorUid?: string;
  revisadoEl?: Timestamp;
  creadoEl: Timestamp;
};

/** Minúsculas, sin espacios repetidos ni sobrantes — comparación laxa a
 * propósito. El nombre NUNCA es evidencia suficiente por sí solo (ver
 * `compararCandidatoPaciente`); esta normalización solo evita falsos
 * negativos triviales ("Ana García " vs "ana garcía"), no intenta resolver
 * acentos, apodos ni apellidos de casada. */
export function normalizarNombreComparable(crudo: string): string {
  return crudo.trim().toLowerCase().replace(/\s+/g, " ");
}

export type CandidatoComparable = {
  nombre: string;
  telefonoNormalizado?: string;
  fechaNacimiento?: string;
  sexo?: string;
};

export type ResultadoComparacionCandidato = {
  confianza: number;
  evidenciasCoincidentes: string[];
  evidenciasContradictorias: string[];
  conflictoGrave: boolean;
};

/** Puntaje simple y explicable (nunca un score opaco): cada campo que
 * coincide suma evidencia; teléfono y fecha de nacimiento pesan más que el
 * nombre porque son mucho menos propensos a coincidir por casualidad.
 * Una contradicción en fecha de nacimiento o sexo es SIEMPRE grave (v3
 * §11.1: "sexo o fecha de nacimiento contradictorios") y tapa el puntaje —
 * nunca debe leerse como "alta confianza" aunque otros campos coincidan. */
export function compararCandidatoPaciente(a: CandidatoComparable, b: CandidatoComparable): ResultadoComparacionCandidato {
  const evidenciasCoincidentes: string[] = [];
  const evidenciasContradictorias: string[] = [];

  if (a.telefonoNormalizado && b.telefonoNormalizado) {
    (a.telefonoNormalizado === b.telefonoNormalizado ? evidenciasCoincidentes : evidenciasContradictorias).push("telefono");
  }
  if (a.fechaNacimiento && b.fechaNacimiento) {
    (a.fechaNacimiento === b.fechaNacimiento ? evidenciasCoincidentes : evidenciasContradictorias).push("fechaNacimiento");
  }
  if (a.sexo && b.sexo) {
    (a.sexo === b.sexo ? evidenciasCoincidentes : evidenciasContradictorias).push("sexo");
  }
  if (normalizarNombreComparable(a.nombre) === normalizarNombreComparable(b.nombre)) {
    evidenciasCoincidentes.push("nombre");
  }

  const conflictoGrave = evidenciasContradictorias.includes("fechaNacimiento") || evidenciasContradictorias.includes("sexo");

  let confianza = 0;
  if (evidenciasCoincidentes.includes("telefono")) confianza += 45;
  if (evidenciasCoincidentes.includes("fechaNacimiento")) confianza += 35;
  if (evidenciasCoincidentes.includes("sexo")) confianza += 5;
  if (evidenciasCoincidentes.includes("nombre")) confianza += 15;
  if (conflictoGrave) confianza = Math.min(confianza, 20);

  return { confianza: Math.min(confianza, 100), evidenciasCoincidentes, evidenciasContradictorias, conflictoGrave };
}
