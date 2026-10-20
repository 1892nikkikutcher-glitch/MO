import { describe, expect, it } from "vitest";
import { calcularIndicadores, diasDelMes, mesDesplazado, type EntradaIndicadores } from "../indicadoresNegocio";
import type { Gasto } from "../gastos";

const gasto = (categoria: Gasto["categoria"], monto: number, fecha: string): Gasto => ({ id: `${categoria}${fecha}${monto}`, concepto: "x", categoria, monto, fecha });

// Octubre 2026 tiene 31 días; el 1 es jueves. Hoy = 20 (mes en curso).
const base = (extra: Partial<EntradaIndicadores> = {}): EntradaIndicadores => ({
  mes: "2026-10-15",
  hoyISO: "2026-10-20",
  finanzas: {
    porFecha: { "2026-10-05": 20000, "2026-10-12": 30000, "2026-09-10": 40000, "2026-11-02": 99999 },
    devolucionesPorFecha: { "2026-10-12": 2000, "2026-09-10": 5000 },
    pagosCountPorFecha: { "2026-10-05": 8, "2026-10-12": 12, "2026-09-10": 99 },
    porFechaYMedico: { "2026-10-05": { "Dra. Ana": 14000, "Dr. Luis": 6000 }, "2026-10-12": { "Dra. Ana": 20000, "Dr. Luis": 10000 } },
  },
  gastos: [
    gasto("Renta", 8000, "2026-10-01"),
    gasto("Nómina", 12000, "2026-10-15"),
    gasto("Insumos", 6000, "2026-10-08"),
    gasto("Laboratorio", 4000, "2026-10-09"),
    gasto("Renta", 8000, "2026-09-01"), // otro mes
  ],
  clasificacionPorCategoria: { Renta: "fijo", Nómina: "fijo", Insumos: "variable", Laboratorio: "variable" },
  citas: [],
  recursos: [],
  sedes: [],
  pacientes: [],
  saldos: [],
  metaMensual: 60000,
  ...extra,
});

describe("fechas del mes", () => {
  it("da los días del mes y desplaza meses", () => {
    expect(diasDelMes("2026-10-15")).toMatchObject({ primero: "2026-10-01", ultimo: "2026-10-31" });
    expect(diasDelMes("2026-02-10").dias).toHaveLength(28);
    expect(diasDelMes("2028-02-10").dias).toHaveLength(29);
    expect(mesDesplazado("2026-10-15", -1)).toBe("2026-09-01");
    expect(mesDesplazado("2026-01-15", -1)).toBe("2025-12-01");
    expect(mesDesplazado("2026-12-15", 1)).toBe("2027-01-01");
  });
});

