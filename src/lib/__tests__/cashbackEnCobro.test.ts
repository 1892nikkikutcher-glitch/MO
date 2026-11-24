import { describe, expect, it } from "vitest";
import { cashbackAplicable, repartirLineasConCashback } from "../cashbackEnCobro";
import { cashbackConfigInicial, type CashbackConfig } from "../cashback";
import type { LineaPago } from "../patientData";

const config: CashbackConfig = { ...cashbackConfigInicial, activo: true, porcentajeMaxCanje: 20, topeCanjePorVisita: 500 };
const linea = (id: string, monto: number, extra: Partial<LineaPago> = {}): LineaPago => ({
  id,
  tratamientoId: `t-${id}`,
  folio: id,
  label: `Tratamiento ${id}`,
  monto,
  ...extra,
});

describe("cashbackAplicable", () => {
  it("toma lo menor entre el saldo, el % de la atención y el tope por visita", () => {
    // 20% de $1,000 = $200; saldo $300; tope $500 → $200
    expect(cashbackAplicable({ disponible: 300, valorAtencion: 1000, cobradoEnTratamientos: 1000, config })).toEqual({ maximo: 200, aplicado: 200 });
    // saldo bajo manda
    expect(cashbackAplicable({ disponible: 80, valorAtencion: 1000, cobradoEnTratamientos: 1000, config }).aplicado).toBe(80);
    // el tope por visita manda
    expect(cashbackAplicable({ disponible: 5000, valorAtencion: 10000, cobradoEnTratamientos: 10000, config }).aplicado).toBe(500);
  });

  it("nunca pasa de lo que se cobra hoy en tratamientos", () => {
    // Valor de la atención $1,000 (máx. $200) pero hoy solo se cobran $120.
    expect(cashbackAplicable({ disponible: 300, valorAtencion: 1000, cobradoEnTratamientos: 120, config }).aplicado).toBe(120);
    // Solo un anticipo: nada que cubrir con Cashback.
    expect(cashbackAplicable({ disponible: 300, valorAtencion: 0, cobradoEnTratamientos: 0, config }).aplicado).toBe(0);
  });

  it("respeta una cantidad menor pedida y recorta una mayor", () => {
    const base = { disponible: 300, valorAtencion: 1000, cobradoEnTratamientos: 1000, config };
    expect(cashbackAplicable({ ...base, solicitado: 50 })).toEqual({ maximo: 200, aplicado: 50 });
    expect(cashbackAplicable({ ...base, solicitado: 900 }).aplicado).toBe(200);
    expect(cashbackAplicable({ ...base, solicitado: -5 }).aplicado).toBe(0);
    expect(cashbackAplicable({ ...base, solicitado: null }).aplicado).toBe(200);
  });

  it("sin saldo no aplica nada", () => {
    expect(cashbackAplicable({ disponible: 0, valorAtencion: 1000, cobradoEnTratamientos: 1000, config })).toEqual({ maximo: 0, aplicado: 0 });
  });
});

describe("repartirLineasConCashback", () => {
  const suma = (ls: LineaPago[]) => ls.reduce((s, l) => s + l.monto, 0);

  it("reparte en orden y parte el renglón donde se acaba el Cashback", () => {
    const { cashback, dinero } = repartirLineasConCashback([linea("a", 100), linea("b", 300)], 150);
    expect(cashback.map((l) => [l.id, l.monto])).toEqual([["a-cb", 100], ["b-cb", 50]]);
    expect(dinero.map((l) => [l.id, l.monto])).toEqual([["b", 250]]);
    expect(suma(cashback)).toBe(150);
  });

  it("conserva el tratamiento de cada parte", () => {
    const { cashback, dinero } = repartirLineasConCashback([linea("a", 400)], 100);
    expect(cashback[0].tratamientoId).toBe("t-a");
    expect(dinero[0].tratamientoId).toBe("t-a");
  });

  it("los anticipos nunca se pagan con Cashback", () => {
    const anticipo = linea("x", 200, { tratamientoId: null, folio: null, sinAsignar: true });
    const { cashback, dinero } = repartirLineasConCashback([anticipo, linea("a", 100)], 100);
    expect(cashback.map((l) => l.id)).toEqual(["a-cb"]);
    expect(dinero.map((l) => l.id)).toEqual(["x"]);
  });

  it("sin Cashback todo queda en dinero y la suma no cambia", () => {
    const lineas = [linea("a", 100), linea("b", 300)];
    const { cashback, dinero } = repartirLineasConCashback(lineas, 0);
    expect(cashback).toEqual([]);
    expect(dinero).toEqual(lineas);
  });

  it("si el Cashback cubre todo, no queda nada en dinero", () => {
    const { cashback, dinero } = repartirLineasConCashback([linea("a", 100)], 100);
    expect(suma(cashback)).toBe(100);
    expect(dinero).toEqual([]);
  });

  it("no se pierde ni un centavo con decimales", () => {
    const lineas = [linea("a", 33.33), linea("b", 66.67)];
    const { cashback, dinero } = repartirLineasConCashback(lineas, 40.1);
    expect(Math.round((suma(cashback) + suma(dinero)) * 100)).toBe(10000);
  });
});
