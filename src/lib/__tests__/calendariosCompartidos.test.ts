import { describe, expect, it } from "vitest";
import { colegasPorRecurso, unirColegas } from "../calendariosCompartidos";

const caso = (over = {}) => ({
  pacienteId: "p1",
  estado: "sent" as const,
  destinatarioUid: "colega1",
  participantesAutorizados: ["yo", "colega1"],
  expedienteCompartido: { citas: [{ fecha: "2026-10-06", hora: "09:00", estatus: "Confirmada", tratamientos: [] }] },
  ...over,
});
const cita = (over = {}) => ({ patientId: "p1", fecha: "2026-10-06", horaInicio: "09:00", medicoId: "r1", unidadId: "u1", recursoId: "r1", ...over });
const nombre = (uid: string) => (uid === "colega1" ? "Dra. Mariana" : "un colega");

describe("colegasPorRecurso", () => {
  it("marca el médico y la unidad de la cita compartida", () => {
    const m = colegasPorRecurso([caso()], [cita()], nombre);
    expect(m.get("r1")).toEqual(["Dra. Mariana"]);
    expect(m.get("u1")).toEqual(["Dra. Mariana"]);
  });

  it("ignora citas que no se compartieron o de otro paciente", () => {
    const m = colegasPorRecurso([caso()], [cita({ horaInicio: "10:00" }), cita({ patientId: "p2", medicoId: "r9" })], nombre);
    expect(m.size).toBe(0);
  });

  it("no marca casos cerrados, sin colega o con acceso revocado", () => {
    expect(colegasPorRecurso([caso({ estado: "cancelled" })], [cita()], nombre).size).toBe(0);
    expect(colegasPorRecurso([caso({ destinatarioUid: undefined })], [cita()], nombre).size).toBe(0);
    expect(colegasPorRecurso([caso({ participantesAutorizados: ["yo"] })], [cita()], nombre).size).toBe(0);
  });

  it("no marca si el caso no compartió citas", () => {
    expect(colegasPorRecurso([caso({ expedienteCompartido: {} })], [cita()], nombre).size).toBe(0);
  });

  it("junta varios colegas sin repetir", () => {
    const m = colegasPorRecurso([caso(), caso({ destinatarioUid: "c2", participantesAutorizados: ["yo", "c2"] }), caso()], [cita()], nombre);
    expect(m.get("r1")).toEqual(["Dra. Mariana", "un colega"]);
  });
});

describe("unirColegas", () => {
  it("une lo manual y lo automático sin duplicar", () => {
    expect(unirColegas("dra. mariana", ["Dra. Mariana", "Dr. Luis"])).toEqual(["dra. mariana", "Dr. Luis"]);
    expect(unirColegas(undefined, undefined)).toEqual([]);
  });
});
