import { describe, expect, it } from "vitest";
import {
  aplicarDevolucionAResumen,
  calcularDisponibleDevolucion,
  construirDevolucion,
  devolucionValida,
  resumenDesdeDevoluciones,
  type DevolucionInput,
} from "../devolucionesPago";
import type { DevolucionPago, DevolucionResumen, Pago } from "../patientData";

function pagoFixture(overrides: Partial<Pago> = {}): Pago {
  return {
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
    ...overrides,
  };
}

function inputFixture(overrides: Partial<DevolucionInput> = {}): DevolucionInput {
  return {
    patientId: "pac-1",
    pagoOrigenId: "pago-1",
    tipo: "parcial",
    monto: 500,
    metodo: "efectivo",
    motivo: "procedimiento_no_realizado",
    efectoTratamiento: null,
    itemsAfectados: [
      { lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "Endodoncia OD 36", montoDevuelto: 500, efectoTratamiento: "referido" },
    ],
    recibidoPor: { nombre: "María Pérez", relacion: "madre" },
    ...overrides,
  };
}

describe("calcularDisponibleDevolucion", () => {
  it("sin devoluciones previas, todo el pago está disponible", () => {
    const d = calcularDisponibleDevolucion(pagoFixture(), null);
    expect(d).toEqual({ montoOriginal: 3000, totalDevuelto: 0, neto: 3000, disponible: 3000, sobreDevuelto: false });
  });

  it("con un resumen parcial existente, resta lo ya devuelto", () => {
    const resumen: DevolucionResumen = { pagoId: "pago-1", totalDevuelto: 1200, devueltoPorLinea: {}, actualizadoEn: "2026-06-01" };
    const d = calcularDisponibleDevolucion(pagoFixture(), resumen);
    expect(d.disponible).toBe(1800);
    expect(d.neto).toBe(1800);
    expect(d.sobreDevuelto).toBe(false);
  });

  it("detecta sobreDevuelto sin dejar disponible negativo", () => {
    const resumen: DevolucionResumen = { pagoId: "pago-1", totalDevuelto: 3500, devueltoPorLinea: {}, actualizadoEn: "2026-06-01" };
    const d = calcularDisponibleDevolucion(pagoFixture(), resumen);
    expect(d.sobreDevuelto).toBe(true);
    expect(d.disponible).toBe(0);
  });
});

describe("devolucionValida — componentes monetarios individuales", () => {
  it("monto <= 0 es inválido", () => {
    expect(devolucionValida(inputFixture({ monto: 0 }), pagoFixture(), null).valido).toBe(false);
    expect(devolucionValida(inputFixture({ monto: -100 }), pagoFixture(), null).valido).toBe(false);
  });

  it("monto NaN/Infinity es inválido", () => {
    expect(devolucionValida(inputFixture({ monto: NaN }), pagoFixture(), null).valido).toBe(false);
    expect(devolucionValida(inputFixture({ monto: Infinity }), pagoFixture(), null).valido).toBe(false);
  });

  it("item con montoDevuelto <= 0 es inválido, aunque la suma algebraica cuadre", () => {
    const input = inputFixture({
      monto: 1500,
      itemsAfectados: [
        { lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: -500, efectoTratamiento: "referido" },
        { lineaPagoId: "linea-B", tratamientoId: "trat-B", folio: "F-1", label: "B", montoDevuelto: 2000, efectoTratamiento: "referido" },
      ],
    });
    expect(devolucionValida(input, pagoFixture(), null).valido).toBe(false);
  });

  it("item en cero es inválido", () => {
    const input = inputFixture({
      itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 0, efectoTratamiento: "referido" }],
    });
    expect(devolucionValida(input, pagoFixture(), null).valido).toBe(false);
  });

  it("item NaN/Infinity es inválido", () => {
    const conNaN = inputFixture({
      itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: NaN, efectoTratamiento: "referido" }],
    });
    expect(devolucionValida(conNaN, pagoFixture(), null).valido).toBe(false);
    const conInfinity = inputFixture({
      itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: Infinity, efectoTratamiento: "referido" }],
    });
    expect(devolucionValida(conInfinity, pagoFixture(), null).valido).toBe(false);
  });

  it("montoNoAsignadoTratamientos negativo es inválido", () => {
    const input = inputFixture({ monto: 500, itemsAfectados: [], montoNoAsignadoTratamientos: -1, efectoTratamiento: "solo_financiero" });
    expect(devolucionValida(input, pagoFixture(), null).valido).toBe(false);
  });

  it("montoNoAsignadoTratamientos en cero es válido", () => {
    const input = inputFixture({ montoNoAsignadoTratamientos: 0 });
    expect(devolucionValida(input, pagoFixture(), null).valido).toBe(true);
  });
});

