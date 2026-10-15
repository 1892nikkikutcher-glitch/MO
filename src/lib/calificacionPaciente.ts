/** Calificación del paciente (0 a 5 estrellas, de media en media) según cómo se ha portado con sus citas.
 * Pura: recibe las citas del paciente y las cuenta. Empieza en 5 y baja con cada inasistencia o
 * cancelación, pero con el peso de TODO su historial: un paciente con 40 citas atendidas y una falta
 * no pierde una estrella entera, y uno nuevo que falta una vez no se desploma (el historial arranca con
 * un colchón de citas "buenas" imaginarias, PESO_INICIAL). */

export type CitaParaCalificar = { estatus: string; canceladaTarde?: boolean };

/** Cuánto pesa cada resultado (1 = una inasistencia completa). */
export const PESOS_INCIDENCIA = {
  /** No se presentó. */
  noAsistio: 1,
  /** Canceló cuando ya se había agotado el tiempo de su cita: el lugar se perdió, igual que una falta. */
  canceladaTarde: 1,
  /** Canceló a tiempo (avisó): molesta poco. */
  cancelada: 0.3,
  /** Movió su cita a otra fecha. */
  reagendada: 0.3,
} as const;

/** Citas "buenas" imaginarias con las que arranca todo paciente para que pocas citas no dominen la nota. */
export const PESO_INICIAL = 4;

export type CalificacionPaciente = {
  /** 0 a 5 en pasos de 0.5. */
  estrellas: number;
  /** false = todavía no hay ninguna cita con resultado: no hay nada que calificar. */
  tieneHistorial: boolean;
  atendidas: number;
  noAsistio: number;
  canceladasTarde: number;
  canceladas: number;
  reagendadas: number;
};

export function calificacionDePaciente(citas: CitaParaCalificar[]): CalificacionPaciente {
  const atendidas = citas.filter((c) => c.estatus === "Atendida").length;
  const noAsistio = citas.filter((c) => c.estatus === "No Asistió").length;
  const canceladasTarde = citas.filter((c) => c.estatus === "Cancelada" && c.canceladaTarde).length;
  const canceladas = citas.filter((c) => c.estatus === "Cancelada" && !c.canceladaTarde).length;
  const reagendadas = citas.filter((c) => c.estatus === "Reagendada").length;

  const resueltas = atendidas + noAsistio + canceladasTarde + canceladas + reagendadas;
  const base = { atendidas, noAsistio, canceladasTarde, canceladas, reagendadas };
  if (resueltas === 0) return { estrellas: 5, tieneHistorial: false, ...base };

  const penalizacion =
    noAsistio * PESOS_INCIDENCIA.noAsistio +
    canceladasTarde * PESOS_INCIDENCIA.canceladaTarde +
    canceladas * PESOS_INCIDENCIA.cancelada +
    reagendadas * PESOS_INCIDENCIA.reagendada;
  const proporcion = Math.min(1, penalizacion / (resueltas + PESO_INICIAL));
  const estrellas = Math.round((5 - 5 * proporcion) * 2) / 2;
  return { estrellas: Math.max(0, Math.min(5, estrellas)), tieneHistorial: true, ...base };
}

/** "Sin faltas" / "1 no asistió · 1 canceló fuera de tiempo" — el detalle que acompaña a las estrellas. */
export function detalleCalificacion(c: CalificacionPaciente): string {
  if (!c.tieneHistorial) return "Aún sin historial de citas";
  const partes: string[] = [];
  if (c.atendidas > 0) partes.push(`${c.atendidas} atendida${c.atendidas === 1 ? "" : "s"}`);
  if (c.noAsistio > 0) partes.push(`${c.noAsistio} no asistió`);
  if (c.canceladasTarde > 0) partes.push(`${c.canceladasTarde} canceló fuera de tiempo`);
  if (c.canceladas > 0) partes.push(`${c.canceladas} canceló`);
  if (c.reagendadas > 0) partes.push(`${c.reagendadas} reagendó`);
  return partes.join(" · ");
}
