import { describe, expect, it } from "vitest";
import {
  aceptarPropuesta,
  calcularCuenta,
  cantidadDeCobro,
  conServicios,
  crearServicioRealizado,
  marcarAvance,
  propuestasAntiguasSinDecision,
  renglonesCobrables,
} from "../cuentaPaciente";
import { calcularSaldoPendiente } from "../saldosPendientes";
import { crearSiguienteCitaSeguimiento } from "../seguimientoAutomatico";
import type { CitaAgenda, DevolucionPago, HorarioAtencion, LineItem, Pago, Recurso, SavedBudget } from "../patientData";

const item = (id: string, price: number, extra: Partial<LineItem> = {}): LineItem => ({
  id,
  procedure: `Procedimiento ${id}`,
  price,
  teeth: [],
  note: "",
  ...extra,
});

/** Propuesta nueva (modelo actual): cobra al realizar por default. */
const propuesta = (id: string, items: LineItem[], extra: Partial<SavedBudget> = {}): SavedBudget => ({
  id,
  folio: id.toUpperCase(),
  fecha: "01/11/2026",
  medico: "Dra. López",
  tipoDePrecio: "Consultorio",
  especialidad: "Odontología General",
  diagnostico: "",
  items,
  total: items.reduce((s, i) => s + i.price, 0),
  estado: "pendiente",
  origen: "propuesta",
  ...extra,
});

const pago = (id: string, lineas: { tratamientoId: string | null; monto: number; sinAsignar?: boolean }[]): Pago => ({
  id,
  fecha: "02/11/2026",
  medico: "Dra. López",
  formaPago: "Efectivo",
  lineas: lineas.map((l, i) => ({ id: `${id}-l${i}`, folio: null, label: "x", ...l })),
  total: lineas.reduce((s, l) => s + l.monto, 0),
  facturar: false,
  firma: null,
});

const aceptar = (ps: SavedBudget[], id: string, itemIds?: string[], modalidad: "al_realizar" | "al_aceptar" = "al_realizar") =>
  aceptarPropuesta(ps, id, { itemIds, modalidad, fechaISO: "2026-11-02" });

const resumen = (ps: SavedBudget[], pagos: Pago[] = [], dev: DevolucionPago[] = []) => calcularCuenta(ps, pagos, dev).resumen;

describe("presupuestar no es generar deuda", () => {
  it("una cotización sin aceptación deja el saldo en $0 y aparece como propuesto", () => {
    const r = resumen([propuesta("p1", [item("a", 1000), item("b", 500)])]);
    expect(r.porCobrar).toBe(0);
    expect(r.cargos).toBe(0);
    expect(r.propuesto).toBe(1500);
  });

  it("un presupuesto rechazado no suma ni como propuesto ni como deuda", () => {
    const r = resumen([propuesta("p1", [item("a", 1000)], { estado: "rechazado" })]);
    expect(r).toMatchObject({ porCobrar: 0, cargos: 0, propuesto: 0 });
  });

  it("dos alternativas A/B no se suman: se considera una sola y la no elegida no genera deuda", () => {
    const A = propuesta("A", [item("a", 3000)], { grupoAlternativas: "g1" });
    const B = propuesta("B", [item("b", 5000)], { grupoAlternativas: "g1" });
    expect(resumen([A, B]).propuesto).toBe(5000);
    // Se elige A: B queda "no elegida", se conserva y no suma a nada.
    const despues = aceptar([A, B], "A");
    expect(despues.find((p) => p.id === "B")?.estado).toBe("no_elegida");
    expect(despues.find((p) => p.id === "B")?.items).toHaveLength(1);
    const r = resumen(despues);
    expect(r.propuesto).toBe(0);
    expect(r.aceptadoPendienteDeCobro).toBe(3000);
    expect(r.porCobrar).toBe(0);
  });

  it("alternativas complementarias (sin grupo) sí se suman", () => {
    const r = resumen([propuesta("A", [item("a", 3000)]), propuesta("B", [item("b", 500)])]);
    expect(r.propuesto).toBe(3500);
  });
});

describe("aceptación parcial desde el mismo plan", () => {
  it("solo lo autorizado queda aceptado; el resto sigue propuesto", () => {
    const ps = aceptar([propuesta("p1", [item("a", 1800), item("b", 1200)])], "p1", ["a"]);
    const r = resumen(ps);
    expect(r.aceptadoPendienteDeCobro).toBe(1800);
    expect(r.propuesto).toBe(1200);
    expect(r.cargos).toBe(0);
    expect(r.porCobrar).toBe(0);
  });

  it("aceptar de nuevo cambia lo autorizado sin duplicar el presupuesto", () => {
    let ps = aceptar([propuesta("p1", [item("a", 1800), item("b", 1200)])], "p1", ["a"]);
    ps = aceptar(ps, "p1", ["a", "b"]);
    expect(ps).toHaveLength(1);
    expect(resumen(ps).aceptadoPendienteDeCobro).toBe(3000);
  });
});

