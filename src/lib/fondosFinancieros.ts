/** Regla de sobres del consultorio: cada peso que entra se reparte entre
 * fondos fijos, según el canal por el que entró. El usuario definió estos
 * porcentajes a mano (no son configurables desde la interfaz todavía) —
 * ver Inicio.tsx para dónde se muestran. */

import { redondearDinero } from "./dinero";
import { MESES_ABR, addDays, addMonths } from "./agendaHelpers";
import { inicioSemana } from "./metas";
import { FORMA_PAGO_CASHBACK } from "./cashback";

export type FondoAsignacion = { label: string; porcentaje: number };

/** Un canal puede mostrarse como una sola lista plana (un solo grupo sin
 * título, ej. Efectivo) o dividido en subgrupos con su propio % del total
 * (ej. Electrónico: Operativo 60% / Reservas 40%) — mismo componente de
 * despliegue sirve para ambos casos. */
export type GrupoFondos = {
  titulo?: string;
  porcentajeGrupo: number;
  fondos: FondoAsignacion[];
};

export const GRUPOS_ELECTRONICO: GrupoFondos[] = [
  {
    titulo: "Operativo",
    porcentajeGrupo: 60,
    fondos: [
      { label: "Nómina", porcentaje: 15 },
      { label: "Alquiler", porcentaje: 5 },
      { label: "Mi sueldo", porcentaje: 20 },
      { label: "Insumos", porcentaje: 10 },
      { label: "Gastos generales", porcentaje: 10 },
    ],
  },
  {
    titulo: "Reservas",
    porcentajeGrupo: 40,
    fondos: [
      { label: "Ganancias", porcentaje: 10 },
      { label: "Impuestos", porcentaje: 15 },
      { label: "Compensación dueño", porcentaje: 15 },
    ],
  },
];

export const GRUPOS_EFECTIVO: GrupoFondos[] = [
  {
    porcentajeGrupo: 100,
    fondos: [
      { label: "Fondo en cash", porcentaje: 50 },
      { label: "Ganancias", porcentaje: 10 },
      { label: "Urgencias", porcentaje: 10 },
      { label: "Contingencias", porcentaje: 10 },
      { label: "Indemnizaciones", porcentaje: 10 },
      { label: "Compensación dueño", porcentaje: 10 },
    ],
  },
];

/** Divide los ingresos del rango en dos canales — "Efectivo" (coincidencia
 * exacta con ese texto de `formaPago`) vs. cualquier otro método (tarjeta,
 * transferencia, cheque...) — mismo criterio binario que usa el usuario
 * para separar sus fondos. `porFechaYFormaPago` es el desglose que ya
 * alimenta Corte de Caja (ver FinanzasConfig en metas.ts), así que esto no
 * necesita ninguna agregación nueva del lado de registrar pagos. */
export function sumarRangoPorFormaPago(
  porFechaYFormaPago: Record<string, Record<string, number>>,
  desde: Date,
  hasta: Date
): { efectivo: number; electronico: number } {
  let efectivo = 0;
  let electronico = 0;
  Object.entries(porFechaYFormaPago).forEach(([fecha, porForma]) => {
    const d = new Date(`${fecha}T00:00:00`);
    if (d < desde || d > hasta) return;
    Object.entries(porForma).forEach(([forma, monto]) => {
      if (forma === FORMA_PAGO_CASHBACK) return; // lo pagado con Saldo Sonríe no es dinero que entró: no se reparte
      if (forma === "Efectivo") efectivo += monto;
      else electronico += monto;
    });
  });
  return { efectivo: redondearDinero(efectivo), electronico: redondearDinero(electronico) };
}

export type IngresosPorMedico = { medico: string; efectivo: number; electronico: number };

/** Lo que cobró cada médico en el rango, separado en efectivo y electrónico (mismo criterio que `sumarRangoPorFormaPago`).
 * Los médicos salen ordenados de quien más cobró a quien menos. */
export function sumarRangoPorMedico(
  porFechaMedicoYFormaPago: Record<string, Record<string, Record<string, number>>>,
  desde: Date,
  hasta: Date
): IngresosPorMedico[] {
  const acumulado = new Map<string, { efectivo: number; electronico: number }>();
  Object.entries(porFechaMedicoYFormaPago).forEach(([fecha, porMedico]) => {
    const d = new Date(`${fecha}T00:00:00`);
    if (d < desde || d > hasta) return;
    Object.entries(porMedico).forEach(([medico, porForma]) => {
      const actual = acumulado.get(medico) ?? { efectivo: 0, electronico: 0 };
      Object.entries(porForma).forEach(([forma, monto]) => {
        if (forma === FORMA_PAGO_CASHBACK) return;
        if (forma === "Efectivo") actual.efectivo += monto;
        else actual.electronico += monto;
      });
      acumulado.set(medico, actual);
    });
  });
  return [...acumulado.entries()]
    .map(([medico, v]) => ({ medico, efectivo: redondearDinero(v.efectivo), electronico: redondearDinero(v.electronico) }))
    .sort((a, b) => b.efectivo + b.electronico - (a.efectivo + a.electronico) || a.medico.localeCompare(b.medico));
}

