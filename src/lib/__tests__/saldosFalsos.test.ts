import { describe, expect, it } from "vitest";
import {
  aplicarUnionAPagos,
  planUnion,
  posiblesDuplicados,
  presupuestosDeCitasNoAtendidas,
  type CitaMinima,
} from "../saldosFalsos";
import type { Pago, SavedBudget } from "../patientData";

function presupuesto(id: string, items: [string, number][], extra: Partial<SavedBudget> = {}): SavedBudget {
  return {
    id,
    folio: id.slice(-4),
    fecha: "01/10/2026",
    medico: "",
    tipoDePrecio: "Consultorio",
    especialidad: "",
    diagnostico: "",
    items: items.map(([procedure, price], i) => ({ id: `${id}-i${i}`, procedure, price, teeth: [], note: "" })),
    total: items.reduce((s, [, p]) => s + p, 0),
    ...extra,
  };
}
function pago(id: string, lineas: { tratamientoId: string | null; monto: number }[]): Pago {
  return {
    id,
    fecha: "02/10/2026",
    medico: "",
    formaPago: "Efectivo",
    lineas: lineas.map((l, i) => ({ id: `${id}-${i}`, folio: null, label: "x", ...l })),
    total: lineas.reduce((s, l) => s + l.monto, 0),
    facturar: false,
    firma: null,
  };
}
const citas = (estatus: string): Map<string, CitaMinima> =>
  new Map([["c1", { id: "c1", patientId: "p", fecha: "2026-10-01", estatus }]]);

describe("presupuestosDeCitasNoAtendidas", () => {
  it("detecta el presupuesto de una cita cancelada sin pagos", () => {
    const r = presupuestosDeCitasNoAtendidas(
      { patientId: "p", patientName: "P", presupuestos: [presupuesto("pres-cita-c1", [["Limpieza", 600]])], pagos: [] },
      citas("Cancelada")
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ presupuestoId: "pres-cita-c1", total: 600, citaEstatus: "Cancelada" });
  });

  it("no toca citas atendidas, presupuestos con pagos ni los editados a mano", () => {
    const base = { patientId: "p", patientName: "P" };
    expect(presupuestosDeCitasNoAtendidas({ ...base, presupuestos: [presupuesto("pres-cita-c1", [["x", 100]])], pagos: [] }, citas("Atendida"))).toEqual([]);
    expect(
      presupuestosDeCitasNoAtendidas(
        { ...base, presupuestos: [presupuesto("pres-cita-c1", [["x", 100]])], pagos: [pago("g", [{ tratamientoId: "pres-cita-c1-i0", monto: 50 }])] },
        citas("No Asistió")
      )
    ).toEqual([]);
    expect(
      presupuestosDeCitasNoAtendidas(
        { ...base, presupuestos: [presupuesto("pres-cita-c1", [["x", 100]], { editadoManualmente: true })], pagos: [] },
        citas("No Asistió")
      )
    ).toEqual([]);
  });

  it("ignora presupuestos que no vienen de una cita", () => {
    expect(
      presupuestosDeCitasNoAtendidas(
        { patientId: "p", patientName: "P", presupuestos: [presupuesto("b1", [["x", 100]])], pagos: [] },
        citas("Cancelada")
      )
    ).toEqual([]);
  });
});

describe("posiblesDuplicados y unión", () => {
  const deCita = presupuesto("pres-cita-c1", [["Resina", 1200]]);
  const deExtra = presupuesto("pres-g1", [["Resina", 1200]], { diagnostico: "Generado automáticamente a partir de un pago sin presupuesto previo." });
  const pagoExtra = pago("g1", [{ tratamientoId: "pres-g1-i0", monto: 1200 }]);

  it("detecta el mismo monto: uno de cita sin pagar y uno de pago extra ya pagado", () => {
    const r = posiblesDuplicados({ patientId: "p", patientName: "P", presupuestos: [deCita, deExtra], pagos: [pagoExtra] }, citas("Confirmada"));
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ presupuestoCitaId: "pres-cita-c1", presupuestoPagoId: "pres-g1", unibleAutomaticamente: true });
  });

  it("no marca duplicado si el de cita ya está pagado o los montos difieren", () => {
    expect(
      posiblesDuplicados(
        { patientId: "p", patientName: "P", presupuestos: [deCita, presupuesto("pres-g1", [["x", 999]], { diagnostico: "Generado automáticamente a partir de un pago" })], pagos: [pago("g1", [{ tratamientoId: "pres-g1-i0", monto: 999 }])] },
        citas("Confirmada")
      )
    ).toEqual([]);
  });

  it("planUnion + aplicarUnionAPagos: el pago pasa a descontar del presupuesto de la cita", () => {
    const plan = planUnion(deCita, deExtra)!;
    expect(plan).not.toBeNull();
    const etiquetas = new Map(deCita.items.map((i) => [i.id, i.procedure]));
    const [nuevo] = aplicarUnionAPagos([pagoExtra], plan, etiquetas);
    expect(nuevo.lineas[0]).toMatchObject({ tratamientoId: "pres-cita-c1-i0", folio: deCita.folio, label: "Resina" });
    expect("generarPresupuesto" in nuevo.lineas[0]).toBe(false);
  });

  it("planUnion devuelve null si los renglones no se pueden emparejar", () => {
    expect(planUnion(presupuesto("pres-cita-c1", [["a", 100], ["b", 200]]), presupuesto("pres-g1", [["a", 300]]))).toBeNull();
  });
});
