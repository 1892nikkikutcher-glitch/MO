/** La cuenta de un paciente: qué se le propuso, qué aceptó, qué ya se le debe cobrar y qué ha pagado.
 *
 * Una sola fuente de verdad para todos los saldos de MO (expediente, pagos, recibos, reportes, rollup).
 * Antes cada presupuesto guardado sumaba al saldo, aunque fuera una cotización que nadie aceptó o la
 * opción B de una comparativa. Aquí se separan tres cosas que son distintas:
 *
 *  - DECISIÓN del paciente por renglón: pendiente, aceptado, rechazado o alternativa no elegida.
 *  - AVANCE clínico por renglón: por iniciar, en curso, terminado o cancelado.
 *  - SITUACIÓN de pago: se calcula, nunca se captura (cargos menos pagos aplicados y ajustes).
 *
 * Cotizar no genera deuda. Un renglón se vuelve CARGO cuando fue aceptado y, según la modalidad de cobro
 * de la aceptación, ya se realizó ("al_realizar", lo normal) o desde que se aceptó ("al_aceptar").
 *
 * Funciones puras y sin efectos: no tocan Firestore. Compatibilidad con lo guardado antes de este modelo:
 *  - Un presupuesto sin `origen` es de los de antes: si está en estado "aceptado", o ya tiene pagos aplicados,
 *    se entiende aceptado por completo y cobrable desde ya (así su saldo no cambia).
 *  - Uno de esos que sigue "pendiente" y sin pagos es una propuesta: deja de contar como deuda. No se borra
 *    ni se modifica; `propuestasAntiguasSinDecision` lista cuáles son para que alguien las revise. */

import { montoMayorQue, redondearDinero } from "./dinero";
import type {
  AvanceClinico,
  DevolucionPago,
  LineItem,
  ModalidadCobro,
  Pago,
  SavedBudget,
  UnidadCobro,
} from "./patientData";

export type DecisionRenglon = "pendiente" | "aceptado" | "rechazado" | "no_elegida";

export type RenglonCuenta = {
  presupuestoId: string;
  folio: string;
  item: LineItem;
  /** Lo que se muestra en recibos y listas (la nota o, si no hay, el procedimiento). */
  label: string;
  /** Precio vigente del renglón en el presupuesto emitido. */
  price: number;
  decision: DecisionRenglon;
  avance: AvanceClinico;
  modalidad: ModalidadCobro;
  /** Cargo ya generado (neto de ajustes por devolución). 0 mientras no corresponda cobrarlo. */
  cargo: number;
  /** Pagado a este renglón (neto de devoluciones). */
  pagado: number;
  /** Cargo que todavía no se ha pagado. */
  porCobrar: number;
  /** Pagado de más o por adelantado: dinero recibido que ya espera su aplicación. */
  aFavor: number;
  /** Aceptado, todavía sin cargo (por ejemplo, aún no se realiza). */
  aceptadoSinCargo: number;
  /** Aún en consideración del paciente. */
  propuesto: number;
};

export type ResumenCuenta = {
  /** Lo que aún se está considerando (alternativas excluyentes cuentan una sola vez, la de mayor monto). */
  propuesto: number;
  /** Importe autorizado por el paciente que todavía no se ha convertido en cargos. */
  aceptadoPendienteDeCobro: number;
  /** Cargos generados (netos de ajustes). */
  cargos: number;
  /** Lo pagado que cubre cargos. */
  pagadoACargos: number;
  /** Saldo por cobrar: cargos menos pagos aplicados y ajustes. */
  porCobrar: number;
  /** Saldo a favor: dinero recibido disponible para aplicar (anticipos y pagos sin asignar). */
  aFavor: number;
};

const estaRealizado = (avance: AvanceClinico) => avance === "terminado";

/** Modalidad de cobro con la que se entiende un presupuesto. */
export function modalidadDe(p: SavedBudget): ModalidadCobro {
  if (p.aceptacion) return p.aceptacion.modalidad;
  // Un servicio registrado al cobrar, o un presupuesto de antes de este modelo, se cobra completo desde el inicio.
  return p.origen === "propuesta" ? "al_realizar" : "al_aceptar";
}

type Movimientos = {
  pagadoPorRenglon: Map<string, number>;
  devueltoContinua: Map<string, number>;
  devueltoCierra: Map<string, number>;
  devueltoOtro: Map<string, number>;
  /** Dinero recibido sin asignar a ningún tratamiento (saldo a favor). */
  sinAsignar: number;
};

const sumar = (m: Map<string, number>, id: string, monto: number) => m.set(id, (m.get(id) ?? 0) + monto);