describe("indicadores de finanzas", () => {
  const r = calcularIndicadores(base()).finanzas;

  it("ingresos netos del mes, sin mezclar otros meses", () => {
    expect(r.ingresosBrutos).toBe(50000);
    expect(r.devoluciones).toBe(2000);
    expect(r.ingresosNetos).toBe(48000);
  });

  it("compara contra el mes anterior", () => {
    expect(r.ingresosNetosMesAnterior).toBe(35000);
    expect(r.variacionIngresos).toBeCloseTo(13000 / 35000, 5);
    expect(calcularIndicadores(base({ mes: "2026-09-10", hoyISO: "2026-10-20" })).finanzas.variacionIngresos).toBeNull(); // agosto sin ingresos
  });

  it("proyecta el cierre solo si el mes está en curso", () => {
    expect(r.proyeccionCierre).toBeCloseTo((48000 / 20) * 31, 0);
    expect(calcularIndicadores(base({ mes: "2026-09-10" })).finanzas.proyeccionCierre).toBeNull();
  });

  it("suma gastos del mes y los separa en fijos y variables", () => {
    expect(r.gastos).toBe(30000);
    expect(r.gastosFijos).toBe(20000);
    expect(r.gastosVariables).toBe(10000);
    expect(r.gastosPorCategoria[0]).toMatchObject({ categoria: "Nómina", monto: 12000, clasificacion: "fijo" }); // de mayor a menor
    expect(r.gastosPorCategoria.find((g) => g.categoria === "Renta")).toMatchObject({ monto: 8000, clasificacion: "fijo" });
    expect(r.gastosPorCategoria.find((g) => g.categoria === "Nómina")?.porcentajeDeIngresos).toBeCloseTo(12000 / 48000, 5);
  });

  it("utilidad y margen", () => {
    expect(r.utilidad).toBe(18000);
    expect(r.margen).toBeCloseTo(18000 / 48000, 5);
  });

  it("punto de equilibrio: fijos entre (1 − peso del gasto variable)", () => {
    // Variables 10,000 / 48,000 = 20.83% → fijos 20,000 / 0.7917 ≈ 25,263.16
    expect(r.puntoEquilibrio?.ingresoNecesario).toBeCloseTo(25263.16, 1);
    expect(r.puntoEquilibrio?.superado).toBe(true);
    expect(r.puntoEquilibrio?.faltan).toBe(0);
  });

  it("si todavía no llega al equilibrio, dice cuánto falta", () => {
    const flojo = calcularIndicadores(base({ finanzas: { ...base().finanzas, porFecha: { "2026-10-05": 15000 }, devolucionesPorFecha: {} } })).finanzas;
    // Variables 10,000 / 15,000 = 66.7% → fijos 20,000 / 0.3333 = 60,000
    expect(flojo.puntoEquilibrio?.ingresoNecesario).toBe(60000);
    expect(flojo.puntoEquilibrio?.superado).toBe(false);
    expect(flojo.puntoEquilibrio?.faltan).toBe(45000);
  });

  it("sin ingresos no hay margen ni equilibrio que calcular", () => {
    const vacio = calcularIndicadores(base({ finanzas: { porFecha: {} } })).finanzas;
    expect(vacio.margen).toBeNull();
    expect(vacio.puntoEquilibrio).toBeNull();
    expect(vacio.ticketPromedio).toBeNull();
    expect(vacio.utilidad).toBe(-30000);
  });

  it("si el gasto variable se come todo el ingreso, no hay equilibrio posible", () => {
    const malo = calcularIndicadores(base({ finanzas: { porFecha: { "2026-10-05": 9000 } } })).finanzas;
    expect(malo.puntoEquilibrio).toBeNull();
  });

  it("ticket promedio con los pagos del mes", () => {
    expect(r.pagos).toBe(20);
    expect(r.ticketPromedio).toBe(2500);
  });

  it("cuentas por cobrar: solo a quien todavía debe", () => {
    const c = calcularIndicadores(
      base({ saldos: [{ totalPresupuestado: 5000, totalPagado: 2000 }, { totalPresupuestado: 1000, totalPagado: 1000 }, { totalPresupuestado: 800, totalPagado: 900 }] })
    ).finanzas.cuentasPorCobrar;
    expect(c).toEqual({ total: 3000, pacientes: 1 });
  });

  it("cumplimiento de la meta y concentración por médico", () => {
    expect(r.cumplimientoMeta).toBeCloseTo(48000 / 60000, 5);
    expect(calcularIndicadores(base({ metaMensual: 0 })).finanzas.cumplimientoMeta).toBeNull();
    expect(r.concentracionMedico?.nombre).toBe("Dra. Ana");
    expect(r.concentracionMedico?.porcentaje).toBeCloseTo(34000 / 50000, 5);
  });

  it("una categoría sin clasificar cuenta como variable", () => {
    const sin = calcularIndicadores(base({ clasificacionPorCategoria: {} })).finanzas;
    expect(sin.gastosFijos).toBe(0);
    expect(sin.puntoEquilibrio).toBeNull(); // sin gastos fijos no hay equilibrio
  });
});

