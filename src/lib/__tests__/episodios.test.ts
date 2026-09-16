import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import { episodioActivo, type Episodio } from "../episodios";

function episodio(overrides: Partial<Episodio>): Episodio {
  return {
    id: "ep1",
    expedienteId: "exp1",
    interconsultaId: "ic1",
    titulo: "Extracción de terceros molares",
    especialidad: "Cirugía Oral y Maxilofacial",
    motivoOrigen: "Retención de OD 38 y 48",
    responsableUid: "uid-cirujano",
    clinicaOrigenId: "clinica-a",
    estado: "activo",
    creadoEl: Timestamp.fromDate(new Date("2026-09-07T00:00:00.000Z")),
    ...overrides,
  };
}

describe("episodioActivo", () => {
  it("true cuando el estado es activo", () => {
    expect(episodioActivo(episodio({ estado: "activo" }))).toBe(true);
  });

  it("false cuando el estado es concluido", () => {
    expect(episodioActivo(episodio({ estado: "concluido" }))).toBe(false);
  });
});
