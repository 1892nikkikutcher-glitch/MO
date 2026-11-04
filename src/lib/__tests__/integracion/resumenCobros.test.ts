/** El resumen de cobros (`config/finanzas`) contra el emulador de Firestore.
 *
 * Reproduce el día en que un pago en efectivo de $550 quedó guardado en el
 * expediente, con su recibo, y nunca apareció en el total del día: dos
 * aparatos cobrando el mismo día escribían cada uno la cifra final calculada
 * sobre la copia que tenían en memoria, y el segundo en guardar borraba lo
 * del primero.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
});

import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { aIncrementos, calcularDeltasFinanzas } from "../../finanzasIncrementos";
import type { FinanzasConfig } from "../../metas";
import type { Pago } from "../../patientData";

const app = getApps()[0] ?? initializeApp({ projectId: "demo-mo-local" });
const db = getFirestore(app);

const CLINICA = "uid-clinica-resumen-cobros";
const HOY = "2026-11-03";
const ref = db.doc(`users/${CLINICA}/config/finanzas`);

const incrementar = (monto: number) => FieldValue.increment(monto) as unknown;

const pago = (id: string, total: number, formaPago = "Efectivo", medico = "Dra. A"): Pago => ({
  id,
  fecha: "03/11/2026",
  medico,
  formaPago,
  lineas: [],
  total,
  facturar: false,
  firma: null,
});

/** Lo que hace la app al guardar un pago: manda solo el delta. */
async function sumarPago(prev: Pago[], next: Pago[]) {
  const deltas = calcularDeltasFinanzas(prev, next);
  if (!deltas) return;
  await ref.set(aIncrementos(deltas as unknown as Record<string, unknown>, incrementar), { merge: true });
}

async function leer(): Promise<FinanzasConfig> {
  return (await ref.get()).data() as FinanzasConfig;
}

/** Los $2,270 en efectivo que ya se habían cobrado ese día antes del pago de $550. */
const YA_COBRADO = [pago("previo", 2270)];

beforeEach(async () => {
  await ref.delete();
  await sumarPago([], YA_COBRADO);
});

afterAll(async () => {
  await ref.delete();
});

describe("resumen de cobros contra el emulador", () => {
  it("dos aparatos cobrando el mismo día no se borran entre sí", async () => {
    // Las dos pestañas tienen la MISMA copia vieja del resumen (la de antes
    // de los dos cobros) y guardan casi al mismo tiempo: así se perdía el
    // dinero del primero en guardar.
    await Promise.all([
      sumarPago(YA_COBRADO, [...YA_COBRADO, pago("efectivo-550", 550)]),
      sumarPago(YA_COBRADO, [...YA_COBRADO, pago("transfer-1100", 1100, "Transferencia")]),
    ]);

    const f = await leer();
    expect(f.porFecha[HOY]).toBe(2270 + 550 + 1100);
    expect(f.porFechaYFormaPago[HOY]).toEqual({ Efectivo: 2820, Transferencia: 1100 });
    expect(f.pagosCountPorFecha?.[HOY]).toBe(3);
  });

  it("escribir la cifra final SÍ borra el cobro del otro aparato", async () => {
    // El comportamiento viejo, aquí nomás para dejar asentado qué se arregló:
    // cada quien escribe su total calculado sobre la misma base vieja.
    await Promise.all([
      ref.set({ porFechaYFormaPago: { [HOY]: { Efectivo: 2270 + 550 } } }, { merge: true }),
      ref.set({ porFechaYFormaPago: { [HOY]: { Efectivo: 2270, Transferencia: 1100 } } }, { merge: true }),
    ]);
    const f = await leer();
    const efectivo = f.porFechaYFormaPago[HOY].Efectivo;
    expect([2270, 2820]).toContain(efectivo); // uno de los dos ganó
    expect(efectivo).not.toBe(2820 + 1100); // y el del otro se perdió
  });

  it("un pago registrado con el resumen todavía sin cargar no arrasa con el día", async () => {
    // El caso de abrir MO y cobrar en el primer segundo: la base local es
    // cero. Con incrementos, cero de base ya no significa cero de resultado.
    await sumarPago([], [pago("apenas-abrio", 550)]);
    const f = await leer();
    expect(f.porFecha[HOY]).toBe(2820);
  });

  it("un pago sin médico ni forma de pago ya no tira la escritura completa", async () => {
    // Firestore rechaza un nombre de campo vacío, y lo rechaza en el acto:
    // el error no llega como promesa rechazada sino como excepción, así que
    // ni siquiera lo atrapaba el .catch() de la escritura. Como el resumen es
    // un solo documento, ese pago se llevaba por delante el dinero del resto.
    expect(() => ref.set({ porFechaYFormaPago: { [HOY]: { "": 100 } } }, { merge: true })).toThrow();

    await sumarPago([], [pago("sin-datos", 550, "", "   ")]);
    const f = await leer();
    expect(f.porFecha[HOY]).toBe(2820);
    expect(f.porFechaYFormaPago[HOY]["Sin especificar"]).toBe(550);
  });

  it("borrar un pago lo descuenta del día", async () => {
    const conPago = [...YA_COBRADO, pago("se-borra", 550)];
    await sumarPago(YA_COBRADO, conPago);
    await sumarPago(conPago, YA_COBRADO);
    const f = await leer();
    expect(f.porFecha[HOY]).toBe(2270);
    expect(f.pagosCountPorFecha?.[HOY]).toBe(1);
  });
});
