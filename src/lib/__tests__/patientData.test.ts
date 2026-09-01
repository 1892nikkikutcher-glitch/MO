import { describe, expect, it } from "vitest";
import { computeTratamientosPendientes, type DevolucionPago, type Pago, type SavedBudget } from "../patientData";

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

describe("computeTratamientosPendientes — regresión sin devoluciones", () => {
  it("se comporta exactamente igual que antes cuando no hay devoluciones", () => {
    const pendientes = computeTratamientosPendientes([presupuesto], [pago]);
    expect(pendientes).toEqual([]);
  });

  it("presupuesto sin pagos sigue mostrando el pendiente completo", () => {
    const pendientes = computeTratamientosPendientes([presupuesto], []);
    expect(pendientes.find((t) => t.id === "trat-A")?.pendiente).toBe(500);
    expect(pendientes.find((t) => t.id === "trat-B")?.pendiente).toBe(2500);
  });
});

describe("computeTratamientosPendientes — con devoluciones", () => {
  it("efectoTratamiento 'continua' por renglón reabre saldo de ESE tratamiento", () => {
    const pendientes = computeTratamientosPendientes([presupuesto], [pago], [devolucion({ itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 500, efectoTratamiento: "continua" }] })]);
    const tratA = pendientes.find((t) => t.id === "trat-A");
    expect(tratA?.pendiente).toBe(500);
    expect(pendientes.find((t) => t.id === "trat-B")).toBeUndefined();
  });

  it.each(["cancelado", "referido", "pendiente", "solo_financiero"] as const)(
    "efectoTratamiento '%s' nunca genera una cuenta por cobrar automática",
    (efecto) => {
      const pendientes = computeTratamientosPendientes(
        [presupuesto],
        [pago],
        [devolucion({ itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 500, efectoTratamiento: efecto }] })]
      );
      expect(pendientes).toEqual([]);
    }
  );

  it("una devolución con estado distinto de 'completada' se ignora, aunque tenga items 'continua'", () => {
    const pendientes = computeTratamientosPendientes(
      [presupuesto],
      [pago],
      [devolucion({ estado: "borrador", itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 500, efectoTratamiento: "continua" }] })]
    );
    expect(pendientes).toEqual([]);
  });

  it("una devolución puede tener renglones mixtos — solo el 'continua' reabre saldo", () => {
    const dev = devolucion({
      monto: 3000,
      tipo: "total",
      itemsAfectados: [
        { lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 500, efectoTratamiento: "referido" },
        { lineaPagoId: "linea-B", tratamientoId: "trat-B", folio: "F-1", label: "B", montoDevuelto: 2500, efectoTratamiento: "continua" },
      ],
    });
    const pendientes = computeTratamientosPendientes([presupuesto], [pago], [dev]);
    expect(pendientes.find((t) => t.id === "trat-A")).toBeUndefined();
    expect(pendientes.find((t) => t.id === "trat-B")?.pendiente).toBe(2500);
  });
});
