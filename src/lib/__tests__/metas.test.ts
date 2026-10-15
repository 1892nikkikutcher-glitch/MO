import { describe, expect, it } from "vitest";
import { aplicarDeltaDevolucion, contarPagosEnRango, finanzasInicial } from "../metas";

describe("aplicarDeltaDevolucion", () => {
  it("acumula por fecha y por fecha+método", () => {
    const finanzas = aplicarDeltaDevolucion(finanzasInicial, "2026-06-15", "efectivo", 500);
    expect(finanzas.devolucionesPorFecha?.["2026-06-15"]).toBe(500);
    expect(finanzas.devolucionesPorFechaYMetodo?.["2026-06-15"]?.efectivo).toBe(500);
  });

  it("dos devoluciones la misma fecha con métodos distintos se acumulan por separado", () => {
    let finanzas = aplicarDeltaDevolucion(finanzasInicial, "2026-06-15", "efectivo", 500);
    finanzas = aplicarDeltaDevolucion(finanzas, "2026-06-15", "transferencia", 300);
    expect(finanzas.devolucionesPorFecha?.["2026-06-15"]).toBe(800);
    expect(finanzas.devolucionesPorFechaYMetodo?.["2026-06-15"]).toEqual({ efectivo: 500, transferencia: 300 });
  });

  it("dos devoluciones del mismo método en la misma fecha se suman", () => {
    let finanzas = aplicarDeltaDevolucion(finanzasInicial, "2026-06-15", "efectivo", 500);
    finanzas = aplicarDeltaDevolucion(finanzas, "2026-06-15", "efectivo", 200);
    expect(finanzas.devolucionesPorFechaYMetodo?.["2026-06-15"]?.efectivo).toBe(700);
  });

  it("nunca toca porFecha/porFechaYFormaPago (el corte de cobros, no de devoluciones)", () => {
    const finanzas = aplicarDeltaDevolucion({ ...finanzasInicial, porFecha: { "2026-01-01": 1000 } }, "2026-06-15", "efectivo", 500);
    expect(finanzas.porFecha).toEqual({ "2026-01-01": 1000 });
    expect(finanzas.porFechaYFormaPago).toEqual({});
  });

  it("respeta decimales sin residuo binario", () => {
    let finanzas = aplicarDeltaDevolucion(finanzasInicial, "2026-06-15", "efectivo", 100.1);
    finanzas = aplicarDeltaDevolucion(finanzas, "2026-06-15", "efectivo", 200.2);
    expect(finanzas.devolucionesPorFecha?.["2026-06-15"]).toBe(300.3);
  });
});

describe("contarPagosEnRango", () => {
  const pagosCountPorFecha = { "2026-06-01": 2, "2026-06-15": 3, "2026-07-01": 1 };

  it("suma solo las fechas dentro del rango (inclusive)", () => {
    const total = contarPagosEnRango(pagosCountPorFecha, new Date(2026, 5, 1), new Date(2026, 5, 30));
    expect(total).toBe(5);
  });

  it("0 cuando el rollup no existe (documentos legados sin el campo)", () => {
    expect(contarPagosEnRango(undefined, new Date(2026, 5, 1), new Date(2026, 5, 30))).toBe(0);
  });

  it("0 cuando ninguna fecha cae dentro del rango", () => {
    const total = contarPagosEnRango(pagosCountPorFecha, new Date(2026, 0, 1), new Date(2026, 0, 31));
    expect(total).toBe(0);
  });

  it("incluye los límites del rango", () => {
    const total = contarPagosEnRango({ "2026-06-01": 4 }, new Date(2026, 5, 1), new Date(2026, 5, 1));
    expect(total).toBe(4);
  });
});

describe("meta diaria", () => {
  it("sale de la semanal entre los 6 días de atención", async () => {
    const { metaDiariaDe, metaSemanalDe, DIAS_ATENCION_POR_SEMANA } = await import("../metas");
    expect(DIAS_ATENCION_POR_SEMANA).toBe(6);
    expect(metaDiariaDe(80000)).toBeCloseTo(metaSemanalDe(80000) / 6, 6);
    expect(metaDiariaDe(80000) * 6).toBeCloseTo(metaSemanalDe(80000), 6); // seis días suman la semana
    expect(metaDiariaDe(0)).toBe(0);
  });

  it("calcularAvanceMetas trae la diaria primero y cuenta solo lo cobrado hoy", async () => {
    const { calcularAvanceMetas } = await import("../metas");
    const hoy = new Date();
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const ayer = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 1);
    const [diaria, ...resto] = calcularAvanceMetas({ [iso(hoy)]: 1000, [iso(ayer)]: 700 }, 80000);
    expect(diaria.label).toBe("Diaria");
    expect(diaria.actual).toBe(1000);
    expect(diaria.porcentaje).toBe(Math.min(100, Math.round((1000 / diaria.meta) * 100)));
    expect(resto.map((a) => a.label)).toEqual(["Semanal", "Quincenal", "Mensual"]);
  });
});
