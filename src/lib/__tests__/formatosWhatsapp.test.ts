import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildProximaCitaTexto } from "../formatosWhatsapp";
import type { CitaAgenda } from "../patientData";

function cita(overrides: Partial<CitaAgenda>): CitaAgenda {
  return {
    id: overrides.id ?? "c1",
    folio: "1",
    recursoId: "",
    patientId: "p1",
    paciente: "Paciente Uno",
    tratamientos: [],
    comentarios: "",
    fecha: "2026-09-10",
    horaInicio: "09:00",
    horaFin: "10:00",
    estatus: "Confirmada",
    recurrenciaId: null,
    ...overrides,
  } as CitaAgenda;
}

describe("buildProximaCitaTexto", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 4, 12, 0, 0)); // 2026-09-04, hoy
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("no cuenta la cita de hoy mismo como 'próxima' (la que se está pagando ahora)", () => {
    const citas = [cita({ id: "hoy", fecha: "2026-09-04", horaInicio: "16:00" })];
    const texto = buildProximaCitaTexto(citas, "p1", "2026-09-04");
    expect(texto).not.toContain("próxima cita es el");
    expect(texto).toContain("Aún no tiene una próxima cita agendada");
  });

  it("muestra una cita realmente futura", () => {
    const citas = [cita({ id: "futura", fecha: "2026-09-10", horaInicio: "14:30" })];
    const texto = buildProximaCitaTexto(citas, "p1", "2026-09-04");
    expect(texto).toBe("\n\nSu próxima cita es el 10 de septiembre de 2026 a las 02:30 PM.");
  });

  it("no cuenta una cita reagendada con fecha futura (esa fecha vieja ya no es real)", () => {
    const citas = [cita({ id: "reagendada", fecha: "2026-09-10", estatus: "Reagendada" })];
    const texto = buildProximaCitaTexto(citas, "p1", "2026-09-04");
    expect(texto).toContain("Aún no tiene una próxima cita agendada");
  });

  it("no cuenta una cita cancelada con fecha futura", () => {
    const citas = [cita({ id: "cancelada", fecha: "2026-09-10", estatus: "Cancelada" })];
    const texto = buildProximaCitaTexto(citas, "p1", "2026-09-04");
    expect(texto).toContain("Aún no tiene una próxima cita agendada");
  });

  it("de varias citas futuras, elige la más próxima", () => {
    const citas = [
      cita({ id: "lejana", fecha: "2026-10-01", horaInicio: "09:00" }),
      cita({ id: "cercana", fecha: "2026-09-06", horaInicio: "11:00" }),
    ];
    const texto = buildProximaCitaTexto(citas, "p1", "2026-09-04");
    expect(texto).toBe("\n\nSu próxima cita es el 6 de septiembre de 2026 a las 11:00 AM.");
  });

  it("ignora citas de otro paciente", () => {
    const citas = [cita({ id: "otro", patientId: "p2", fecha: "2026-09-10" })];
    const texto = buildProximaCitaTexto(citas, "p1", "2026-09-04");
    expect(texto).toContain("Aún no tiene una próxima cita agendada");
  });
});
