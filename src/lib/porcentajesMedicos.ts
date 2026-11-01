/** Reporte de porcentajes por médico: lo que cobró cada uno en un periodo, cuánto le toca según su % de comisión y
 * si va alcanzando su meta. Lógica pura: recibe el acumulado de cobros por fecha y médico (FinanzasConfig) y los
 * médicos con su % y su meta, y devuelve las filas ya calculadas. */

import { toISODate } from "./agendaHelpers";
import { redondearDinero } from "./dinero";
import { diasDeAtencionDe, inicioMes, inicioQuincena, inicioSemana, metaDiariaDe, metaQuincenalDe, metaSemanalDe } from "./metas";
import type { Recurso } from "./patientData";

export type PeriodoPorcentajes = "hoy" | "semana" | "quincena" | "mes" | "mes_anterior";

export const PERIODOS_PORCENTAJES: { id: PeriodoPorcentajes; etiqueta: string }[] = [
  { id: "hoy", etiqueta: "Hoy" },
  { id: "semana", etiqueta: "Esta semana" },
  { id: "quincena", etiqueta: "Esta quincena" },
  { id: "mes", etiqueta: "Este mes" },
  { id: "mes_anterior", etiqueta: "Mes anterior" },
];

/** Desde y hasta (fechas ISO, ambas incluidas) del periodo. Todos terminan hoy, menos "mes anterior". */
export function rangoDePeriodo(periodo: PeriodoPorcentajes, hoy: Date): { desde: string; hasta: string } {
  const dia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (periodo === "mes_anterior") {
    const primero = new Date(dia.getFullYear(), dia.getMonth() - 1, 1);
    const ultimo = new Date(dia.getFullYear(), dia.getMonth(), 0);
    return { desde: toISODate(primero), hasta: toISODate(ultimo) };
  }
  const inicio = periodo === "hoy" ? dia : periodo === "semana" ? inicioSemana(dia) : periodo === "quincena" ? inicioQuincena(dia) : inicioMes(dia);
  return { desde: toISODate(inicio), hasta: toISODate(dia) };
}

/** La meta mensual del médico llevada al periodo (la misma regla que las metas de la clínica). */
export function metaDelPeriodo(metaMensual: number, periodo: PeriodoPorcentajes, diasAtencion?: number[] | null): number {
  switch (periodo) {
    case "hoy":
      return metaDiariaDe(metaMensual, diasAtencion);
    case "semana":
      return metaSemanalDe(metaMensual);
    case "quincena":
      return metaQuincenalDe(metaMensual);
    default:
      return metaMensual;
  }
}

/** Cuántos días de atención hay entre dos fechas ISO (ambas incluidas). */
export function diasDeAtencionEnRango(desde: string, hasta: string, diasAtencion?: number[] | null): number {
  const atiende = new Set(diasDeAtencionDe(diasAtencion));
  const [a, m, d] = desde.split("-").map(Number);
  const fin = new Date(`${hasta}T00:00:00`);
  let total = 0;
  for (let f = new Date(a, m - 1, d); f <= fin; f = new Date(f.getFullYear(), f.getMonth(), f.getDate() + 1)) {
    if (atiende.has(f.getDay())) total++;
  }
  return total;
}

export type FilaPorcentaje = {
  recursoId: string;
  nombre: string;
  color: string;
  /** Lo que cobró en el periodo. */
  cobrado: number;
  /** Su % de comisión; null = todavía sin configurar. */
  porcentaje: number | null;
  /** Lo que le toca (cobrado × %); null si no tiene %. */
  comision: number | null;
  /** Su meta llevada al periodo; null si no tiene meta. */
  meta: number | null;
  /** Qué tanto de la meta lleva, en % (puede pasar de 100); null sin meta. */
  avance: number | null;
  /** Lo que le falta para la meta (0 si ya la alcanzó); null sin meta. */
  falta: number | null;
  alcanzada: boolean;
  /** Solo "este mes": cuánto cobraría al cierre si sigue al ritmo de los días de atención que van; null en el resto. */
  proyeccion: number | null;
};

export type ResultadoPorcentajes = {
  filas: FilaPorcentaje[];
  totalCobrado: number;
  totalComision: number;
  /** Cobros del periodo a nombre de alguien que no es un médico registrado (por ejemplo, un nombre mal escrito). */
  sinMedico: { nombre: string; monto: number }[];
};

export function calcularPorcentajes(args: {
  medicos: Pick<Recurso, "id" | "nombre" | "color" | "tipo" | "porcentajeComision" | "metaMensual">[];
  porFechaYMedico: Record<string, Record<string, number>> | undefined;
  periodo: PeriodoPorcentajes;
  hoy: Date;
  diasAtencion?: number[] | null;
}): ResultadoPorcentajes {
  const { periodo, hoy, diasAtencion } = args;
  const { desde, hasta } = rangoDePeriodo(periodo, hoy);
  const medicos = args.medicos.filter((r) => r.tipo === "medico");

  const cobradoPorNombre = new Map<string, number>();
  for (const [fecha, porMedico] of Object.entries(args.porFechaYMedico ?? {})) {
    if (fecha < desde || fecha > hasta) continue;
    for (const [nombre, monto] of Object.entries(porMedico)) {
      cobradoPorNombre.set(nombre, (cobradoPorNombre.get(nombre) ?? 0) + (Number(monto) || 0));
    }
  }

  const hoyIso = toISODate(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
  const diasTotalesMes = diasDeAtencionEnRango(desde, toISODate(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)), diasAtencion);
  const diasTranscurridos = diasDeAtencionEnRango(desde, hoyIso, diasAtencion);

  const filas: FilaPorcentaje[] = medicos.map((r) => {
    const cobrado = redondearDinero(cobradoPorNombre.get(r.nombre) ?? 0);
    cobradoPorNombre.delete(r.nombre);
    const porcentaje = typeof r.porcentajeComision === "number" && r.porcentajeComision > 0 ? r.porcentajeComision : null;
    const metaMensual = typeof r.metaMensual === "number" && r.metaMensual > 0 ? r.metaMensual : null;
    const meta = metaMensual === null ? null : redondearDinero(metaDelPeriodo(metaMensual, periodo, diasAtencion));
    return {
      recursoId: r.id,
      nombre: r.nombre,
      color: r.color,
      cobrado,
      porcentaje,
      comision: porcentaje === null ? null : redondearDinero((cobrado * porcentaje) / 100),
      meta,
      avance: meta === null || meta <= 0 ? null : Math.round((cobrado / meta) * 100),
      falta: meta === null ? null : redondearDinero(Math.max(0, meta - cobrado)),
      alcanzada: meta !== null && cobrado >= meta,
      proyeccion:
        periodo === "mes" && metaMensual !== null && diasTranscurridos > 0
          ? Math.round((cobrado / diasTranscurridos) * diasTotalesMes)
          : null,
    };
  });

  const sinMedico = [...cobradoPorNombre.entries()]
    .filter(([, monto]) => monto > 0)
    .map(([nombre, monto]) => ({ nombre: nombre || "(sin nombre)", monto: redondearDinero(monto) }))
    .sort((a, b) => b.monto - a.monto);

  return {
    filas,
    totalCobrado: redondearDinero(filas.reduce((s, f) => s + f.cobrado, 0) + sinMedico.reduce((s, x) => s + x.monto, 0)),
    totalComision: redondearDinero(filas.reduce((s, f) => s + (f.comision ?? 0), 0)),
    sinMedico,
  };
}
