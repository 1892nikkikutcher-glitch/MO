import { describe, expect, it } from "vitest";
import { bloquesOcupados, rangoValido } from "../calendarioOcupacion";

const cita = (fecha: string, horaInicio: string, horaFin: string, estatus = "Confirmada", over = {}) => ({
  fecha,
  horaInicio,
  horaFin,
  estatus,
  medicoId: "r1",
  ...over,
});

describe("bloquesOcupados", () => {
  it("solo devuelve horarios, sin ningún dato de la cita", () => {
    const r = bloquesOcupados([{ ...cita("2026-10-06", "09:00", "10:00"), pacienteNombre: "SECRETO", costo: "$9" } as never], "r1", "2026-10-01", "2026-10-31");
    expect(r).toEqual([{ fecha: "2026-10-06", inicio: "09:00", fin: "10:00" }]);
    expect(JSON.stringify(r)).not.toContain("SECRETO");
  });

  it("las citas canceladas, reagendadas o de no asistió dejan el horario libre", () => {
    const r = bloquesOcupados(
      [cita("2026-10-06", "09:00", "10:00", "Cancelada"), cita("2026-10-06", "10:00", "11:00", "Reagendada"), cita("2026-10-06", "11:00", "12:00", "No Asistió"), cita("2026-10-06", "12:00", "13:00", "Atendida")],
      "r1",
      "2026-10-01",
      "2026-10-31"
    );
    expect(r).toEqual([{ fecha: "2026-10-06", inicio: "12:00", fin: "13:00" }]);
  });

  it("junta las citas que se encimen o se toquen en un solo bloque", () => {
    const r = bloquesOcupados(
      [cita("2026-10-06", "09:00", "09:45"), cita("2026-10-06", "09:30", "10:30"), cita("2026-10-06", "10:30", "11:00"), cita("2026-10-06", "13:00", "14:00")],
      "r1",
      "2026-10-01",
      "2026-10-31"
    );
    expect(r).toEqual([
      { fecha: "2026-10-06", inicio: "09:00", fin: "11:00" },
      { fecha: "2026-10-06", inicio: "13:00", fin: "14:00" },
    ]);
  });

  it("filtra por recurso (médico, unidad o recurso) y por rango", () => {
    const r = bloquesOcupados(
      [
        cita("2026-10-06", "09:00", "10:00", "Confirmada", { medicoId: "otro" }),
        cita("2026-10-07", "09:00", "10:00", "Confirmada", { medicoId: null, unidadId: "r1" }),
        cita("2026-11-07", "09:00", "10:00"),
      ],
      "r1",
      "2026-10-01",
      "2026-10-31"
    );
    expect(r).toEqual([{ fecha: "2026-10-07", inicio: "09:00", fin: "10:00" }]);
  });
});

describe("rangoValido", () => {
  it("acepta rangos normales y rechaza fechas raras o rangos enormes", () => {
    expect(rangoValido("2026-10-05", "2026-10-11")).toBe(true);
    expect(rangoValido("2026-10-11", "2026-10-05")).toBe(false);
    expect(rangoValido("2026-1-5", "2026-10-11")).toBe(false);
    expect(rangoValido("2026-01-01", "2026-12-31")).toBe(false);
  });
});
