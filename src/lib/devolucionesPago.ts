/** "Devoluciones de pago" — un pago efectuado es un hecho histórico: nunca
 * se elimina, nunca se le baja el monto, nunca se sobrescribe. Una
 * devolución se registra como un movimiento nuevo vinculado al pago
 * original. Fase 1: solo la lógica pura (validación, construcción,
 * acumulación) — sin Firestore, sin runTransaction todavía (ver Fase 2). */

import { montoMayorQue, montosIguales, redondearDinero } from "./dinero";
import type {
  DevolucionPago,
  DevolucionResumen,
  EfectoTratamiento,
  ItemDevolucion,
  MetodoDevolucion,
  MotivoDevolucion,
  Pago,
  RelacionReceptorDevolucion,
} from "./patientData";

export type DisponibleDevolucion = {
  montoOriginal: number;
  totalDevuelto: number;
  neto: number;
  disponible: number;
  /** true si totalDevuelto > montoOriginal por alguna inconsistencia
   * externa (ej. el pago se editó a la baja después de una devolución ya
   * completada) — la UI debe advertir, nunca ocultarlo ni mostrar
   * disponible negativo. */
  sobreDevuelto: boolean;
};

export function calcularDisponibleDevolucion(pago: Pago, resumen: DevolucionResumen | null): DisponibleDevolucion {
  const montoOriginal = pago.total;
  const totalDevuelto = resumen?.totalDevuelto ?? 0;
  const neto = redondearDinero(montoOriginal - totalDevuelto);
  return {
    montoOriginal,
    totalDevuelto,
    neto,
    disponible: Math.max(0, neto),
    sobreDevuelto: montoMayorQue(totalDevuelto, montoOriginal),
  };
}

export type ItemDevolucionInput = {
  lineaPagoId: string;
  tratamientoId: string | null;
  folio: string | null;
  label: string;
  montoDevuelto: number;
  efectoTratamiento: EfectoTratamiento | null;
};

export type DevolucionInput = {
  patientId: string;
  pagoOrigenId: string;
  tipo: "total" | "parcial";
  monto: number;
  metodo: MetodoDevolucion | null;
  motivo: MotivoDevolucion | null;
  detalleMotivo?: string;
  /** Solo aplica a montoNoAsignadoTratamientos — ver devolucionValida. */
  efectoTratamiento: EfectoTratamiento | null;
  itemsAfectados?: ItemDevolucionInput[];
  montoNoAsignadoTratamientos?: number;
  recibidoPor?: { nombre: string; relacion?: string };
  referenciaTransferencia?: string;
};

export type ResultadoValidacion = { valido: true } | { valido: false; motivo: string };

/** Única fuente de verdad de validación — se usa TANTO para la vista previa
 * en la UI (con el pago/resumen que el cliente tiene cacheados) COMO,
 * en Fase 2, dentro de la transacción de Firestore (con pago/resumen
 * leídos en vivo), para que nunca haya dos implementaciones de la misma
 * regla desalineadas. */
export function devolucionValida(input: DevolucionInput, pago: Pago, resumen: DevolucionResumen | null): ResultadoValidacion {
  // 1. Cada componente monetario se valida individualmente — la suma
  // algebraica sola no basta (un item negativo podría "compensar" a otro
  // positivo y cuadrar la suma sin ser válido).
  if (!Number.isFinite(input.monto) || input.monto <= 0) {
    return { valido: false, motivo: "El monto debe ser mayor a cero." };
  }
  const items = input.itemsAfectados ?? [];
  for (const item of items) {
    if (!Number.isFinite(item.montoDevuelto) || item.montoDevuelto <= 0) {
      return { valido: false, motivo: `El monto de "${item.label}" debe ser mayor a cero.` };
    }
  }
  const noAsignado = input.montoNoAsignadoTratamientos ?? 0;
  if (!Number.isFinite(noAsignado) || noAsignado < 0) {
    return { valido: false, motivo: "El monto no asignado a tratamientos no puede ser negativo." };
  }

  // 2. Disponible global del pago.
  const disponible = calcularDisponibleDevolucion(pago, resumen);
  if (montoMayorQue(input.monto, disponible.disponible)) {
    return { valido: false, motivo: `Solo hay ${disponible.disponible} disponible para devolver de este pago.` };
  }

  // 3. Campos requeridos.
  if (!input.metodo) return { valido: false, motivo: "Selecciona el método de la devolución." };
  if (!input.motivo) return { valido: false, motivo: "Selecciona el motivo de la devolución." };
  if (input.motivo === "otro" && !input.detalleMotivo?.trim()) {
    return { valido: false, motivo: "Describe el motivo cuando eliges 'Otro'." };
  }
  if (input.metodo === "efectivo" && !input.recibidoPor?.nombre?.trim()) {
    return { valido: false, motivo: "Captura quién recibe el efectivo." };
  }

  // 4. El efecto general SOLO se exige cuando de verdad hay monto sin
  // asignar a un tratamiento — nunca un efecto general artificial cuando
  // cada item ya trae el suyo. Cada item, en cambio, siempre necesita el
  // suyo si existe.
  if (noAsignado > 0 && !input.efectoTratamiento) {
    return { valido: false, motivo: "Indica qué ocurre con la parte de la devolución no asociada a un tratamiento." };
  }
  if (items.some((i) => !i.efectoTratamiento)) {
    return { valido: false, motivo: "Indica el efecto clínico de cada renglón devuelto." };
  }

  // 5. Distribución del monto — nunca una diferencia silenciosa.
  const sumaItems = redondearDinero(items.reduce((s, i) => s + i.montoDevuelto, 0));
  if (!montosIguales(sumaItems + noAsignado, input.monto)) {
    return { valido: false, motivo: "La suma de los renglones más el monto sin asignar no coincide con el total de la devolución." };
  }

  // 6. Coherencia tipo/monto: "total" debe agotar exactamente el
  // disponible; "parcial" ya quedó acotado por el chequeo de disponible.
  if (input.tipo === "total" && !montosIguales(input.monto, disponible.disponible)) {
    return { valido: false, motivo: "Una devolución total debe corresponder al monto completo todavía disponible." };
  }

  // 7. Límite POR LÍNEA DE PAGO (no solo global) — items agrupados por
  // lineaPagoId ANTES de comparar, para que dos renglones de la misma línea
  // no pasen cada uno por separado y juntos excedan el original. Contra el
  // pago LEÍDO EN VIVO (parámetro `pago`), nunca contra un snapshot viejo
  // de la UI.
  const lineasPorId = new Map(pago.lineas.map((l) => [l.id, l]));
  const solicitadoPorLinea: Record<string, number> = {};
  for (const item of items) {
    if (!lineasPorId.has(item.lineaPagoId)) {
      return { valido: false, motivo: `La línea "${item.label}" ya no existe en el pago original.` };
    }
    solicitadoPorLinea[item.lineaPagoId] = redondearDinero((solicitadoPorLinea[item.lineaPagoId] ?? 0) + item.montoDevuelto);
  }
  for (const [lineaPagoId, montoSolicitado] of Object.entries(solicitadoPorLinea)) {
    const lineaPago = lineasPorId.get(lineaPagoId)!;
    const devueltoPrevio = resumen?.devueltoPorLinea[lineaPagoId] ?? 0;
    if (montoMayorQue(devueltoPrevio + montoSolicitado, lineaPago.monto)) {
      return { valido: false, motivo: `Ya se devolvió el máximo disponible de "${lineaPago.label}".` };
    }
  }

  return { valido: true };
}

