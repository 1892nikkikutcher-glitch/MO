/** Calendario compartido con un colega: SOLO horarios ocupados y libres, nunca
 * datos del paciente ni del tratamiento. Pura (sin Firebase): la usan el
 * servidor (para calcular lo que ve el colega) y la pantalla. */

export type BloqueOcupado = { fecha: string; inicio: string; fin: string };

export type CalendarioCompartidoDoc = {
  id: string;
  clinicaId: string;
  recursoId: string;
  recursoNombre: string;
  remitenteUid: string;
  remitenteNombre: string;
  destinatarioUid: string;
  destinatarioNombre: string;
  estado: "activo" | "revocado";
  creadoEl: string;
  revocadoEl?: string;
};

export type OcupacionDeCalendario = {
  recursoNombre: string;
  remitenteNombre: string;
  horario: { apertura: string; cierre: string; comidaInicio: string; comidaFin: string } | null;
  bloques: BloqueOcupado[];
  desde: string;
  hasta: string;
  generadoEl: string;
};

type CitaParaOcupacion = {
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estatus: string;
  medicoId?: string | null;
  unidadId?: string | null;
  recursoId?: string;
};

/** Una cita en alguno de estos estatus ya no ocupa el horario. */
const ESTATUS_QUE_LIBERAN = ["Cancelada", "Reagendada", "No Asistió"];

const minutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Bloques ocupados del recurso entre `desde` y `hasta` (YYYY-MM-DD, ambos
 * incluidos). Las citas que se encimen o se toquen el mismo día se juntan en
 * un solo bloque, para que no se distinga cuántas citas hay. */
export function bloquesOcupados(
  citas: CitaParaOcupacion[],
  recursoId: string,
  desde: string,
  hasta: string
): BloqueOcupado[] {
  const porDia = new Map<string, { i: number; f: number }[]>();
  for (const c of citas) {
    const fecha = c.fecha.slice(0, 10);
    if (fecha < desde || fecha > hasta) continue;
    if (ESTATUS_QUE_LIBERAN.includes(c.estatus)) continue;
    if (c.medicoId !== recursoId && c.unidadId !== recursoId && c.recursoId !== recursoId) continue;
    const i = minutos(c.horaInicio);
    const f = minutos(c.horaFin);
    if (!(f > i)) continue;
    porDia.set(fecha, [...(porDia.get(fecha) ?? []), { i, f }]);
  }
  const salida: BloqueOcupado[] = [];
  for (const fecha of [...porDia.keys()].sort()) {
    const ordenados = porDia.get(fecha)!.sort((a, b) => a.i - b.i);
    const juntos: { i: number; f: number }[] = [];
    for (const t of ordenados) {
      const ultimo = juntos[juntos.length - 1];
      if (ultimo && t.i <= ultimo.f) ultimo.f = Math.max(ultimo.f, t.f);
      else juntos.push({ ...t });
    }
    juntos.forEach((t) => salida.push({ fecha, inicio: hhmm(t.i), fin: hhmm(t.f) }));
  }
  return salida;
}

/** El rango pedido es válido: fechas ISO, desde <= hasta y no más de 35 días. */
export function rangoValido(desde: string, hasta: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) return false;
  const d = new Date(`${desde}T00:00:00Z`).getTime();
  const h = new Date(`${hasta}T00:00:00Z`).getTime();
  if (Number.isNaN(d) || Number.isNaN(h) || h < d) return false;
  return (h - d) / 86_400_000 <= 35;
}
