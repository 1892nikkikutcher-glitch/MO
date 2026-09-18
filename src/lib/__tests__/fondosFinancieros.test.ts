import { describe, expect, it } from "vitest";
import {
  GRUPOS_EFECTIVO,
  GRUPOS_ELECTRONICO,
  calcularAsignacionFondos,
  sumarRangoPorFormaPago,
} from "../fondosFinancieros";

describe("sumarRangoPorFormaPago", () => {
  it("separa Efectivo de cualquier otra forma de pago", () => {
    const porFechaYFormaPago = {
      "2026-06-01": { Efectivo: 1000, "Tarjeta de crédito": 2000 },
      "2026-06-02": { Transferencia: 500, Cheque: 300 },
    };
    const resultado = sumarRangoPorFormaPago(
      porFechaYFormaPago,
      new Date("2026-06-01T00:00:00"),
      new Date("2026-06-02T00:00:00")
    );
    expect(resultado.efectivo).toBe(1000);
    expect(resultado.electronico).toBe(2800); // 2000 + 500 + 300
  });

  it("ignora fechas fuera del rango", () => {
    const porFechaYFormaPago = {
      "2026-05-31": { Efectivo: 9999 },
      "2026-06-15": { Efectivo: 100 },
    };
    const resultado = sumarRangoPorFormaPago(
      porFechaYFormaPago,
      new Date("2026-06-01T00:00:00"),
      new Date("2026-06-30T00:00:00")
    );
    expect(resultado.efectivo).toBe(100);
  });

  it("un objeto vacío da ambos canales en cero, no un error", () => {
    const resultado = sumarRangoPorFormaPago({}, new Date("2026-06-01"), new Date("2026-06-30"));
    expect(resultado).toEqual({ efectivo: 0, electronico: 0 });
  });
});

describe("calcularAsignacionFondos", () => {
  it("Electrónico: cada fondo es el % del ingreso real del canal, nunca del subtotal del grupo", () => {
    const grupos = calcularAsignacionFondos(GRUPOS_ELECTRONICO, 10000);
    const operativo = grupos.find((g) => g.titulo === "Operativo")!;
    const reservas = grupos.find((g) => g.titulo === "Reservas")!;

    expect(operativo.montoGrupo).toBe(6000); // 60% de 10000
    expect(operativo.fondos.find((f) => f.label === "Nómina")?.monto).toBe(1500); // 15% de 10000
    expect(operativo.fondos.find((f) => f.label === "Mi sueldo")?.monto).toBe(2000); // 20% de 10000

    expect(reservas.montoGrupo).toBe(4000); // 40% de 10000
    expect(reservas.fondos.find((f) => f.label === "Impuestos")?.monto).toBe(1500); // 15% de 10000

    const sumaFondos = grupos.flatMap((g) => g.fondos).reduce((s, f) => s + f.monto, 0);
    expect(sumaFondos).toBe(10000);
  });

  it("Efectivo: los 6 fondos suman el 100% del ingreso del canal", () => {
    const grupos = calcularAsignacionFondos(GRUPOS_EFECTIVO, 5000);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].fondos.find((f) => f.label === "Fondo en cash")?.monto).toBe(2500); // 50%
    const sumaFondos = grupos[0].fondos.reduce((s, f) => s + f.monto, 0);
    expect(sumaFondos).toBe(5000);
  });

  it("ingreso en cero da montos en cero, no NaN ni error", () => {
    const grupos = calcularAsignacionFondos(GRUPOS_EFECTIVO, 0);
    expect(grupos[0].fondos.every((f) => f.monto === 0)).toBe(true);
  });
});
