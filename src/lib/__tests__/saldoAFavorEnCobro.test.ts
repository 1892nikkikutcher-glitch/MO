import { describe, expect, it } from "vitest";
import { calcularCuenta, crearServicioRealizado, idRenglonServicio, idServicio } from "../cuentaPaciente";
import { aplicarSaldoAFavorEnCobro } from "../saldoAFavorEnCobro";
import type { LineaPago, Pago, SavedBudget } from "../patientData";

const servicio = (origen: string, precio: number): SavedBudget =>
  crearServicioRealizado({ origenId: origen, concepto: `Servicio ${origen}`, precio, medico: "Dra. López", fecha: "01/11/2026", fechaISO: "2026-11-01" });
const renglonDe = (origen: string) => idRenglonServicio(idServicio(origen));

const pago = (id: string, lineas: LineaPago[], formaPago = "Efectivo"): Pago => ({
  id,
  fecha: "01/11/2026",
  medico: "Dra. López",
  formaPago,
  lineas,
  total: lineas.reduce((s, l) => s + l.monto, 0),
  facturar: false,
  firma: null,
});
const anticipo = (id: string, monto: number): LineaPago => ({ id, tratamientoId: null, folio: null, label: "Anticipo", monto, sinAsignar: true });
const aTratamiento = (id: string, tratamientoId: string, monto: number): LineaPago => ({ id, tratamientoId, folio: "F", label: "Trat", monto });

/** Lo que cobra hoy: una extracción de $1,200 que aún no existe en la cuenta (se registra al guardar). */
const hoy = (monto: number, tratamientoId = "hoy-1"): LineaPago[] => [{ id: "p-hoy-1", tratamientoId, folio: "H", label: "Extracción", monto }];

const totalDe = (pagos: Pago[]) => pagos.reduce((s, p) => s + p.lineas.reduce((s2, l) => s2 + l.monto, 0), 0);

