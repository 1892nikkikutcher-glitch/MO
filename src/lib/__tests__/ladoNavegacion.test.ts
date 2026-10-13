import { describe, expect, it } from "vitest";
import { claveLadoNavegacion, ladoOpuesto, normalizarLadoNavegacion } from "../ladoNavegacion";

describe("ladoNavegacion", () => {
  it("solo 'izquierda' cambia el lado; cualquier otra cosa es la derecha de siempre", () => {
    expect(normalizarLadoNavegacion("izquierda")).toBe("izquierda");
    expect(normalizarLadoNavegacion("derecha")).toBe("derecha");
    expect(normalizarLadoNavegacion(null)).toBe("derecha");
    expect(normalizarLadoNavegacion(undefined)).toBe("derecha");
    expect(normalizarLadoNavegacion("arriba")).toBe("derecha");
  });

  it("alterna entre los dos lados", () => {
    expect(ladoOpuesto("derecha")).toBe("izquierda");
    expect(ladoOpuesto("izquierda")).toBe("derecha");
  });

  it("cada usuario tiene su propia clave", () => {
    expect(claveLadoNavegacion("a")).not.toBe(claveLadoNavegacion("b"));
  });
});
