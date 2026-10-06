/** Saldos "falsos": deuda que aparece en un presupuesto aunque el paciente no
 * debe nada. Dos orígenes reales (ver AgendaCitaDialog y Pagos):
 *
 *  1. Cada cita con costo estimado crea su presupuesto `pres-cita-<id>`, y ese
 *     presupuesto NO desaparecía si la cita se cancelaba, se reagendaba o el
 *     paciente no llegaba — nadie puede pagar algo que nunca ocurrió, así que
 *     el saldo pendiente solo subía.
 *  2. Un pago registrado como "extra" crea su propio presupuesto ya pagado
 *     (`pres-<id del pago>`); si el mismo trabajo ya tenía su presupuesto de
 *     cita, el paciente queda con DOS presupuestos del mismo monto: uno pagado
 *     y otro "pendiente" (el que genera la falsa deuda).
 */

import { redondearDinero } from "./dinero";
import type { Pago, SavedBudget } from "./patientData";

const ESTATUS_NO_ATENDIDA = ["Cancelada", "Reagendada", "No Asistió"] as const;

export type CitaMinima = { id: string; patientId: string | null; fecha: string; estatus: string };

export type EntradaFalsos = {
  patientId: string;
  patientName: string;
  presupuestos: SavedBudget[];
  pagos: Pago[];
};

const esPresupuestoDeCita = (id: string) => id.startsWith("pres-cita-");
const citaIdDePresupuesto = (id: string) => id.slice("pres-cita-".length);

/** Ids de renglones de presupuesto a los que algún pago ya descuenta. */
function renglonesPagados(pagos: Pago[]): Set<string> {
  const ids = new Set<string>();
  pagos.forEach((p) =>
    p.lineas.forEach((l) => {
      if (l.tratamientoId && l.monto > 0) ids.add(l.tratamientoId);
    })
  );
  return ids;
}

function sinPagos(presupuesto: SavedBudget, pagados: Set<string>): boolean {
  return presupuesto.items.every((i) => !pagados.has(i.id));
}

export type PresupuestoDeCitaNoAtendida = {
  patientId: string;
  patientName: string;
  presupuestoId: string;
  folio: string;
  total: number;
  citaId: string;
  citaFecha: string;
  citaEstatus: string;
};

/** Presupuestos generados por una cita que ya no se va a atender y que nadie
 * ha pagado — seguros de quitar (quedan en la Papelera). Nunca toca uno
 * editado a mano ni uno con algún pago ligado. */
export function presupuestosDeCitasNoAtendidas(
  e: EntradaFalsos,
  citasPorId: Map<string, CitaMinima>
): PresupuestoDeCitaNoAtendida[] {
  const pagados = renglonesPagados(e.pagos);
  const resultado: PresupuestoDeCitaNoAtendida[] = [];
  e.presupuestos.forEach((p) => {
    if (!esPresupuestoDeCita(p.id) || p.editadoManualmente || !sinPagos(p, pagados)) return;
    const cita = citasPorId.get(citaIdDePresupuesto(p.id));
    if (!cita || cita.patientId !== e.patientId) return;
    if (!(ESTATUS_NO_ATENDIDA as readonly string[]).includes(cita.estatus)) return;
    resultado.push({
      patientId: e.patientId,
      patientName: e.patientName,
      presupuestoId: p.id,
      folio: p.folio,
      total: p.total,
      citaId: cita.id,
      citaFecha: cita.fecha,
      citaEstatus: cita.estatus,
    });
  });
  return resultado;
}

export type PosibleDuplicado = {
  patientId: string;
  patientName: string;
  /** Presupuesto de la cita, sin pagar. */
  presupuestoCitaId: string;
  folioCita: string;
  /** Presupuesto generado por el pago "extra", ya pagado. */
  presupuestoPagoId: string;
  total: number;
  /** true si se puede unir solos (mismos renglones y montos): ver `planUnion`. */
  unibleAutomaticamente: boolean;
};

const esPresupuestoDePagoExtra = (p: SavedBudget) =>
  p.id.startsWith("pres-") && !esPresupuestoDeCita(p.id) && p.diagnostico.startsWith("Generado automáticamente a partir de un pago");

