import { describe, expect, it } from "vitest";
import {
  comisionesEstimadas,
  cobrosPorOperador,
  costosDeLaSemana,
  diasDeLaSemana,
  lunesDe,
  resumenSemana,
  sumarDias,
  veredictoDeBloques,
} from "../evaluacionSemanal";
import type { BloqueAtencion, Sede } from "../sedesBloques";
import type { PagoRealizado } from "../pagosRealizados";
import type { Gasto } from "../gastos";

const sedes: Sede[] = [
  { id: "jc", nombre: "Juan Corrales" },
  { id: "emsa", nombre: "EMSA" },
];

// Semana del lunes 2026-10-19 al domingo 2026-10-25.
const LUNES = "2026-10-19";
const enrique: BloqueAtencion = { id: "b1", sedeId: "jc", dias: [1, 3, 5], inicio: "09:00", fin: "14:00" }; // 5 h × 3 días = 15 h
const nicolas: BloqueAtencion = { id: "b2", sedeId: "emsa", dias: [2, 4], inicio: "10:00", fin: "18:00" }; // 8 h × 2 días = 16 h
const recursos = [
  { id: "e", tipo: "medico", nombre: "Dr. Enrique", bloques: [enrique], porcentajeComision: 40 },
  { id: "n", tipo: "medico", nombre: "Dr. Nicolás", bloques: [nicolas], porcentajeComision: 50 },
  { id: "u1", tipo: "unidad", nombre: "Unidad 1" },
];

const cita = (id: string, fecha: string, ini: string, fin: string, estatus: string, extra: Record<string, unknown> = {}) => ({
  id,
  fecha,
  horaInicio: ini,
  horaFin: fin,
  estatus,
  medicoId: "e",
  ...extra,
});

describe("fechas de la semana", () => {
  it("encuentra el lunes y los siete días", () => {
    expect(lunesDe("2026-10-22")).toBe(LUNES);
    expect(lunesDe("2026-10-25")).toBe(LUNES); // domingo
    expect(lunesDe(LUNES)).toBe(LUNES);
    expect(diasDeLaSemana(LUNES)).toHaveLength(7);
    expect(sumarDias(LUNES, 6)).toBe("2026-10-25");
    expect(sumarDias(LUNES, -7)).toBe("2026-10-12");
  });
});

describe("resumen de la semana", () => {
  const citas = [
    cita("1", "2026-10-19", "09:00", "10:00", "Atendida", { horaLlegada: "08:55" }),
    cita("2", "2026-10-19", "10:00", "11:30", "Atendida", { horaLlegada: "10:25" }), // 25 min tarde
    cita("3", "2026-10-21", "09:00", "10:00", "No Asistió"),
    cita("4", "2026-10-21", "10:00", "10:30", "Cancelada", { canceladaTarde: true }),
    cita("5", "2026-10-23", "09:00", "10:00", "Confirmada"),
    cita("6", "2026-10-23", "10:00", "10:30", "Reagendada"),
    // Del otro médico, en su bloque de EMSA.
    cita("7", "2026-10-20", "10:00", "12:00", "Atendida", { medicoId: "n" }),
  ];
  const r = resumenSemana({ lunes: LUNES, recursos, sedes, citas });
  const enriqueFila = r.filas.find((f) => f.medicoId === "e")!;
  const nicolasFila = r.filas.find((f) => f.medicoId === "n")!;

  it("suma las horas que abren los bloques", () => {
    expect(enriqueFila.horasDisponibles).toBe(15);
    expect(nicolasFila.horasDisponibles).toBe(16);
    expect(r.totales.horasDisponibles).toBe(31);
  });

  it("separa horas atendidas, por atender, inasistencias y canceladas", () => {
    expect(enriqueFila.horasAtendidas).toBe(2.5);
    expect(enriqueFila.horasAgendadas).toBe(3.5); // 2.5 atendidas + 1 confirmada
    expect(enriqueFila.horasNoAsistio).toBe(1);
    expect(enriqueFila.horasCanceladas).toBe(0.5);
    expect(nicolasFila.horasAtendidas).toBe(2);
  });

  it("cuenta las citas por resultado", () => {
    expect(enriqueFila).toMatchObject({ citas: 6, atendidas: 2, noAsistio: 1, canceladas: 1, canceladasTarde: 1, reagendadas: 1 });
  });

  it("calcula la ocupación efectiva y agendada", () => {
    expect(r.ocupacionEfectiva).toBeCloseTo(4.5 / 31, 5);
    expect(r.ocupacionAgendada).toBeCloseTo(5.5 / 31, 5);
  });

  it("la tasa de pérdida no cuenta las reagendadas", () => {
    // 6 citas sin la reagendada... más la de Nicolás = 6 en total; pierden 2 (no asistió y cancelada).
    expect(r.tasaPerdida).toBeCloseTo(2 / 6, 5);
  });

  it("mide la puntualidad con la tolerancia de 10 minutos", () => {
    expect(r.puntualidad).toMatchObject({ conLlegada: 2, puntuales: 1, tarde: 1, minutosPromedioTarde: 25 });
  });

  it("avisa cuántas atendidas no tienen hora de llegada", () => {
    expect(r.puntualidad.sinDato).toBe(1); // la de Nicolás no la tiene
  });

  it("separa lo que se agendó fuera de los bloques", () => {
    const fuera = resumenSemana({
      lunes: LUNES,
      recursos,
      sedes,
      citas: [
        cita("a", "2026-10-20", "10:00", "11:00", "Atendida"), // Enrique no atiende martes
        cita("b", "2026-10-19", "13:30", "14:30", "Atendida"), // la mitad queda fuera
      ],
    });
    expect(fuera.fueraDeBloque.citas).toBe(1);
    expect(fuera.fueraDeBloque.horas).toBe(1.5);
    expect(fuera.totales.horasAtendidas).toBe(0.5);
  });

  it("un médico sin bloques no cuenta como fuera de bloque", () => {
    const sinBloques = [{ id: "z", tipo: "medico", nombre: "Dra. Z" }];
    const r2 = resumenSemana({ lunes: LUNES, recursos: sinBloques, sedes, citas: [cita("a", "2026-10-20", "10:00", "11:00", "Atendida", { medicoId: "z" })] });
    expect(r2.fueraDeBloque).toEqual({ citas: 0, horas: 0 });
    expect(r2.citasSinBloques).toBe(1);
    expect(r2.ocupacionEfectiva).toBe(0);
  });

  it("ignora las citas de otras semanas", () => {
    const r3 = resumenSemana({ lunes: LUNES, recursos, sedes, citas: [cita("a", "2026-10-26", "09:00", "10:00", "Atendida")] });
    expect(r3.totales.horasAtendidas).toBe(0);
  });
});

