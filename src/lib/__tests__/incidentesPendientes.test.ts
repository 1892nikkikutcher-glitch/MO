import { describe, expect, it } from "vitest";
import { incidentesPendientesDeSeguimiento } from "../incidentesPendientes";

const nota = (over: Record<string, unknown> = {}) =>
  ({
    id: "n1",
    version: 2,
    estado: "firmada",
    encabezado: { patientId: "p1", pacienteNombreSnapshot: "Ana Torres", citaId: "c1", medico: "Dr. X", organosDentales: [] },
    estadoFinal: {
      chips: ["incidente"],
      incidente: { queOcurrio: "Fractura radicular", comoSeAtendio: "Se retiró el fragmento", estadoFinalPaciente: "Estable", seguimientoRequerido: "Control en 48 h" },
    },
    creadoEn: "2026-10-26T15:00:00.000Z",
    ...over,
  }) as never;

const cita = (over: Record<string, unknown> = {}) =>
  ({ id: "c1", patientId: "p1", paciente: "Ana Torres", fecha: "2026-10-26", horaInicio: "10:00", horaFin: "10:45", estatus: "Atendida", ...over }) as never;

describe("incidentesPendientesDeSeguimiento", () => {
  it("avisa de un incidente reciente sin cita posterior", () => {
    const r = incidentesPendientesDeSeguimiento({ p1: [nota()] }, [cita()], "2026-10-27");
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ patientId: "p1", paciente: "Ana Torres", fecha: "2026-10-26", seguimientoRequerido: "Control en 48 h" });
  });

  it("deja de avisar cuando hay una cita posterior, atendida o por venir", () => {
    expect(incidentesPendientesDeSeguimiento({ p1: [nota()] }, [cita(), cita({ id: "c2", fecha: "2026-10-28", estatus: "Agendada" })], "2026-10-27")).toEqual([]);
  });

  it("una cita posterior cancelada o de no asistencia no cuenta como seguimiento", () => {
    const citas = [cita(), cita({ id: "c2", fecha: "2026-10-28", estatus: "Cancelada" }), cita({ id: "c3", fecha: "2026-10-29", estatus: "No Asistió" })];
    expect(incidentesPendientesDeSeguimiento({ p1: [nota()] }, citas, "2026-10-27")).toHaveLength(1);
  });

  it("ignora notas sin incidente, incidentes viejos y notas ya sin datos del incidente", () => {
    const sinIncidente = nota({ estadoFinal: { chips: ["sin_incidentes"] } });
    expect(incidentesPendientesDeSeguimiento({ p1: [sinIncidente] }, [cita()], "2026-10-27")).toEqual([]);
    expect(incidentesPendientesDeSeguimiento({ p1: [nota()] }, [cita()], "2026-12-01")).toEqual([]);
    const vacio = nota({ estadoFinal: { chips: ["incidente"], incidente: { queOcurrio: " ", comoSeAtendio: "", estadoFinalPaciente: "", seguimientoRequerido: "" } } });
    expect(incidentesPendientesDeSeguimiento({ p1: [vacio] }, [cita()], "2026-10-27")).toEqual([]);
  });

  it("sin cita ligada usa el día en que se creó la nota", () => {
    const r = incidentesPendientesDeSeguimiento({ p1: [nota({ encabezado: { patientId: "p1", pacienteNombreSnapshot: "Ana Torres", citaId: null } })] }, [], "2026-10-27");
    expect(r[0].fecha).toBe("2026-10-26");
  });

  it("ordena del más antiguo al más reciente", () => {
    const n2 = nota({ id: "n2", encabezado: { patientId: "p2", pacienteNombreSnapshot: "Beto", citaId: "c9" } });
    const r = incidentesPendientesDeSeguimiento({ p2: [n2], p1: [nota()] }, [cita(), cita({ id: "c9", patientId: "p2", paciente: "Beto", fecha: "2026-10-22" })], "2026-10-27");
    expect(r.map((x) => x.patientId)).toEqual(["p2", "p1"]);
  });
});
