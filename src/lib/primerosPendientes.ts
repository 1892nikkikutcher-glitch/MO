/** Primeros pendientes de una clínica recién creada, para "Requieren Atención" en Inicio: dar de alta el consultorio,
 * al primer paciente y su primera cita. Cada uno desaparece solo cuando ya está hecho. */

export type PrimerPendiente = {
  key: "primer-consultorio" | "primer-paciente" | "primera-cita";
  texto: string;
  accion: "consultorio" | "guia-primer-paciente" | "nueva-cita";
};

export type DatosPrimerosPendientes = {
  /** Solo el administrador de la clínica puede capturar el consultorio. */
  esAdmin: boolean;
  consultorioCapturado: boolean;
  hayPacientes: boolean;
  hayCitas: boolean;
};

export function primerosPendientes(d: DatosPrimerosPendientes): PrimerPendiente[] {
  const lista: PrimerPendiente[] = [];
  if (d.esAdmin && !d.consultorioCapturado) {
    lista.push({
      key: "primer-consultorio",
      texto: "Da de alta tu consultorio y al responsable — es lo primero para dejar la plataforma lista",
      accion: "consultorio",
    });
  }
  if (!d.hayPacientes) {
    lista.push({
      key: "primer-paciente",
      texto: "Da de alta a tu primer paciente — te acompaño a llenar su expediente paso a paso",
      accion: "guia-primer-paciente",
    });
  } else if (!d.hayCitas) {
    lista.push({
      key: "primera-cita",
      texto: "Agenda tu primera cita — te ayudo a llenarla",
      accion: "nueva-cita",
    });
  }
  return lista;
}
