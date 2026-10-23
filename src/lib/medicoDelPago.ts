/** A qué médico se le atribuye un pago por defecto. Cada pago lleva el nombre de un médico (de él sale cuánto ingresó a
 * cada doctor y su comisión), así que lo más importante es que el valor de partida sea el correcto y quien cobra solo
 * tenga que cambiarlo cuando no lo sea. Lógica pura. */

type RecursoMedico = { id: string; nombre: string; tipo: string };
type CitaDelPaciente = { patientId: string | null; fecha: string; horaInicio: string; estatus: string; medicoId?: string | null; recursoId?: string };

const ESTATUS_QUE_NO_CUENTAN = ["Cancelada", "Reagendada", "No Asistió"];

/** En orden: el médico responsable que se le asignó al paciente; el de su cita de hoy; el de su última cita atendida o
 * pasada; y si nada de eso existe, ninguno (quien cobra lo elige). */
export function medicoPredeterminadoParaPago(args: {
  patientId: string;
  medicoResponsableId?: string;
  recursos: RecursoMedico[];
  citas: CitaDelPaciente[];
  hoyISO: string;
}): string {
  const medicos = args.recursos.filter((r) => r.tipo === "medico");
  const nombreDe = (id?: string | null) => (id ? medicos.find((m) => m.id === id)?.nombre : undefined);

  const responsable = nombreDe(args.medicoResponsableId);
  if (responsable) return responsable;

  const suyas = args.citas.filter((c) => c.patientId === args.patientId && !ESTATUS_QUE_NO_CUENTAN.includes(c.estatus));
  const deHoy = suyas.filter((c) => c.fecha === args.hoyISO).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  for (const c of deHoy) {
    const n = nombreDe(c.medicoId) ?? nombreDe(c.recursoId);
    if (n) return n;
  }
  const anteriores = suyas.filter((c) => c.fecha < args.hoyISO).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.horaInicio.localeCompare(a.horaInicio));
  for (const c of anteriores) {
    const n = nombreDe(c.medicoId) ?? nombreDe(c.recursoId);
    if (n) return n;
  }
  return "";
}