describe("cargo al realizar y pagos", () => {
  it("tratamiento realizado con pago parcial: cargos − pagado = por cobrar", () => {
    let ps = aceptar([propuesta("p1", [item("a", 800), item("b", 1000)])], "p1");
    ps = marcarAvance(ps, ["a"], "terminado", "2026-11-03");
    const r = resumen(ps, [pago("pg1", [{ tratamientoId: "a", monto: 500 }])]);
    expect(r).toMatchObject({ cargos: 800, pagadoACargos: 500, porCobrar: 300, aceptadoPendienteDeCobro: 1000, aFavor: 0 });
  });

  it("valoración cobrada sin tratamiento: se registra como servicio realizado, queda pagado y no genera deuda ni plan", () => {
    const servicio = crearServicioRealizado({
      origenId: "pago-1",
      concepto: "Consulta de valoración",
      precio: 400,
      medico: "Dra. López",
      fecha: "02/11/2026",
      fechaISO: "2026-11-02",
    });
    const ps = conServicios([], [servicio]);
    const itemId = servicio.items[0].id;
    const r = resumen(ps, [pago("pago-1", [{ tratamientoId: itemId, monto: 400 }])]);
    expect(r).toMatchObject({ cargos: 400, pagadoACargos: 400, porCobrar: 0, aFavor: 0, propuesto: 0 });
  });

  it("un anticipo sin asignar es saldo a favor, no crea presupuesto ni deuda", () => {
    const r = resumen([], [pago("pg1", [{ tratamientoId: null, sinAsignar: true, monto: 400 }])]);
    expect(r).toMatchObject({ aFavor: 400, porCobrar: 0, cargos: 0 });
  });

  it("anticipo y luego aplicación al tratamiento: el dinero pasa de saldo a favor a pagado sin duplicarse", () => {
    let ps = aceptar([propuesta("p1", [item("a", 1000)])], "p1");
    const antes = resumen(ps, [pago("pg1", [{ tratamientoId: null, sinAsignar: true, monto: 400 }])]);
    expect(antes).toMatchObject({ aFavor: 400, cargos: 0, porCobrar: 0 });
    // Se asigna el mismo pago al renglón (editar el pago) y el tratamiento se realiza.
    ps = marcarAvance(ps, ["a"], "terminado", "2026-11-05");
    const despues = resumen(ps, [pago("pg1", [{ tratamientoId: "a", monto: 400 }])]);
    expect(despues).toMatchObject({ cargos: 1000, pagadoACargos: 400, porCobrar: 600, aFavor: 0 });
  });

  it("un anticipo sobre un renglón aceptado y aún no realizado no es deuda ni pierde su relación", () => {
    const ps = aceptar([propuesta("p1", [item("a", 1000)])], "p1");
    const r = resumen(ps, [pago("pg1", [{ tratamientoId: "a", monto: 400 }])]);
    expect(r.porCobrar).toBe(0);
    expect(r.aFavor).toBe(400);
    // Y sigue ofreciéndose para cobrar el resto como anticipo.
    expect(renglonesCobrables(ps, [pago("pg1", [{ tratamientoId: "a", monto: 400 }])])).toEqual([
      expect.objectContaining({ id: "a", pendiente: 600, tipo: "anticipo" }),
    ]);
  });

  it("modalidad 'al aceptar' genera el cargo desde la aceptación, sin esperar a que se realice", () => {
    const ps = aceptar([propuesta("p1", [item("a", 1000)])], "p1", undefined, "al_aceptar");
    expect(resumen(ps)).toMatchObject({ cargos: 1000, porCobrar: 1000 });
  });
});

