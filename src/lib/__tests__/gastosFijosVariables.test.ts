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
