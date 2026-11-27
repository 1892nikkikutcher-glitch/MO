import { describe, expect, it } from "vitest";
import { pruebaVencida, tieneCortesia } from "../patientData";

describe("acceso de cortesía", () => {
  it("solo cuenta cuando la clínica la tiene encendida", () => {
    expect(tieneCortesia({ cortesia: true })).toBe(true);
    expect(tieneCortesia({ cortesia: false })).toBe(false);
    expect(tieneCortesia({})).toBe(false);
    expect(tieneCortesia(null)).toBe(false);
    expect(tieneCortesia(undefined)).toBe(false);
  });

  it("una prueba vencida sigue vencida: la cortesía se aplica aparte (Dashboard y panel la consultan primero)", () => {
    expect(pruebaVencida({ planActivo: "prueba", pruebaIniciadaEl: "2026-01-01" })).toBe(true);
    expect(tieneCortesia({ cortesia: true }) || pruebaVencida({ planActivo: "prueba", pruebaIniciadaEl: "2026-01-01" })).toBe(true);
    // El bloqueo real es: !tieneCortesia && pruebaVencida
    expect(!tieneCortesia({ cortesia: true }) && pruebaVencida({ planActivo: "prueba", pruebaIniciadaEl: "2026-01-01" })).toBe(false);
  });
});
