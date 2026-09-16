import { describe, expect, it } from "vitest";
import { normalizarTelefono } from "../pacienteGlobal";

describe("normalizarTelefono", () => {
  it("se queda solo con los dígitos", () => {
    expect(normalizarTelefono("55-1234-5678")).toBe("5512345678");
  });

  it("ignora el código de país y espacios", () => {
    expect(normalizarTelefono("+52 55 1234 5678")).toBe("5512345678");
  });

  it("dos formatos distintos del mismo número normalizan igual", () => {
    expect(normalizarTelefono("(55) 1234-5678")).toBe(normalizarTelefono("5512345678"));
  });

  it("con un 1 nacional de más antes del número, se queda con los últimos 10 dígitos", () => {
    expect(normalizarTelefono("+52 1 55 1234 5678")).toBe("5512345678");
  });
});
