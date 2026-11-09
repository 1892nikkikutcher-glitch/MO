/** Lo que ya se sabe de un paciente por sus citas anteriores, para no volver a capturarlo en cada cita nueva:
 * a qué hora y cuánto tiempo vino la última vez y en qué sede. Todo sale del historial de citas — no se guarda
 * nada aparte, así que nunca queda desactualizado. Lógica pura, sin Firestore ni pantalla. */

import { aMinutos, sedeDeCita, type BloqueAtencion, type Sede } from "./sedesBloques";

type CitaDelHistorial = {
  id?: string;
  patientId: string | null;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estatus: string;
  sedeId?: string | null;
  medicoId?: string | null;
  recursoId?: string;
};

type RecursoConBloques = { id: string; tipo: string; bloques?: BloqueAtencion[] };

export type CitaAnterior = {
  fecha: string;
  horaInicio: string;
  duracionMin: number;
  /** Sede de esa cita (la que se le estampó o la del bloque que la cubría); null si no se sabe. */
  sedeId: string | null;
};

/** Citas que no dicen nada de cómo atiende al paciente: no vino o se movió. */
const ESTATUS_SIN_DATO = ["Cancelada", "No Asistió", "Reagendada"];

/** La cita más reciente del paciente hasta `hastaFechaISO` (la fecha de la cita que se está agendando), sin
 * contar la que se está editando. null si nunca ha tenido una. */
export function citaAnteriorDelPaciente(
  citas: CitaDelHistorial[],
  patientId: string,
  hastaFechaISO: string,
  excluirCitaId: string | undefined,
  recursos: RecursoConBloques[],
  sedes: Sede[]
): CitaAnterior | null {
  const candidatas = citas.filter(
    (c) =>
      c.patientId === patientId &&
      c.id !== excluirCitaId &&
      !ESTATUS_SIN_DATO.includes(c.estatus) &&
      c.fecha <= hastaFechaISO
  );
  if (candidatas.length === 0) return null;
  const ultima = [...candidatas].sort(
    (a, b) => b.fecha.localeCompare(a.fecha) || b.horaInicio.localeCompare(a.horaInicio)
  )[0];
  const duracionMin = aMinutos(ultima.horaFin) - aMinutos(ultima.horaInicio);
  return {
    fecha: ultima.fecha,
    horaInicio: ultima.horaInicio,
    duracionMin: duracionMin > 0 ? duracionMin : 0,
    sedeId: sedeDeCita(ultima, recursos, sedes)?.id ?? null,
  };
}

export type DatoFaltante = { clave: "sede" | "telefono" | "motivo"; texto: string };

/** Datos que conviene tener en la cita y todavía no están. Es un recordatorio: no impide guardar. */
export function datosFaltantesDeCita(c: {
  /** Hay sedes dadas de alta y ya se eligió médico: entonces la cita debe tener una. */
  pideSede: boolean;
  sedeElegida: string;
  hayPaciente: boolean;
  telefono: string;
  /** El recordatorio por WhatsApp solo tiene sentido en citas por venir. */
  citaPorVenir: boolean;
  tratamientos: string[];
}): DatoFaltante[] {
  const faltan: DatoFaltante[] = [];
  if (c.pideSede && !c.sedeElegida) faltan.push({ clave: "sede", texto: "Falta la sede de esta cita." });
  if (c.hayPaciente && c.citaPorVenir && !c.telefono.trim()) {
    faltan.push({
      clave: "telefono",
      texto: "Falta el teléfono del paciente: sin él no puedes mandarle el recordatorio por WhatsApp.",
    });
  }
  if (c.hayPaciente && c.tratamientos.length === 0) {
    faltan.push({ clave: "motivo", texto: "Falta el motivo o tratamiento de la cita." });
  }
  return faltan;
}
