/** "Pacientes por proponer cita": quién ya debería volver (su prevención de los 6 meses está por tocar o
 * vencida) y todavía no tiene próxima cita, con las fechas que le acomodan según su horario preferente.
 * Pura (sin Firestore ni pantalla). */

import { calificacionDePaciente, type CalificacionPaciente } from "./calificacionPaciente";
import {
  describirHorarioPreferente,
  proximasPropuestasDeCita,
  type HorarioPreferente,
  type PropuestaDeCita,
} from "./horarioPreferente";

type PacienteMin = {
  id: string;
  name: string;
  phone?: string;
  fusionadoEnId?: string;
  recordatorioPrevencion?: boolean;
  horarioPreferente?: HorarioPreferente | null;
};
type CitaMin = { patientId: string | null; fecha: string; estatus: string; canceladaTarde?: boolean };

/** Estatus de una cita que todavía está por ocurrir (cuenta como "ya tiene próxima cita"). */
const ESTATUS_PENDIENTES = ["Agendada", "Confirmada", "En espera"];

/** Cada cuántos meses toca la prevención, y con cuántos días de anticipación ya se ofrece. */
export const MESES_ENTRE_PREVENCIONES = 6;
export const DIAS_DE_ANTICIPACION = 30;

export type PacientePorProponer = {
  paciente: PacienteMin;
  ultimaCita: string;
  /** Desde cuándo le toca (ultima cita + 6 meses). */
  tocaDesde: string;
  vencida: boolean;
  mesesDesdeUltima: number;
  horario: string;
  propuestas: PropuestaDeCita[];
  calificacion: CalificacionPaciente;
};

const aIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function sumarMeses(fechaIso: string, meses: number): string {
  const [y, m, d] = fechaIso.split("-").map(Number);
  const dia = new Date(y, m - 1 + meses, d);
  // 31 ene + 1 mes no debe saltar a marzo: se queda en el último día del mes correcto.
  if (dia.getDate() !== d) return aIso(new Date(y, m + meses, 0));
  return aIso(dia);
}

function mesesEntre(desdeIso: string, hasta: Date): number {
  const [y, m, d] = desdeIso.split("-").map(Number);
  let meses = (hasta.getFullYear() - y) * 12 + (hasta.getMonth() - (m - 1));
  if (hasta.getDate() < d) meses -= 1;
  return Math.max(0, meses);
}

export function pacientesPorProponerCita(
  pacientes: PacienteMin[],
  citas: CitaMin[],
  hoy: Date = new Date(),
  limite = 10
): PacientePorProponer[] {
  const hoyIso = aIso(hoy);
  const limiteIso = aIso(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + DIAS_DE_ANTICIPACION));
  const porPaciente = new Map<string, CitaMin[]>();
  for (const c of citas) {
    if (!c.patientId) continue;
    const lista = porPaciente.get(c.patientId) ?? [];
    lista.push(c);
    porPaciente.set(c.patientId, lista);
  }

  const resultado: PacientePorProponer[] = [];
  for (const paciente of pacientes) {
    if (paciente.fusionadoEnId || paciente.recordatorioPrevencion === false) continue;
    const suyas = porPaciente.get(paciente.id) ?? [];
    if (suyas.some((c) => ESTATUS_PENDIENTES.includes(c.estatus) && c.fecha >= hoyIso)) continue; // ya tiene próxima cita
    const atendidas = suyas.filter((c) => c.estatus === "Atendida").map((c) => c.fecha);
    if (atendidas.length === 0) continue; // nunca ha venido: no hay una prevención que recordar
    const ultimaCita = atendidas.sort().at(-1)!;
    const tocaDesde = sumarMeses(ultimaCita, MESES_ENTRE_PREVENCIONES);
    if (tocaDesde > limiteIso) continue; // todavía falta mucho
    resultado.push({
      paciente,
      ultimaCita,
      tocaDesde,
      vencida: tocaDesde <= hoyIso,
      mesesDesdeUltima: mesesEntre(ultimaCita, hoy),
      horario: describirHorarioPreferente(paciente.horarioPreferente),
      // Las propuestas arrancan hoy (o mañana si hoy ya no da tiempo no se puede saber: se ofrece hoy y el doctor decide).
      propuestas: proximasPropuestasDeCita(paciente.horarioPreferente, hoy, 3),
      calificacion: calificacionDePaciente(suyas),
    });
  }
  // Los que llevan más tiempo sin venir primero.
  return resultado.sort((a, b) => a.ultimaCita.localeCompare(b.ultimaCita)).slice(0, limite);
}

const MESES_LARGOS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS_LARGOS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** Mensaje de WhatsApp para proponerle su cita. Con una fecha propuesta la ofrece; sin ella pregunta cuándo le acomoda. */
export function mensajeProponerCita(args: { nombrePaciente: string; clinica?: string; propuesta?: PropuestaDeCita }): string {
  const primerNombre = args.nombrePaciente.trim().split(/\s+/)[0] || "";
  const saludo = `Hola${primerNombre ? ` ${primerNombre}` : ""}, te escribimos de ${args.clinica?.trim() || "tu consultorio dental"}.`;
  const motivo = "Ya toca tu revisión y limpieza dental.";
  if (!args.propuesta) return `${saludo} ${motivo} ¿Qué día y horario te acomoda para agendarla?`;
  const [y, m, d] = args.propuesta.fecha.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  const texto = `el ${DIAS_LARGOS[fecha.getDay()]} ${d} de ${MESES_LARGOS[m - 1]} a las ${args.propuesta.hora}`;
  return `${saludo} ${motivo} ¿Te acomoda ${texto}? Si prefieres otro horario, dime y lo acomodamos.`;
}