describe("indicadores de administración y operación", () => {
  const cita = (id: string, fecha: string, estatus: string, extra: Record<string, unknown> = {}) => ({ id, fecha, horaInicio: "09:00", horaFin: "10:00", estatus, medicoId: "m", patientId: "p1", ...extra });
  const bloque = { id: "b", sedeId: "s", dias: [1, 2, 3, 4, 5], inicio: "09:00", fin: "13:00" }; // 4 h por día hábil
  const recursos = [{ id: "m", tipo: "medico", nombre: "Dra. Ana", bloques: [bloque] }];

  it("cuenta citas y tasa de pérdida (sin contar reagendadas ni otros meses)", () => {
    const o = calcularIndicadores(
      base({
        recursos,
        citas: [
          cita("1", "2026-10-05", "Atendida"),
          cita("2", "2026-10-06", "Atendida", { patientId: "p2" }),
          cita("3", "2026-10-07", "Cancelada"),
          cita("4", "2026-10-08", "No Asistió"),
          cita("5", "2026-10-09", "Reagendada"),
          cita("6", "2026-09-09", "Atendida"),
        ],
      })
    ).operacion;
    expect(o).toMatchObject({ citasAgendadas: 4, atendidas: 2, canceladas: 1, noAsistio: 1 });
    expect(o.tasaPerdida).toBeCloseTo(2 / 4, 5);
  });

  it("utilización de bloques e ingreso por hora atendida", () => {
    // Octubre 2026 tiene 22 días hábiles → 88 h disponibles; 2 citas atendidas de 1 h.
    const o = calcularIndicadores(base({ recursos, citas: [cita("1", "2026-10-05", "Atendida"), cita("2", "2026-10-06", "Atendida")] })).operacion;
    expect(o.horasDisponibles).toBe(88);
    expect(o.horasAtendidas).toBe(2);
    expect(o.utilizacionBloques).toBeCloseTo(2 / 88, 5);
    expect(o.ingresoPorHoraAtendida).toBe(24000); // 48,000 netos / 2 h
  });

  it("sin bloques no hay utilización", () => {
    const o = calcularIndicadores(base({ citas: [cita("1", "2026-10-05", "Atendida")] })).operacion;
    expect(o.utilizacionBloques).toBeNull();
  });

  it("pacientes nuevos del mes y activos en los últimos 12 meses", () => {
    const o = calcularIndicadores(
      base({
        pacientes: [{ id: "p1", createdAt: "2026-10-03" }, { id: "p2", createdAt: "2026-10-31" }, { id: "p3", createdAt: "2026-09-30" }, { id: "p4" }],
        citas: [
          cita("1", "2026-10-05", "Atendida", { patientId: "p1" }),
          cita("2", "2026-02-05", "Atendida", { patientId: "p2" }),
          cita("3", "2025-08-05", "Atendida", { patientId: "p3" }), // hace más de un año
          cita("4", "2026-10-06", "Cancelada", { patientId: "p4" }),
          cita("5", "2026-10-25", "Atendida", { patientId: "p5" }), // futura: no cuenta como activo
        ],
      })
    ).operacion;
    expect(o.pacientesNuevos).toBe(2);
    expect(o.pacientesActivos).toBe(2); // p1 y p2
  });

  it("presupuestos: tasa de cierre sobre los ya resueltos, y lo que sigue pendiente", () => {
    const o = calcularIndicadores(
      base({
        presupuestosPorEstado: {
          pendiente: { cantidad: 4, valor: 12000 },
          aceptado: { cantidad: 6, valor: 30000 },
          rechazado: { cantidad: 2, valor: 5000 },
          expirado: { cantidad: 2, valor: 4000 },
        },
      })
    ).operacion.presupuestos;
    expect(o?.tasaCierre).toBeCloseTo(6 / 10, 5);
    expect(o?.pendientes).toBe(4);
    expect(o?.valorPendiente).toBe(12000);
    expect(calcularIndicadores(base()).operacion.presupuestos).toBeNull();
  });
});

describe("horas trabajadas y costo por hora", () => {
  const bloque = { id: "b", sedeId: "s", dias: [1, 2, 3, 4, 5], inicio: "09:00", fin: "13:00" }; // 22 días hábiles en oct-2026 → 88 h
  const recursos = [{ id: "m", tipo: "medico", nombre: "Dra. Ana", bloques: [bloque] }];
  // 10 citas atendidas de 2 horas = 20 h trabajadas (días hábiles distintos, dentro del bloque).
  const dias = ["05", "06", "07", "08", "09", "12", "13", "14", "15", "16"];
  const citas = dias.map((d, i) => ({ id: `c${i}`, fecha: `2026-10-${d}`, horaInicio: "09:00", horaFin: "11:00", estatus: "Atendida", medicoId: "m", patientId: `p${i}` }));

  it("costo por hora trabajada y por hora disponible, y utilidad por hora", () => {
    const f = calcularIndicadores(base({ recursos, citas })).finanzas;
    // Gastos 30,000 entre 20 h trabajadas y 88 disponibles; utilidad 18,000 entre 20 h.
    expect(f.costoPorHoraTrabajada).toBe(1500);
    expect(f.costoPorHoraDisponible).toBeCloseTo(30000 / 88, 1);
    expect(f.utilidadPorHora).toBe(900);
    expect(calcularIndicadores(base({ recursos, citas })).operacion.horasAtendidas).toBe(20);
  });

  it("el costo de la estructura por hora deja fuera insumos y laboratorio", () => {
    // 30,000 de gastos − 10,000 (insumos 6,000 + laboratorio 4,000) = 20,000 entre 20 h.
    expect(calcularIndicadores(base({ recursos, citas })).finanzas.costoEstructuraPorHora).toBe(1000);
  });

  it("sin horas trabajadas no hay costo por hora", () => {
    const f = calcularIndicadores(base({ recursos, citas: [] })).finanzas;
    expect(f.costoPorHoraTrabajada).toBeNull();
    expect(f.costoEstructuraPorHora).toBeNull();
    expect(f.utilidadPorHora).toBeNull();
    expect(f.costoPorHoraDisponible).toBeCloseTo(30000 / 88, 1);
    expect(calcularIndicadores(base()).finanzas.costoPorHoraDisponible).toBeNull(); // sin bloques
  });
});

