/** Usar el saldo a favor del paciente en el cobro de hoy: el paciente paga solo la diferencia.
 *
 * Antes, el dinero que el paciente ya había dejado (un anticipo sin asignar o un pago de más) se quedaba esperando
 * mientras el cobro de hoy se pedía completo, así que "pagaba de más" cada vez. Ahora ese dinero se asigna al
 * tratamiento que se cobra hoy, igual que si se editara el pago viejo y se le escogiera tratamiento: la línea del pago
 * anterior pasa (entera o partida) al tratamiento de hoy, y el pago de hoy se registra solo por lo que falta.
 *
 * De dónde se toma, en este orden:
 *  1. Anticipos sin asignar, del más antiguo al más reciente.
 *  2. Lo pagado de más en tratamientos ya cobrados (cargo mayor a cero), del pago más reciente al más antiguo.
 * Un anticipo de un tratamiento aceptado que todavía no se realiza NO se toca: ese dinero ya tiene destino.
 * Tampoco se toca lo pagado con Cashback, ni líneas que ya tienen una devolución.
 *
 * Lógica pura, sin React ni Firestore. */

import { redondearDinero } from "./dinero";
import type { Pago, LineaPago } from "./patientData";
import type { RenglonCuenta } from "./cuentaPaciente";

export type ResultadoSaldoAFavor = {
  /** Cuánto saldo a favor se usa en este cobro. */
  aplicado: number;
  /** Las líneas del pago de hoy ya reducidas por lo aplicado (se quitan las que queden en cero). */
  lineasDinero: LineaPago[];
  /** Los pagos anteriores que cambian (con la línea reasignada); se guardan reemplazando a los de antes. */
  pagosModificados: Pago[];
};

