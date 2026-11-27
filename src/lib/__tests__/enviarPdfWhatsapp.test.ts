import { afterEach, describe, expect, it, vi } from "vitest";
import { enviarPdfPorWhatsapp } from "../enviarPdfWhatsapp";

describe("enviar PDF por WhatsApp en escritorio", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("el mensaje precargado lleva solo el texto para el paciente, sin la nota interna de adjuntar", async () => {
    // Entorno de pruebas sin navegador: se simula el enlace de descarga.
    vi.stubGlobal("document", { createElement: () => ({ click: () => {} }) });

    const caption = "Receta médica — Paola Almazan · Folio 15 · 26/11/2026 07:59 pm";
    const r = await enviarPdfPorWhatsapp({
      blob: new Blob(["%PDF"], { type: "application/pdf" }),
      nombreArchivo: "Receta.pdf",
      telefono: "7291322354",
      caption,
      ventanaPrevia: null,
    });

    expect(r.requiereAbrirManualmente).toBe(true);
    if (!r.requiereAbrirManualmente) return;
    expect(r.waUrl.startsWith("https://wa.me/7291322354?text=")).toBe(true);
    const texto = decodeURIComponent(r.waUrl.split("?text=")[1]);
    expect(texto).toBe(caption);
    expect(texto).not.toMatch(/Adjunta/i);
  });
});