function movimientosDe(pagos: Pago[], devoluciones: DevolucionPago[]): Movimientos {
  const pagadoPorRenglon = new Map<string, number>();
  const devueltoContinua = new Map<string, number>();
  const devueltoCierra = new Map<string, number>();
  const devueltoOtro = new Map<string, number>();
  let sinAsignar = 0;
  pagos.forEach((pago) =>
    pago.lineas.forEach((l) => {
      if (l.tratamientoId) sumar(pagadoPorRenglon, l.tratamientoId, l.monto);
      else if (l.sinAsignar && l.monto > 0) sinAsignar += l.monto;
    })
  );
  let devueltoSinAsignar = 0;
  devoluciones
    .filter((d) => d.estado === "completada")
    .forEach((d) => {
      devueltoSinAsignar += d.montoNoAsignadoTratamientos ?? 0;
      (d.itemsAfectados ?? []).forEach((i) => {
        if (!i.tratamientoId) return;
        if (i.efectoTratamiento === "continua") sumar(devueltoContinua, i.tratamientoId, i.montoDevuelto);
        else {
          sumar(devueltoOtro, i.tratamientoId, i.montoDevuelto);
          // Un reembolso porque el tratamiento se canceló o se refirió cierra ese renglón, aunque nadie lo marcara.
          if (i.efectoTratamiento === "cancelado" || i.efectoTratamiento === "referido") {
            sumar(devueltoCierra, i.tratamientoId, i.montoDevuelto);
          }
        }
      });
    });
  return {
    pagadoPorRenglon,
    devueltoContinua,
    devueltoCierra,
    devueltoOtro,
    sinAsignar: Math.max(0, redondearDinero(sinAsignar - devueltoSinAsignar)),
  };
}

/** Decisión del paciente sobre un renglón. Un pago aplicado a un renglón lo da por aceptado: así nunca se
 * pierde la relación entre el dinero recibido y el trabajo, aunque la propuesta siga marcada pendiente. */
export function decisionDeRenglon(p: SavedBudget, item: LineItem, tienePagos: boolean): DecisionRenglon {
  if (p.origen === "servicio") return "aceptado";
  if (p.aceptacion) {
    if (p.aceptacion.itemIds.includes(item.id)) return "aceptado";
  } else if (p.estado === "aceptado") {
    return "aceptado";
  }
  if (tienePagos) return "aceptado";
  if (p.estado === "no_elegida") return "no_elegida";
  if (p.estado === "rechazado") return "rechazado";
  return "pendiente";
}

export function calcularRenglones(presupuestos: SavedBudget[], pagos: Pago[], devoluciones: DevolucionPago[] = []): RenglonCuenta[] {
  const mov = movimientosDe(pagos, devoluciones);
  return presupuestos.flatMap((p) =>
    p.items.map((item) => {
      const pagadoBruto = mov.pagadoPorRenglon.get(item.id) ?? 0;
      const decision = decisionDeRenglon(p, item, pagadoBruto > 0);
      const modalidad = modalidadDe(p);
      const cierraPorDevolucion = item.avance === undefined && (mov.devueltoCierra.get(item.id) ?? 0) > 0;
      const avance: AvanceClinico = cierraPorDevolucion ? "cancelado" : (item.avance ?? "por_iniciar");
      const aceptado = decision === "aceptado";
      const activo = aceptado && avance !== "cancelado";
      const hayCargo = activo && (modalidad === "al_aceptar" || estaRealizado(avance));

      const devueltoOtro = mov.devueltoOtro.get(item.id) ?? 0;
      const devueltoContinua = mov.devueltoContinua.get(item.id) ?? 0;
      const cargo = hayCargo ? Math.max(0, redondearDinero(item.price - devueltoOtro)) : 0;
      const pagado = redondearDinero(pagadoBruto - devueltoOtro - devueltoContinua);
      const porCobrar = Math.max(0, redondearDinero(cargo - pagado));
      const aFavor = Math.max(0, redondearDinero(pagado - cargo));
      return {
        presupuestoId: p.id,
        folio: p.folio,
        item,
        label: item.note || item.procedure,
        price: item.price,
        decision,
        avance,
        modalidad,
        cargo,
        pagado,
        porCobrar,
        aFavor,
        aceptadoSinCargo: activo && !hayCargo ? item.price : 0,
        propuesto: decision === "pendiente" && p.estado !== "expirado" ? item.price : 0,
      };
    })
  );
}

export type CuentaPaciente = { renglones: RenglonCuenta[]; resumen: ResumenCuenta };

