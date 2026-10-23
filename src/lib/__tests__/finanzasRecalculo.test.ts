import { describe, expect, it } from "vitest";
import { cobradoEnRango, cobradoTotal, construirFinanzasDesdePagos } from "../finanzasRecalculo";
import { fechaPagoAIso, finanzasInicial } from "../metas";
import type { Pago } from "../patientData";

const pago = (id: string, fecha: string, total: number, formaPago = "Efectivo", medico = "Dra. A"): Pago => ({
  id,
  fecha,
  medico,
  formaPago,
  lineas: [],
  total,
  facturar: false,
  firma: null,
});

describe("fechaPagoAIso tolerante", () => {
  it("entiende dd/mm/aaaa, d/m/aaaa, con guiones e ISO", () => {
    expect(fechaPagoAIso("05/10/2026")).toBe("2026-10-05");
    expect(fechaPagoAIso("5/10/2026")).toBe("2026-10-05");
    expect(fechaPagoAIso("05-10-2026")).toBe("2026-10-05");
    expect(fechaPagoAIso("2026-10-05")).toBe("2026-10-05");
    expect(fechaPagoAIso("2026-10-05T14:30:00Z")).toBe("2026-10-05");
  });
  it("rechaza lo que no es una fecha", () => {
    expect(fechaPagoAIso("ayer")).toBeNull();
    expect(fechaPagoAIso("31/02/2026")).toBeNull();
    expect(fechaPagoAIso("")).toBeNull();
  });
});

describe("construirFinanzasDesdePagos", () => {
  it("suma por fecha, forma de pago y médico, y cuenta los pagos", () => {
    const { nuevo, pagosLeidos, sinFechaValida } = construirFinanzasDesdePagos(
      [pago("1", "05/10/2026", 1000), pago("2", "5/10/2026", 500, "Tarjeta"), pago("3", "2026-10-07", 200.1, "Efectivo", "Dr. B"), pago("4", "ayer", 999)],
      finanzasInicial
    );
    expect(pagosLeidos).toBe(4);
    expect(sinFechaValida).toBe(1);
    expect(nuevo.porFecha).toEqual({ "2026-10-05": 1500, "2026-10-07": 200.1 });
    expect(nuevo.porFechaYFormaPago["2026-10-05"]).toEqual({ Efectivo: 1000, Tarjeta: 500 });
    expect(nuevo.porFechaYMedico?.["2026-10-07"]).toEqual({ "Dr. B": 200.1 });
    expect(nuevo.pagosCountPorFecha).toEqual({ "2026-10-05": 2, "2026-10-07": 1 });
  });

  it("conserva lo que no calcula (devoluciones) y corrige fechas que estaban de más", () => {
    const actual = { ...finanzasInicial, porFecha: { "2026-09-01": 7777 }, devolucionesPorFecha: { "2026-10-06": 100 } };
    const { nuevo } = construirFinanzasDesdePagos([pago("1", "05/10/2026", 300)], actual);
    expect(nuevo.devolucionesPorFecha).toEqual({ "2026-10-06": 100 });
    expect(nuevo.porFecha).toEqual({ "2026-10-05": 300 }); // lo viejo e incorrecto ya no está
  });
});

describe("cobrado", () => {
  it("por rango y total, igual que lo que muestra Fondos", () => {
    const { nuevo } = construirFinanzasDesdePagos([pago("1", "05/10/2026", 1000), pago("2", "14/10/2026", 500, "Tarjeta")], finanzasInicial);
    expect(cobradoEnRango(nuevo, new Date(2026, 9, 5), new Date(2026, 9, 11))).toBe(1000);
    expect(cobradoEnRango(nuevo, new Date(2026, 9, 1), new Date(2026, 9, 31))).toBe(1500);
    expect(cobradoTotal(nuevo)).toBe(1500);
  });
});

describe("recalculo por médico y forma de pago", () => {
  it("reconstruye lo que cobró cada médico por cada forma de pago", () => {
    const pagos = [
      pago("1", "05/10/2026", 1000, "Efectivo", "Dra. Ana"),
      pago("2", "05/10/2026", 2000, "Tarjeta de débito", "Dra. Ana"),
      pago("3", "05/10/2026", 500, "Efectivo", "Dr. Luis"),
      pago("4", "12/10/2026", 700, "Efectivo", "Dra. Ana"),
    ];
    const { nuevo } = construirFinanzasDesdePagos(pagos, finanzasInicial);
    expect(nuevo.porFechaMedicoYFormaPago).toEqual({
      "2026-10-05": { "Dra. Ana": { Efectivo: 1000, "Tarjeta de débito": 2000 }, "Dr. Luis": { Efectivo: 500 } },
      "2026-10-12": { "Dra. Ana": { Efectivo: 700 } },
    });
  });
});
