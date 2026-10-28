/** Incidentes o complicaciones que el profesional anotó en una nota de evolución ("Se presentó un incidente":
 * qué ocurrió, cómo se atendió, estado final y seguimiento requerido) y que todavía no tienen un seguimiento:
 * ninguna cita posterior del paciente (atendida o por venir). Todo se calcula con lo ya guardado; no hay un
 * estado extra que alguien tenga que acordarse de cerrar. */

import { esNotaV2, type NotaEvolucionAny, type NotaEvolucionV2 } from "./notasEvolucion";
import type { CitaAgenda } from "./patientData";

/** Cuántos días después de un incidente se sigue avisando si nadie le dio seguimiento. */
export const VENTANA_INCIDENTES_DIAS = 14;

export type IncidentePendiente = {
  patientId: string;
  paciente: string;
  notaId: string;
  /** Día del incidente ("YYYY-MM-DD"): el de la cita de la nota, o el de su creación. */
  fecha: string;
  queOcurrio: string;
  seguimientoRequerido: string;
};

function restarDias(fechaISO: string, dias: number): string {
  const [a, m, d] = fechaISO.split("-").map(Number);
  const f = new Date(a, m - 1, d - dias);
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`;
}

export function notaTieneIncidente(nota: NotaEvolucionAny): nota is NotaEvolucionV2 {
  return esNotaV2(nota) && !!nota.estadoFinal?.chips.includes("incidente") && !!nota.estadoFinal.incidente?.queOcurrio?.trim();
}

/** `notasPorPaciente` son las notas ya cargadas de cada paciente; un paciente cuyas notas no se han cargado
 * simplemente no aparece (nunca se inventa un incidente). */
export function incidentesPendientesDeSeguimiento(
  notasPorPaciente: Record<string, NotaEvolucionAny[]>,
  citas: CitaAgenda[],
  hoyISO: string
): IncidentePendiente[] {
  const desde = restarDias(hoyISO, VENTANA_INCIDENTES_DIAS);
  const citaPorId = new Map(citas.map((c) => [c.id, c]));
  const resultado: IncidentePendiente[] = [];

  for (const [patientId, notas] of Object.entries(notasPorPaciente)) {
    for (const nota of notas) {
      if (!notaTieneIncidente(nota)) continue;
      const cita = nota.encabezado.citaId ? citaPorId.get(nota.encabezado.citaId) : undefined;
      const fecha = cita?.fecha ?? nota.creadoEn.slice(0, 10);
      if (fecha < desde || fecha > hoyISO) continue;
      const conSeguimiento = citas.some(
        (c) => c.patientId === patientId && c.fecha > fecha && c.estatus !== "Cancelada" && c.estatus !== "No Asistió"
      );
      if (conSeguimiento) continue;
      resultado.push({
        patientId,
        paciente: nota.encabezado.pacienteNombreSnapshot,
        notaId: nota.id,
        fecha,
        queOcurrio: nota.estadoFinal!.incidente!.queOcurrio.trim(),
        seguimientoRequerido: nota.estadoFinal!.incidente!.seguimientoRequerido?.trim() ?? "",
      });
    }
  }
  return resultado.sort((a, b) => a.fecha.localeCompare(b.fecha));
}