describe("devolucionValida — campos requeridos y efecto clínico", () => {
  it("falta método", () => {
    expect(devolucionValida(inputFixture({ metodo: null }), pagoFixture(), null).valido).toBe(false);
  });

  it("falta motivo", () => {
    expect(devolucionValida(inputFixture({ motivo: null }), pagoFixture(), null).valido).toBe(false);
  });

  it("motivo 'otro' sin detalle es inválido", () => {
    expect(devolucionValida(inputFixture({ motivo: "otro" }), pagoFixture(), null).valido).toBe(false);
    expect(devolucionValida(inputFixture({ motivo: "otro", detalleMotivo: "Cortesía por retraso" }), pagoFixture(), null).valido).toBe(true);
  });

  it("efectivo sin receptor es inválido", () => {
    expect(devolucionValida(inputFixture({ recibidoPor: undefined }), pagoFixture(), null).valido).toBe(false);
  });

  it("monto no asignado > 0 sin efecto general es inválido", () => {
    const input = inputFixture({ monto: 800, itemsAfectados: [], montoNoAsignadoTratamientos: 800, efectoTratamiento: null });
    expect(devolucionValida(input, pagoFixture(), null).valido).toBe(false);
  });

  it("monto no asignado = 0 con items completos NO exige efecto general", () => {
    const input = inputFixture({ montoNoAsignadoTratamientos: 0, efectoTratamiento: null });
    expect(devolucionValida(input, pagoFixture(), null).valido).toBe(true);
  });

  it("item sin efectoTratamiento propio es inválido", () => {
    const input = inputFixture({
      itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 500, efectoTratamiento: null }],
    });
    expect(devolucionValida(input, pagoFixture(), null).valido).toBe(false);
  });
});

