import { describe, expect, it } from "vitest";
import { sinIndefinidos } from "../conectaServerPuro";

describe("sinIndefinidos", () => {
  it("quita undefined de primer nivel", () => {
    expect(sinIndefinidos({ a: 1, b: undefined })).toEqual({ a: 1 });
  });

  it("quita undefined dentro de objetos anidados (ej. resumenPaciente.sexo)", () => {
    const resultado = sinIndefinidos({
      nombre: "Fernando",
      resumenPaciente: { nombre: "Fernando", sexo: undefined, alergias: undefined, condicionesSistemicas: [] },
    });
    expect(resultado).toEqual({
      nombre: "Fernando",
      resumenPaciente: { nombre: "Fernando", condicionesSistemicas: [] },
    });
  });

  it("no toca arreglos ni sus elementos", () => {
    const arreglo = [{ a: undefined, b: 1 }];
    const resultado = sinIndefinidos({ historial: arreglo });
    expect(resultado.historial).toBe(arreglo);
  });
});
