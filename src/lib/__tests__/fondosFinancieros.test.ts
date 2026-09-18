import { describe, expect, it } from "vitest";
import {
  GRUPOS_EFECTIVO,
  GRUPOS_ELECTRONICO,
  calcularAsignacionFondos,
  rangoVistaFondos,
  sumarRangoPorFormaPago,
} from "../fondosFinancieros";

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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

describe("rangoVistaFondos", () => {
  it("hoy a medio quincena 1 (día 8): quincena 1 corta a hoy, quincena 2 todavía no arranca (rango vacío)", () => {
    const hoy = new Date(2026, 8, 8); // 8 de septiembre
    const q1 = rangoVistaFondos("quincena1", hoy);
    expect(iso(q1.desde)).toBe("2026-09-01");
    expect(iso(q1.hasta)).toBe("2026-09-08"); // cortado a hoy, no llega al día 15 todavía

    const q2 = rangoVistaFondos("quincena2", hoy);
    expect(q2.desde.getTime()).toBeGreaterThan(q2.hasta.getTime()); // día 16 > hoy (día 8) — rango vacío
  });

  it("hoy a medio quincena 2 (día 18): quincena 1 ya cerrada completa (1-15), quincena 2 corta a hoy", () => {
    const hoy = new Date(2026, 8, 18); // 18 de septiembre
    const q1 = rangoVistaFondos("quincena1", hoy);
    expect(iso(q1.desde)).toBe("2026-09-01");
    expect(iso(q1.hasta)).toBe("2026-09-15"); // ya pasó completa, no se corta

    const q2 = rangoVistaFondos("quincena2", hoy);
    expect(iso(q2.desde)).toBe("2026-09-16");
    expect(iso(q2.hasta)).toBe("2026-09-18"); // cortado a hoy

    const mes = rangoVistaFondos("mes", hoy);
    expect(iso(mes.desde)).toBe("2026-09-01");
    expect(iso(mes.hasta)).toBe("2026-09-18");
  });

  it("el último día de un mes de 30 días: quincena 2 llega completa hasta el día 30, no se corta antes", () => {
    const hoy = new Date(2026, 8, 30); // 30 de septiembre (septiembre tiene 30 días)
    const q2 = rangoVistaFondos("quincena2", hoy);
    expect(iso(q2.hasta)).toBe("2026-09-30");
  });

  it("etiquetas legibles por vista", () => {
    const hoy = new Date(2026, 8, 18);
    expect(rangoVistaFondos("quincena1", hoy).label).toBe("1–15 sep.");
    expect(rangoVistaFondos("quincena2", hoy).label).toBe("16–30 sep.");
    expect(rangoVistaFondos("mes", hoy).label).toBe("sep. 2026");
  });
});
