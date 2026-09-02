import { describe, expect, it } from "vitest";
import { calcularRangoPeriodo, sumarPresupuestosEnRango } from "../dashboardMetrics";

describe("sumarPresupuestosEnRango", () => {
  const presupuestosPorFecha = {
    "2026-06-01": { cantidad: 2, valor: 3000 },
    "2026-06-15": { cantidad: 1, valor: 1500 },
    "2026-07-01": { cantidad: 3, valor: 4500 },
  };

  it("suma cantidad y valor de las fechas dentro del rango (inclusive)", () => {
    const resultado = sumarPresupuestosEnRango(presupuestosPorFecha, "2026-06-01", "2026-06-30");
    expect(resultado).toEqual({ cantidad: 3, valor: 4500 });
  });

  it("{cantidad:0, valor:0} cuando el rollup no existe (documentos legados)", () => {
    expect(sumarPresupuestosEnRango(undefined, "2026-06-01", "2026-06-30")).toEqual({ cantidad: 0, valor: 0 });
  });

  it("{cantidad:0, valor:0} cuando ninguna fecha cae dentro del rango", () => {
    const resultado = sumarPresupuestosEnRango(presupuestosPorFecha, "2026-01-01", "2026-01-31");
    expect(resultado).toEqual({ cantidad: 0, valor: 0 });
  });

  it("incluye los límites del rango", () => {
    const resultado = sumarPresupuestosEnRango({ "2026-06-01": { cantidad: 5, valor: 100 } }, "2026-06-01", "2026-06-01");
    expect(resultado).toEqual({ cantidad: 5, valor: 100 });
  });
});

describe("calcularRangoPeriodo (regresión — ya existía, sin test hasta ahora)", () => {
  it("'hoy' cubre solo el día actual", () => {
    const hoy = new Date(2026, 5, 15);
    const rango = calcularRangoPeriodo("hoy", hoy);
    expect(rango.desdeISO).toBe("2026-06-15");
    expect(rango.hastaISO).toBe("2026-06-15");
    expect(rango.label).toBe("Hoy");
  });

  it("'mes' arranca el día 1 del mes actual", () => {
    const hoy = new Date(2026, 5, 15);
    const rango = calcularRangoPeriodo("mes", hoy);
    expect(rango.desdeISO).toBe("2026-06-01");
    expect(rango.hastaISO).toBe("2026-06-15");
  });

  it("'personalizado' respeta el rango exacto capturado, incluso invertido", () => {
    const hoy = new Date(2026, 5, 15);
    const rango = calcularRangoPeriodo("personalizado", hoy, { desdeISO: "2026-03-10", hastaISO: "2026-01-05" });
    expect(rango.desdeISO).toBe("2026-01-05");
    expect(rango.hastaISO).toBe("2026-03-10");
    expect(rango.label).toBe("Personalizado");
  });

  it("el rango anterior tiene el mismo número de días, justo antes", () => {
    const hoy = new Date(2026, 5, 15);
    const rango = calcularRangoPeriodo("semana", hoy);
    const dias = (new Date(`${rango.hastaISO}T00:00:00`).getTime() - new Date(`${rango.desdeISO}T00:00:00`).getTime()) / 86_400_000 + 1;
    const diasAnterior =
      (new Date(`${rango.hastaAnteriorISO}T00:00:00`).getTime() - new Date(`${rango.desdeAnteriorISO}T00:00:00`).getTime()) / 86_400_000 + 1;
    expect(diasAnterior).toBe(dias);
    expect(rango.hastaAnteriorISO < rango.desdeISO).toBe(true);
  });
});
