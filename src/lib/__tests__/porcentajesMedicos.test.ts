import { describe, expect, it } from "vitest";
import { calcularPorcentajes, diasDeAtencionEnRango, metaDelPeriodo, rangoDePeriodo } from "../porcentajesMedicos";

const medico = (nombre: string, extra: { porcentajeComision?: number; metaMensual?: number } = {}) => ({
  id: nombre,
  nombre,
  color: "#fff",
  tipo: "medico" as const,
  ...extra,
});

// Miércoles 14 de octubre de 2026.
const HOY = new Date(2026, 9, 14);

describe("rangoDePeriodo", () => {
  it("hoy, semana (desde el lunes), quincena y mes terminan hoy", () => {
    expect(rangoDePeriodo("hoy", HOY)).toEqual({ desde: "2026-10-14", hasta: "2026-10-14" });
    expect(rangoDePeriodo("semana", HOY)).toEqual({ desde: "2026-10-12", hasta: "2026-10-14" });
    expect(rangoDePeriodo("quincena", HOY)).toEqual({ desde: "2026-10-01", hasta: "2026-10-14" });
    expect(rangoDePeriodo("quincena", new Date(2026, 9, 20))).toEqual({ desde: "2026-10-16", hasta: "2026-10-20" });
    expect(rangoDePeriodo("mes", HOY)).toEqual({ desde: "2026-10-01", hasta: "2026-10-14" });
  });

  it("el mes anterior es completo, también al cruzar de año", () => {
    expect(rangoDePeriodo("mes_anterior", HOY)).toEqual({ desde: "2026-09-01", hasta: "2026-09-30" });
    expect(rangoDePeriodo("mes_anterior", new Date(2027, 0, 5))).toEqual({ desde: "2026-12-01", hasta: "2026-12-31" });
  });
});

describe("meta del periodo", () => {
  it("la mensual se lleva a día, semana y quincena como las metas de la clínica", () => {
    expect(metaDelPeriodo(43450, "semana")).toBeCloseTo(10000, 0);
    expect(metaDelPeriodo(43450, "hoy")).toBeCloseTo(10000 / 6, 1);
    expect(metaDelPeriodo(43450, "quincena")).toBe(21725);
    expect(metaDelPeriodo(43450, "mes")).toBe(43450);
    expect(metaDelPeriodo(43450, "mes_anterior")).toBe(43450);
  });

  it("cuenta los días de atención de un rango (lunes a sábado por omisión)", () => {
    expect(diasDeAtencionEnRango("2026-10-12", "2026-10-18")).toBe(6);
    expect(diasDeAtencionEnRango("2026-10-12", "2026-10-18", [1, 3, 5])).toBe(3);
  });
});

describe("calcularPorcentajes", () => {
  const cobros = {
    "2026-10-05": { "Dra. Ana": 4000, "Dr. Luis": 1000 },
    "2026-10-13": { "Dra. Ana": 6000, "Alguien suelto": 500 },
    "2026-09-20": { "Dra. Ana": 9999 },
  };

  it("suma lo cobrado solo dentro del periodo y calcula lo que le toca", () => {
    const r = calcularPorcentajes({
      medicos: [medico("Dra. Ana", { porcentajeComision: 40 }), medico("Dr. Luis")],
      porFechaYMedico: cobros,
      periodo: "mes",
      hoy: HOY,
    });
    const ana = r.filas.find((f) => f.nombre === "Dra. Ana")!;
    expect(ana.cobrado).toBe(10000);
    expect(ana.comision).toBe(4000);
    const luis = r.filas.find((f) => f.nombre === "Dr. Luis")!;
    expect(luis.cobrado).toBe(1000);
    expect(luis.porcentaje).toBeNull();
    expect(luis.comision).toBeNull();
    expect(r.totalComision).toBe(4000);
  });

  it("el mes anterior toma otros días, y la semana solo los de esta semana", () => {
    const base = { medicos: [medico("Dra. Ana", { porcentajeComision: 50 })], porFechaYMedico: cobros, hoy: HOY };
    expect(calcularPorcentajes({ ...base, periodo: "mes_anterior" }).filas[0].cobrado).toBe(9999);
    expect(calcularPorcentajes({ ...base, periodo: "semana" }).filas[0].cobrado).toBe(6000);
  });

  it("los cobros a un nombre que no es médico registrado se listan aparte, pero cuentan en el total", () => {
    const r = calcularPorcentajes({ medicos: [medico("Dra. Ana", { porcentajeComision: 40 })], porFechaYMedico: cobros, periodo: "mes", hoy: HOY });
    expect(r.sinMedico).toEqual([
      { nombre: "Dr. Luis", monto: 1000 },
      { nombre: "Alguien suelto", monto: 500 },
    ]);
    expect(r.totalCobrado).toBe(11500);
  });

  it("con meta: avance, lo que falta y si la alcanzó", () => {
    const r = calcularPorcentajes({
      medicos: [medico("Dra. Ana", { metaMensual: 8000 }), medico("Dr. Luis", { metaMensual: 20000 })],
      porFechaYMedico: cobros,
      periodo: "mes",
      hoy: HOY,
    });
    const ana = r.filas[0];
    expect(ana).toMatchObject({ meta: 8000, avance: 125, falta: 0, alcanzada: true });
    const luis = r.filas[1];
    expect(luis).toMatchObject({ meta: 20000, avance: 5, falta: 19000, alcanzada: false });
  });

  it("la meta de la semana es la mensual repartida, y sin meta no hay avance", () => {
    const r = calcularPorcentajes({
      medicos: [medico("Dra. Ana", { metaMensual: 43450 }), medico("Dr. Luis")],
      porFechaYMedico: cobros,
      periodo: "semana",
      hoy: HOY,
    });
    expect(r.filas[0].meta).toBeCloseTo(10000, 0);
    expect(r.filas[1]).toMatchObject({ meta: null, avance: null, falta: null, alcanzada: false });
  });

  it("este mes proyecta el cierre según los días de atención que van", () => {
    const r = calcularPorcentajes({
      medicos: [medico("Dra. Ana", { metaMensual: 50000 })],
      porFechaYMedico: cobros,
      periodo: "mes",
      hoy: HOY,
    });
    // Del 1 al 14 de octubre hay 12 días de atención (lunes a sábado); el mes completo tiene 27 (31 días menos 4 domingos).
    expect(r.filas[0].proyeccion).toBeCloseTo((10000 / 12) * 27, 0);
    expect(calcularPorcentajes({ medicos: [medico("Dra. Ana", { metaMensual: 50000 })], porFechaYMedico: cobros, periodo: "semana", hoy: HOY }).filas[0].proyeccion).toBeNull();
  });

  it("las unidades no cuentan como médicos y sin datos todo es cero", () => {
    const r = calcularPorcentajes({
      medicos: [{ id: "u1", nombre: "Sillón 1", color: "#000", tipo: "unidad" }, medico("Dra. Ana", { porcentajeComision: 30 })],
      porFechaYMedico: undefined,
      periodo: "hoy",
      hoy: HOY,
    });
    expect(r.filas).toHaveLength(1);
    expect(r).toMatchObject({ totalCobrado: 0, totalComision: 0, sinMedico: [] });
  });
});
