import { describe, expect, it } from "vitest";
import { enlaceParaCompartir, MENSAJE_COMPARTIR_MO, REDES_COMPARTIR, urlCompartir } from "../compartirMo";

describe("enlaceParaCompartir", () => {
  it("se queda solo con el origen, sin ruta ni parámetros", () => {
    expect(enlaceParaCompartir("https://mo-ten-lime.vercel.app/pacientes?x=1#y")).toBe("https://mo-ten-lime.vercel.app");
  });

  it("si no es una URL válida la devuelve tal cual", () => {
    expect(enlaceParaCompartir("no es url")).toBe("no es url");
  });
});

describe("urlCompartir", () => {
  const enlace = "https://mo-ten-lime.vercel.app";

  it("WhatsApp lleva el mensaje y el enlace en un solo texto", () => {
    const url = new URL(urlCompartir("whatsapp", enlace));
    expect(url.origin + url.pathname).toBe("https://wa.me/");
    expect(url.searchParams.get("text")).toBe(`${MENSAJE_COMPARTIR_MO} ${enlace}`);
  });

  it("Facebook, X, LinkedIn y Telegram llevan el enlace codificado", () => {
    expect(new URL(urlCompartir("facebook", enlace)).searchParams.get("u")).toBe(enlace);
    expect(new URL(urlCompartir("x", enlace)).searchParams.get("url")).toBe(enlace);
    expect(new URL(urlCompartir("linkedin", enlace)).searchParams.get("url")).toBe(enlace);
    expect(new URL(urlCompartir("telegram", enlace)).searchParams.get("url")).toBe(enlace);
  });

  it("el correo trae asunto y el enlace en el cuerpo", () => {
    const url = urlCompartir("correo", enlace);
    expect(url.startsWith("mailto:?subject=")).toBe(true);
    expect(decodeURIComponent(url)).toContain(enlace);
  });

  it("todas las redes listadas generan una URL", () => {
    for (const red of REDES_COMPARTIR) {
      expect(urlCompartir(red.id, enlace)).toContain(encodeURIComponent(enlace).slice(0, 10));
    }
  });
});
