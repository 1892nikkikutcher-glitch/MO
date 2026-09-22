import { describe, expect, it } from "vitest";
import {
  addMonths,
  estaDentroDeHorario,
  medicoPreferidoDePaciente,
  textoNoAsistioDeCita,
  toISODate,
} from "../agendaHelpers";

describe("addMonths", () => {
  it("suma meses en un caso normal (regresión, sin desborde de mes)", () => {
    expect(toISODate(addMonths(new Date(2026, 0, 15), 2))).toBe("2026-03-15");
  });

  it("cruza de año correctamente", () => {
    expect(toISODate(addMonths(new Date(2026, 10, 10), 3))).toBe("2027-02-10");
  });

  it("31 de agosto + 6 meses recorta al último día válido de febrero (no bisiesto)", () => {
    expect(toISODate(addMonths(new Date(2026, 7, 31), 6))).toBe("2027-02-28");
  });

  it("31 de agosto + 6 meses recorta a 29 de febrero en año bisiesto", () => {
    expect(toISODate(addMonths(new Date(2027, 7, 31), 6))).toBe("2028-02-29");
  });

  it("día 30 recortado en un mes corto (30 de enero + 1 mes -> 28 de febrero)", () => {
    expect(toISODate(addMonths(new Date(2026, 0, 30), 1))).toBe("2026-02-28");
  });
});

describe("estaDentroDeHorario", () => {
  const horario = { apertura: "09:00", comidaInicio: "14:00", comidaFin: "15:00", cierre: "19:00" };

  it("dentro del horario y sin cruzar la comida", () => {
    expect(estaDentroDeHorario(horario, "10:00", "10:30")).toBe(true);
  });

  it("cruza la comida", () => {
    expect(estaDentroDeHorario(horario, "13:30", "14:30")).toBe(false);
  });

  it("antes de la apertura", () => {
    expect(estaDentroDeHorario(horario, "08:00", "08:30")).toBe(false);
  });

  it("después del cierre", () => {
    expect(estaDentroDeHorario(horario, "18:30", "19:30")).toBe(false);
  });
});

describe("textoNoAsistioDeCita", () => {
  it("incluye fecha en español, hora y procedimiento", () => {
    const texto = textoNoAsistioDeCita({
      fecha: "2026-09-15",
      horaInicio: "10:00",
      tratamientos: ["Limpieza dental"],
    });
    expect(texto).toBe(
      "El paciente no se presentó a su cita programada el 15 de septiembre de 2026 a las 10:00 hrs para Limpieza dental."
    );
  });

  it("varios tratamientos se unen con coma", () => {
    const texto = textoNoAsistioDeCita({
      fecha: "2026-01-05",
      horaInicio: "09:30",
      tratamientos: ["Endodoncia OD 36", "Corona OD 36"],
    });
    expect(texto).toContain("para Endodoncia OD 36, Corona OD 36.");
  });

  it("sin tratamientos, la frase termina en la hora sin dejar un 'para' vacío", () => {
    const texto = textoNoAsistioDeCita({ fecha: "2026-09-15", horaInicio: "10:00", tratamientos: [] });
    expect(texto).toBe("El paciente no se presentó a su cita programada el 15 de septiembre de 2026 a las 10:00 hrs.");
  });

  it("una fecha con formato inválido no truena — se usa tal cual", () => {
    const texto = textoNoAsistioDeCita({ fecha: "no-es-una-fecha", horaInicio: "10:00", tratamientos: [] });
    expect(texto).toContain("no-es-una-fecha");
  });
});

describe("medicoPreferidoDePaciente", () => {
  it("sugiere el médico de la cita más reciente del paciente", () => {
    const citas = [
      { patientId: "pac1", medicoId: "med-A", fecha: "2026-08-01", estatus: "Atendida" as const },
      { patientId: "pac1", medicoId: "med-B", fecha: "2026-09-10", estatus: "Confirmada" as const },
      { patientId: "pac2", medicoId: "med-C", fecha: "2026-09-15", estatus: "Atendida" as const },
    ];
    expect(medicoPreferidoDePaciente(citas, "pac1")).toBe("med-B");
  });

  it("una cita más reciente pero cancelada no cuenta — se ignora", () => {
    const citas = [
      { patientId: "pac1", medicoId: "med-A", fecha: "2026-08-01", estatus: "Atendida" as const },
      { patientId: "pac1", medicoId: "med-B", fecha: "2026-09-10", estatus: "Cancelada" as const },
    ];
    expect(medicoPreferidoDePaciente(citas, "pac1")).toBe("med-A");
  });

  it("paciente sin ninguna cita previa con médico asignado: null, nunca inventa una sugerencia", () => {
    const citas = [{ patientId: "pac1", medicoId: null, fecha: "2026-08-01", estatus: "Atendida" as const }];
    expect(medicoPreferidoDePaciente(citas, "pac1")).toBeNull();
  });

  it("paciente que no aparece en absoluto en las citas: null", () => {
    expect(medicoPreferidoDePaciente([], "pac1")).toBeNull();
  });

  it("no mezcla las citas de otro paciente", () => {
    const citas = [
      { patientId: "pac1", medicoId: "med-A", fecha: "2026-08-01", estatus: "Atendida" as const },
      { patientId: "pac2", medicoId: "med-Z", fecha: "2026-09-20", estatus: "Atendida" as const },
    ];
    expect(medicoPreferidoDePaciente(citas, "pac1")).toBe("med-A");
  });
});
