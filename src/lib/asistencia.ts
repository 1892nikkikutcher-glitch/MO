/** Asistencia: horarios y checador de personal (odontólogos/colaboradores)
 * y asistencia de pacientes (llegada real vs. hora de la cita). */

export type DiaSemana = "lunes" | "martes" | "miercoles" | "jueves" | "viernes" | "sabado" | "domingo";

export const diasSemanaOptions: { value: DiaSemana; label: string }[] = [
  { value: "lunes", label: "Lun" },
  { value: "martes", label: "Mar" },
  { value: "miercoles", label: "Mié" },
  { value: "jueves", label: "Jue" },
  { value: "viernes", label: "Vie" },
  { value: "sabado", label: "Sáb" },
  { value: "domingo", label: "Dom" },
];

const DIA_JS_A_DIA_SEMANA: DiaSemana[] = [
  "domingo",
  "lunes",
  "martes",
  "miercoles",
  "jueves",
  "viernes",
  "sabado",
];

export function diaSemanaDe(fechaISO: string): DiaSemana {
  const d = new Date(`${fechaISO}T00:00:00`);
  return DIA_JS_A_DIA_SEMANA[d.getDay()];
}

export type BloqueHorario = { inicio: string; fin: string } | null;

export type PersonalAsistencia = {
  id: string;
  nombre: string;
  puesto: string;
  horario: Record<DiaSemana, BloqueHorario>;
};

export const horarioVacio = (): Record<DiaSemana, BloqueHorario> => ({
  lunes: { inicio: "09:00", fin: "18:00" },
  martes: { inicio: "09:00", fin: "18:00" },
  miercoles: { inicio: "09:00", fin: "18:00" },
  jueves: { inicio: "09:00", fin: "18:00" },
  viernes: { inicio: "09:00", fin: "18:00" },
  sabado: null,
  domingo: null,
});

/** Un registro por persona por día — id determinístico `{personalId}_{fecha}`. */
export type RegistroAsistencia = {
  id: string;
  personalId: string;
  fecha: string;
  entrada: string | null;
  salida: string | null;
};

export type EstadoAsistencia = "a-tiempo" | "retraso" | "falta" | "sin-horario" | "descanso";

export function estadoEntrada(
  horario: Record<DiaSemana, BloqueHorario>,
  fecha: string,
  entrada: string | null
): EstadoAsistencia {
  const bloque = horario[diaSemanaDe(fecha)];
  if (!bloque) return "descanso";
  if (!entrada) return "falta";
  return entrada <= bloque.inicio ? "a-tiempo" : "retraso";
}

export const estadoLabel: Record<EstadoAsistencia, string> = {
  "a-tiempo": "A tiempo",
  retraso: "Retraso",
  falta: "Falta",
  "sin-horario": "Sin horario",
  descanso: "Descanso",
};

export const estadoColor: Record<EstadoAsistencia, string> = {
  "a-tiempo": "text-success",
  retraso: "text-accent",
  falta: "text-danger",
  "sin-horario": "text-ink/40",
  descanso: "text-ink/30",
};

export type EstadoLlegadaPaciente = "a-tiempo" | "tarde" | "no-llego" | "pendiente";

export function estadoLlegadaPaciente(
  fecha: string,
  horaInicio: string,
  horaFin: string,
  horaLlegada: string | null | undefined
): EstadoLlegadaPaciente {
  if (horaLlegada) return horaLlegada <= horaInicio ? "a-tiempo" : "tarde";
  const ahora = new Date();
  const finCita = new Date(`${fecha}T${horaFin}:00`);
  if (finCita < ahora) return "no-llego";
  return "pendiente";
}

export const estadoLlegadaLabel: Record<EstadoLlegadaPaciente, string> = {
  "a-tiempo": "Llegó a tiempo",
  tarde: "Llegó tarde",
  "no-llego": "No llegó",
  pendiente: "Pendiente",
};

export const estadoLlegadaColor: Record<EstadoLlegadaPaciente, string> = {
  "a-tiempo": "text-success",
  tarde: "text-accent",
  "no-llego": "text-danger",
  pendiente: "text-ink/40",
};

export function horaActual(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
