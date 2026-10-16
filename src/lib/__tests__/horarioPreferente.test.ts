import { describe, expect, it } from "vitest";
import {
  citaEnHorarioPreferente,
  describirHorarioPreferente,
  normalizarHorarioPreferente,
  proximasPropuestasDeCita,
} from "../horarioPreferente";

const lmv = { dias: [1, 3, 5], desde: "18:00" };

describe("normalizarHorarioPreferente", () => {
  it("devuelve null si no hay nada, y limpia días repetidos, inválidos o desordenados", () => {
    expect(normalizarHorarioPreferente(null)).toBeNull();
    expect(normalizarHorarioPreferente({ dias: [], nota: "  " })).toBeNull();
    expect(normalizarHorarioPreferente({ dias: [5, 1, 1, 9, -1, 3] })).toEqual({ dias: [1, 3, 5] });
    expect(normalizarHorarioPreferente({ dias: [0, 6, 1] })?.dias).toEqual([1, 6, 0]); // lunes a domingo
  });

  it("descarta horas inválidas o un rango al revés", () => {
    expect(normalizarHorarioPreferente({ dias: [], desde: "25:00" })).toBeNull();
    expect(normalizarHorarioPreferente({ dias: [1], desde: "18:00", hasta: "09:00" })).toEqual({ dias: [1], desde: "18:00" });
    expect(normalizarHorarioPreferente({ dias: [1], desde: "09:00", hasta: "13:00", nota: " sale a las 8 " })).toEqual({
      dias: [1],
      desde: "09:00",
      hasta: "13:00",
      nota: "sale a las 8",
    });
  });
});

describe("describirHorarioPreferente", () => {
  it("lo dice en español", () => {
    expect(describirHorarioPreferente(lmv)).toBe("Lunes, miércoles y viernes · después de las 18:00");
    expect(describirHorarioPreferente({ dias: [2], hasta: "13:00" })).toBe("Martes · antes de las 13:00");
    expect(describirHorarioPreferente({ dias: [], desde: "09:00", hasta: "12:00" })).toBe("Entre las 09:00 y las 12:00");
    expect(describirHorarioPreferente({ dias: [0, 1, 2, 3, 4, 5, 6] })).toBe("Todos los días");
    expect(describirHorarioPreferente({ dias: [6], nota: "solo si hay lugar" })).toBe("Sábado (solo si hay lugar)");
    expect(describirHorarioPreferente(null)).toBe("");
  });
});

describe("citaEnHorarioPreferente", () => {
  it("compara día y hora de inicio", () => {
    expect(citaEnHorarioPreferente(lmv, "2026-10-16", "18:00")).toBe(true); // viernes 18:00
    expect(citaEnHorarioPreferente(lmv, "2026-10-16", "19:30")).toBe(true);
    expect(citaEnHorarioPreferente(lmv, "2026-10-16", "17:30")).toBe(false); // muy temprano
    expect(citaEnHorarioPreferente(lmv, "2026-10-15", "18:00")).toBe(false); // jueves
    expect(citaEnHorarioPreferente({ dias: [], hasta: "13:00" }, "2026-10-15", "13:30")).toBe(false);
  });

  it("sin preferencia no hay con qué comparar", () => {
    expect(citaEnHorarioPreferente(null, "2026-10-16", "10:00")).toBeNull();
    expect(citaEnHorarioPreferente({ dias: [], nota: "algo" }, "2026-10-16", "10:00")).toBeNull();
  });
});

describe("proximasPropuestasDeCita", () => {
  it("propone las próximas fechas que le acomodan, con su hora", () => {
    // Miércoles 14 oct. 2026
    const r = proximasPropuestasDeCita(lmv, new Date(2026, 9, 14), 3);
    expect(r.map((p) => p.fecha)).toEqual(["2026-10-14", "2026-10-16", "2026-10-19"]);
    expect(r.every((p) => p.hora === "18:00")).toBe(true);
    expect(r[0].etiqueta).toBe("Mié 14 oct · 18:00");
  });

  it("solo con horas propone días hábiles; sin preferencia no propone nada", () => {
    const r = proximasPropuestasDeCita({ dias: [], desde: "16:00" }, new Date(2026, 9, 17), 2); // sábado
    expect(r.map((p) => p.fecha)).toEqual(["2026-10-17", "2026-10-19"]); // se salta el domingo
    expect(proximasPropuestasDeCita(null, new Date(), 3)).toEqual([]);
  });
});
