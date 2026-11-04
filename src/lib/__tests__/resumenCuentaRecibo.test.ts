import { describe, expect, it } from "vitest";
import { montoDeCostoCita, resumenCuentaRecibo } from "../resumenCuentaRecibo";
import type { CitaAgenda, Pago, SavedBudget } from "../patientData";

const presupuesto = { id: "b1", total: 5000 } as unknown as SavedBudget;
const pagoCon = (id: string, monto: number, fecha = "01/01/2026"): Pago =>
  ({ id, fecha, medico: "", formaPago: "Efectivo", total: monto, facturar: false, firma: null, lineas: [{ id: id + "l", tratamientoId: "t1", folio: null, label: "x", monto }] }) as Pago;
const cita = (fecha: string, costo?: string): CitaAgenda =>
  ({ id: "c" + fecha, patientId: "p1", estatus: "Programada", fecha, horaInicio: "10:00", tratamientos: ["Endodoncia"], costo }) as unknown as CitaAgenda;

describe("montoDeCostoCita", () => {
  it("rescata el número del texto libre", () => {
    expect(montoDeCostoCita("$1,200")).toBe(1200);
    expect(montoDeCostoCita("1500.50 aprox.")).toBe(1500.5);
  });
  it("sin número da null", () => {
    expect(montoDeCostoCita("")).toBeNull();
    expect(montoDeCostoCita(undefined)).toBeNull();
    expect(montoDeCostoCita("por definir")).toBeNull();
  });
});

describe("resumenCuentaRecibo", () => {
  const base = { presupuestos: [presupuesto], devoluciones: [], citas: [], patientId: "p1" };

  it("cuenta este pago y los anteriores, no los posteriores", () => {
    const nuevo = pagoCon("p3", 1000);
    const medio = pagoCon("p2", 500);
    const viejo = pagoCon("p1", 700);
    const r = resumenCuentaRecibo({ ...base, pagos: [nuevo, medio, viejo], pago: medio })!;
    expect(r).toMatchObject({ totalPresupuestado: 5000, totalPagado: 1200, saldo: 3800 });
  });

  it("no depende del orden de la lista", () => {
    const viejo = pagoCon("1700000000001", 700, "01/01/2026");
    const medio = pagoCon("1700000000002", 500, "05/01/2026");
    const nuevo = pagoCon("1700000000003", 1000, "09/01/2026");
    for (const lista of [[viejo, medio, nuevo], [nuevo, medio, viejo], [medio, nuevo, viejo]]) {
      expect(resumenCuentaRecibo({ ...base, pagos: lista, pago: medio })).toMatchObject({ totalPagado: 1200, saldo: 3800 });
    }
  });

  it("si el pago aún no está en la lista, lo suma", () => {
    const r = resumenCuentaRecibo({ ...base, pagos: [pagoCon("p1", 700)], pago: pagoCon("p2", 300) })!;
    expect(r).toMatchObject({ totalPagado: 1000, saldo: 4000 });
  });

  it("sin presupuestos no hay estado de cuenta", () => {
    expect(resumenCuentaRecibo({ ...base, presupuestos: [], pagos: [], pago: pagoCon("p1", 1) })).toBeNull();
  });

  it("trae la próxima cita con su costo estimado", () => {
    const r = resumenCuentaRecibo({ ...base, pagos: [pagoCon("p1", 700)], pago: pagoCon("p1", 700), citas: [cita("2999-01-01", "$900")] })!;
    expect(r.proximaCita).toEqual({ fecha: "2999-01-01", horaInicio: "10:00", tratamientos: ["Endodoncia"], costo: 900 });
  });
});
