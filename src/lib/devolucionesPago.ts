/** "Devoluciones de pago" — un pago efectuado es un hecho histórico: nunca
 * se elimina, nunca se le baja el monto, nunca se sobrescribe. Una
 * devolución se registra como un movimiento nuevo vinculado al pago
 * original. Fase 1 (arriba): lógica pura. Fase 2 (abajo): persistencia real
 * — una sola transacción atómica cubre devolución + resumen + corte de caja
 * + log (los cuatro son documentos de referencia directa, sin queries);
 * `saldosPendientes` queda deliberadamente FUERA de esa transacción porque
 * necesita la lista completa de presupuestos/pagos/devoluciones del
 * paciente (una consulta, no cabe en Transaction.get() del cliente) — se
 * reconcilia aparte, de forma idempotente, sin fingir una atomicidad que no
 * existe. */

import { doc, runTransaction, updateDoc, type Firestore } from "firebase/firestore";
import { montoMayorQue, montosIguales, redondearDinero } from "./dinero";
import { aplicarDeltaDevolucion, type FinanzasConfig } from "./metas";
import type { EventoDevolucionLog } from "./devolucionesLog";
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

/** Deriva un DevolucionResumen equivalente a partir de la lista de
 * devoluciones que el cliente ya tiene cargada (vía onSnapshot) — para la
 * vista previa en la UI (montos mostrados antes de confirmar). Puede
 * quedar momentáneamente desactualizado si otra pestaña completa una
 * devolución justo antes; la fuente de verdad real es siempre el
 * documento `devolucionesResumen` leído EN VIVO dentro de la transacción
 * de `completarDevolucion`, nunca este cálculo del lado cliente. */
export function resumenDesdeDevoluciones(pagoId: string, devoluciones: DevolucionPago[]): DevolucionResumen | null {
  const completadas = devoluciones.filter((d) => d.pagoOrigenId === pagoId && d.estado === "completada");
  if (completadas.length === 0) return null;
  const devueltoPorLinea: Record<string, number> = {};
  completadas.forEach((d) => {
    (d.itemsAfectados ?? []).forEach((item) => {
      devueltoPorLinea[item.lineaPagoId] = redondearDinero((devueltoPorLinea[item.lineaPagoId] ?? 0) + item.montoDevuelto);
    });
  });
  return {
    pagoId,
    totalDevuelto: redondearDinero(completadas.reduce((s, d) => s + d.monto, 0)),
    devueltoPorLinea,
    actualizadoEn: new Date().toISOString(),
  };
}

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

/** Completa una devolución de forma atómica e idempotente. `devolucionId`
 * se recibe como argumento — generado UNA sola vez por quien llama (al
 * entrar al paso de confirmación en la UI) — esta función NUNCA genera un
 * id nuevo, así un reintento (ej. tras un error de red) reusa el mismo id.
 *
 * Dentro de una única transacción: si `devoluciones/{devolucionId}` ya
 * existe con estado "completada" y los datos esenciales coinciden, es un
 * reintento — no se reescribe nada. Si coinciden datos distintos, es un
 * conflicto de idempotencia real. Si no existe (o es un borrador previo),
 * se valida con `devolucionValida` contra el pago/resumen LEÍDOS EN VIVO, y
 * si pasa, se escriben en la MISMA transacción: la devolución, el resumen
 * actualizado, el delta en `config/finanzas` (corte de caja, indexado por
 * la fecha en que se completa, nunca por la del pago original) y un evento
 * de auditoría con id determinístico `${devolucionId}-completada`. El
 * documento del pago original NUNCA se escribe — solo se lee. */