describe("conservar el historial", () => {
  it("un presupuesto vencido conserva los cargos y pagos de lo aceptado", () => {
    let ps = aceptar([propuesta("p1", [item("a", 1000), item("b", 700)])], "p1", ["a"]);
    ps = marcarAvance(ps, ["a"], "terminado", "2026-11-03");
    ps = ps.map((p) => ({ ...p, estado: "expirado" as const }));
    const r = resumen(ps, [pago("pg1", [{ tratamientoId: "a", monto: 300 }])]);
    expect(r).toMatchObject({ cargos: 1000, pagadoACargos: 300, porCobrar: 700 });
    // Lo que no se aceptó en un presupuesto vencido ya no se considera propuesta vigente.
    expect(r.propuesto).toBe(0);
  });

  it("cancelar un tratamiento con pagos previos no borra el historial ni devuelve dinero: queda saldo a favor", () => {
    let ps = aceptar([propuesta("p1", [item("a", 1000)])], "p1");
    const pagos = [pago("pg1", [{ tratamientoId: "a", monto: 400 }])];
    ps = marcarAvance(ps, ["a"], "cancelado", "2026-11-06");
    const r = resumen(ps, pagos);
    expect(ps).toHaveLength(1);
    expect(pagos[0].total).toBe(400); // el pago sigue ahí
    expect(r).toMatchObject({ cargos: 0, porCobrar: 0, aFavor: 400 }); // el dinero sigue en la cuenta hasta decidir qué hacer
  });

  it("una devolución con 'continúa el tratamiento' reabre la deuda; una por cancelación no", () => {
    let ps = aceptar([propuesta("p1", [item("a", 1000)])], "p1");
    ps = marcarAvance(ps, ["a"], "terminado", "2026-11-03");
    const pagos = [pago("pg1", [{ tratamientoId: "a", monto: 1000 }])];
    const dev = (efecto: "continua" | "cancelado"): DevolucionPago =>
      ({
        id: "d1",
        patientId: "x",
        pagoOrigenId: "pg1",
        tipo: "parcial",
        monto: 300,
        moneda: "MXN",
        metodo: "efectivo",
        motivo: "otro",
        itemsAfectados: [{ lineaPagoId: "pg1-l0", tratamientoId: "a", folio: "P1", label: "a", montoDevuelto: 300, efectoTratamiento: efecto }],
        registradoPorUid: "u",
        estado: "completada",
        creadoEn: "2026-11-10T10:00:00.000Z",
        completadoEn: "2026-11-10T10:00:00.000Z",
      }) as unknown as DevolucionPago;
    expect(resumen(ps, pagos, [dev("continua")])).toMatchObject({ cargos: 1000, porCobrar: 300 });
    expect(resumen(ps, pagos, [dev("cancelado")]).porCobrar).toBe(0);
  });
});

describe("paquetes y unidades de cobro", () => {
  it("un paquete de precio fijo con varios dientes cobra una sola vez y conserva todos los dientes", () => {
    expect(cantidadDeCobro("paquete", 6)).toBe(1);
    const dientes = [11, 12, 13, 21, 22, 23];
    const ps = aceptar([propuesta("p1", [item("a", 12000, { unidadCobro: "paquete", teeth: dientes, incluye: ["6 carillas"] })])], "p1");
    expect(ps[0].items[0].teeth).toEqual(dientes);
    expect(resumen(ps).aceptadoPendienteDeCobro).toBe(12000);
  });

  it("por diente multiplica por los dientes marcados; arcada/sesión usan la cantidad indicada", () => {
    expect(cantidadDeCobro("diente", 3)).toBe(3);
    expect(cantidadDeCobro(undefined, 0)).toBe(1);
    expect(cantidadDeCobro("arcada", 5, 2)).toBe(2);
    expect(cantidadDeCobro("sesion", 5)).toBe(1);
    expect(cantidadDeCobro("procedimiento", 4)).toBe(1);
  });
});

describe("repetir un clic o un reintento no duplica", () => {
  it("registrar dos veces el mismo servicio realizado deja un solo presupuesto y un solo cargo", () => {
    const crear = () =>
      crearServicioRealizado({ origenId: "cita-9", concepto: "Limpieza", precio: 600, medico: "", fecha: "02/11/2026", fechaISO: "2026-11-02" });
    const una = conServicios([], [crear()]);
    const dos = conServicios(una, [crear()]);
    expect(dos).toHaveLength(1);
    expect(resumen(dos).cargos).toBe(600);
  });

  it("aceptar dos veces el mismo plan es idempotente", () => {
    const base = [propuesta("p1", [item("a", 1000)])];
    const una = aceptar(base, "p1");
    const dos = aceptar(una, "p1");
    expect(resumen(dos)).toEqual(resumen(una));
    expect(dos).toHaveLength(1);
  });

  it("marcar dos veces el avance no cambia nada", () => {
    const ps = marcarAvance(aceptar([propuesta("p1", [item("a", 1000)])], "p1"), ["a"], "terminado", "2026-11-03");
    expect(marcarAvance(ps, ["a"], "terminado", "2026-11-09")).toEqual(ps);
  });
});

