/** Ayuda por campo del diálogo de nueva cita: qué falta y qué sigue, según lo que ya se capturó. */

export type CamposNuevaCita = {
  paciente: boolean;
  medicoOUnidad: boolean;
  procedimiento: boolean;
  fechaYHora: boolean;
  telefono: boolean;
};

export type PasoAyudaCita = {
  id: keyof CamposNuevaCita | "guardar";
  titulo: string;
  detalle: string;
  hecho: boolean;
};

export function pasosAyudaNuevaCita(campos: CamposNuevaCita): PasoAyudaCita[] {
  const pasos: PasoAyudaCita[] = [
    {
      id: "paciente",
      titulo: "Paciente",
      detalle: "Busca por nombre y elígelo. Si no existe, escribe su nombre y presiona «Crear Paciente».",
      hecho: campos.paciente,
    },
    {
      id: "medicoOUnidad",
      titulo: "Médico",
      detalle: "Quién lo atiende. La agenda avisa si ese horario se empalma con otra cita.",
      hecho: campos.medicoOUnidad,
    },
    {
      id: "procedimiento",
      titulo: "Procedimiento o motivo",
      detalle: "Escríbelo y presiona «Agregar» (o Enter). Puedes poner varios; si tiene presupuesto, elígelos de ahí.",
      hecho: campos.procedimiento,
    },
    {
      id: "fechaYHora",
      titulo: "Fecha, inicio y duración",
      detalle: "Elige el día, la hora de inicio y cuánto va a durar.",
      hecho: campos.fechaYHora,
    },
    {
      id: "telefono",
      titulo: "Celular del paciente",
      detalle: "Con su celular le puedes mandar la confirmación por WhatsApp. Es recomendado.",
      hecho: campos.telefono,
    },
  ];
  const faltaObligatorio = pasos.some((p) => p.id !== "telefono" && p.id !== "procedimiento" && !p.hecho);
  pasos.push({
    id: "guardar",
    titulo: "Guardar",
    detalle: faltaObligatorio
      ? "Cuando estén el paciente, el médico y la fecha, presiona «Guardar»."
      : "Todo listo: presiona «Guardar». Después podrás enviarle la confirmación por WhatsApp.",
    hecho: false,
  });
  return pasos;
}

/** Cuántos de los pasos de captura (sin «Guardar») ya están hechos. */
export function avanceAyudaNuevaCita(pasos: PasoAyudaCita[]): { hechos: number; total: number } {
  const captura = pasos.filter((p) => p.id !== "guardar");
  return { hechos: captura.filter((p) => p.hecho).length, total: captura.length };
}
