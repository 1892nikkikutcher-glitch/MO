/** Regla de sobres del consultorio: cada peso que entra se reparte entre
 * fondos fijos, según el canal por el que entró. El usuario definió estos
 * porcentajes a mano (no son configurables desde la interfaz todavía) —
 * ver Inicio.tsx para dónde se muestran. */

import { redondearDinero } from "./dinero";
import { MESES_ABR } from "./agendaHelpers";
import { inicioSemana } from "./metas";

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
      if (forma === "Efectivo") efectivo += monto;
      else electronico += monto;
    });
  });
  return { efectivo: redondearDinero(efectivo), electronico: redondearDinero(electronico) };
}

export type VistaFondos = "dia" | "semana" | "quincena1" | "quincena2" | "mes";

export type RangoFondos = { desde: Date; hasta: Date; label: string };

/** Mismo estilo breve que ya usan quincena/mes (sin "de", sin año) — a
 * diferencia de `formatRangeLabel` en agendaHelpers.ts, pensado para un
 * lugar con más espacio (el selector de periodo general). */
function labelRango(desde: Date, finNatural: Date): string {
  if (desde.getMonth() === finNatural.getMonth()) {
    return `${desde.getDate()}–${finNatural.getDate()} ${MESES_ABR[finNatural.getMonth()]}`;
  }
  return `${desde.getDate()} ${MESES_ABR[desde.getMonth()]} – ${finNatural.getDate()} ${MESES_ABR[finNatural.getMonth()]}`;
}

/** Rango de fechas de la vista elegida, siempre relativo a `hoy` (esta
 * sección no navega a periodos pasados, a diferencia del selector de
 * periodo general de Inicio.tsx) — semana usa el mismo corte lunes-domingo
 * que ya usa `inicioSemana` (metas.ts) para la Meta Semanal, quincena 1 =
 * días 1-15, quincena 2 = día 16 al último día del mes (mismo corte que ya
 * usa `inicioQuincena` para la Meta Quincenal). `hasta` nunca pasa de hoy —
 * un periodo que todavía no llega (ej. quincena 2 vista el día 8) da un
 * rango vacío, que `sumarRangoPorFormaPago` ya interpreta como cero sin
 * necesitar un caso especial. */
export function rangoVistaFondos(vista: VistaFondos, hoy: Date): RangoFondos {
  const anio = hoy.getFullYear();
  const mes = hoy.getMonth();
  const hoySinHora = new Date(anio, mes, hoy.getDate());
  const ultimoDiaMes = new Date(anio, mes + 1, 0).getDate();

  let desde: Date;
  let finNatural: Date;
  let label: string;

  if (vista === "dia") {
    desde = hoySinHora;
    finNatural = hoySinHora;
    label = `${hoySinHora.getDate()} ${MESES_ABR[mes]}`;
  } else if (vista === "semana") {
    desde = inicioSemana(hoy);
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
