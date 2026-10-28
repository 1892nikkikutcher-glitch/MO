import { describe, expect, it } from "vitest";
import { calificacionDePaciente, calificacionManualValida, detalleCalificacion, estrellasVisibles } from "../calificacionPaciente";

const cita = (estatus: string, extra: object = {}) => ({ estatus, ...extra });
const muchas = (n: number, estatus: string, extra: object = {}) => Array.from({ length: n }, () => cita(estatus, extra));

describe("calificacionDePaciente", () => {
  it("sin citas con resultado: 5 estrellas y sin historial", () => {
    const c = calificacionDePaciente([cita("Agendada"), cita("Confirmada"), cita("En espera")]);
    expect(c).toMatchObject({ estrellas: 5, tieneHistorial: false });
  });

  it("solo citas atendidas: 5 estrellas", () => {
    expect(calificacionDePaciente(muchas(6, "Atendida")).estrellas).toBe(5);
  });

  it("baja con cada falta, pero con el peso de todo su historial", () => {
    const una = calificacionDePaciente([...muchas(40, "Atendida"), cita("No Asistió")]).estrellas;
    const varias = calificacionDePaciente([...muchas(8, "Atendida"), ...muchas(3, "No Asistió")]).estrellas;
    const pocas = calificacionDePaciente([cita("Atendida"), cita("No Asistió")]).estrellas;
    expect(una).toBeGreaterThanOrEqual(4.5); // una falta entre 41 citas casi no mueve
    expect(varias).toBeLessThan(una);
    expect(pocas).toBeLessThan(una);
    expect(una).toBeLessThanOrEqual(5);
  });

  it("canceló fuera de tiempo pesa como una falta; canceló a tiempo o reagendó, mucho menos", () => {
    const base = muchas(6, "Atendida");
    const falta = calificacionDePaciente([...base, cita("No Asistió")]).estrellas;
    const tarde = calificacionDePaciente([...base, cita("Cancelada", { canceladaTarde: true })]).estrellas;
    const aTiempo = calificacionDePaciente([...base, cita("Cancelada")]).estrellas;
    const reagendo = calificacionDePaciente([...base, cita("Reagendada")]).estrellas;
    expect(tarde).toBe(falta);
    expect(aTiempo).toBeGreaterThan(tarde);
    expect(reagendo).toBeGreaterThan(tarde);
  });

  it("siempre entre 0 y 5, de media en media", () => {
    for (const n of [1, 2, 5, 20]) {
      const e = calificacionDePaciente(muchas(n, "No Asistió")).estrellas;
      expect(e).toBeGreaterThanOrEqual(0);
      expect(e).toBeLessThanOrEqual(5);
      expect(e * 2).toBe(Math.round(e * 2));
    }
    expect(calificacionDePaciente(muchas(50, "No Asistió")).estrellas).toBeLessThanOrEqual(0.5);
  });

  it("el detalle cuenta lo que pasó", () => {
    const c = calificacionDePaciente([cita("Atendida"), cita("Atendida"), cita("No Asistió"), cita("Cancelada", { canceladaTarde: true }), cita("Cancelada"), cita("Reagendada")]);
    expect(detalleCalificacion(c)).toBe("2 atendidas · 1 no asistió · 1 canceló fuera de tiempo · 1 canceló · 1 reagendó");
    expect(detalleCalificacion(calificacionDePaciente([]))).toBe("Aún sin historial de citas");
  });
});

describe("calificación manual", () => {
  it("acepta de 0 a 5 en pasos de media estrella y descarta lo demás", () => {
    expect(calificacionManualValida(3.5)).toBe(3.5);
    expect(calificacionManualValida(3.7)).toBe(3.5);
    expect(calificacionManualValida(9)).toBe(5);
    expect(calificacionManualValida(-2)).toBe(0);
    expect(calificacionManualValida(0)).toBe(0);
    expect(calificacionManualValida("4")).toBeUndefined();
    expect(calificacionManualValida(undefined)).toBeUndefined();
    expect(calificacionManualValida(Number.NaN)).toBeUndefined();
  });

  it("la manual manda sobre la automática; sin ella se ve la de las citas", () => {
    const auto = calificacionDePaciente([{ estatus: "No Asistió" }, { estatus: "No Asistió" }]);
    expect(estrellasVisibles(auto, 5)).toBe(5);
    expect(estrellasVisibles(auto, 0)).toBe(0);
    expect(estrellasVisibles(auto, null)).toBe(auto.estrellas);
    expect(estrellasVisibles(auto)).toBe(auto.estrellas);
  });
});