function totalPagadoDe(presupuesto: SavedBudget, pagos: Pago[]): number {
  const ids = new Set(presupuesto.items.map((i) => i.id));
  return redondearDinero(
    pagos.reduce((s, p) => s + p.lineas.reduce((ls, l) => ls + (l.tratamientoId && ids.has(l.tratamientoId) ? l.monto : 0), 0), 0)
  );
}

/** Mismos montos (como conjunto) en los renglones de dos presupuestos. */
function mismosMontos(a: SavedBudget, b: SavedBudget): boolean {
  if (a.items.length !== b.items.length) return false;
  const x = a.items.map((i) => redondearDinero(i.price)).sort((m, n) => m - n);
  const y = b.items.map((i) => redondearDinero(i.price)).sort((m, n) => m - n);
  return x.every((v, i) => v === y[i]);
}

/** Un presupuesto de cita sin pagar + un presupuesto de pago "extra" ya
 * pagado completo, del mismo total: casi seguro es el mismo trabajo cobrado
 * por otra vía. */
export function posiblesDuplicados(e: EntradaFalsos, citasPorId: Map<string, CitaMinima>): PosibleDuplicado[] {
  const pagados = renglonesPagados(e.pagos);
  const deCita = e.presupuestos.filter(
    (p) => esPresupuestoDeCita(p.id) && !p.editadoManualmente && sinPagos(p, pagados)
  );
  const deExtra = e.presupuestos.filter(
    (p) => esPresupuestoDePagoExtra(p) && totalPagadoDe(p, e.pagos) >= redondearDinero(p.total) && p.total > 0
  );
  const usados = new Set<string>();
  const resultado: PosibleDuplicado[] = [];
  deCita.forEach((c) => {
    // Las de citas ya no atendidas se limpian por su propio camino.
    const cita = citasPorId.get(citaIdDePresupuesto(c.id));
    if (cita && (ESTATUS_NO_ATENDIDA as readonly string[]).includes(cita.estatus)) return;
    const par = deExtra.find((x) => !usados.has(x.id) && redondearDinero(x.total) === redondearDinero(c.total));
    if (!par) return;
    usados.add(par.id);
    resultado.push({
      patientId: e.patientId,
      patientName: e.patientName,
      presupuestoCitaId: c.id,
      folioCita: c.folio,
      presupuestoPagoId: par.id,
      total: c.total,
      unibleAutomaticamente: mismosMontos(c, par),
    });
  });
  return resultado;
}

/** Cómo unir un duplicado: cada renglón del presupuesto del pago "extra" se
 * empareja con un renglón de la cita del MISMO monto; los pagos que apuntaban
 * al renglón viejo pasan a apuntar al de la cita. Devuelve null si no se
 * puede emparejar uno a uno. */
export function planUnion(
  deCita: SavedBudget,
  deExtra: SavedBudget
): { renglonViejoAId: Map<string, string>; folioNuevo: string } | null {
  if (!mismosMontos(deCita, deExtra)) return null;
  const libres = [...deCita.items];
  const mapa = new Map<string, string>();
  for (const viejo of deExtra.items) {
    const idx = libres.findIndex((n) => redondearDinero(n.price) === redondearDinero(viejo.price));
    if (idx < 0) return null;
    mapa.set(viejo.id, libres[idx].id);
    libres.splice(idx, 1);
  }
  return { renglonViejoAId: mapa, folioNuevo: deCita.folio };
}

/** Reasigna las líneas de pago según el plan de unión (puro). */
export function aplicarUnionAPagos(
  pagos: Pago[],
  plan: { renglonViejoAId: Map<string, string>; folioNuevo: string },
  etiquetas: Map<string, string>
): Pago[] {
  return pagos.map((p) => {
    let cambio = false;
    const lineas = p.lineas.map((l) => {
      const nuevo = l.tratamientoId ? plan.renglonViejoAId.get(l.tratamientoId) : undefined;
      if (!nuevo) return l;
      cambio = true;
      const { generarPresupuesto: _g, ...resto } = l;
      return { ...resto, tratamientoId: nuevo, folio: plan.folioNuevo, label: etiquetas.get(nuevo) ?? l.label };
    });
    return cambio ? { ...p, lineas } : p;
  });
}
