import { describe, expect, it } from "vitest";
import { calcularSaldoPendiente } from "../saldosPendientes";
import type { DevolucionPago, Pago, SavedBudget } from "../patientData";

const presupuesto: SavedBudget = {
  id: "pres-1",
  folio: "F-1",
  fecha: "01/06/2026",
  medico: "Dra. López",
  tipoDePrecio: "Consultorio",
  especialidad: "Odontología General",
  diagnostico: "",
  items: [
    { id: "trat-A", procedure: "Endodoncia OD 36", price: 500, teeth: [36], note: "" },
    { id: "trat-B", procedure: "Corona OD 36", price: 2500, teeth: [36], note: "" },
  ],
  total: 3000,
};

const pago: Pago = {
  id: "pago-1",
  fecha: "01/06/2026",
  medico: "Dra. López",
  formaPago: "Efectivo",
  lineas: [
    { id: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "Endodoncia OD 36", monto: 500 },
    { id: "linea-B", tratamientoId: "trat-B", folio: "F-1", label: "Corona OD 36", monto: 2500 },
  ],
  total: 3000,
  facturar: false,
  firma: null,
};

function devolucion(overrides: Partial<DevolucionPago> = {}): DevolucionPago {
  return {
    id: "dev-1",
    patientId: "pac-1",
    pagoOrigenId: "pago-1",
    tipo: "parcial",
    monto: 500,
    moneda: "MXN",
    metodo: "efectivo",
    motivo: "procedimiento_no_realizado",
    itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "Endodoncia OD 36", montoDevuelto: 500, efectoTratamiento: "referido" }],
    registradoPorUid: "uid-1",
    estado: "completada",
    creadoEn: "2026-06-15T10:00:00.000Z",
    completadoEn: "2026-06-15T10:00:00.000Z",
    ...overrides,
  };
}

describe("calcularSaldoPendiente", () => {
  it("sin devoluciones — comportamiento actual intacto", () => {
    expect(calcularSaldoPendiente([presupuesto], [pago])).toEqual({ totalPresupuestado: 3000, totalPagado: 3000, saldo: 0 });
  });

  it("efectoTratamiento 'continua' reabre exactamente el monto de ese renglón", () => {
    const resultado = calcularSaldoPendiente(
      [presupuesto],
      [pago],
      [devolucion({ itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 500, efectoTratamiento: "continua" }] })]
    );
    expect(resultado.totalPagado).toBe(2500);
    expect(resultado.saldo).toBe(500);
  });

  it.each(["cancelado", "referido", "pendiente", "solo_financiero"] as const)(
    "'%s' nunca agrega saldo pendiente",
    (efecto) => {
      const resultado = calcularSaldoPendiente(
        [presupuesto],
        [pago],
        [devolucion({ itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 500, efectoTratamiento: efecto }] })]
      );
      expect(resultado.saldo).toBe(0);
    }
  );

  it("una devolución 'anulada'/no completada se ignora aunque sea 'continua'", () => {
    const resultado = calcularSaldoPendiente(
      [presupuesto],
      [pago],
      [devolucion({ estado: "cancelada", itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 500, efectoTratamiento: "continua" }] })]
    );
    expect(resultado.saldo).toBe(0);
  });
});

import { calcularSaldosGlobales } from "../saldosPendientes";

describe("calcularSaldosGlobales", () => {
  const presupuesto = (id: string, total: number) =>
    ({ id, folio: id, fecha: "01/10/2026", medico: "", tipoDePrecio: "", especialidad: "", diagnostico: "", items: [{ id: `${id}-i`, procedure: "x", price: total, teeth: [], note: "" }], total }) as never;
  const pago = (id: string, lineas: { tratamientoId: string | null; monto: number }[]) =>
    ({ id, fecha: "02/10/2026", medico: "", formaPago: "Efectivo", lineas: lineas.map((l, i) => ({ id: `${id}-${i}`, folio: null, label: "x", ...l })), total: lineas.reduce((s, l) => s + l.monto, 0), facturar: false, firma: null }) as never;

  it("solo incluye a quien aún debe y descuenta pagos ligados", () => {
    const r = calcularSaldosGlobales(
      [
        { patientId: "a", patientName: "A", presupuestos: [presupuesto("b1", 1000)], pagos: [pago("p1", [{ tratamientoId: "b1-i", monto: 400 }])], devoluciones: [] },
        { patientId: "b", patientName: "B", presupuestos: [presupuesto("b2", 500)], pagos: [pago("p2", [{ tratamientoId: "b2-i", monto: 500 }])], devoluciones: [] },
      ],
      "2026-10-05T00:00:00Z"
    );
    expect(Object.keys(r.porPaciente)).toEqual(["a"]);
    expect(r.porPaciente.a).toMatchObject({ totalPresupuestado: 1000, totalPagado: 400 });
    expect(r.sinLigar).toEqual([]);
  });

  it("detecta pagos sin ligar a un tratamiento: no bajan el saldo pero se reportan", () => {
    const r = calcularSaldosGlobales(
      [{ patientId: "a", patientName: "A", presupuestos: [presupuesto("b1", 1000)], pagos: [pago("p1", [{ tratamientoId: null, monto: 700 }])], devoluciones: [] }],
      "2026-10-05T00:00:00Z"
    );
    expect(r.porPaciente.a.totalPagado).toBe(0);
    expect(r.sinLigar).toEqual([{ patientId: "a", patientName: "A", monto: 700, cantidad: 1 }]);
  });
});