describe("gastos fijos y variables por gasto", () => {
  it("un gasto con su propia clasificación manda sobre la de su categoría", () => {
    const r = calcularIndicadores(
      base({
        gastos: [
          gasto("Nómina", 10000, "2026-10-02"), // categoría fija
          { ...gasto("Nómina", 4000, "2026-10-03"), clasificacion: "variable" }, // comisiones: variable
          { ...gasto("Insumos", 1500, "2026-10-04"), clasificacion: "fijo" }, // suscripción fija de insumos
          gasto("Insumos", 500, "2026-10-05"), // categoría variable
        ],
      })
    ).finanzas;
    expect(r.gastosFijos).toBe(11500); // 10,000 + 1,500
    expect(r.gastosVariables).toBe(4500); // 4,000 + 500
    // Una categoría con las dos clases se marca como mixta.
    expect(r.gastosPorCategoria.find((g) => g.categoria === "Nómina")?.clasificacion).toBe("mixto");
    expect(r.gastosPorCategoria.find((g) => g.categoria === "Insumos")?.clasificacion).toBe("mixto");
  });

  it("sin clasificación propia se sigue usando la de la categoría", () => {
    const r = calcularIndicadores(base()).finanzas;
    expect(r.gastosFijos).toBe(20000);
    expect(r.gastosPorCategoria.find((g) => g.categoria === "Renta")?.clasificacion).toBe("fijo");
  });
});

describe("costos, gastos de operación e inversión", () => {
  const conInversion = base({
    gastos: [
      gasto("Insumos", 6000, "2026-10-08"), // costo
      gasto("Laboratorio", 4000, "2026-10-09"), // costo
      gasto("Renta", 8000, "2026-10-01"), // gasto
      gasto("Nómina", 12000, "2026-10-15"), // gasto
      gasto("Inversión", 30000, "2026-10-12"), // inversión del mes
      gasto("Inversión", 50000, "2026-03-05"), // inversión de otro mes, mismo año
      gasto("Inversión", 99999, "2025-12-31"), // año anterior
    ],
  });
  const r = calcularIndicadores(conInversion).finanzas;

  it("separa costos, gastos de operación e inversión", () => {
    expect(r.costos).toBe(10000);
    expect(r.gastosOperativos).toBe(20000);
    expect(r.gastos).toBe(30000); // costos + gastos, sin la inversión
    expect(r.inversion).toBe(30000);
  });

  it("la inversión del año suma desde enero hasta el fin del mes elegido", () => {
    expect(r.inversionDelAnio).toBe(80000);
    expect(calcularIndicadores({ ...conInversion, mes: "2026-02-10" }).finanzas.inversionDelAnio).toBe(0); // antes de la compra de marzo
    expect(calcularIndicadores({ ...conInversion, mes: "2026-03-10" }).finanzas.inversionDelAnio).toBe(50000);
  });

  it("utilidad bruta, utilidad operativa y flujo tras la inversión", () => {
    // Ingresos netos 48,000.
    expect(r.utilidadBruta).toBe(38000); // 48,000 − 10,000
    expect(r.margenBruto).toBeCloseTo(38000 / 48000, 5);
    expect(r.utilidad).toBe(18000); // 48,000 − 30,000: la inversión no resta
    expect(r.flujoTrasInversion).toBe(-12000); // 18,000 − 30,000
  });

  it("la inversión no entra en fijos, variables ni en el punto de equilibrio", () => {
    expect(r.gastosFijos + r.gastosVariables).toBe(30000);
    expect(r.gastosPorCategoria.some((g) => g.categoria === "Inversión")).toBe(false);
  });

  it("un gasto marcado como costo cuenta como costo aunque su categoría sea de gasto", () => {
    const x = calcularIndicadores(base({ gastos: [{ ...gasto("Nómina", 5000, "2026-10-10"), naturaleza: "costo" }, gasto("Renta", 8000, "2026-10-01")] })).finanzas;
    expect(x.costos).toBe(5000);
    expect(x.gastosOperativos).toBe(8000);
  });

  it("el costo de la estructura por hora deja fuera los costos y la inversión", () => {
    const bloque = { id: "b", sedeId: "s", dias: [1, 2, 3, 4, 5], inicio: "09:00", fin: "13:00" };
    const recursos = [{ id: "m", tipo: "medico", nombre: "Dra. Ana", bloques: [bloque] }];
    const citas = ["05", "06", "07", "08", "09", "12", "13", "14", "15", "16"].map((d, i) => ({
      id: `c${i}`,
      fecha: `2026-10-${d}`,
      horaInicio: "09:00",
      horaFin: "11:00",
      estatus: "Atendida",
      medicoId: "m",
      patientId: `p${i}`,
    })); // 20 h trabajadas
    const x = calcularIndicadores({ ...conInversion, recursos, citas }).finanzas;
    expect(x.costoEstructuraPorHora).toBe(1000); // (30,000 − 10,000 costos) / 20 h; la inversión no entra
    expect(x.costoPorHoraTrabajada).toBe(1500);
  });
});