export function calcularCuenta(presupuestos: SavedBudget[], pagos: Pago[], devoluciones: DevolucionPago[] = []): CuentaPaciente {
  const renglones = calcularRenglones(presupuestos, pagos, devoluciones);
  const mov = movimientosDe(pagos, devoluciones);
  const suma = (f: (r: RenglonCuenta) => number) => redondearDinero(renglones.reduce((s, r) => s + f(r), 0));

  // Alternativas excluyentes (opción A / opción B): se considera una sola, la de mayor monto, no la suma.
  const propuestoPorGrupo = new Map<string, number>();
  let propuestoSuelto = 0;
  presupuestos.forEach((p) => {
    const monto = redondearDinero(
      renglones.filter((r) => r.presupuestoId === p.id).reduce((s, r) => s + r.propuesto, 0)
    );
    if (monto <= 0) return;
    if (p.grupoAlternativas) {
      propuestoPorGrupo.set(p.grupoAlternativas, Math.max(propuestoPorGrupo.get(p.grupoAlternativas) ?? 0, monto));
    } else {
      propuestoSuelto += monto;
    }
  });
  const propuesto = redondearDinero(propuestoSuelto + [...propuestoPorGrupo.values()].reduce((s, v) => s + v, 0));

  const cargos = suma((r) => r.cargo);
  const porCobrar = suma((r) => r.porCobrar);
  return {
    renglones,
    resumen: {
      propuesto,
      aceptadoPendienteDeCobro: suma((r) => r.aceptadoSinCargo),
      cargos,
      pagadoACargos: redondearDinero(cargos - porCobrar),
      porCobrar,
      aFavor: redondearDinero(suma((r) => r.aFavor) + mov.sinAsignar),
    },
  };
}

/** Un renglón que se puede cobrar desde la ventana de pago. */
export type RenglonCobrable = {
  id: string;
  presupuestoId: string;
  folio: string;
  label: string;
  price: number;
  /** Lo que aún se puede pagar a este renglón. */
  pendiente: number;
  /** "cargo": ya se realizó (o se cobra desde que se aceptó) y se debe. "anticipo": aceptado y aún no realizado. */
  tipo: "cargo" | "anticipo";
};

/** Qué se puede cobrar a un paciente: primero lo que ya se debe; después lo aceptado todavía sin realizar,
 * que se puede dejar como anticipo (o marcar como realizado al cobrarlo). Lo que solo está propuesto,
 * rechazado o no elegido no se cobra. */
export function renglonesCobrables(presupuestos: SavedBudget[], pagos: Pago[], devoluciones: DevolucionPago[] = []): RenglonCobrable[] {
  const salida: RenglonCobrable[] = [];
  calcularRenglones(presupuestos, pagos, devoluciones).forEach((r) => {
    if (montoMayorQue(r.porCobrar, 0)) {
      salida.push({ id: r.item.id, presupuestoId: r.presupuestoId, folio: r.folio, label: r.label, price: r.price, pendiente: r.porCobrar, tipo: "cargo" });
      return;
    }
    if (r.aceptadoSinCargo > 0) {
      const resta = redondearDinero(r.price - r.pagado);
      if (montoMayorQue(resta, 0)) {
        salida.push({ id: r.item.id, presupuestoId: r.presupuestoId, folio: r.folio, label: r.label, price: r.price, pendiente: resta, tipo: "anticipo" });
      }
    }
  });
  return salida;
}

// ---------- Cambios que se aplican a los presupuestos (puros: devuelven una copia) ----------

/** Registra lo que el paciente aceptó. Las alternativas del mismo grupo que siguen sin decisión quedan como
 * "no elegida" (se conservan, y no suman al saldo). Aceptar de nuevo cambia lo autorizado; no duplica. */
export function aceptarPropuesta(
  presupuestos: SavedBudget[],
  presupuestoId: string,
  opciones: { itemIds?: string[]; modalidad: ModalidadCobro; fechaISO: string; porEmail?: string; ahoraISO?: string }
): SavedBudget[] {
  const objetivo = presupuestos.find((p) => p.id === presupuestoId);
  if (!objetivo) return presupuestos;
  const validos = new Set(objetivo.items.map((i) => i.id));
  const itemIds = (opciones.itemIds ?? objetivo.items.map((i) => i.id)).filter((id) => validos.has(id));
  if (itemIds.length === 0) return presupuestos;
  return presupuestos.map((p) => {
    if (p.id === presupuestoId) {
      return {
        ...p,
        estado: "aceptado" as const,
        aceptacion: {
          fecha: opciones.fechaISO,
          itemIds,
          modalidad: opciones.modalidad,
          ...(opciones.porEmail ? { registradaPorEmail: opciones.porEmail } : {}),
          ...(opciones.ahoraISO ? { registradaEl: opciones.ahoraISO } : {}),
        },
      };
    }
    if (objetivo.grupoAlternativas && p.grupoAlternativas === objetivo.grupoAlternativas && (p.estado ?? "pendiente") === "pendiente") {
      return { ...p, estado: "no_elegida" as const };
    }
    return p;
  });
}