/** ¿El desglose por médico suma lo mismo que el total cobrado en el rango? Si no (días anteriores a que existiera el
 * desglose, o un cobro que no pasó por él), el reparto por doctor sería incompleto y hay que avisar. */
export function desglosePorMedicoCompleto(medicos: IngresosPorMedico[], ingresos: { efectivo: number; electronico: number }): boolean {
  const suma = medicos.reduce((s, m) => s + m.efectivo + m.electronico, 0);
  return Math.abs(suma - (ingresos.efectivo + ingresos.electronico)) < 0.01;
}

export type VistaFondos = "dia" | "semana" | "quincena1" | "quincena2" | "mes";

/** Total que llevamos en el periodo: todo lo cobrado, sea efectivo o electrónico. */
export function totalCobrado(ingresos: { efectivo: number; electronico: number }): number {
  return redondearDinero(ingresos.efectivo + ingresos.electronico);
}

/** Título del total según la vista elegida (día, semana, quincena o mes). */
export function etiquetaTotalFondos(vista: VistaFondos): string {
  switch (vista) {
    case "dia":
      return "Total del día";
    case "semana":
      return "Total de la semana";
    case "quincena1":
      return "Total de la quincena 1–15";
    case "quincena2":
      return "Total de la quincena 16–fin";
    case "mes":
      return "Total del mes";
  }
}

export type RangoFondos = { desde: Date; hasta: Date; label: string };

const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** Número de semana del año (ISO 8601: la semana empieza en lunes y la 1 es la que trae el primer
 * jueves del año) — mismo corte lunes-domingo que usa la vista Semana. */
export function semanaDelAnio(fecha: Date): number {
  const d = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  const diaLunes1 = d.getUTCDay() || 7; // lunes = 1 … domingo = 7
  d.setUTCDate(d.getUTCDate() + 4 - diaLunes1); // el jueves de esa semana decide el año y el número
  const inicioAnio = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - inicioAnio.getTime()) / 86_400_000 + 1) / 7);
}

/** "Semana 25 de 52": el número de la semana y cuántas semanas tiene ese año (52 o 53 según el año ISO). El
 * 28 de diciembre siempre cae en la última semana del año ISO, de ahí sale el total. */
export function semanaConTotalDelAnio(fecha: Date): { semana: number; total: number } {
  const jueves = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  jueves.setDate(jueves.getDate() + 4 - (jueves.getDay() || 7)); // el jueves decide a qué año ISO pertenece
  return { semana: semanaDelAnio(fecha), total: semanaDelAnio(new Date(jueves.getFullYear(), 11, 28)) };
}

/** Título completo del cuadro del total: en Día dice qué día de la semana fue ("Total del día ·
 * sábado 10 oct."), en Semana dice cuál semana del año es ("Total de la semana 41 · 5–11 oct.");
 * quincena y mes no cambian. */
export function tituloTotalFondos(vista: VistaFondos, rango: RangoFondos, ancla: Date): string {
  if (vista === "dia") return `${etiquetaTotalFondos(vista)} · ${DIAS_SEMANA[ancla.getDay()]} ${rango.label}`;
  if (vista === "semana") return `${etiquetaTotalFondos(vista)} ${semanaDelAnio(rango.desde)} · ${rango.label}`;
  return `${etiquetaTotalFondos(vista)} · ${rango.label}`;
}

/** Mismo estilo breve que ya usan quincena/mes (sin "de", sin año) — a
 * diferencia de `formatRangeLabel` en agendaHelpers.ts, pensado para un
 * lugar con más espacio (el selector de periodo general). */
function labelRango(desde: Date, finNatural: Date): string {
  if (desde.getMonth() === finNatural.getMonth()) {
    return `${desde.getDate()}–${finNatural.getDate()} ${MESES_ABR[finNatural.getMonth()]}`;
  }
  return `${desde.getDate()} ${MESES_ABR[desde.getMonth()]} – ${finNatural.getDate()} ${MESES_ABR[finNatural.getMonth()]}`;
}

