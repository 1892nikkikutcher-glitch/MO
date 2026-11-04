import { describe, expect, it } from "vitest";
import { CLAVE_SIN_DATO, calcularDeltasFinanzas } from "../finanzasIncrementos";
import { construirFinanzasDesdePagos } from "../finanzasRecalculo";
import { finanzasInicial } from "../metas";
import type { Pago } from "../patientData";

const pago = (id: string, fecha: string, total: number, formaPago = "Efectivo", medico = "Dra. A"): Pago => ({
  id,
  fecha,
  medico,
  formaPago,
  lineas: [],
  total,
  facturar: false,
  firma: null,
});

describe("calcularDeltasFinanzas", () => {
  it("un pago nuevo suma en los cinco desgloses", () => {
    const d = calcularDeltasFinanzas([], [pago("1", "03/11/2026", 550)]);
    expect(d).toEqual({
      porFecha: { "2026-11-03": 550 },
      pagosCountPorFecha: { "2026-11-03": 1 },
      porFechaYFormaPago: { "2026-11-03": { Efectivo: 550 } },
      porFechaYMedico: { "2026-11-03": { "Dra. A": 550 } },
      porFechaMedicoYFormaPago: { "2026-11-03": { "Dra. A": { Efectivo: 550 } } },
    });
  });

  it("solo manda lo que cambia, no el total del día", () => {
    // Lo que de verdad arreglaba el problema: el delta de cobrar $550 es $550
    // aunque ese día ya hubiera otros $2,270 cobrados desde otro aparato. La
    // cifra del día la arma el servidor, no este navegador.
    const yaCobrados = [pago("1", "03/11/2026", 2270)];
    const d = calcularDeltasFinanzas(yaCobrados, [...yaCobrados, pago("2", "03/11/2026", 550)]);
    expect(d?.porFecha).toEqual({ "2026-11-03": 550 });
    expect(d?.pagosCountPorFecha).toEqual({ "2026-11-03": 1 });
  });

  it("borrar un pago resta", () => {
    const d = calcularDeltasFinanzas([pago("1", "03/11/2026", 550)], []);
    expect(d?.porFecha).toEqual({ "2026-11-03": -550 });
    expect(d?.pagosCountPorFecha).toEqual({ "2026-11-03": -1 });
    expect(d?.porFechaYFormaPago).toEqual({ "2026-11-03": { Efectivo: -550 } });
  });

  it("editar el monto manda solo la diferencia", () => {
    const d = calcularDeltasFinanzas([pago("1", "03/11/2026", 550)], [pago("1", "03/11/2026", 700)]);
    expect(d?.porFecha).toEqual({ "2026-11-03": 150 });
    expect(d?.pagosCountPorFecha).toEqual({}); // sigue siendo un pago
  });

  it("editar la firma o la factura no mueve ninguna cifra", () => {
    const antes = pago("1", "03/11/2026", 550);
    const despues = { ...antes, firma: "data:image/png;base64,xx", facturar: true };
    expect(calcularDeltasFinanzas([antes], [despues])).toBeNull();
  });

  it("corregir la fecha resta del día viejo y suma al nuevo", () => {
    const d = calcularDeltasFinanzas([pago("1", "02/11/2026", 550)], [pago("1", "03/11/2026", 550)]);
    expect(d?.porFecha).toEqual({ "2026-11-02": -550, "2026-11-03": 550 });
    expect(d?.pagosCountPorFecha).toEqual({ "2026-11-02": -1, "2026-11-03": 1 });
  });

  it("cambiar de forma de pago mueve el dinero de un canal al otro", () => {
    const d = calcularDeltasFinanzas(
      [pago("1", "03/11/2026", 550, "Efectivo")],
      [pago("1", "03/11/2026", 550, "Tarjeta")]
    );
    expect(d?.porFecha).toEqual({}); // el día cobró lo mismo
    expect(d?.porFechaYFormaPago).toEqual({ "2026-11-03": { Efectivo: -550, Tarjeta: 550 } });
  });

  it("un pago sin médico ni forma de pago nunca produce una clave vacía", () => {
    // Firestore rechaza un nombre de campo vacío, y como el resumen es un
    // solo documento, ese pago tiraba la escritura completa: se perdía
    // también el dinero de los demás pagos del mismo movimiento.
    const d = calcularDeltasFinanzas([], [pago("1", "03/11/2026", 550, "", "  ")]);
    expect(d?.porFechaYFormaPago).toEqual({ "2026-11-03": { [CLAVE_SIN_DATO]: 550 } });
    expect(d?.porFechaYMedico).toEqual({ "2026-11-03": { [CLAVE_SIN_DATO]: 550 } });
    expect(Object.keys(d!.porFechaYFormaPago["2026-11-03"])).not.toContain("");
    expect(d?.porFecha).toEqual({ "2026-11-03": 550 }); // el dinero sigue contado
  });

  it("una fecha que no se entiende no entra a ningún día", () => {
    expect(calcularDeltasFinanzas([], [pago("1", "ayer", 550)])).toBeNull();
  });

  it("los centavos no se arrastran", () => {
    const d = calcularDeltasFinanzas([], [pago("1", "03/11/2026", 100.1), pago("2", "03/11/2026", 200.2)]);
    expect(d?.porFecha).toEqual({ "2026-11-03": 300.3 });
  });
});

describe("sumar al vuelo y reconstruir dan lo mismo", () => {
  it("las dos rutas usan las mismas claves", () => {
    const pagos = [
      pago("1", "03/11/2026", 2270),
      pago("2", "03/11/2026", 550),
      pago("3", "03/11/2026", 1100, "Transferencia", ""),
    ];
    const deltas = calcularDeltasFinanzas([], pagos);
    const { nuevo } = construirFinanzasDesdePagos(pagos, finanzasInicial);
    expect(deltas?.porFecha).toEqual(nuevo.porFecha);
    expect(deltas?.porFechaYFormaPago).toEqual(nuevo.porFechaYFormaPago);
    expect(deltas?.porFechaYMedico).toEqual(nuevo.porFechaYMedico);
    expect(deltas?.porFechaMedicoYFormaPago).toEqual(nuevo.porFechaMedicoYFormaPago);
    expect(deltas?.pagosCountPorFecha).toEqual(nuevo.pagosCountPorFecha);
  });
});
