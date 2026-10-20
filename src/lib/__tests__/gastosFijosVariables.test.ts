import { describe, expect, it } from "vitest";
import { calcularFijosYVariables, clasificacionDeGasto, type Gasto } from "../gastos";

const g = (categoria: Gasto["categoria"], monto: number, fecha: string, clasificacion?: Gasto["clasificacion"]): Gasto => ({
  id: `${categoria}${fecha}${monto}`,
  concepto: "x",
  categoria,
  monto,
  fecha,
  ...(clasificacion ? { clasificacion } : {}),
});

const porCategoria = { Renta: { clasificacion: "fijo" as const }, Insumos: { clasificacion: "variable" as const } };

describe("gastos fijos y variables", () => {
  it("usa la clasificación del gasto y, si no, la de su categoría", () => {
    expect(clasificacionDeGasto(g("Renta", 1, "2026-10-01"), porCategoria)).toBe("fijo");
    expect(clasificacionDeGasto(g("Insumos", 1, "2026-10-01"), porCategoria)).toBe("variable");
    expect(clasificacionDeGasto(g("Renta", 1, "2026-10-01", "variable"), porCategoria)).toBe("variable");
    expect(clasificacionDeGasto(g("Insumos", 1, "2026-10-01", "fijo"), porCategoria)).toBe("fijo");
  });

  it("sin configuración usa la sugerida (renta, nómina y servicios son fijos; lo demás, variable)", () => {
    expect(clasificacionDeGasto(g("Nómina", 1, "2026-10-01"), {})).toBe("fijo");
    expect(clasificacionDeGasto(g("Marketing", 1, "2026-10-01"), {})).toBe("variable");
  });

  it("suma fijos y variables del rango, cada gasto con su clasificación", () => {
    const r = calcularFijosYVariables(
      [
        g("Renta", 8000, "2026-10-01"),
        g("Insumos", 2000, "2026-10-05"),
        g("Insumos", 1000, "2026-10-06", "fijo"),
        g("Renta", 9999, "2026-09-30"), // otro mes
      ],
      porCategoria,
      new Date("2026-10-01T00:00:00"),
      new Date("2026-10-31T23:59:59")
    );
    expect(r).toEqual({ fijos: 9000, variables: 2000, total: 11000 });
  });
});

describe("costos, gastos e inversión", () => {
  it("cada categoría tiene su naturaleza por defecto", async () => {
    const { naturalezaDeGasto } = await import("../gastos");
    expect(naturalezaDeGasto(g("Insumos", 1, "2026-10-01"))).toBe("costo");
    expect(naturalezaDeGasto(g("Laboratorio", 1, "2026-10-01"))).toBe("costo");
    expect(naturalezaDeGasto(g("Renta", 1, "2026-10-01"))).toBe("gasto");
    expect(naturalezaDeGasto(g("Nómina", 1, "2026-10-01"))).toBe("gasto");
    expect(naturalezaDeGasto(g("Marketing", 1, "2026-10-01"))).toBe("gasto");
    expect(naturalezaDeGasto(g("Inversión", 1, "2026-10-01"))).toBe("inversion");
  });

  it("la naturaleza propia del gasto manda sobre la de la categoría", async () => {
    const { naturalezaDeGasto } = await import("../gastos");
    expect({ ...g("Insumos", 1, "2026-10-01"), naturaleza: "inversion" as const }).toBeTruthy();
    expect(naturalezaDeGasto({ categoria: "Insumos", naturaleza: "inversion" })).toBe("inversion");
    expect(naturalezaDeGasto({ categoria: "Nómina", naturaleza: "costo" })).toBe("costo"); // comisiones como costo
  });

  it("suma costos, gastos e inversión del rango por separado", async () => {
    const { calcularPorNaturaleza } = await import("../gastos");
    const r = calcularPorNaturaleza(
      [
        g("Insumos", 3000, "2026-10-05"),
        g("Renta", 8000, "2026-10-01"),
        g("Inversión", 25000, "2026-10-10"),
        { ...g("Nómina", 4000, "2026-10-15"), naturaleza: "costo" },
        g("Renta", 9999, "2026-09-30"), // otro mes
      ],
      new Date("2026-10-01T00:00:00"),
      new Date("2026-10-31T23:59:59")
    );
    expect(r).toEqual({ costos: 7000, gastos: 8000, inversion: 25000, financieros: 0 });
  });

  it("la inversión no cuenta en fijos ni variables", () => {
    const r = calcularFijosYVariables(
      [g("Renta", 8000, "2026-10-01"), g("Inversión", 25000, "2026-10-10", "fijo"), g("Insumos", 2000, "2026-10-05")],
      porCategoria,
      new Date("2026-10-01T00:00:00"),
      new Date("2026-10-31T23:59:59")
    );
    expect(r).toEqual({ fijos: 8000, variables: 2000, total: 10000 });
  });
});

describe("impuestos e intereses", () => {
  it("la categoría Impuestos e intereses es financiera y va aparte de costos, gastos e inversión", async () => {
    const { naturalezaDeGasto, calcularPorNaturaleza } = await import("../gastos");
    expect(naturalezaDeGasto(g("Impuestos e intereses", 1, "2026-10-01"))).toBe("financiero");
    const r = calcularPorNaturaleza(
      [g("Impuestos e intereses", 3000, "2026-10-05"), g("Renta", 8000, "2026-10-01"), { ...g("Otro", 500, "2026-10-06"), naturaleza: "financiero" as const }],
      new Date("2026-10-01T00:00:00"),
      new Date("2026-10-31T23:59:59")
    );
    expect(r).toEqual({ costos: 0, gastos: 8000, inversion: 0, financieros: 3500 });
  });

  it("no cuentan como fijos ni variables", () => {
    const r = calcularFijosYVariables(
      [g("Renta", 8000, "2026-10-01"), g("Impuestos e intereses", 3000, "2026-10-05")],
      porCategoria,
      new Date("2026-10-01T00:00:00"),
      new Date("2026-10-31T23:59:59")
    );
    expect(r).toEqual({ fijos: 8000, variables: 0, total: 8000 });
  });
});
