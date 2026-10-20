import { redondearDinero } from "./dinero";

export const gastoCategoriaOptions = [
  "Insumos",
  "Renta",
  "Nómina",
  "Servicios",
  "Laboratorio",
  "Marketing",
  "Otro",
  "Inversión",
] as const;
export type GastoCategoria = (typeof gastoCategoriaOptions)[number];

export type Gasto = {
  id: string;
  concepto: string;
  categoria: GastoCategoria;
  monto: number;
  /** Fecha ISO "YYYY-MM-DD". */
  fecha: string;
  /** Si este gasto es fijo o variable. Ausente = el de su categoría (Administración → Presupuesto de Gastos). */
  clasificacion?: ClasificacionGasto;
  /** Si es un costo (lo que cuesta dar el servicio), un gasto (lo que cuesta operar) o una inversión (equipo,
   * remodelación…). Ausente = el de su categoría. */
  naturaleza?: NaturalezaGasto;
};

/** Costo: insumos, laboratorio (lo que cuesta atender). Gasto: renta, nómina, servicios, marketing (lo que cuesta
 * operar). Inversión: equipo, mobiliario, remodelación (se compra una vez y rinde durante años; no resta de la
 * utilidad del mes, pero sí del efectivo). */
export const naturalezaGastoOptions = ["costo", "gasto", "inversion"] as const;
export type NaturalezaGasto = (typeof naturalezaGastoOptions)[number];

export const etiquetaNaturaleza: Record<NaturalezaGasto, string> = { costo: "Costo", gasto: "Gasto", inversion: "Inversión" };

/** Naturaleza que se le da a cada categoría mientras el gasto no diga otra. */
const naturalezaPorDefecto: Record<GastoCategoria, NaturalezaGasto> = {
  Insumos: "costo",
  Laboratorio: "costo",
  Renta: "gasto",
  Nómina: "gasto",
  Servicios: "gasto",
  Marketing: "gasto",
  Otro: "gasto",
  Inversión: "inversion",
};

export function naturalezaDeGasto(gasto: Pick<Gasto, "categoria" | "naturaleza">): NaturalezaGasto {
  if (gasto.naturaleza === "costo" || gasto.naturaleza === "gasto" || gasto.naturaleza === "inversion") return gasto.naturaleza;
  return naturalezaPorDefecto[gasto.categoria] ?? "gasto";
}

/** Lo gastado en el rango, separado en costos, gastos de operación e inversión. */
export function calcularPorNaturaleza(
  gastos: Gasto[],
  desde: Date,
  hasta: Date
): { costos: number; gastos: number; inversion: number } {
  const t = { costo: 0, gasto: 0, inversion: 0 };
  gastos.forEach((g) => {
    const d = new Date(`${g.fecha}T00:00:00`);
    if (d < desde || d > hasta) return;
    t[naturalezaDeGasto(g)] += g.monto;
  });
  return { costos: redondearDinero(t.costo), gastos: redondearDinero(t.gasto), inversion: redondearDinero(t.inversion) };
}

/** Sobres de gasto — clasificación fijo/variable por categoría y un
 * presupuesto mensual (porcentaje del ingreso del mes, o un monto fijo en
 * pesos) para saber cuánto se puede gastar todavía. Deliberadamente
 * independiente de la "Regla de Sobres" de Fondos Financieros (que reparte
 * ingresos, no limita gastos) — mismo espíritu de "sobre con un límite",
 * sin reusar esos porcentajes, para no pedirle al usuario el mismo dato dos
 * veces en dos lugares distintos. */
export const clasificacionGastoOptions = ["fijo", "variable"] as const;
export type ClasificacionGasto = (typeof clasificacionGastoOptions)[number];

export const modoPresupuestoOptions = ["porcentaje", "monto"] as const;
export type ModoPresupuesto = (typeof modoPresupuestoOptions)[number];

export type PresupuestoCategoria = {
  clasificacion: ClasificacionGasto;
  modo: ModoPresupuesto;
  /** Si modo="porcentaje": % del ingreso del mes. Si modo="monto": pesos
   * fijos. 0 (o sin entrada) significa "sin configurar todavía". */
  valor: number;
};

export type PresupuestoGastosConfig = {
  porCategoria: Record<GastoCategoria, PresupuestoCategoria>;
};

/** Clasificación sugerida al sembrar el documento por primera vez — una
 * clínica dental típica tiene Renta/Nómina/Servicios como costos fijos e
 * Insumos/Laboratorio/Marketing/Otro como variables. Editable después desde
 * Administración → Presupuesto de Gastos, no es permanente. */
const clasificacionPorDefecto: Record<GastoCategoria, ClasificacionGasto> = {
  Renta: "fijo",
  Nómina: "fijo",
  Servicios: "fijo",
  Insumos: "variable",
  Laboratorio: "variable",
  Marketing: "variable",
  Otro: "variable",
  Inversión: "variable",
};

