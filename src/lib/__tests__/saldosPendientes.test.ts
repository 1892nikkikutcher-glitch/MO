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
