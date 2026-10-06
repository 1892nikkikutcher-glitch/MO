import { describe, expect, it } from "vitest";
import { aplicarMovimientosAPagos, controlesPorError } from "../controlesPorError";
import type { Pago, SavedBudget } from "../patientData";

const budget = (id: string, folio: string, items: [string, string, number][], extra: Partial<SavedBudget> = {}): SavedBudget => ({
  id,
  folio,
  fecha: "01/10/2026",
  medico: "Dra.",
  tipoDePrecio: "Consultorio",
  especialidad: "Odontología General",
  diagnostico: "",
  items: items.map(([iid, procedure, price]) => ({ id: iid, procedure, price, teeth: [], note: "" })),
  total: items.reduce((s, [, , p]) => s + p, 0),
  ...extra,
});
const pago = (id: string, lineas: [string, string | null, number][]): Pago => ({
  id,
  fecha: "02/10/2026",
  medico: "Dra.",
  formaPago: "Efectivo",
  lineas: lineas.map(([lid, tratamientoId, monto]) => ({ id: lid, tratamientoId, folio: null, label: "x", monto })),
  total: lineas.reduce((s, [, , m]) => s + m, 0),
  facturar: false,
  firma: null,
});
const entrada = (presupuestos: SavedBudget[], pagos: Pago[]) => ({ patientId: "p", patientName: "Paciente", presupuestos, pagos });

const principal = budget("b-orto", "100", [["i-orto", "Ortodoncia tratamiento completo", 18000]]);

describe("controlesPorError", () => {
  it("un control automático sin pagos se propone quitar", () => {
    const r = controlesPorError(entrada([principal, budget("pres-cita-c1", "c1", [["i1", "Control de ortodoncia", 500]])], []));
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ presupuestoId: "pres-cita-c1", accion: "quitar", pagado: 0 });
  });

  it("un control pagado pasa su pago al presupuesto principal de ortodoncia", () => {
    const c = budget("pres-cita-c2", "c2", [["i2", "Control de ortodoncia", 500]]);
    const pg = pago("pg1", [["l1", "i2", 500]]);
    const r = controlesPorError(entrada([principal, c], [pg]));
    expect(r[0].accion).toBe("pasar_pagos");
    expect(r[0].destinoFolio).toBe("100");
    expect(r[0].movimientos).toEqual([{ lineaKey: "pg1|l1", tratamientoId: "i-orto", folio: "100", label: "Ortodoncia tratamiento completo" }]);
    const nuevos = aplicarMovimientosAPagos([pg], r[0].movimientos);
    expect(nuevos[0].lineas[0]).toMatchObject({ tratamientoId: "i-orto", folio: "100", monto: 500 });
    expect(nuevos[0].total).toBe(500);
  });

  it("sin presupuesto principal, o con varios, o sin saldo: revisar a mano", () => {
    const c = budget("pres-cita-c3", "c3", [["i3", "Mensualidad de ortodoncia", 800]]);
    const pg = pago("pg3", [["l1", "i3", 800]]);
    expect(controlesPorError(entrada([c], [pg]))[0].accion).toBe("revisar");
    const otro = budget("b2", "101", [["i-o2", "Brackets", 9000]]);
    expect(controlesPorError(entrada([principal, otro, c], [pg]))[0].accion).toBe("revisar");
    const chico = budget("b-chico", "102", [["i-ch", "Ortodoncia", 300]]);
    expect(controlesPorError(entrada([chico, c], [pg]))[0].accion).toBe("revisar");
  });

  it("no toca presupuestos hechos a mano, editados a mano ni de otros tratamientos", () => {
    const manual = budget("123", "m1", [["i4", "Control de ortodoncia", 500]]);
    const editado = budget("pres-cita-c5", "c5", [["i5", "Control de ortodoncia", 500]], { editadoManualmente: true });
    const resina = budget("pres-cita-c6", "c6", [["i6", "Resina", 500]]);
    const mixto = budget("pres-cita-c7", "c7", [["i7", "Control de ortodoncia", 500], ["i8", "Resina", 500]]);
    expect(controlesPorError(entrada([principal, manual, editado, resina, mixto], []))).toEqual([]);
  });

  it("reparte varias líneas de pago sin pasarse del saldo del principal", () => {
    const c = budget("pres-cita-c9", "c9", [["i9", "Control de ortodoncia", 500]]);
    const pg = pago("pg9", [["l1", "i9", 200], ["l2", "i9", 300]]);
    const justo = budget("b-j", "103", [["i-j", "Ortodoncia", 500]]);
    const r = controlesPorError(entrada([justo, c], [pg]));
    expect(r[0].accion).toBe("pasar_pagos"); // 200 + 300 llenan exacto el renglón de 500
    expect(r[0].movimientos).toHaveLength(2);
    const sobra = budget("b-s", "104", [["i-s", "Ortodoncia", 400]]);
    expect(controlesPorError(entrada([sobra, c], [pg]))[0].accion).toBe("revisar"); // 500 no cabe en 400
  });
});