export async function completarDevolucion(
  db: Firestore,
  clinicUid: string,
  devolucionId: string,
  input: DevolucionInput,
  registradoPorUid: string,
  patientName: string
): Promise<{ devolucion: DevolucionPago; idempotente: boolean }> {
  const fechaISO = new Date().toISOString();
  const base = `users/${clinicUid}/pacientes/${input.patientId}`;
  const pagoRef = doc(db, `${base}/pagos/${input.pagoOrigenId}`);
  const resumenRef = doc(db, `${base}/devolucionesResumen/${input.pagoOrigenId}`);
  const devolucionRef = doc(db, `${base}/devoluciones/${devolucionId}`);
  const finanzasRef = doc(db, `users/${clinicUid}/config/finanzas`);
  const logRef = doc(db, `users/${clinicUid}/devolucionesLog/${devolucionId}-completada`);

  let resultado!: { devolucion: DevolucionPago; idempotente: boolean };

  await runTransaction(db, async (tx) => {
    // TODAS las lecturas antes que cualquier escritura (regla de Firestore).
    const [pagoSnap, resumenSnap, devSnap, finanzasSnap] = await Promise.all([
      tx.get(pagoRef),
      tx.get(resumenRef),
      tx.get(devolucionRef),
      tx.get(finanzasRef),
    ]);
    if (!pagoSnap.exists()) throw new Error("El pago original ya no existe.");
    const pago = pagoSnap.data() as Pago; // leído EN VIVO — nunca se cachea
    const resumen = resumenSnap.exists() ? (resumenSnap.data() as DevolucionResumen) : null;

    if (devSnap.exists()) {
      const existente = { ...(devSnap.data() as DevolucionPago), id: devolucionId };
      if (existente.estado === "completada") {
        const coincide =
          existente.monto === input.monto &&
          existente.pagoOrigenId === input.pagoOrigenId &&
          existente.patientId === input.patientId;
        if (!coincide) {
          throw new Error("Ya existe una devolución completada con este id pero con datos distintos — no se puede continuar.");
        }
        resultado = { devolucion: existente, idempotente: true }; // reintento limpio, no reescribe nada
        return;
      }
      if (existente.estado === "cancelada") throw new Error("Esta devolución ya fue cancelada.");
    }

    const check = devolucionValida(input, pago, resumen);
    if (!check.valido) throw new Error(check.motivo);

    const devolucionFinal = construirDevolucion(input, devolucionId, fechaISO, registradoPorUid);
    const resumenFinal = aplicarDevolucionAResumen(resumen, input.pagoOrigenId, input, fechaISO);
    const finanzasActual: FinanzasConfig = finanzasSnap.exists()
      ? (finanzasSnap.data() as FinanzasConfig)
      : { porFecha: {}, porFechaYFormaPago: {} };
    const finanzasFinal = aplicarDeltaDevolucion(finanzasActual, fechaISO.slice(0, 10), input.metodo!, input.monto);
    const evento: EventoDevolucionLog = {
      id: `${devolucionId}-completada`,
      tipo: "devolucion_completada",
      patientId: input.patientId,
      patientName,
      devolucionId,
      pagoOrigenId: input.pagoOrigenId,
      monto: input.monto,
      uid: registradoPorUid,
      creadoEn: fechaISO,
    };

    tx.set(devolucionRef, devolucionFinal);
    tx.set(resumenRef, resumenFinal);
    tx.set(finanzasRef, finanzasFinal, { merge: true });
    tx.set(logRef, evento);

    resultado = { devolucion: devolucionFinal, idempotente: false };
  });

  return resultado;
}

/** Cancela un borrador (o pendiente de autorización) que NUNCA llegó a
 * completarse — no toca devolucionesResumen ni finanzas porque un borrador
 * nunca escribió ahí. No transaccional: no hay ningún invariante financiero
 * en juego. */
export async function cancelarDevolucionBorrador(
  db: Firestore,
  clinicUid: string,
  patientId: string,
  devolucionId: string,
  canceladoPorUid: string
): Promise<void> {
  const ref = doc(db, `users/${clinicUid}/pacientes/${patientId}/devoluciones/${devolucionId}`);
  await updateDoc(ref, { estado: "cancelada", canceladoEn: new Date().toISOString(), canceladoPorUid });
}

/** Anota que existió un ajuste posterior a una devolución YA completada —
 * NUNCA cambia `estado`, NUNCA resta de devolucionesResumen.totalDevuelto
 * ni de finanzas.devolucionesPorFecha. La salida de efectivo original ya
 * ocurrió y sigue siendo un hecho histórico; esto es solo trazabilidad de
 * que el caso se revisó, no una reversión. */
export async function registrarCorreccionDevolucion(
  db: Firestore,
  clinicUid: string,
  patientId: string,
  devolucionId: string,
  correccion: { motivo: string; montoRegresado?: number },
  registradaPorUid: string
): Promise<void> {
  const ref = doc(db, `users/${clinicUid}/pacientes/${patientId}/devoluciones/${devolucionId}`);
  const registradaEn = new Date().toISOString();
  const correccionData: NonNullable<DevolucionPago["correccion"]> = {
    motivo: correccion.motivo,
    registradaEn,
    registradaPorUid,
  };
  if (correccion.montoRegresado !== undefined) correccionData.montoRegresado = correccion.montoRegresado;
  await updateDoc(ref, { correccion: correccionData });
}
