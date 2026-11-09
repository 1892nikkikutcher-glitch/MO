import { describe, expect, it } from "vitest";
import { citaAnteriorDelPaciente, datosFaltantesDeCita } from "../citaAnteriorDelPaciente";
import type { Sede } from "../sedesBloques";

const sedes: Sede[] = [
  { id: "jc", nombre: "Juan Corrales" },
  { id: "emsa", nombre: "Torre Médica EMSA" },
];

const cita = (
  fecha: string,
  horaInicio: string,
  horaFin: string,
  extra: Partial<{ id: string; patientId: string; estatus: string; sedeId: string | null }> = {}
) => ({
  id: `${fecha}-${horaInicio}`,
  patientId: "p1",
  fecha,
  horaInicio,
  horaFin,
  estatus: "Atendida",
  sedeId: "emsa" as string | null,
  medicoId: "m1",
  ...extra,
});

describe("citaAnteriorDelPaciente", () => {
  it("devuelve hora, duración y sede de su cita más reciente", () => {
    const citas = [cita("2026-10-05", "10:00", "10:30"), cita("2026-11-02", "18:15", "19:15")];
    expect(citaAnteriorDelPaciente(citas, "p1", "2026-11-09", undefined, [], sedes)).toEqual({
      fecha: "2026-11-02",
      horaInicio: "18:15",
      duracionMin: 60,
      sedeId: "emsa",
    });
  });

  it("no cuenta canceladas, inasistencias ni reagendadas", () => {
    const citas = [
      cita("2026-10-05", "10:00", "10:30"),
      cita("2026-11-02", "18:15", "19:15", { estatus: "Cancelada" }),
      cita("2026-11-03", "17:00", "17:30", { estatus: "No Asistió" }),
    ];
    expect(citaAnteriorDelPaciente(citas, "p1", "2026-11-09", undefined, [], sedes)?.fecha).toBe("2026-10-05");
  });

  it("ignora otros pacientes, citas posteriores a la nueva y la que se está editando", () => {
    const citas = [
      cita("2026-11-02", "18:15", "19:15", { patientId: "p2" }),
      cita("2026-11-20", "09:00", "09:30"),
      cita("2026-10-05", "10:00", "10:30"),
      cita("2026-11-08", "12:00", "12:30", { id: "actual" }),
    ];
    const r = citaAnteriorDelPaciente(citas, "p1", "2026-11-09", "actual", [], sedes);
    expect(r?.fecha).toBe("2026-10-05");
  });

  it("si nunca ha tenido cita devuelve null", () => {
    expect(citaAnteriorDelPaciente([], "p1", "2026-11-09", undefined, [], sedes)).toBeNull();
  });

  it("con citas el mismo día toma la de más tarde", () => {
    const citas = [cita("2026-11-02", "09:00", "09:30"), cita("2026-11-02", "18:00", "18:30")];
    expect(citaAnteriorDelPaciente(citas, "p1", "2026-11-09", undefined, [], sedes)?.horaInicio).toBe("18:00");
  });

  it("sin sede estampada ni bloque que la cubra, la sede queda en null", () => {
    const citas = [cita("2026-11-02", "18:15", "19:15", { sedeId: null })];
    expect(citaAnteriorDelPaciente(citas, "p1", "2026-11-09", undefined, [], sedes)?.sedeId).toBeNull();
  });
});

describe("datosFaltantesDeCita", () => {
  const completa = {
    pideSede: true,
    sedeElegida: "emsa",
    hayPaciente: true,
    telefono: "5512345678",
    citaPorVenir: true,
    tratamientos: ["Control de ortodoncia"],
  };

  it("no avisa nada cuando está todo", () => {
    expect(datosFaltantesDeCita(completa)).toEqual([]);
  });

  it("avisa de la sede cuando hay sedes y no se eligió", () => {
    expect(datosFaltantesDeCita({ ...completa, sedeElegida: "" }).map((d) => d.clave)).toEqual(["sede"]);
    expect(datosFaltantesDeCita({ ...completa, sedeElegida: "", pideSede: false })).toEqual([]);
  });

  it("avisa del teléfono solo en citas por venir", () => {
    expect(datosFaltantesDeCita({ ...completa, telefono: " " }).map((d) => d.clave)).toEqual(["telefono"]);
    expect(datosFaltantesDeCita({ ...completa, telefono: "", citaPorVenir: false })).toEqual([]);
  });

  it("avisa del motivo, pero no antes de tener paciente", () => {
    expect(datosFaltantesDeCita({ ...completa, tratamientos: [] }).map((d) => d.clave)).toEqual(["motivo"]);
    expect(datosFaltantesDeCita({ ...completa, hayPaciente: false, telefono: "", tratamientos: [] })).toEqual([]);
  });
});