describe("devolucionValida — distribución del monto", () => {
  it("suma de items no coincide con el monto total es inválido", () => {
    const input = inputFixture({
      monto: 1500,
      itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 700, efectoTratamiento: "referido" }],
      montoNoAsignadoTratamientos: 0,
    });
    expect(devolucionValida(input, pagoFixture(), null).valido).toBe(false);
  });

  it("suma de items + monto no asignado correctos es válido", () => {
    const input = inputFixture({
      monto: 900,
      itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 500, efectoTratamiento: "referido" }],
      montoNoAsignadoTratamientos: 400,
      efectoTratamiento: "solo_financiero",
    });
    expect(devolucionValida(input, pagoFixture(), null).valido).toBe(true);
  });

  it("decimales como 100.10 + 200.20 no fallan por representación binaria", () => {
    const pago = pagoFixture({ total: 300.3, lineas: [{ id: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", monto: 300.3 }] });
    const input = inputFixture({
      monto: 300.3,
      tipo: "total",
      itemsAfectados: [
        { lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 100.1, efectoTratamiento: "referido" },
      ],
      montoNoAsignadoTratamientos: 200.2,
      efectoTratamiento: "solo_financiero",
    });
    expect(devolucionValida(input, pago, null).valido).toBe(true);
  });
});

describe("devolucionValida — límite global y por línea de pago", () => {
  it("monto mayor al disponible global es inválido", () => {
    expect(devolucionValida(inputFixture({ monto: 3500, itemsAfectados: undefined, montoNoAsignadoTratamientos: 3500, efectoTratamiento: "solo_financiero" }), pagoFixture(), null).valido).toBe(false);
  });

  it("caso obligatorio: devolver $1,500 de la línea A ($500) es inválido aunque el pago completo tenga $3,000 disponibles", () => {
    const input = inputFixture({
      monto: 1500,
      itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "Endodoncia OD 36", montoDevuelto: 1500, efectoTratamiento: "referido" }],
    });
    const resultado = devolucionValida(input, pagoFixture(), null);
    expect(resultado.valido).toBe(false);
  });

  it("línea inexistente en el pago (leído en vivo) es inválido", () => {
    const input = inputFixture({
      itemsAfectados: [{ lineaPagoId: "linea-fantasma", tratamientoId: null, folio: "F-1", label: "Fantasma", montoDevuelto: 500, efectoTratamiento: "referido" }],
    });
    expect(devolucionValida(input, pagoFixture(), null).valido).toBe(false);
  });

  it("caso obligatorio: dos items de la MISMA línea ($700 + $700 sobre una línea de $1,000) son inválidos juntos", () => {
    const pago = pagoFixture({ lineas: [{ id: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", monto: 1000 }], total: 1000 });
    const input = inputFixture({
      monto: 1400,
      itemsAfectados: [
        { lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 700, efectoTratamiento: "referido" },
        { lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 700, efectoTratamiento: "referido" },
      ],
    });
    expect(devolucionValida(input, pago, null).valido).toBe(false);
  });

  it("dos items de la misma línea cuya suma exacta sí cabe es válido", () => {
    const pago = pagoFixture({ lineas: [{ id: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", monto: 1000 }], total: 1000 });
    const input = inputFixture({
      monto: 1000,
      tipo: "total",
      itemsAfectados: [
        { lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 400, efectoTratamiento: "referido" },
        { lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 600, efectoTratamiento: "continua" },
      ],
    });
    expect(devolucionValida(input, pago, null).valido).toBe(true);
  });

  it("respeta el acumulado histórico de devueltoPorLinea de una devolución previa", () => {
    const resumen: DevolucionResumen = { pagoId: "pago-1", totalDevuelto: 300, devueltoPorLinea: { "linea-A": 300 }, actualizadoEn: "2026-06-01" };
    // línea A tiene $500 originales, ya se devolvieron $300 -> quedan $200
    const conValido = inputFixture({
      monto: 200,
      itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 200, efectoTratamiento: "referido" }],
    });
    expect(devolucionValida(conValido, pagoFixture(), resumen).valido).toBe(true);

    const conExceso = inputFixture({
      monto: 201,
      itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 201, efectoTratamiento: "referido" }],
    });
    expect(devolucionValida(conExceso, pagoFixture(), resumen).valido).toBe(false);
  });
});

describe("devolucionValida — coherencia tipo/monto", () => {
  it("tipo total con monto menor al disponible es inválido", () => {
    const input = inputFixture({
      tipo: "total",
      monto: 1500,
      itemsAfectados: [{ lineaPagoId: "linea-B", tratamientoId: "trat-B", folio: "F-1", label: "B", montoDevuelto: 1500, efectoTratamiento: "referido" }],
    });
    expect(devolucionValida(input, pagoFixture(), null).valido).toBe(false);
  });

  it("tipo total con monto exactamente igual al disponible es válido", () => {
    const input = inputFixture({
      tipo: "total",
      monto: 3000,
      itemsAfectados: [
        { lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 500, efectoTratamiento: "referido" },
        { lineaPagoId: "linea-B", tratamientoId: "trat-B", folio: "F-1", label: "B", montoDevuelto: 2500, efectoTratamiento: "referido" },
      ],
    });
    expect(devolucionValida(input, pagoFixture(), null).valido).toBe(true);
  });

  it("tipo parcial válido", () => {
    expect(devolucionValida(inputFixture({ tipo: "parcial", monto: 500 }), pagoFixture(), null).valido).toBe(true);
  });
});

describe("construirDevolucion", () => {
  const id = "dev-1";
  const fecha = "2026-06-01T10:00:00.000Z";

  it("nunca muta el input ni el pago", () => {
    const input = inputFixture();
    const inputCopia = JSON.parse(JSON.stringify(input));
    construirDevolucion(input, id, fecha, "uid-1");
    expect(input).toEqual(inputCopia);
  });

  it("omite opcionales ausentes en vez de dejarlos como undefined explícito", () => {
    const dev = construirDevolucion(inputFixture({ detalleMotivo: undefined, referenciaTransferencia: undefined }), id, fecha, "uid-1");
    expect("detalleMotivo" in dev).toBe(false);
    expect("referenciaTransferencia" in dev).toBe(false);
  });

  it("conserva efectoTratamiento por item", () => {
    const dev = construirDevolucion(inputFixture(), id, fecha, "uid-1");
    expect(dev.itemsAfectados?.[0].efectoTratamiento).toBe("referido");
  });

  it("NO guarda efectoTratamiento general cuando montoNoAsignadoTratamientos es 0, aunque venga un valor en el input", () => {
    const dev = construirDevolucion(inputFixture({ montoNoAsignadoTratamientos: 0, efectoTratamiento: "solo_financiero" }), id, fecha, "uid-1");
    expect(dev.efectoTratamiento).toBeUndefined();
  });

  it("SÍ guarda efectoTratamiento general cuando hay monto no asignado y efecto confirmado", () => {
    const dev = construirDevolucion(
      inputFixture({ monto: 900, itemsAfectados: [], montoNoAsignadoTratamientos: 900, efectoTratamiento: "solo_financiero" }),
      id,
      fecha,
      "uid-1"
    );
    expect(dev.efectoTratamiento).toBe("solo_financiero");
  });

  it("estado nace completada con creadoEn/completadoEn en la misma fecha recibida", () => {
    const dev = construirDevolucion(inputFixture(), id, fecha, "uid-1");
    expect(dev.estado).toBe("completada");
    expect(dev.creadoEn).toBe(fecha);
    expect(dev.completadoEn).toBe(fecha);
  });
});

describe("aplicarDevolucionAResumen", () => {
  it("primera devolución del pago (resumen previo null)", () => {
    const resumen = aplicarDevolucionAResumen(null, "pago-1", inputFixture({ monto: 500 }), "2026-06-01T10:00:00.000Z");
    expect(resumen.totalDevuelto).toBe(500);
    expect(resumen.devueltoPorLinea["linea-A"]).toBe(500);
  });

  it("acumula sobre un resumen previo sin perder el histórico de otras líneas", () => {
    const previo: DevolucionResumen = { pagoId: "pago-1", totalDevuelto: 500, devueltoPorLinea: { "linea-A": 500 }, actualizadoEn: "2026-06-01" };
    const input = inputFixture({
      monto: 400,
      itemsAfectados: [{ lineaPagoId: "linea-B", tratamientoId: "trat-B", folio: "F-1", label: "B", montoDevuelto: 400, efectoTratamiento: "continua" }],
    });
    const resumen = aplicarDevolucionAResumen(previo, "pago-1", input, "2026-07-01T10:00:00.000Z");
    expect(resumen.totalDevuelto).toBe(900);
    expect(resumen.devueltoPorLinea).toEqual({ "linea-A": 500, "linea-B": 400 });
  });

  it("acumula sobre la MISMA línea sin pisar el valor previo", () => {
    const previo: DevolucionResumen = { pagoId: "pago-1", totalDevuelto: 200, devueltoPorLinea: { "linea-A": 200 }, actualizadoEn: "2026-06-01" };
    const input = inputFixture({
      monto: 100,
      itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 100, efectoTratamiento: "referido" }],
    });
    const resumen = aplicarDevolucionAResumen(previo, "pago-1", input, "2026-07-01");
    expect(resumen.devueltoPorLinea["linea-A"]).toBe(300);
  });

  it("nunca muta el resumen previo", () => {
    const previo: DevolucionResumen = { pagoId: "pago-1", totalDevuelto: 200, devueltoPorLinea: { "linea-A": 200 }, actualizadoEn: "2026-06-01" };
    const previoCopia = JSON.parse(JSON.stringify(previo));
    aplicarDevolucionAResumen(previo, "pago-1", inputFixture({ monto: 100 }), "2026-07-01");
    expect(previo).toEqual(previoCopia);
  });
});

describe("resumenDesdeDevoluciones", () => {
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
      itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 500, efectoTratamiento: "referido" }],
      registradoPorUid: "uid-1",
      estado: "completada",
      creadoEn: "2026-06-15T10:00:00.000Z",
      completadoEn: "2026-06-15T10:00:00.000Z",
      ...overrides,
    };
  }

  it("null cuando no hay devoluciones completadas de ese pago", () => {
    expect(resumenDesdeDevoluciones("pago-1", [])).toBeNull();
    expect(resumenDesdeDevoluciones("pago-1", [devolucion({ estado: "borrador" })])).toBeNull();
    expect(resumenDesdeDevoluciones("pago-2", [devolucion()])).toBeNull();
  });

  it("suma solo devoluciones completadas de ESE pago, ignora canceladas y de otros pagos", () => {
    const resumen = resumenDesdeDevoluciones("pago-1", [
      devolucion({ id: "d1", monto: 500 }),
      devolucion({ id: "d2", monto: 300, pagoOrigenId: "pago-2" }),
      devolucion({ id: "d3", monto: 100, estado: "cancelada" }),
    ]);
    expect(resumen?.totalDevuelto).toBe(500);
  });

  it("acumula devueltoPorLinea de varias devoluciones", () => {
    const resumen = resumenDesdeDevoluciones("pago-1", [
      devolucion({ id: "d1", monto: 200, itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 200, efectoTratamiento: "referido" }] }),
      devolucion({ id: "d2", monto: 100, itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "A", montoDevuelto: 100, efectoTratamiento: "referido" }] }),
    ]);
    expect(resumen?.devueltoPorLinea["linea-A"]).toBe(300);
    expect(resumen?.totalDevuelto).toBe(300);
  });
});

describe("caso pediátrico completo (lógica pura, sin Firestore)", () => {
  it("devolución parcial referida no reabre saldo del tratamiento", () => {
    const pago = pagoFixture();
    const input = inputFixture({
      monto: 500,
      motivo: "referencia_especialista",
      itemsAfectados: [{ lineaPagoId: "linea-A", tratamientoId: "trat-A", folio: "F-1", label: "Endodoncia OD 36", montoDevuelto: 500, efectoTratamiento: "referido" }],
      metodo: "efectivo",
      recibidoPor: { nombre: "María Pérez (madre)", relacion: "madre" },
    });
    expect(devolucionValida(input, pago, null).valido).toBe(true);
    const dev = construirDevolucion(input, "dev-pediatrico", "2026-06-01T12:00:00.000Z", "uid-doctor");
    expect(dev.itemsAfectados?.[0].efectoTratamiento).toBe("referido");
    expect(dev.recibidoPor?.relacion).toBe("madre");
    // El pago original permanece intacto — construirDevolucion nunca toca `pago`.
    expect(pago.total).toBe(3000);
    expect(pago.lineas[0].monto).toBe(500);
  });
});
