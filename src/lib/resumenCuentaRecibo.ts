/** Estado de cuenta que acompaña al recibo de pago: cuánto se presupuestó, cuánto lleva pagado el paciente (con este
 * pago incluido) y cuánto falta; más lo que costaría su próxima cita, si ya está agendada con un costo estimado. */

import { calcularSaldoPendiente } from "./saldosPendientes";
import { siguienteCita } from "./formatosWhatsapp";
import { fechaPagoAIso } from "./metas";
import type { CitaAgenda, DevolucionPago, Pago, SavedBudget } from "./patientData";

export type ResumenCuentaRecibo = {
  totalPresupuestado: number;
  totalPagado: number;
  saldo: number;
  proximaCita: { fecha: string; horaInicio: string; tratamientos: string[]; costo: number | null } | null;
};

/** El costo de la cita es texto libre ("$1,200", "1200 aprox."): se rescata el número o nada. */
export function montoDeCostoCita(costo: string | undefined): number | null {
  const limpio = (costo ?? "").replace(/,/g, "").match(/\d+(\.\d+)?/)?.[0];
  if (!limpio) return null;
  const monto = Number(limpio);
  return Number.isFinite(monto) && monto > 0 ? monto : null;
}

/** Orden cronológico de un pago: su fecha y, a igual fecha, su id (que lleva la hora de captura). La lista de pagos no
 * viene ordenada de forma confiable (Firestore la entrega por id; lo recién capturado se pone al inicio). */
function clave(p: Pick<Pago, "id" | "fecha">): string {
  return `${fechaPagoAIso(p.fecha) ?? ""}|${p.id.padStart(20, "0")}`;
}

/** El estado de cuenta se calcula con este pago y los anteriores, no con los que vengan después (así un recibo viejo no
 * cambia de cifras cuando el paciente sigue pagando). Sin presupuestos no hay estado de cuenta que mostrar (el paciente
 * no tiene nada presupuestado o su expediente no está cargado). */
export function resumenCuentaRecibo(datos: {
  presupuestos: SavedBudget[];
  pagos: Pago[];
  devoluciones: DevolucionPago[];
  pago: Pago;
  citas: CitaAgenda[];
  patientId: string;
}): ResumenCuentaRecibo | null {
  if (datos.presupuestos.length === 0) return null;
  const limite = clave(datos.pago);
  const hastaEstePago = [datos.pago, ...datos.pagos.filter((p) => p.id !== datos.pago.id && clave(p) <= limite)];
  const { totalPresupuestado, totalPagado, saldo } = calcularSaldoPendiente(datos.presupuestos, hastaEstePago, datos.devoluciones);
  const cita = siguienteCita(datos.citas, datos.patientId);
  return {
    totalPresupuestado,
    totalPagado,
    saldo: Math.max(0, saldo),
    proximaCita: cita
      ? { fecha: cita.fecha, horaInicio: cita.horaInicio, tratamientos: cita.tratamientos ?? [], costo: montoDeCostoCita(cita.costo) }
      : null,
  };
}