export function aplicarSaldoAFavorEnCobro(args: {
  /** Pagos del paciente, el más reciente primero (como se guardan). */
  pagos: Pago[];
  renglones: RenglonCuenta[];
  /** Saldo a favor total de la cuenta (`resumen.aFavor`). */
  aFavor: number;
  /** Líneas del pago de hoy que se pagan con dinero. Las que traen `sinAsignar` (anticipos nuevos) no se reducen. */
  lineasDinero: LineaPago[];
  /** Ids de líneas de pago que una devolución ya referencia: no se parten ni se mueven. */
  lineasBloqueadas?: Set<string>;
  esCashback?: (formaPago: string) => boolean;
}): ResultadoSaldoAFavor {
  const { pagos, renglones, aFavor, lineasDinero, lineasBloqueadas = new Set(), esCashback = () => false } = args;
  const sinCambios: ResultadoSaldoAFavor = { aplicado: 0, lineasDinero, pagosModificados: [] };

  const destinos = lineasDinero.filter((l) => l.tratamientoId && !l.sinAsignar && l.monto > 0);
  const idsDestino = new Set(destinos.map((l) => l.tratamientoId as string));
  const necesidad = redondearDinero(destinos.reduce((s, l) => s + l.monto, 0));
  if (aFavor <= 0 || necesidad <= 0) return sinCambios;

  // Dinero sin asignar que la cuenta reconoce (ya descontadas las devoluciones): lo que sobra del saldo a favor total
  // una vez separado lo que está pagado de más en cada tratamiento.
  const sobranteEnRenglones = redondearDinero(renglones.reduce((s, r) => s + r.aFavor, 0));
  let sinAsignarDisponible = Math.max(0, redondearDinero(aFavor - sobranteEnRenglones));

  type Toma = { pagoId: string; lineaId: string; monto: number };
  const tomas: Toma[] = [];
  let falta = necesidad;

  // 1. Anticipos sin asignar, del más antiguo (el final de la lista) al más reciente.
  for (let i = pagos.length - 1; i >= 0 && falta > 0 && sinAsignarDisponible > 0; i--) {
    const pago = pagos[i];
    if (esCashback(pago.formaPago)) continue;
    for (const l of pago.lineas) {
      if (falta <= 0 || sinAsignarDisponible <= 0) break;
      if (l.tratamientoId || !l.sinAsignar || l.monto <= 0 || lineasBloqueadas.has(l.id)) continue;
      const monto = redondearDinero(Math.min(l.monto, falta, sinAsignarDisponible));
      if (monto <= 0) continue;
      tomas.push({ pagoId: pago.id, lineaId: l.id, monto });
      falta = redondearDinero(falta - monto);
      sinAsignarDisponible = redondearDinero(sinAsignarDisponible - monto);
    }
  }

  // 2. Lo pagado de más en tratamientos ya cobrados, del pago más reciente al más antiguo.
  for (const r of renglones) {
    if (falta <= 0) break;
    if (r.cargo <= 0 || r.aFavor <= 0 || idsDestino.has(r.item.id)) continue;
    let sobra = r.aFavor;
    for (const pago of pagos) {
      if (falta <= 0 || sobra <= 0) break;
      if (esCashback(pago.formaPago)) continue;
      for (const l of pago.lineas) {
        if (falta <= 0 || sobra <= 0) break;
        if (l.tratamientoId !== r.item.id || l.monto <= 0 || lineasBloqueadas.has(l.id)) continue;
        const monto = redondearDinero(Math.min(l.monto, falta, sobra));
        if (monto <= 0) continue;
        tomas.push({ pagoId: pago.id, lineaId: l.id, monto });
        falta = redondearDinero(falta - monto);
        sobra = redondearDinero(sobra - monto);
      }
    }
  }

  const aplicado = redondearDinero(necesidad - falta);
  if (aplicado <= 0) return sinCambios;

  // Se reparte lo tomado entre las líneas de hoy, en orden; cada pedazo es una línea nueva del pago viejo apuntando al
  // tratamiento de hoy, y la línea de hoy baja en lo mismo.
  const porCubrir = destinos.map((l) => ({ linea: l, resta: l.monto }));
  const reducciones = new Map<string, number>(); // id de línea de hoy → lo que baja
  const nuevasLineas = new Map<string, LineaPago[]>(); // id de línea vieja → lo que se le suma
  const tomadoDe = new Map<string, number>(); // id de línea vieja → lo que se le quita
  let contador = 0;
  for (const t of tomas) {
    let porAsignar = t.monto;
    for (const d of porCubrir) {
      if (porAsignar <= 0) break;
      if (d.resta <= 0) continue;
      const parte = redondearDinero(Math.min(d.resta, porAsignar));
      d.resta = redondearDinero(d.resta - parte);
      porAsignar = redondearDinero(porAsignar - parte);
      reducciones.set(d.linea.id, redondearDinero((reducciones.get(d.linea.id) ?? 0) + parte));
      const lista = nuevasLineas.get(t.lineaId) ?? [];
      lista.push({
        id: `${t.lineaId}-sf${++contador}`,
        tratamientoId: d.linea.tratamientoId,
        folio: d.linea.folio,
        label: d.linea.label,
        monto: parte,
      });
      nuevasLineas.set(t.lineaId, lista);
      tomadoDe.set(t.lineaId, redondearDinero((tomadoDe.get(t.lineaId) ?? 0) + parte));
    }
  }

  const pagosModificados = pagos
    .filter((p) => p.lineas.some((l) => tomadoDe.has(l.id)))
    .map((p): Pago => ({
      ...p,
      lineas: p.lineas.flatMap((l) => {
        const quitado = tomadoDe.get(l.id);
        if (!quitado) return [l];
        const resto = redondearDinero(l.monto - quitado);
        return [...(resto > 0 ? [{ ...l, monto: resto }] : []), ...(nuevasLineas.get(l.id) ?? [])];
      }),
    }));

  const lineasReducidas = lineasDinero
    .map((l) => {
      const baja = reducciones.get(l.id);
      return baja ? { ...l, monto: redondearDinero(l.monto - baja) } : l;
    })
    .filter((l) => l.monto > 0);

  return { aplicado, lineasDinero: lineasReducidas, pagosModificados };
}