export const presupuestoGastosInicial: PresupuestoGastosConfig = {
  porCategoria: Object.fromEntries(
    gastoCategoriaOptions.map((categoria) => [
      categoria,
      { clasificacion: clasificacionPorDefecto[categoria], modo: "monto", valor: 0 } satisfies PresupuestoCategoria,
    ])
  ) as Record<GastoCategoria, PresupuestoCategoria>,
};

/** Fijo o variable: lo que se le puso a ese gasto y, si no, lo de su categoría. */
export function clasificacionDeGasto(
  gasto: Pick<Gasto, "categoria" | "clasificacion">,
  porCategoria: Partial<Record<GastoCategoria, { clasificacion: ClasificacionGasto }>>
): ClasificacionGasto {
  if (gasto.clasificacion === "fijo" || gasto.clasificacion === "variable") return gasto.clasificacion;
  return porCategoria[gasto.categoria]?.clasificacion ?? presupuestoGastosInicial.porCategoria[gasto.categoria]?.clasificacion ?? "variable";
}

/** Lo gastado en el rango en costos y gastos, separado en fijo y variable (cada gasto con su propia clasificación).
 * La inversión no cuenta: no es un gasto de operación. */
export function calcularFijosYVariables(
  gastos: Gasto[],
  porCategoria: Partial<Record<GastoCategoria, { clasificacion: ClasificacionGasto }>>,
  desde: Date,
  hasta: Date
): { fijos: number; variables: number; total: number } {
  let fijos = 0;
  let variables = 0;
  gastos.forEach((g) => {
    const d = new Date(`${g.fecha}T00:00:00`);
    if (d < desde || d > hasta) return;
    if (naturalezaDeGasto(g) === "inversion") return;
    if (clasificacionDeGasto(g, porCategoria) === "fijo") fijos += g.monto;
    else variables += g.monto;
  });
  return { fijos: redondearDinero(fijos), variables: redondearDinero(variables), total: redondearDinero(fijos + variables) };
}

/** Suma de gastos del rango, agrupada por categoría — mismo filtro de fecha
 * inclusive que ya usaba el cálculo de "Gastos del Mes" en Gastos.tsx.
 * Siempre devuelve las 7 categorías (en 0 si no tuvieron gasto en el
 * rango), para que un sobre sin movimiento este mes se siga mostrando
 * vacío en vez de desaparecer de la lista. */
export function calcularGastosPorCategoria(
  gastos: Gasto[],
  desde: Date,
  hasta: Date
): Record<GastoCategoria, number> {
  const resultado = Object.fromEntries(gastoCategoriaOptions.map((c) => [c, 0])) as Record<
    GastoCategoria,
    number
  >;
  gastos.forEach((g) => {
    const d = new Date(`${g.fecha}T00:00:00`);
    if (d < desde || d > hasta) return;
    resultado[g.categoria] = redondearDinero(resultado[g.categoria] + g.monto);
  });
  return resultado;
}

export type SobreGasto = PresupuestoCategoria & {
  categoria: GastoCategoria;
  /** Límite ya resuelto a pesos para este mes (si modo="porcentaje", ya
   * aplicado sobre `ingresoDelMes`). */
  limite: number;
  gastado: number;
  /** limite - gastado, SIN topar — negativo significa que ya se excedió. */
  restante: number;
  /** 0-100, topado en 100 (nunca más, aunque se haya excedido). */
  porcentajeUsado: number;
  /** true si `valor` es 0/sin definir (o el límite resuelto da 0) — evita
   * mostrar una alarma falsa cuando nadie ha configurado el sobre todavía. */
  sinConfigurar: boolean;
};

/** Resuelve cada categoría a su sobre de gasto del mes. Itera sobre
 * `gastoCategoriaOptions` (no `Object.keys(porCategoria)`) para garantizar
 * las 7 categorías siempre presentes y en el mismo orden, con fallback al
 * default si el documento de Firestore llegara parcial (ej. una categoría
 * agregada después de que el doc ya existía). */
export function calcularSobresGasto(
  porCategoria: Record<GastoCategoria, PresupuestoCategoria>,
  gastosPorCategoria: Record<GastoCategoria, number>,
  ingresoDelMes: number
): SobreGasto[] {
  return gastoCategoriaOptions.map((categoria) => {
    const config = porCategoria[categoria] ?? presupuestoGastosInicial.porCategoria[categoria];
    const limite =
      config.modo === "porcentaje"
        ? redondearDinero((ingresoDelMes * config.valor) / 100)
        : redondearDinero(config.valor);
    const gastado = gastosPorCategoria[categoria] ?? 0;
    const sinConfigurar = limite <= 0;
    const porcentajeUsado = sinConfigurar ? 0 : Math.min(100, Math.round((gastado / limite) * 100));
    return {
      ...config,
      categoria,
      limite,
      gastado,
      restante: redondearDinero(limite - gastado),
      porcentajeUsado,
      sinConfigurar,
    };
  });
}