/** Cambia el avance clínico de renglones. Marcar la cita como atendida NO pasa por aquí: cada procedimiento
 * se da por realizado de forma explícita. */
export function marcarAvance(presupuestos: SavedBudget[], itemIds: string[], avance: AvanceClinico, fechaISO: string): SavedBudget[] {
  if (itemIds.length === 0) return presupuestos;
  const ids = new Set(itemIds);
  return presupuestos.map((p) =>
    p.items.some((i) => ids.has(i.id))
      ? { ...p, items: p.items.map((i) => (ids.has(i.id) && i.avance !== avance ? { ...i, avance, avanceEl: fechaISO } : i)) }
      : p
  );
}

export const idServicio = (origenId: string) => `serv-${origenId}`;
export const idRenglonServicio = (servicioId: string) => `item-${servicioId}`;

/** Un servicio ya realizado, registrado de forma explícita al cobrarlo (consulta, procedimiento que no estaba
 * presupuestado). Es un cargo desde el primer momento y queda realizado. El id sale del origen (la cita o el
 * pago), así que reintentar el guardado no lo duplica. */
export function crearServicioRealizado(datos: {
  origenId: string;
  concepto: string;
  precio: number;
  medico: string;
  fecha: string; // formato del presupuesto (DD/MM/AAAA)
  fechaISO: string;
  porEmail?: string;
}): SavedBudget {
  const id = idServicio(datos.origenId);
  const itemId = idRenglonServicio(id);
  return {
    id,
    folio: datos.origenId.slice(-6),
    fecha: datos.fecha,
    medico: datos.medico,
    tipoDePrecio: "Consultorio",
    especialidad: "Odontología General",
    diagnostico: "Servicio realizado, registrado al cobrar.",
    items: [{ id: itemId, procedure: datos.concepto, price: datos.precio, teeth: [], note: "", avance: "terminado", avanceEl: datos.fechaISO }],
    total: datos.precio,
    estado: "aceptado",
    origen: "servicio",
    aceptacion: { fecha: datos.fechaISO, itemIds: [itemId], modalidad: "al_aceptar", ...(datos.porEmail ? { registradaPorEmail: datos.porEmail } : {}) },
  };
}

/** Agrega los servicios que falten (por id): reintentar o volver a pulsar no duplica nada. */
export function conServicios(presupuestos: SavedBudget[], servicios: SavedBudget[]): SavedBudget[] {
  const existentes = new Set(presupuestos.map((p) => p.id));
  const nuevos = servicios.filter((s) => !existentes.has(s.id));
  return nuevos.length === 0 ? presupuestos : [...nuevos, ...presupuestos];
}

// ---------- Precios por unidad ----------

/** Cantidad a cobrar de un renglón según su unidad. Solo "diente" depende de los dientes marcados; "paquete" y
 * "procedimiento" son un precio fijo (los dientes quedan como información clínica); el resto usa la cantidad que
 * se indique (arcadas, superficies, sesiones). */
export function cantidadDeCobro(unidad: UnidadCobro | undefined, dientesMarcados: number, cantidadManual?: number): number {
  switch (unidad ?? "diente") {
    case "diente":
      return Math.max(dientesMarcados, 1);
    case "paquete":
    case "procedimiento":
      return 1;
    default:
      return Math.max(1, Math.floor(cantidadManual && cantidadManual > 0 ? cantidadManual : 1));
  }
}

// ---------- Datos de antes del modelo ----------

export type PropuestasAntiguas = { presupuestoIds: string[]; cantidad: number; monto: number };

/** Presupuestos anteriores a este modelo que antes sumaban al saldo y ahora no: siguen "pendientes", sin pagos y
 * sin marca de aceptado. No se borran ni se convierten en deuda: solo se listan para que alguien confirme si el
 * paciente los aceptó (y entonces los marque) o si fueron cotizaciones. */
export function propuestasAntiguasSinDecision(presupuestos: SavedBudget[], pagos: Pago[]): PropuestasAntiguas {
  const conPagos = new Set(pagos.flatMap((p) => p.lineas.filter((l) => l.tratamientoId && l.monto > 0).map((l) => l.tratamientoId as string)));
  const ids: string[] = [];
  let monto = 0;
  presupuestos.forEach((p) => {
    if (p.origen || p.aceptacion) return;
    const e = p.estado ?? "pendiente";
    if (e === "aceptado" || e === "rechazado" || e === "no_elegida") return;
    const sinPagos = p.items.filter((i) => !conPagos.has(i.id));
    if (sinPagos.length === 0) return;
    ids.push(p.id);
    monto += sinPagos.reduce((s, i) => s + i.price, 0);
  });
  return { presupuestoIds: ids, cantidad: ids.length, monto: redondearDinero(monto) };
}
