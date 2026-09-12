import { describe, expect, it } from "vitest";
import { sonEquivalentes } from "../deepEqual";

describe("sonEquivalentes", () => {
  it("compara primitivos directamente", () => {
    expect(sonEquivalentes(1, 1)).toBe(true);
    expect(sonEquivalentes(1, 2)).toBe(false);
    expect(sonEquivalentes("a", "a")).toBe(true);
    expect(sonEquivalentes(null, null)).toBe(true);
    expect(sonEquivalentes(null, undefined)).toBe(false);
  });

  it("ignora el orden de las llaves — el caso que rompía JSON.stringify", () => {
    const a = { nombre: "Juan", edad: 30, activo: true };
    const b = { activo: true, edad: 30, nombre: "Juan" };
    expect(JSON.stringify(a) === JSON.stringify(b)).toBe(false); // el bug original
    expect(sonEquivalentes(a, b)).toBe(true); // el fix
  });

  it("detecta una diferencia real de valor aunque el orden también cambie", () => {
    const a = { nombre: "Juan", edad: 30 };
    const b = { edad: 31, nombre: "Juan" };
    expect(sonEquivalentes(a, b)).toBe(false);
  });

  it("compara objetos anidados sin importar el orden en ningún nivel", () => {
    const a = { porPregunta: { p1: "x", p2: "y" }, actualizadoEn: "2026-01-01" };
    const b = { actualizadoEn: "2026-01-01", porPregunta: { p2: "y", p1: "x" } };
    expect(sonEquivalentes(a, b)).toBe(true);
  });

  it("en arreglos SÍ importa el orden", () => {
    expect(sonEquivalentes([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(sonEquivalentes([1, 2, 3], [3, 2, 1])).toBe(false);
  });

  it("detecta cuando un lado tiene una llave de más", () => {
    expect(sonEquivalentes({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });

  it("un objeto nunca es equivalente a un arreglo aunque el contenido se parezca", () => {
    expect(sonEquivalentes({ 0: "a", 1: "b" }, ["a", "b"])).toBe(false);
  });
});