describe("saldo a favor en el cobro de hoy", () => {
  it("el caso real: $500 de anticipo y una extracción de $1,200 → solo se cobran $700", () => {
    const presupuestos = [servicio("antes", 390)];
    const pagos = [pago("viejo", [aTratamiento("l1", renglonDe("antes"), 390), anticipo("l2", 500)])];
    const { renglones, resumen } = calcularCuenta(presupuestos, pagos);
    expect(resumen.aFavor).toBe(500);

    const r = aplicarSaldoAFavorEnCobro({ pagos, renglones, aFavor: resumen.aFavor, lineasDinero: hoy(1200) });
    expect(r.aplicado).toBe(500);
    expect(r.lineasDinero).toEqual([expect.objectContaining({ tratamientoId: "hoy-1", monto: 700 })]);
    // El anticipo pasa a la extracción de hoy: el pago viejo conserva su total.
    expect(r.pagosModificados).toHaveLength(1);
    const viejo = r.pagosModificados[0];
    expect(viejo.total).toBe(890);
    expect(viejo.lineas.reduce((s, l) => s + l.monto, 0)).toBe(890);
    expect(viejo.lineas.find((l) => l.tratamientoId === "hoy-1")?.monto).toBe(500);
    expect(viejo.lineas.some((l) => l.sinAsignar)).toBe(false);
  });

  it("al terminar, la cuenta queda sin saldo por cobrar ni saldo a favor", () => {
    const antes = servicio("antes", 390);
    const hoyServ = servicio("hoy", 1200);
    const pagos = [pago("viejo", [aTratamiento("l1", renglonDe("antes"), 390), anticipo("l2", 500)])];
    const { renglones, resumen } = calcularCuenta([antes], pagos);
    const r = aplicarSaldoAFavorEnCobro({ pagos, renglones, aFavor: resumen.aFavor, lineasDinero: hoy(1200, renglonDe("hoy")) });
    const pagosFinal = [pago("nuevo", r.lineasDinero), ...pagos.map((p) => r.pagosModificados.find((m) => m.id === p.id) ?? p)];
    const final = calcularCuenta([antes, hoyServ], pagosFinal).resumen;
    expect(final.porCobrar).toBe(0);
    expect(final.aFavor).toBe(0);
    expect(final.cargos).toBe(1590);
    expect(final.pagadoACargos).toBe(1590);
    expect(totalDe(pagosFinal)).toBe(1590 + 0); // 890 viejo + 700 nuevo
  });

  it("si el saldo a favor es menor al cobro, parte la línea y lo demás se cobra", () => {
    const pagos = [pago("viejo", [anticipo("l1", 300)])];
    const { renglones, resumen } = calcularCuenta([], pagos);
    const r = aplicarSaldoAFavorEnCobro({ pagos, renglones, aFavor: resumen.aFavor, lineasDinero: hoy(1000) });
    expect(r.aplicado).toBe(300);
    expect(r.lineasDinero[0].monto).toBe(700);
  });

  it("si el saldo a favor es mayor al cobro, usa solo lo necesario y el resto sigue a favor", () => {
    const pagos = [pago("viejo", [anticipo("l1", 800)])];
    const { renglones, resumen } = calcularCuenta([], pagos);
    const r = aplicarSaldoAFavorEnCobro({ pagos, renglones, aFavor: resumen.aFavor, lineasDinero: hoy(300) });
    expect(r.aplicado).toBe(300);
    expect(r.lineasDinero).toEqual([]);
    const viejo = r.pagosModificados[0];
    expect(viejo.lineas.find((l) => l.sinAsignar)?.monto).toBe(500);
    expect(viejo.lineas.find((l) => l.tratamientoId === "hoy-1")?.monto).toBe(300);
    expect(viejo.total).toBe(800);
  });

  it("toma primero los anticipos más antiguos", () => {
    const pagos = [pago("nuevo", [anticipo("b", 200)]), pago("viejo", [anticipo("a", 200)])];
    const { renglones, resumen } = calcularCuenta([], pagos);
    const r = aplicarSaldoAFavorEnCobro({ pagos, renglones, aFavor: resumen.aFavor, lineasDinero: hoy(200) });
    expect(r.pagosModificados.map((p) => p.id)).toEqual(["viejo"]);
  });

  it("junta varios anticipos si hace falta", () => {
    const pagos = [pago("p2", [anticipo("b", 200)]), pago("p1", [anticipo("a", 100)])];
    const { renglones, resumen } = calcularCuenta([], pagos);
    const r = aplicarSaldoAFavorEnCobro({ pagos, renglones, aFavor: resumen.aFavor, lineasDinero: hoy(250) });
    expect(r.aplicado).toBe(250);
    expect(r.pagosModificados.map((p) => p.id).sort()).toEqual(["p1", "p2"]);
    expect(r.lineasDinero).toEqual([]);
  });

  it("también toma lo pagado de más en un tratamiento ya cobrado", () => {
    const presupuestos = [servicio("antes", 400)];
    const pagos = [pago("viejo", [aTratamiento("l1", renglonDe("antes"), 900)])];
    const { renglones, resumen } = calcularCuenta(presupuestos, pagos);
    expect(resumen.aFavor).toBe(500);
    const r = aplicarSaldoAFavorEnCobro({ pagos, renglones, aFavor: resumen.aFavor, lineasDinero: hoy(1200) });
    expect(r.aplicado).toBe(500);
    const viejo = r.pagosModificados[0];
    expect(viejo.lineas.find((l) => l.tratamientoId === renglonDe("antes"))?.monto).toBe(400);
    expect(viejo.lineas.find((l) => l.tratamientoId === "hoy-1")?.monto).toBe(500);
    // Con eso, el tratamiento de antes queda justo pagado y el de hoy queda pagado en 1,200.
    const pagosFinal = [pago("nuevo", r.lineasDinero), viejo];
    const final = calcularCuenta([...presupuestos, servicio("hoy", 1200)], pagosFinal.map((p) => ({ ...p, lineas: p.lineas.map((l) => (l.tratamientoId === "hoy-1" ? { ...l, tratamientoId: renglonDe("hoy") } : l)) }))).resumen;
    expect(final.aFavor).toBe(0);
    expect(final.porCobrar).toBe(0);
  });

  it("no toca el anticipo de un tratamiento aceptado que aún no se realiza", () => {
    const propuesta: SavedBudget = {
      ...servicio("corona", 5000),
      origen: "propuesta",
      items: [{ id: "i-corona", procedure: "Corona", price: 5000, teeth: [], note: "" }],
      aceptacion: { fecha: "2026-11-01", itemIds: ["i-corona"], modalidad: "al_realizar" },
    };
    const pagos = [pago("viejo", [aTratamiento("l1", "i-corona", 1000)])];
    const { renglones, resumen } = calcularCuenta([propuesta], pagos);
    expect(resumen.aFavor).toBe(1000);
    const r = aplicarSaldoAFavorEnCobro({ pagos, renglones, aFavor: resumen.aFavor, lineasDinero: hoy(500) });
    expect(r.aplicado).toBe(0);
    expect(r.lineasDinero).toEqual(hoy(500));
    expect(r.pagosModificados).toEqual([]);
  });

  it("no usa el saldo de un tratamiento que se está cobrando hoy", () => {
    const presupuestos = [servicio("antes", 400)];
    const pagos = [pago("viejo", [aTratamiento("l1", renglonDe("antes"), 900)])];
    const { renglones, resumen } = calcularCuenta(presupuestos, pagos);
    const r = aplicarSaldoAFavorEnCobro({ pagos, renglones, aFavor: resumen.aFavor, lineasDinero: hoy(300, renglonDe("antes")) });
    expect(r.aplicado).toBe(0);
  });

  it("no mueve lo pagado con Cashback ni líneas con devolución", () => {
    const pagos = [pago("cb", [anticipo("a", 300)], "Cashback"), pago("dev", [anticipo("b", 200)])];
    const { renglones, resumen } = calcularCuenta([], pagos);
    const r = aplicarSaldoAFavorEnCobro({
      pagos,
      renglones,
      aFavor: resumen.aFavor,
      lineasDinero: hoy(1000),
      lineasBloqueadas: new Set(["b"]),
      esCashback: (f) => f === "Cashback",
    });
    expect(r.aplicado).toBe(0);
  });

  it("los anticipos nuevos de hoy no se reducen y sin saldo a favor no cambia nada", () => {
    const pagos = [pago("viejo", [anticipo("l1", 500)])];
    const { renglones, resumen } = calcularCuenta([], pagos);
    const soloAnticipo: LineaPago[] = [{ ...anticipo("n", 400) }];
    expect(aplicarSaldoAFavorEnCobro({ pagos, renglones, aFavor: resumen.aFavor, lineasDinero: soloAnticipo }).aplicado).toBe(0);
    expect(aplicarSaldoAFavorEnCobro({ pagos: [], renglones: [], aFavor: 0, lineasDinero: hoy(100) }).lineasDinero).toEqual(hoy(100));
  });

  it("reparte lo aplicado entre varios tratamientos de hoy", () => {
    const pagos = [pago("viejo", [anticipo("l1", 500)])];
    const { renglones, resumen } = calcularCuenta([], pagos);
    const lineas: LineaPago[] = [
      { id: "h1", tratamientoId: "t1", folio: null, label: "A", monto: 300 },
      { id: "h2", tratamientoId: "t2", folio: null, label: "B", monto: 400 },
    ];
    const r = aplicarSaldoAFavorEnCobro({ pagos, renglones, aFavor: resumen.aFavor, lineasDinero: lineas });
    expect(r.aplicado).toBe(500);
    expect(r.lineasDinero.map((l) => [l.tratamientoId, l.monto])).toEqual([["t2", 200]]);
    const lineasViejo = r.pagosModificados[0].lineas;
    expect(lineasViejo.map((l) => [l.tratamientoId, l.monto])).toEqual([["t1", 300], ["t2", 200]]);
  });
});
