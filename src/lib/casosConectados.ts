/** Vistas del módulo general de MO Conecta: qué pacientes y qué médicos tienen
 * casos conectados. Pura (sin Firestore), para poder probarla. Cuando MO
 * Conecta se abre desde el expediente de UN paciente no se usa: ahí solo se ve
 * lo de ese paciente (ver `soloDelPaciente`). */

import { colegaDelCaso, type ResumenInvitacionDeCaso } from "./colegaDelCaso";
import type { Interconsulta } from "./moConecta";

type CasoMinimo = Pick<
  Interconsulta,
  "id" | "pacienteId" | "odontologoRemitenteUid" | "destinatarioUid" | "actualizadoEl" | "resumenPaciente"
>;

export type PacienteConectado = {
  nombre: string;
  casos: number;
  /** Médicos con quienes tiene casos conectados. */
  colegas: string[];
  ultimoCasoId: string;
};

export type MedicoConectado = {
  nombre: string;
  enviados: number;
  recibidos: number;
  pacientes: string[];
  ultimoCasoId: string;
  /** true si todavía no aceptó (solo se conoce a quien se invitó). */
  pendiente: boolean;
};

const sinRepetir = (lista: string[], valor: string) => (lista.includes(valor) ? lista : [...lista, valor]);

/** Pacientes (con sus médicos) y médicos (con sus pacientes) de todos los casos,
 * del más reciente al más antiguo. Un caso recibido trae el paciente de OTRA
 * clínica, así que se agrupa por nombre; los enviados, por id de paciente. */
export function pacientesYMedicosConectados(
  casos: CasoMinimo[],
  uid: string,
  directorio: { uid: string; nombreCompleto: string }[],
  invitaciones: Record<string, ResumenInvitacionDeCaso | undefined>
): { pacientes: PacienteConectado[]; medicos: MedicoConectado[] } {
  const pacientes = new Map<string, PacienteConectado & { reciente: string }>();
  const medicos = new Map<string, MedicoConectado & { reciente: string }>();

  for (const c of [...casos].sort((a, b) => b.actualizadoEl.localeCompare(a.actualizadoEl))) {
    const enviado = c.odontologoRemitenteUid === uid;
    const colega = colegaDelCaso(c, uid, directorio, invitaciones[c.id]);
    const nombrePaciente = c.resumenPaciente.nombre;

    const kp = enviado ? `p:${c.pacienteId}` : `r:${nombrePaciente.toLowerCase()}`;
    const p = pacientes.get(kp) ?? { nombre: nombrePaciente, casos: 0, colegas: [], ultimoCasoId: c.id, reciente: c.actualizadoEl };
    p.casos += 1;
    p.colegas = sinRepetir(p.colegas, colega.nombre);
    pacientes.set(kp, p);

    const km = colega.nombre.toLowerCase();
    const m = medicos.get(km) ?? {
      nombre: colega.nombre,
      enviados: 0,
      recibidos: 0,
      pacientes: [],
      ultimoCasoId: c.id,
      pendiente: colega.pendiente,
      reciente: c.actualizadoEl,
    };
    if (enviado) m.enviados += 1;
    else m.recibidos += 1;
    m.pacientes = sinRepetir(m.pacientes, nombrePaciente);
    medicos.set(km, m);
  }

  const quitar = <T extends { reciente: string }>({ reciente: _r, ...resto }: T) => resto;
  return {
    pacientes: [...pacientes.values()].map(quitar) as PacienteConectado[],
    medicos: [...medicos.values()].map(quitar) as MedicoConectado[],
  };
}

/** Desde el expediente de un paciente: solo los casos que ENVIASTE de ese
 * paciente. Los recibidos son de pacientes de otro colega, nunca de este. */
export function soloDelPaciente<T extends { pacienteId: string; odontologoRemitenteUid: string }>(
  casos: T[],
  uid: string,
  patientId: string
): T[] {
  return casos.filter((c) => c.odontologoRemitenteUid === uid && c.pacienteId === patientId);
}
