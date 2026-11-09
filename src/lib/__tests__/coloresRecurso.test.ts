import { describe, expect, it } from "vitest";
import { elegirColorDisponible, nombreDeColorRecurso, RECURSO_COLORES, RECURSO_COLOR_PALETTE } from "../patientData";

describe("paleta de colores de médicos y unidades", () => {
  it("no repite colores ni nombres", () => {
    expect(new Set(RECURSO_COLOR_PALETTE.map((c) => c.toLowerCase())).size).toBe(RECURSO_COLOR_PALETTE.length);
    expect(new Set(RECURSO_COLORES.map((c) => c.nombre)).size).toBe(RECURSO_COLORES.length);
  });

  it("todos son colores hexadecimales completos", () => {
    for (const c of RECURSO_COLOR_PALETTE) expect(c).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("incluye Aguacate y Cian", () => {
    expect(nombreDeColorRecurso("#C3CC54")).toBe("Aguacate");
    expect(nombreDeColorRecurso("#3FD3F3")).toBe("Cian");
  });

  it("el nombre se busca sin importar mayúsculas y un color viejo no tiene nombre", () => {
    expect(nombreDeColorRecurso("#c3cc54")).toBe("Aguacate");
    expect(nombreDeColorRecurso("#123456")).toBe("");
  });

  it("los primeros ocho son los de siempre, así que los recursos nuevos estrenan los mismos", () => {
    expect(RECURSO_COLOR_PALETTE.slice(0, 3)).toEqual(["#5D00FF", "#CEFF05", "#3FD3F3"]);
    expect(elegirColorDisponible([])).toBe("#5D00FF");
    expect(elegirColorDisponible(["#5D00FF", "#CEFF05"])).toBe("#3FD3F3");
  });

  it("cuando ya se usaron los de siempre, el siguiente es uno de los nuevos", () => {
    const usados = RECURSO_COLOR_PALETTE.slice(0, 8);
    expect(elegirColorDisponible(usados)).toBe("#C0352A");
  });
});