/** Rango de fechas de la vista elegida, centrado en `ancla` — semana usa el
 * mismo corte lunes-domingo que ya usa `inicioSemana` (metas.ts) para la
 * Meta Semanal, quincena 1 = días 1-15, quincena 2 = día 16 al último día
 * del mes (mismo corte que ya usa `inicioQuincena` para la Meta
 * Quincenal). `hoy` (por default, el propio `ancla` — el caso de siempre,
 * viendo el periodo actual) topa `hasta` para nunca proyectar más allá de
 * hoy: si el fin natural del periodo ya pasó (navegado al pasado con las
 * flechas — ver navegarVistaFondos) queda tal cual, sin cortar; si el fin
 * natural todavía no llega (el periodo actual a medias, ej. quincena 2
 * vista el día 18, o un periodo navegado al futuro que ni siquiera
 * arrancó), `hasta` se topa a hoy — que en un periodo futuro queda ANTES
 * que `desde`, un rango invertido/vacío a propósito: `sumarRangoPorFormaPago`
 * ya lo suma en cero sin necesitar un caso especial, y `label` (calculado
 * aparte, sin este tope) sigue mostrando el periodo real. */
export function rangoVistaFondos(vista: VistaFondos, ancla: Date, hoy: Date = ancla): RangoFondos {
  const anio = ancla.getFullYear();
  const mes = ancla.getMonth();
  const anclaSinHora = new Date(anio, mes, ancla.getDate());
  const hoySinHora = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const ultimoDiaMes = new Date(anio, mes + 1, 0).getDate();

  let desde: Date;
  let finNatural: Date;
  let label: string;

  if (vista === "dia") {
    desde = anclaSinHora;
    finNatural = anclaSinHora;
    label = `${anclaSinHora.getDate()} ${MESES_ABR[mes]}`;
  } else if (vista === "semana") {
    desde = inicioSemana(ancla);
    finNatural = new Date(desde);
    finNatural.setDate(finNatural.getDate() + 6);
    label = labelRango(desde, finNatural);
  } else if (vista === "quincena1") {
    desde = new Date(anio, mes, 1);
    finNatural = new Date(anio, mes, 15);
    label = `1–15 ${MESES_ABR[mes]}`;
  } else if (vista === "quincena2") {
    desde = new Date(anio, mes, 16);
    finNatural = new Date(anio, mes, ultimoDiaMes);
    label = `16–${ultimoDiaMes} ${MESES_ABR[mes]}`;
  } else {
    desde = new Date(anio, mes, 1);
    finNatural = new Date(anio, mes, ultimoDiaMes);
    label = `${MESES_ABR[mes]} ${anio}`;
  }

  const hasta = finNatural < hoySinHora ? finNatural : hoySinHora;
  return { desde, hasta, label };
}

/** Mueve `ancla` un "paso" natural de la vista activa — mismo espíritu que
 * la navegación de PeriodSelector en el Dashboard Principal (flechas ‹ ›),
 * adaptado a los cinco tipos de vista de Fondos. Quincena 1 y quincena 2 se
 * navegan de un mes completo en un mes completo (nunca saltan a "la otra
 * quincena" del mismo mes) — para eso ya están los botones de vista. */
export function navegarVistaFondos(vista: VistaFondos, ancla: Date, direccion: -1 | 1): Date {
  switch (vista) {
    case "dia":
      return addDays(ancla, direccion);
    case "semana":
      return addDays(ancla, direccion * 7);
    case "quincena1":
    case "quincena2":
    case "mes":
    default:
      return addMonths(ancla, direccion);
  }
}

export type FondoConMonto = FondoAsignacion & { monto: number };
export type GrupoConMonto = Omit<GrupoFondos, "fondos"> & { montoGrupo: number; fondos: FondoConMonto[] };

/** Aplica los porcentajes de cada grupo/fondo sobre el ingreso real del
 * canal — el monto de un fondo es directamente `ingresoCanal *
 * (porcentaje/100)`, nunca `montoGrupo * (porcentaje/grupo)`, para que
 * redondear cada fondo por separado no arrastre error hacia el subtotal. */
export function calcularAsignacionFondos(grupos: GrupoFondos[], ingresoCanal: number): GrupoConMonto[] {
  return grupos.map((grupo) => ({
    ...grupo,
    montoGrupo: redondearDinero((ingresoCanal * grupo.porcentajeGrupo) / 100),
    fondos: grupo.fondos.map((f) => ({ ...f, monto: redondearDinero((ingresoCanal * f.porcentaje) / 100) })),
  }));
}
