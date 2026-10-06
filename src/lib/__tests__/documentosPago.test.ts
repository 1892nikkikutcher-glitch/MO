import { describe, expect, it } from "vitest";
import { calendarioDePagos, montoEnLetra, sumarPeriodo } from "../documentosPago";

describe("montoEnLetra", () => {
  it.each([
    [0, "CERO PESOS 00/100 M.N."],
    [1, "UN PESO 00/100 M.N."],
    [21, "VEINTIÚN PESOS 00/100 M.N."],
    [100, "CIEN PESOS 00/100 M.N."],
    [101, "CIENTO UN PESOS 00/100 M.N."],
    [550, "QUINIENTOS CINCUENTA PESOS 00/100 M.N."],
    [1000, "UN MIL PESOS 00/100 M.N."],
    [1500.5, "UN MIL QUINIENTOS PESOS 50/100 M.N."],
    [2350, "DOS MIL TRESCIENTOS CINCUENTA PESOS 00/100 M.N."],
    [21000, "VEINTIÚN MIL PESOS 00/100 M.N."],
    [15390, "QUINCE MIL TRESCIENTOS NOVENTA PESOS 00/100 M.N."],
    [100000, "CIEN MIL PESOS 00/100 M.N."],
    [1000000, "UN MILLÓN DE PESOS 00/100 M.N."],
    [26370.99, "VEINTISÉIS MIL TRESCIENTOS SETENTA PESOS 99/100 M.N."],
  ])("%s", (monto, esperado) => {
    expect(montoEnLetra(monto)).toBe(esperado);
  });

  it("fuera de rango o inválido da texto vacío", () => {
    expect(montoEnLetra(-5)).toBe("");
    expect(montoEnLetra(Number.NaN)).toBe("");
  });
});

describe("sumarPeriodo", () => {
  it("mensual conserva el día y se ajusta al último día del mes", () => {
    expect(sumarPeriodo("2026-01-31", "mensual", 1)).toBe("2026-02-28");
    expect(sumarPeriodo("2026-10-15", "mensual", 3)).toBe("2027-01-15");
  });
  it("quincenal y semanal", () => {
    expect(sumarPeriodo("2026-10-01", "quincenal", 2)).toBe("2026-10-31");
    expect(sumarPeriodo("2026-10-01", "semanal", 1)).toBe("2026-10-08");
  });
});

describe("calendarioDePagos", () => {
  it("reparte el saldo y el último pago absorbe el redondeo", () => {
    const pagos = calendarioDePagos({ total: 1000, anticipo: 100, parcialidades: 3, periodicidad: "mensual", primeraFechaISO: "2026-11-01" });
    expect(pagos.map((p) => p.monto)).toEqual([300, 300, 300]);
    const raro = calendarioDePagos({ total: 1000, anticipo: 0, parcialidades: 3, periodicidad: "mensual", primeraFechaISO: "2026-11-01" });
    expect(raro.map((p) => p.monto)).toEqual([333.33, 333.33, 333.34]);
    expect(raro.reduce((s, p) => s + p.monto, 0)).toBeCloseTo(1000, 2);
    expect(raro.map((p) => p.fechaISO)).toEqual(["2026-11-01", "2026-12-01", "2027-01-01"]);
  });
  it("sin saldo o sin parcialidades no hay calendario", () => {
    expect(calendarioDePagos({ total: 500, anticipo: 500, parcialidades: 3, periodicidad: "mensual", primeraFechaISO: "2026-11-01" })).toEqual([]);
    expect(calendarioDePagos({ total: 500, anticipo: 0, parcialidades: 0, periodicidad: "mensual", primeraFechaISO: "2026-11-01" })).toEqual([]);
  });
});
