import { describe, expect, it } from "vitest";
import { calcularEconomiaRelativa } from "../comparativaRehabilitacion";

describe("calcularEconomiaRelativa", () => {
  it("el más barato obtiene 5, el más caro obtiene 1", () => {
    const [barato, medio, caro] = calcularEconomiaRelativa([1000, 5500, 10000]);
    expect(barato).toBe(5);
    expect(caro).toBe(1);
    expect(medio).toBeGreaterThan(1);
    expect(medio).toBeLessThan(5);
  });

  it("si todos cuestan igual, todos obtienen 3 (neutral)", () => {
    expect(calcularEconomiaRelativa([4000, 4000, 4000])).toEqual([3, 3, 3]);
  });

  it("un solo total también da 3 (no hay con qué comparar)", () => {
    expect(calcularEconomiaRelativa([4000])).toEqual([3]);
  });

  it("arreglo vacío regresa arreglo vacío", () => {
    expect(calcularEconomiaRelativa([])).toEqual([]);
  });

  it("escala linealmente con 4 opciones", () => {
    const niveles = calcularEconomiaRelativa([1000, 2000, 3000, 4000]);
    expect(niveles).toEqual([5, 4, 2, 1]);
  });

  it("el orden de entrada no importa — cada total conserva su propio nivel", () => {
    const niveles = calcularEconomiaRelativa([10000, 1000, 5500]);
    expect(niveles[0]).toBe(1); // el de 10000, el más caro
    expect(niveles[1]).toBe(5); // el de 1000, el más barato
  });
});
