import { describe, expect, it } from "vitest";
import { fechaDeHoyLarga, msHastaMedianoche, tituloYNombre, TITULOS_SUGERIDOS } from "../encabezadoClinica";

describe("encabezado de la clínica", () => {
  it("escribe la fecha de hoy con el día de la semana", () => {
    expect(fechaDeHoyLarga(new Date(2026, 9, 20))).toBe("martes 20 de octubre de 2026");
    expect(fechaDeHoyLarga(new Date(2026, 0, 1))).toBe("jueves 1 de enero de 2026");
    expect(fechaDeHoyLarga(new Date(2025, 11, 31))).toBe("miércoles 31 de diciembre de 2025");
  });

  it("junta título y nombre", () => {
    expect(tituloYNombre("C.D.", "Nicolás Medina González")).toBe("C.D. Nicolás Medina González");
    expect(tituloYNombre("  C.D.E.O. ", "  Juanito   Banana ")).toBe("C.D.E.O. Juanito Banana");
    expect(tituloYNombre("", "Nicolás Medina")).toBe("Nicolás Medina");
    expect(tituloYNombre(undefined, "Nicolás Medina")).toBe("Nicolás Medina");
  });

  it("sin nombre no hay nada que mostrar, aunque haya título", () => {
    expect(tituloYNombre("C.D.", "")).toBe("");
    expect(tituloYNombre("C.D.", undefined)).toBe("");
    expect(tituloYNombre("C.D.", "   ")).toBe("");
  });

  it("calcula cuánto falta para la medianoche", () => {
    expect(msHastaMedianoche(new Date(2026, 9, 20, 23, 59, 0))).toBe(60_000);
    expect(msHastaMedianoche(new Date(2026, 9, 20, 0, 0, 0))).toBe(86_400_000);
    // Cruza fin de mes y de año sin problema.
    expect(msHastaMedianoche(new Date(2025, 11, 31, 23, 0, 0))).toBe(3_600_000);
  });

  it("sugiere los títulos habituales, incluido el de ortodoncia", () => {
    expect(TITULOS_SUGERIDOS).toContain("C.D.");
    expect(TITULOS_SUGERIDOS).toContain("C.D.E.O.");
    expect(TITULOS_SUGERIDOS).toContain("Dr.");
  });
});
