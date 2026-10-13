/** Novedades de MO Conecta para quien ENVÍA casos y comparte calendarios: lo que
 * los colegas hicieron desde la última vez que las viste (aceptó o rechazó un
 * caso, se unió a MO con tu enlace, aceptó tu calendario...). MO no manda
 * notificaciones solo, así que esto alimenta el número rojo del menú, el
 * Dashboard y el Resumen. Pura: recibe lo ya cargado. */

import type { CalendarioCompartidoDoc } from "./calendarioOcupacion";
import type { EventoHistorialEstado, Interconsulta } from "./moConecta";

export type Novedad = {
  id: string;
  fecha: string;
  texto: string;
  /** Caso que se abre al tocar la novedad (si aplica). */
  casoId?: string;
};

type CasoParaNovedades = Pick<
  Interconsulta,
  "id" | "resumenPaciente" | "destinatarioUid" | "odontologoRemitenteUid" | "historialEstados" | "colegaSeUnioEl"
>;

const ACCION_DEL_COLEGA: Partial<Record<EventoHistorialEstado["estado"], string>> = {
  accepted: "aceptó el caso de",
  rejected: "rechazó el caso de",
  patient_contacted: "ya contactó al paciente",
  scheduled: "agendó al paciente",
  in_treatment: "inició el tratamiento de",
  completed: "terminó el tratamiento de",
  counter_referral_sent: "te envió la contrarreferencia de",
  cancelled: "canceló el caso de",
};

export function novedadesConecta(args: {
  casosEnviados: CasoParaNovedades[];
  calendariosMios: CalendarioCompartidoDoc[];
  uid: string;
  /** Todo lo posterior a esta fecha (ISO) es nuevo. */
  vistoHasta: string;
  nombreDeColega: (uid: string) => string;
}): Novedad[] {
  const { casosEnviados, calendariosMios, uid, vistoHasta, nombreDeColega } = args;
  const salida: Novedad[] = [];

  for (const c of casosEnviados) {
    const colega = c.destinatarioUid ? nombreDeColega(c.destinatarioUid) : "Tu colega";
    const paciente = c.resumenPaciente.nombre;

    for (const e of c.historialEstados) {
      if (e.uid === uid || e.fecha <= vistoHasta) continue;
      const accion = ACCION_DEL_COLEGA[e.estado];
      if (!accion) continue;
      salida.push({
        id: `${c.id}|${e.estado}|${e.fecha}`,
        fecha: e.fecha,
        texto: e.estado === "patient_contacted" || e.estado === "scheduled" ? `${colega} ${accion} (${paciente})` : `${colega} ${accion} ${paciente}`,
        casoId: c.id,
      });
    }
  }

  // Se unió a MO con tu enlace: varios casos enviados juntos se aceptan a la vez, así que se juntan.
  const unidos = new Map<string, { fecha: string; colega: string; casos: CasoParaNovedades[] }>();
  for (const c of casosEnviados) {
    if (!c.colegaSeUnioEl || c.colegaSeUnioEl <= vistoHasta) continue;
    const clave = `${c.destinatarioUid ?? "?"}|${c.colegaSeUnioEl}`;
    const previo = unidos.get(clave) ?? {
      fecha: c.colegaSeUnioEl,
      colega: c.destinatarioUid ? nombreDeColega(c.destinatarioUid) : "Tu colega",
      casos: [],
    };
    previo.casos.push(c);
    unidos.set(clave, previo);
  }
  for (const [clave, u] of unidos) {
    salida.push({
      id: `unido|${clave}`,
      fecha: u.fecha,
      texto:
        u.casos.length === 1
          ? `${u.colega} se unió a MO con tu enlace y ya ve el caso de ${u.casos[0].resumenPaciente.nombre}`
          : `${u.colega} se unió a MO con tu enlace y ya ve ${u.casos.length} casos`,
      casoId: u.casos[0].id,
    });
  }

  for (const cal of calendariosMios) {
    if (cal.estado !== "activo" || !cal.aceptadoEl || cal.aceptadoEl <= vistoHasta) continue;
    salida.push({
      id: `cal|${cal.id}|${cal.aceptadoEl}`,
      fecha: cal.aceptadoEl,
      texto: `${cal.destinatarioNombre || "Tu colega"} aceptó tu calendario «${cal.recursoNombre}»`,
    });
  }

  return salida.sort((a, b) => b.fecha.localeCompare(a.fecha));
}
