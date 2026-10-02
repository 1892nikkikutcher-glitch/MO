import { describe, expect, it } from "vitest";
import {
  calcularGastosPorCategoria,
  calcularSobresGasto,
  gastoCategoriaOptions,
  presupuestoGastosInicial,
  type Gasto,
  type PresupuestoCategoria,
  type GastoCategoria,
} from "../gastos";

function gasto(categoria: GastoCategoria, monto: number, fecha: string): Gasto {
  return { id: `${categoria}-${fecha}-${monto}`, concepto: "test", categoria, monto, fecha };
}

describe("calcularGastosPorCategoria", () => {
  const desde = new Date("2026-10-01T00:00:00");
  const hasta = new Date("2026-10-31T00:00:00");

  it("con gastos vacío, devuelve las 7 categorías en 0", () => {
    const resultado = calcularGastosPorCategoria([], desde, hasta);
    gastoCategoriaOptions.forEach((c) => expect(resultado[c]).toBe(0));
  });

  it("suma dos gastos de la misma categoría dentro del rango", () => {
    const resultado = calcularGastosPorCategoria(
      [gasto("Insumos", 500, "2026-10-05"), gasto("Insumos", 300, "2026-10-10")],
      desde,
      hasta
    );
    expect(resultado.Insumos).toBe(800);
  });

  it("no mezcla categorías distintas", () => {
    const resultado = calcularGastosPorCategoria(
      [gasto("Insumos", 500, "2026-10-05"), gasto("Renta", 2500, "2026-10-01")],
      desde,
      hasta
    );
    expect(resultado.Insumos).toBe(500);
    expect(resultado.Renta).toBe(2500);
  });

  it("excluye gastos fuera del rango", () => {
    const resultado = calcularGastosPorCategoria(
      [gasto("Insumos", 500, "2026-09-30"), gasto("Insumos", 300, "2026-11-01")],
      desde,
      hasta
    );
    expect(resultado.Insumos).toBe(0);
  });

  it("incluye los límites del rango (desde y hasta inclusive)", () => {
    const resultado = calcularGastosPorCategoria(
      [gasto("Renta", 1000, "2026-10-01"), gasto("Renta", 1000, "2026-10-31")],
      desde,
      hasta
    );
    expect(resultado.Renta).toBe(2000);
  });
});

describe("calcularSobresGasto", () => {
  function config(overrides: Partial<PresupuestoCategoria> = {}): PresupuestoCategoria {
    return { clasificacion: "variable", modo: "monto", valor: 0, ...overrides };
  }
  function porCategoriaConUna(categoria: GastoCategoria, cfg: PresupuestoCategoria) {
    return { ...presupuestoGastosInicial.porCategoria, [categoria]: cfg };
  }
  function gastosEnCero(): Record<GastoCategoria, number> {
    return Object.fromEntries(gastoCategoriaOptions.map((c) => [c, 0])) as Record<GastoCategoria, number>;
  }

  it("modo monto: el límite es el valor literal, sin depender del ingreso del mes", () => {
    const porCategoria = porCategoriaConUna("Insumos", config({ modo: "monto", valor: 3000 }));
    const sinIngreso = calcularSobresGasto(porCategoria, gastosEnCero(), 0);
    const conIngreso = calcularSobresGasto(porCategoria, gastosEnCero(), 500000);
    expect(sinIngreso.find((s) => s.categoria === "Insumos")?.limite).toBe(3000);
    expect(conIngreso.find((s) => s.categoria === "Insumos")?.limite).toBe(3000);
  });

  it("modo porcentaje: límite = ingreso * valor/100, redondeado a centavos", () => {
    const porCategoria = porCategoriaConUna("Renta", config({ clasificacion: "fijo", modo: "porcentaje", valor: 7.5 }));
    const sobres = calcularSobresGasto(porCategoria, gastosEnCero(), 10000);
    expect(sobres.find((s) => s.categoria === "Renta")?.limite).toBe(750);
  });

  it("valor en 0 (sin configurar) nunca produce NaN/Infinity, incluso con gasto real", () => {
    const porCategoria = porCategoriaConUna("Marketing", config({ modo: "monto", valor: 0 }));
    const gastos = gastosEnCero();
    gastos.Marketing = 800;
    const sobre = calcularSobresGasto(porCategoria, gastos, 10000).find((s) => s.categoria === "Marketing")!;
    expect(sobre.sinConfigurar).toBe(true);
    expect(sobre.limite).toBe(0);
    expect(sobre.porcentajeUsado).toBe(0);
    expect(Number.isFinite(sobre.porcentajeUsado)).toBe(true);
  });

  it("ingreso del mes en 0 con modo porcentaje tampoco produce división entre cero", () => {
    const porCategoria = porCategoriaConUna("Renta", config({ clasificacion: "fijo", modo: "porcentaje", valor: 10 }));
    const sobre = calcularSobresGasto(porCategoria, gastosEnCero(), 0).find((s) => s.categoria === "Renta")!;
    expect(sobre.sinConfigurar).toBe(true);
    expect(sobre.limite).toBe(0);
  });

  it("gasto que excede el límite: restante negativo, porcentajeUsado topado en 100", () => {
    const porCategoria = porCategoriaConUna("Insumos", config({ modo: "monto", valor: 1000 }));
    const gastos = gastosEnCero();
    gastos.Insumos = 1500;
    const sobre = calcularSobresGasto(porCategoria, gastos, 0).find((s) => s.categoria === "Insumos")!;
    expect(sobre.restante).toBe(-500);
    expect(sobre.porcentajeUsado).toBe(100);
  });

  it("gasto parcial normal calcula el porcentaje correctamente", () => {
    const porCategoria = porCategoriaConUna("Insumos", config({ modo: "monto", valor: 1000 }));
    const gastos = gastosEnCero();
    gastos.Insumos = 400;
    const sobre = calcularSobresGasto(porCategoria, gastos, 0).find((s) => s.categoria === "Insumos")!;
    expect(sobre.sinConfigurar).toBe(false);
    expect(sobre.porcentajeUsado).toBe(40);
    expect(sobre.restante).toBe(600);
  });

  it("una categoría ausente del doc (legado parcial) usa el fallback inicial, no truena", () => {
    const porCategoriaIncompleto = { Renta: config({ clasificacion: "fijo", modo: "monto", valor: 2000 }) } as Record<
      GastoCategoria,
      PresupuestoCategoria
    >;
    const sobres = calcularSobresGasto(porCategoriaIncompleto, gastosEnCero(), 0);
    expect(sobres).toHaveLength(gastoCategoriaOptions.length);
    expect(sobres.find((s) => s.categoria === "Marketing")).toBeDefined();
  });

  it("devuelve las 7 categorías en el mismo orden que gastoCategoriaOptions", () => {
    const sobres = calcularSobresGasto(presupuestoGastosInicial.porCategoria, gastosEnCero(), 0);
    expect(sobres.map((s) => s.categoria)).toEqual([...gastoCategoriaOptions]);
  });
});
