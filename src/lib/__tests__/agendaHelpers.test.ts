import { describe, expect, it } from "vitest";
import { addMonths, estaDentroDeHorario, toISODate } from "../agendaHelpers";

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
