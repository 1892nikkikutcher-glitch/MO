/** Presupuestos de "control" o "mensualidad" de ortodoncia que se crearon solos
 * por error. Cada cita con costo generaba su propio presupuesto (`pres-cita-…`),
 * así que los controles mensuales del mismo tratamiento terminaban como varios
 * "tratamientos" sueltos en el expediente — informando mal el tratamiento del
 * paciente y, si el paciente ya había pagado, con ese pago ligado al control en
 * vez de al presupuesto principal de ortodoncia.
 *
 * Qué se propone para cada uno (nada se aplica solo; el usuario lo confirma):
 *  - sin ningún pago: quitarlo (queda en la Papelera);
 *  - con pagos: pasar esos pagos al presupuesto principal de ortodoncia (si
 *    hay uno solo y alcanza) y quitar el de control;
 *  - cualquier otro caso: revisar a mano. */

import { redondearDinero } from "./dinero";
import { pareceControlOMensualidad } from "./autoriaRegistros";
import type { LineaPago, Pago, SavedBudget } from "./patientData";
import type { EntradaFalsos } from "./saldosFalsos";

const RE_ORTODONCIA = /ortodon|bracket|aparatolog|alineador/i;

export type DestinoPago = { lineaKey: string; tratamientoId: string; folio: string; label: string };

export type PropuestaControl = {
  patientId: string;
  patientName: string;
  presupuestoId: string;
  folio: string;
  total: number;
  pagado: number;
  procedimientos: string[];
  origen: "cita" | "pago";
  creadoPorEmail?: string;
  /** "quitar" (sin pagos), "pasar_pagos" (pagos al presupuesto principal) o
   * "revisar" (no se puede decidir solo). */
  accion: "quitar" | "pasar_pagos" | "revisar";
  destinoFolio?: string;
  /** Cada línea de pago a mover y a qué renglón del presupuesto principal. */
  movimientos: DestinoPago[];
  motivoRevisar?: string;
};

/** Llave estable de una línea de pago dentro de un paciente. */
export const llaveLinea = (pago: Pago, linea: LineaPago) => `${pago.id}|${linea.id}`;

const origenDe = (id: string): "cita" | "pago" | "manual" =>
  id.startsWith("pres-cita-") ? "cita" : id.startsWith("pres-") ? "pago" : "manual";

const esControl = (p: SavedBudget) =>
  p.items.length > 0 && p.items.every((i) => pareceControlOMensualidad([i.procedure ?? ""]));

function pagadoPorRenglon(pagos: Pago[]): Map<string, number> {
  const m = new Map<string, number>();
  pagos.forEach((p) =>
    p.lineas.forEach((l) => {
      if (l.tratamientoId && l.monto > 0) m.set(l.tratamientoId, redondearDinero((m.get(l.tratamientoId) ?? 0) + l.monto));
    })
  );
  return m;
}

export function controlesPorError(e: EntradaFalsos): PropuestaControl[] {
  const pagado = pagadoPorRenglon(e.pagos);
  const controles = e.presupuestos.filter((p) => origenDe(p.id) !== "manual" && !p.editadoManualmente && esControl(p));
  if (controles.length === 0) return [];
  const idsControl = new Set(controles.map((c) => c.id));

  // Presupuestos principales de ortodoncia: los que NO son de control y mencionan ortodoncia.
  const principales = e.presupuestos.filter(
    (p) =>
      !idsControl.has(p.id) &&
      !esControl(p) &&
      (p.items.some((i) => RE_ORTODONCIA.test(i.procedure ?? "")) || RE_ORTODONCIA.test(p.especialidad ?? ""))
  );

  return controles.map((c) => {
    const pagadoControl = redondearDinero(c.items.reduce((s, i) => s + (pagado.get(i.id) ?? 0), 0));
    const base = {
      patientId: e.patientId,
      patientName: e.patientName,
      presupuestoId: c.id,
      folio: c.folio,
      total: c.total,
      pagado: pagadoControl,
      procedimientos: c.items.map((i) => i.procedure),
      origen: origenDe(c.id) as "cita" | "pago",
      creadoPorEmail: c.creadoPorEmail,
      movimientos: [] as DestinoPago[],
    };
    if (pagadoControl <= 0) return { ...base, accion: "quitar" as const };

    if (principales.length !== 1) {
      return {
        ...base,
        accion: "revisar" as const,
        motivoRevisar:
          principales.length === 0
            ? "No hay un presupuesto principal de ortodoncia al que pasar el pago."
            : "Hay varios presupuestos de ortodoncia; elige a mano a cuál va el pago.",
      };
    }
    const destino = principales[0];
    // Saldo disponible por renglón del destino (lo que todavía se debe).
    const libre = new Map(destino.items.map((i) => [i.id, redondearDinero(i.price - (pagado.get(i.id) ?? 0))]));
    const idsRenglonesControl = new Set(c.items.map((i) => i.id));
    const movimientos: DestinoPago[] = [];
    for (const pago of e.pagos) {
      for (const linea of pago.lineas) {
        if (!linea.tratamientoId || !idsRenglonesControl.has(linea.tratamientoId) || linea.monto <= 0) continue;
        // Renglón con más saldo que alcance para esta línea completa.
        const candidato = destino.items
          .filter((i) => (libre.get(i.id) ?? 0) >= linea.monto)
          .sort((a, b) => (libre.get(b.id) ?? 0) - (libre.get(a.id) ?? 0))[0];
        if (!candidato) {
          return {
            ...base,
            accion: "revisar" as const,
            motivoRevisar: `El pago de ${linea.monto} no cabe en el saldo pendiente del presupuesto ${destino.folio}.`,
          };
        }
        libre.set(candidato.id, redondearDinero((libre.get(candidato.id) ?? 0) - linea.monto));
        movimientos.push({
          lineaKey: llaveLinea(pago, linea),
          tratamientoId: candidato.id,
          folio: destino.folio,
          label: candidato.note || candidato.procedure,
        });
      }
    }
    return { ...base, accion: "pasar_pagos" as const, destinoFolio: destino.folio, movimientos };
  });
}

/** Reasigna las líneas de pago indicadas (puro). El monto cobrado no cambia. */
export function aplicarMovimientosAPagos(pagos: Pago[], movimientos: DestinoPago[]): Pago[] {
  const porLlave = new Map(movimientos.map((m) => [m.lineaKey, m]));
  return pagos.map((p) => {
    let cambio = false;
    const lineas = p.lineas.map((l) => {
      const m = porLlave.get(llaveLinea(p, l));
      if (!m) return l;
      cambio = true;
      const { generarPresupuesto: _g, ...resto } = l;
      return { ...resto, tratamientoId: m.tratamientoId, folio: m.folio, label: m.label };
    });
    return cambio ? { ...p, lineas } : p;
  });
}
