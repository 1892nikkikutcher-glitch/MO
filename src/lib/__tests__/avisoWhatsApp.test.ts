import { describe, expect, it } from "vitest";
import { mensajeAvisoCaso, urlWhatsApp } from "../avisoWhatsApp";

describe("urlWhatsApp", () => {
  it("antepone 52 a un número de 10 dígitos y limpia el formato", () => {
    expect(urlWhatsApp("(722) 123-4567", "hola")).toBe("https://wa.me/527221234567?text=hola");
  });
  it("respeta un número que ya trae código de país", () => {
    expect(urlWhatsApp("+52 722 123 4567", "a b")).toBe("https://wa.me/527221234567?text=a%20b");
  });
  it("sin número abre el selector de contactos de WhatsApp", () => {
    expect(urlWhatsApp("", "hola")).toBe("https://wa.me/?text=hola");
  });
});

describe("mensajeAvisoCaso", () => {
  it("saluda por el primer nombre sin el título y no incluye datos del paciente", () => {
    const m = mensajeAvisoCaso("Dra. Mariana Solís Ortega");
    expect(m.startsWith("Hola Mariana,")).toBe(true);
    expect(m).toContain("Recibidos");
  });
  it("sin nombre sigue siendo un mensaje válido", () => {
    expect(mensajeAvisoCaso("").startsWith("Hola,")).toBe(true);
  });
});
