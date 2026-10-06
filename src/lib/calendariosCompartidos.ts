/** Qué recursos de la Agenda (médicos/unidades) tienen citas compartidas con
 * un colega por MO Conecta — para etiquetarlos solos en Agenda → Recursos.
 * Pura: cruza las citas que cada caso enviado compartió (foto fija al enviar)
 * con las citas reales del paciente para saber en qué calendario están. */

import { ESTADOS_TERMINALES, type Interconsulta } from "./moConecta";

type CitaLocal = {
  patientId: string | null;
  fecha: string;
  horaInicio: string;
  medicoId?: string | null;
  unidadId?: string | null;
  recursoId?: string;
};

/** recursoId -> nombres de los colegas con quienes está compartido. */
export function colegasPorRecurso(
  casosEnviados: (Pick<Interconsulta, "pacienteId" | "estado" | "destinatarioUid" | "participantesAutorizados"> & {
    expedienteCompartido?: { citas?: { fecha: string; hora: string }[] };
  })[],
  citas: CitaLocal[],
  nombreDeColega: (uid: string) => string
): Map<string, string[]> {
  const resultado = new Map<string, string[]>();
  for (const caso of casosEnviados) {
    const compartidas = caso.expedienteCompartido?.citas;
    const colega = caso.destinatarioUid;
    // Solo mientras el caso siga abierto y el colega conserve el acceso.
    if (!compartidas?.length || !colega) continue;
    if (ESTADOS_TERMINALES.includes(caso.estado) || !caso.participantesAutorizados.includes(colega)) continue;

    const claves = new Set(compartidas.map((c) => `${c.fecha.slice(0, 10)}|${c.hora}`));
    const nombre = nombreDeColega(colega);
    for (const cita of citas) {
      if (cita.patientId !== caso.pacienteId || !claves.has(`${cita.fecha.slice(0, 10)}|${cita.horaInicio}`)) continue;
      for (const recursoId of new Set([cita.medicoId, cita.unidadId, cita.recursoId])) {
        if (!recursoId) continue;
        const nombres = resultado.get(recursoId) ?? [];
        if (!nombres.includes(nombre)) nombres.push(nombre);
        resultado.set(recursoId, nombres);
      }
    }
  }
  return resultado;
}

/** Junta los colegas capturados a mano con los detectados por MO Conecta, sin
 * repetir a nadie (sin distinguir mayúsculas). Vacío = no está compartido. */
export function unirColegas(manual: string | undefined, automaticos: string[] | undefined): string[] {
  const salida: string[] = [];
  for (const n of [...(manual ? [manual] : []), ...(automaticos ?? [])]) {
    if (!salida.some((s) => s.toLowerCase() === n.toLowerCase())) salida.push(n);
  }
  return salida;
}
