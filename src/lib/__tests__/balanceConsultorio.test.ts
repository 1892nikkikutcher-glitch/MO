import { describe, expect, it } from "vitest";
import { balanceInicial, calcularBalance, type BalanceConsultorio } from "../balanceConsultorio";

const balance = (extra: Partial<BalanceConsultorio> = {}): BalanceConsultorio => ({ ...balanceInicial, ...extra });

describe("balance del consultorio", () => {
  it("sin nada capturado no hay balance que interpretar", () => {
    const r = calcularBalance(balanceInicial, 0, 0);
    expect(r.capturado).toBe(false);
    expect(r.endeudamiento).toBeNull();
    expect(r.razonCirculante).toBeNull();
  });

  it("las cuentas por cobrar cuentan como activo circulante y el equipo sale de lo invertido", () => {
    const r = calcularBalance(balance({ efectivo: 20000 }), 8000, 100000);
    expect(r.capturado).toBe(true);
    expect(r.activoCirculante).toBe(28000);
    expect(r.activosFijos).toBe(100000);
    expect(r.activosTotales).toBe(128000);
  });

  it("capital de trabajo = activo circulante − pasivo circulante", () => {
    const r = calcularBalance(balance({ efectivo: 30000, inventario: 10000, otrosCirculantes: 2000, cuentasPorPagar: 12000, deudaCortoPlazo: 8000 }), 6000, 0);
    expect(r.activoCirculante).toBe(48000);
    expect(r.pasivoCirculante).toBe(20000);
    expect(r.capitalTrabajo).toBe(28000);
    expect(r.razonCirculante).toBeCloseTo(2.4, 5);
  });

  it("endeudamiento = pasivos totales entre activos totales", () => {
    const r = calcularBalance(balance({ efectivo: 50000, cuentasPorPagar: 10000, deudaCortoPlazo: 10000, deudaLargoPlazo: 30000, valorEquipo: 50000 }), 0, 999999);
    // Activos: 50,000 + 50,000 (el valor capturado manda sobre lo invertido) = 100,000. Pasivos: 20,000 + 30,000 = 50,000.
    expect(r.activosFijos).toBe(50000);
    expect(r.activosTotales).toBe(100000);
    expect(r.pasivosTotales).toBe(50000);
    expect(r.endeudamiento).toBeCloseTo(0.5, 5);
  });

  it("un capital de trabajo negativo se reporta como tal", () => {
    const r = calcularBalance(balance({ efectivo: 5000, cuentasPorPagar: 20000 }), 0, 0);
    expect(r.capitalTrabajo).toBe(-15000);
  });

  it("ignora valores inválidos o negativos", () => {
    const r = calcularBalance(balance({ efectivo: -500, inventario: Number.NaN, cuentasPorPagar: 1000 }), 0, 0);
    expect(r.activoCirculante).toBe(0);
    expect(r.pasivoCirculante).toBe(1000);
  });
});