/** Nunca hace spread del pago ni del input crudo — construye el objeto
 * final campo por campo, omitiendo opcionales ausentes en vez de dejarlos
 * como `undefined` explícito. `id` se recibe como argumento — esta función
 * NUNCA genera un id nuevo (la idempotencia de Fase 2 depende de que el id
 * sea estable entre reintentos, generado una sola vez por el caller). */
export function construirDevolucion(input: DevolucionInput, id: string, fechaISO: string, registradoPorUid: string): DevolucionPago {
  const base: DevolucionPago = {
    id,
    patientId: input.patientId,
    pagoOrigenId: input.pagoOrigenId,
    tipo: input.tipo,
    monto: input.monto,
    moneda: "MXN",
    metodo: input.metodo!,
    motivo: input.motivo!,
    registradoPorUid,
    estado: "completada",
    creadoEn: fechaISO,
    completadoEn: fechaISO,
  };
  // Nunca se inventa un efecto general (ej. "solo_financiero") — el campo
  // solo existe cuando de verdad hay dinero no asignado a un tratamiento.
  if ((input.montoNoAsignadoTratamientos ?? 0) > 0 && input.efectoTratamiento) {
    base.efectoTratamiento = input.efectoTratamiento;
  }
  if (input.detalleMotivo?.trim()) base.detalleMotivo = input.detalleMotivo.trim();
  if (input.itemsAfectados?.length) {
    base.itemsAfectados = input.itemsAfectados.map(
      (i): ItemDevolucion => ({
        lineaPagoId: i.lineaPagoId,
        tratamientoId: i.tratamientoId,
        folio: i.folio,
        label: i.label,
        montoDevuelto: i.montoDevuelto,
        efectoTratamiento: i.efectoTratamiento!,
      })
    );
  }
  if (input.montoNoAsignadoTratamientos) base.montoNoAsignadoTratamientos = input.montoNoAsignadoTratamientos;
  if (input.recibidoPor?.nombre?.trim()) {
    base.recibidoPor = {
      nombre: input.recibidoPor.nombre.trim(),
      relacion: input.recibidoPor.relacion as RelacionReceptorDevolucion | undefined,
    };
  }
  if (input.referenciaTransferencia?.trim()) base.referenciaTransferencia = input.referenciaTransferencia.trim();
  return base;
}

/** Aplica una devolución ya validada al resumen previo del pago — función
 * pura, determinista, reutilizada tanto dentro de la transacción real
 * (Fase 2) como en los tests de Fase 1. No vuelve a validar (esa
 * responsabilidad es 100% de devolucionValida) — solo acumula, siempre con
 * redondearDinero para que el resumen nunca acumule residuos de punto
 * flotante a través de muchas devoluciones sucesivas. */
export function aplicarDevolucionAResumen(
  resumenPrevio: DevolucionResumen | null,
  pagoId: string,
  input: DevolucionInput,
  fechaISO: string
): DevolucionResumen {
  const devueltoPorLinea = { ...(resumenPrevio?.devueltoPorLinea ?? {}) };
  (input.itemsAfectados ?? []).forEach((item) => {
    devueltoPorLinea[item.lineaPagoId] = redondearDinero((devueltoPorLinea[item.lineaPagoId] ?? 0) + item.montoDevuelto);
  });
  return {
    pagoId,
    totalDevuelto: redondearDinero((resumenPrevio?.totalDevuelto ?? 0) + input.monto),
    devueltoPorLinea,
    actualizadoEn: fechaISO,
  };
}
