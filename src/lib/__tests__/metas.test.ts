import { describe, expect, it } from "vitest";
import { aplicarDeltaDevolucion, finanzasInicial } from "../metas";

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
