/** Motivo por el que un paciente no se presentó (o canceló / reagendó) una
 * cita. Se guarda EN LA CITA (`razonNoAsistencia`, `detalleNoAsistencia`) y en
 * la nota administrativa, para poder ver después por qué se pierden citas
 * (inasistencias por olvido vs. por dinero vs. por enfermedad...), no solo
 * que se perdieron. Opcional: nunca bloquea marcar el estatus. */

export const razonesNoAsistencia = [
  "olvido",
  "enfermedad",
  "trabajo",
  "transporte",
  "economico",
  "miedo",
  "sin_aviso",
  "cambio_planes",
  "otro",
] as const;
export type RazonNoAsistencia = (typeof razonesNoAsistencia)[number];

export const razonNoAsistenciaLabel: Record<RazonNoAsistencia, string> = {
  olvido: "Olvidó la cita",
  enfermedad: "Enfermedad / malestar",
  trabajo: "Trabajo / imprevisto",
  transporte: "Transporte / distancia",
  economico: "Motivo económico",
  miedo: "Miedo / ansiedad al tratamiento",
  sin_aviso: "Sin aviso, no contesta",
  cambio_planes: "Cambio de planes / viaje",
  otro: "Otro",
};

/** Estatus de cita en los que tiene sentido registrar un motivo. */
export const estatusConMotivoNoAsistencia = ["Cancelada", "Reagendada", "No Asistió"] as const;

export function estatusAdmiteMotivo(estatus: string): boolean {
  return (estatusConMotivoNoAsistencia as readonly string[]).includes(estatus);
}

export type MotivoNoAsistencia = { razon?: RazonNoAsistencia; detalle?: string };

/** Una cancelación es "tardía" cuando se hace después de que se agotó el tiempo de la cita (ya pasó su
 * hora de fin): el consultorio ya reservó ese lugar y no se pudo ocupar. `fecha` es "YYYY-MM-DD" y
 * `horaFin` "HH:MM"; con datos inválidos no se asume nada (false). */
export function cancelacionTardia(cita: { fecha?: string; horaFin?: string }, ahora: Date = new Date()): boolean {
  if (!cita.fecha || !cita.horaFin) return false;
  const fin = new Date(`${cita.fecha}T${cita.horaFin}:00`);
  if (Number.isNaN(fin.getTime())) return false;
  return ahora.getTime() >= fin.getTime();
}

export type OpcionesEstatusCita = {
  /** Fuerza el marcado de cancelación tardía (true/false). Si se omite, al pasar a Cancelada se calcula
   * con la hora de fin de la cita; una cita que ya estaba Cancelada conserva lo que tenía. */
  canceladaTarde?: boolean;
  ahora?: Date;
};

/** Devuelve la cita con el nuevo estatus y su motivo. Si el estatus no admite
 * motivo (ej. pasa a Atendida), se QUITAN las dos claves: un motivo viejo de
 * "No Asistió" no debe quedar pegado a una cita que luego sí se atendió.
 * Nunca deja claves con `undefined`. */
export function aplicarEstatusConMotivo<T extends { estatus: string }>(
  cita: T,
  estatus: T["estatus"],
  motivo?: MotivoNoAsistencia,
  opciones?: OpcionesEstatusCita
): T {
  const { razonNoAsistencia: _r, detalleNoAsistencia: _d, canceladaTarde: _t, ...resto } = cita as T & {
    razonNoAsistencia?: RazonNoAsistencia;
    detalleNoAsistencia?: string;
    canceladaTarde?: boolean;
  };
  const siguiente = { ...resto, estatus } as T & {
    razonNoAsistencia?: RazonNoAsistencia;
    detalleNoAsistencia?: string;
    canceladaTarde?: boolean;
  };
  // La marca de cancelación tardía solo existe en citas Canceladas (y solo cuando es verdadera).
  if (estatus === "Cancelada") {
    const eraCancelada = cita.estatus === "Cancelada";
    const tardia =
      opciones?.canceladaTarde !== undefined
        ? opciones.canceladaTarde
        : eraCancelada
          ? Boolean(_t)
          : cancelacionTardia(cita as { fecha?: string; horaFin?: string }, opciones?.ahora ?? new Date());
    if (tardia) siguiente.canceladaTarde = true;
  }
  if (!estatusAdmiteMotivo(estatus)) return siguiente;
  // Sin motivo nuevo, se conserva el que ya tuviera la cita.
  const razon = motivo ? motivo.razon : _r;
  const detalle = motivo ? motivo.detalle?.trim() || undefined : _d;
  if (razon) siguiente.razonNoAsistencia = razon;
  if (detalle) siguiente.detalleNoAsistencia = detalle;
  return siguiente;
}

/** "No llega — Olvidó la cita (avisó tarde)" para listas y reportes. */
export function textoMotivoNoAsistencia(c: { razonNoAsistencia?: RazonNoAsistencia; detalleNoAsistencia?: string }): string {
  const razon = c.razonNoAsistencia ? razonNoAsistenciaLabel[c.razonNoAsistencia] : "";
  const detalle = c.detalleNoAsistencia?.trim() ?? "";
  if (razon && detalle) return `${razon} (${detalle})`;
  return razon || detalle;
}
