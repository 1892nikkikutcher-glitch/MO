import { describe, expect, it } from "vitest";
import { VISITAS_CON_LLAMADA, debeLlamarLaAtencion, leerVisitasAsistente } from "../llamadaAsistente";

describe("llamadaAsistente", () => {
  it("llama la atención en las primeras 3 visitas y luego deja de hacerlo", () => {
    expect(VISITAS_CON_LLAMADA).toBe(3);
    expect([1, 2, 3].map(debeLlamarLaAtencion)).toEqual([true, true, true]);
    expect(debeLlamarLaAtencion(4)).toBe(false);
    expect(debeLlamarLaAtencion(0)).toBe(false);
  });

  it("lee las visitas guardadas y descarta valores dañados", () => {
    expect(leerVisitasAsistente("2")).toBe(2);
    expect(leerVisitasAsistente(null)).toBe(0);
    expect(leerVisitasAsistente("abc")).toBe(0);
    expect(leerVisitasAsistente("-1")).toBe(0);
    expect(leerVisitasAsistente("1.5")).toBe(0);
  });
});