describe("cobros por operador", () => {
  const pago = (id: string, fecha: string, total: number, registradoPor: string): PagoRealizado =>
    ({ id, patientId: "p", patientName: "P", registradoEn: "2026-10-20T10:00:00Z", registradoPor, pago: { id, fecha, medico: "x", formaPago: "Efectivo", lineas: [], total, facturar: false, firma: null } }) as PagoRealizado;

  it("agrupa por quien registró el pago, solo de esa semana", () => {
    const r = cobrosPorOperador(
      [
        pago("1", "20/10/2026", 1000, "Claudia@mo.test"),
        pago("2", "22/10/2026", 500, "claudia@mo.test"),
        pago("3", "21/10/2026", 300, "odontologa@mo.test"),
        pago("4", "28/10/2026", 999, "claudia@mo.test"), // otra semana
        pago("5", "21/10/2026", 200, ""),
      ],
      LUNES
    );
    expect(r.porOperador[0]).toEqual({ operador: "claudia@mo.test", total: 1500, pagos: 2 });
    expect(r.porOperador.map((o) => o.operador)).toEqual(["claudia@mo.test", "odontologa@mo.test", "sin operador"]);
    expect(r.totalRegistrado).toBe(2000);
  });
});

describe("costos directos", () => {
  const g = (categoria: Gasto["categoria"], monto: number, fecha: string): Gasto => ({ id: `${categoria}${fecha}`, concepto: "x", categoria, monto, fecha });

  it("separa insumos y laboratorio del resto y solo toma la semana", () => {
    const c = costosDeLaSemana(
      [g("Insumos", 800, "2026-10-20"), g("Laboratorio", 1200, "2026-10-23"), g("Renta", 5000, "2026-10-21"), g("Insumos", 999, "2026-10-26")],
      LUNES
    );
    expect(c.totalDirectos).toBe(2000);
    expect(c.directos.map((d) => d.categoria)).toEqual(["Laboratorio", "Insumos"]);
    expect(c.totalIndirectos).toBe(5000);
  });

  it("estima la comisión de cada médico con su porcentaje", () => {
    const porFechaYMedico = {
      "2026-10-20": { "Dr. Enrique": 1000, "Dr. Nicolás": 2000 },
      "2026-10-27": { "Dr. Enrique": 9999 }, // otra semana
    };
    expect(comisionesEstimadas(porFechaYMedico, recursos, LUNES)).toBe(400 + 1000);
    expect(comisionesEstimadas(undefined, recursos, LUNES)).toBe(0);
  });
});

describe("¿ya se ocupan de manera consistente?", () => {
  // "Hoy" es lunes 2026-11-09: las semanas completas son 19-oct, 26-oct y 2-nov.
  const HOY = "2026-11-09";
  const semana = (lunes: string, horasAtendidasEnrique: number) => {
    // Citas de 1 hora el lunes dentro del bloque de Enrique hasta completar las horas.
    return Array.from({ length: horasAtendidasEnrique }, (_, i) =>
      cita(`${lunes}-${i}`, i < 5 ? lunes : sumarDias(lunes, 2), `${String(9 + (i % 5)).padStart(2, "0")}:00`, `${String(10 + (i % 5)).padStart(2, "0")}:00`, "Atendida")
    );
  };
  const soloEnrique = [recursos[0]];

  it("consistente si todas las semanas llegan al umbral", () => {
    const citas = [...semana("2026-10-19", 12), ...semana("2026-10-26", 12), ...semana("2026-11-02", 12)]; // 12/15 = 80%
    const v = veredictoDeBloques({ hoyISO: HOY, recursos: soloEnrique, sedes, citas });
    expect(v.estado).toBe("consistente");
    expect(v.filas[0].porSemana).toHaveLength(3);
  });

  it("todavía no si una sola semana se queda corta", () => {
    const citas = [...semana("2026-10-19", 12), ...semana("2026-10-26", 6), ...semana("2026-11-02", 12)];
    const v = veredictoDeBloques({ hoyISO: HOY, recursos: soloEnrique, sedes, citas });
    expect(v.estado).toBe("todavia_no");
    expect(v.filas[0].consistente).toBe(false);
  });

  it("la semana en curso no cuenta", () => {
    const citas = [...semana("2026-10-19", 12), ...semana("2026-10-26", 12), ...semana("2026-11-02", 12)]; // la del 9-nov está vacía
    expect(veredictoDeBloques({ hoyISO: HOY, recursos: soloEnrique, sedes, citas }).estado).toBe("consistente");
  });

  it("sin bloques no hay nada que evaluar", () => {
    expect(veredictoDeBloques({ hoyISO: HOY, recursos: [{ id: "z", tipo: "medico", nombre: "Z" }], sedes, citas: [] }).estado).toBe("sin_datos");
  });
});