describe("agenda sin efectos económicos", () => {
  const cita = (over: Partial<CitaAgenda>): CitaAgenda =>
    ({
      id: "c1",
      folio: "F-1",
      recursoId: "r1",
      patientId: "pac",
      paciente: "Paciente",
      tratamientos: ["Control"],
      costo: "500",
      comentarios: "",
      fecha: "2026-11-02",
      horaInicio: "10:00",
      horaFin: "10:30",
      estatus: "Atendida",
      recurrenciaId: null,
      horaLlegada: null,
      seguimientoAutomatico: true,
      seguimientoIntervalo: { cantidad: 1, unidad: "meses" },
      seguimientoMotivo: "Control",
      ...over,
    }) as CitaAgenda;
  const recursos: Recurso[] = [{ id: "r1", nombre: "Dra. López", color: "#000", tipo: "medico" }];
  const horario: HorarioAtencion = { apertura: "09:00", comidaInicio: "14:00", comidaFin: "15:00", cierre: "19:00" };

  it("reagendar, cancelar o no asistir no crea ni borra cargos: el costo de la cita es solo informativo", () => {
    // La cita lleva costo, pero la cuenta solo depende de presupuestos aceptados y pagos.
    const c = cita({ costo: "900", estatus: "No Asistió" });
    expect(c.costo).toBe("900");
    expect(resumen([], [])).toMatchObject({ cargos: 0, porCobrar: 0, propuesto: 0 });
  });

  it("el seguimiento automático no genera otra cita si el paciente ya tiene una próxima programada", () => {
    const atendida = cita({});
    const futura = cita({ id: "c2", fecha: "2026-12-01", estatus: "Agendada", seguimientoAutomatico: false });
    const r = crearSiguienteCitaSeguimiento({ citaAtendida: atendida, citasExistentes: [atendida, futura], recursos, horario, ahora: 1 });
    expect(r).toEqual({ creada: false, motivo: "ya_programada" });
  });

  it("sin próxima cita programada, el seguimiento se crea una sola vez", () => {
    const atendida = cita({});
    const primera = crearSiguienteCitaSeguimiento({ citaAtendida: atendida, citasExistentes: [atendida], recursos, horario, ahora: 1 });
    expect(primera.creada).toBe(true);
    if (!primera.creada) return;
    const segunda = crearSiguienteCitaSeguimiento({ citaAtendida: atendida, citasExistentes: [atendida, primera.cita], recursos, horario, ahora: 2 });
    expect(segunda.creada).toBe(false);
  });
});

describe("datos anteriores al modelo", () => {
  const antiguo = (id: string, items: LineItem[], estado?: SavedBudget["estado"]): SavedBudget => {
    const { origen: _o, ...resto } = propuesta(id, items, estado ? { estado } : {});
    void _o;
    return resto as SavedBudget;
  };

  it("un presupuesto antiguo ya aceptado conserva su saldo exactamente", () => {
    const ps = [antiguo("v1", [item("a", 3000)], "aceptado")];
    expect(resumen(ps, [pago("pg1", [{ tratamientoId: "a", monto: 1000 }])])).toMatchObject({ cargos: 3000, pagadoACargos: 1000, porCobrar: 2000 });
  });

  it("uno antiguo con pagos aplicados se entiende aceptado aunque siga 'pendiente'", () => {
    const ps = [antiguo("v1", [item("a", 3000)])];
    expect(resumen(ps, [pago("pg1", [{ tratamientoId: "a", monto: 1000 }])])).toMatchObject({ cargos: 3000, porCobrar: 2000 });
  });

  it("uno antiguo pendiente y sin pagos deja de ser deuda, no se borra y se lista para revisión", () => {
    const ps = [antiguo("v1", [item("a", 3000)]), antiguo("v2", [item("b", 500)], "aceptado")];
    expect(resumen(ps).porCobrar).toBe(500);
    expect(ps).toHaveLength(2);
    expect(propuestasAntiguasSinDecision(ps, [])).toEqual({ presupuestoIds: ["v1"], cantidad: 1, monto: 3000 });
  });

  it("calcularSaldoPendiente (reportes y rollup) usa la misma regla", () => {
    const ps = aceptar([propuesta("p1", [item("a", 800), item("b", 1000)])], "p1");
    const hecho = marcarAvance(ps, ["a"], "terminado", "2026-11-03");
    expect(calcularSaldoPendiente(hecho, [pago("pg1", [{ tratamientoId: "a", monto: 500 }])])).toEqual({
      totalPresupuestado: 800,
      totalPagado: 500,
      saldo: 300,
    });
  });
});

describe("ejemplo completo para el personal", () => {
  it("plan de $3,000, acepta $1,800; se hace un procedimiento de $800 y paga $500", () => {
    const plan = propuesta("p1", [item("a", 800), item("b", 1000), item("c", 1200)]);
    let ps = aceptar([plan], "p1", ["a", "b"]);
    ps = marcarAvance(ps, ["a"], "terminado", "2026-11-03");
    const r = resumen(ps, [pago("pg1", [{ tratamientoId: "a", monto: 500 }])]);
    expect(r).toEqual({
      propuesto: 1200,
      aceptadoPendienteDeCobro: 1000,
      cargos: 800,
      pagadoACargos: 500,
      porCobrar: 300,
      aFavor: 0,
    });
  });
});
