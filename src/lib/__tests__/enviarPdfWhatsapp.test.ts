import { afterEach, describe, expect, it, vi } from "vitest";
import { abrirVentanaPreviaWhatsapp, archivoPendiente, enviarPdfPorWhatsapp, limpiarArchivoPendiente } from "../enviarPdfWhatsapp";

const pdf = () => new Blob(["%PDF"], { type: "application/pdf" });
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";

describe("enviar PDF por WhatsApp en escritorio", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("el mensaje precargado lleva solo el texto para el paciente, sin la nota interna de adjuntar", async () => {
    // Entorno de pruebas sin navegador: se simula el enlace de descarga.
    vi.stubGlobal("document", { createElement: () => ({ click: () => {} }) });

    const caption = "Receta médica — Paola Almazan · Folio 15 · 26/11/2026 07:59 pm";
    const r = await enviarPdfPorWhatsapp({ blob: pdf(), nombreArchivo: "Receta.pdf", telefono: "7291322354", caption, ventanaPrevia: null });

    expect(r.requiereAbrirManualmente).toBe(true);
    if (!r.requiereAbrirManualmente) return;
    expect(r.waUrl.startsWith("https://wa.me/7291322354?text=")).toBe(true);
    const texto = decodeURIComponent(r.waUrl.split("?text=")[1]);
    expect(texto).toBe(caption);
    expect(texto).not.toMatch(/Adjunta/i);
  });
});

describe("enviar PDF por WhatsApp en iPhone", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    limpiarArchivoPendiente();
  });

  it("si Safari rechaza el menú de compartir (toque ya vencido), deja el PDF listo para un segundo toque", async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error("The request is not allowed by the user agent or the platform in the current context"), { name: "NotAllowedError" }));
    vi.stubGlobal("navigator", { userAgent: IPHONE, canShare: () => true, share });

    const r = await enviarPdfPorWhatsapp({ blob: pdf(), nombreArchivo: "Receta.pdf", telefono: "7291322354", caption: "Receta", ventanaPrevia: null });

    expect(r.requiereAbrirManualmente).toBe(true);
    expect(archivoPendiente()?.name).toBe("Receta.pdf");
    expect(archivoPendiente()?.type).toBe("application/pdf");
  });

  it("si el menú de compartir abre bien, no queda nada pendiente", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { userAgent: IPHONE, canShare: () => true, share });

    const r = await enviarPdfPorWhatsapp({ blob: pdf(), nombreArchivo: "Receta.pdf", caption: "Receta", ventanaPrevia: null });

    expect(r).toEqual({ requiereAbrirManualmente: false });
    expect(archivoPendiente()).toBeNull();
  });

  it("cerrar el menú de compartir no es un error ni deja pendiente", async () => {
    const share = vi.fn().mockRejectedValue(Object.assign(new Error("cancelado"), { name: "AbortError" }));
    vi.stubGlobal("navigator", { userAgent: IPHONE, canShare: () => true, share });

    const r = await enviarPdfPorWhatsapp({ blob: pdf(), nombreArchivo: "Receta.pdf", caption: "Receta", ventanaPrevia: null });

    expect(r).toEqual({ requiereAbrirManualmente: false });
    expect(archivoPendiente()).toBeNull();
  });

  it("en celular no se abre la pestaña en blanco; en escritorio sí", () => {
    const open = vi.fn(() => ({}) as Window);
    vi.stubGlobal("window", { open });

    vi.stubGlobal("navigator", { userAgent: IPHONE });
    expect(abrirVentanaPreviaWhatsapp()).toBeNull();
    expect(open).not.toHaveBeenCalled();

    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36" });
    expect(abrirVentanaPreviaWhatsapp()).not.toBeNull();
    expect(open).toHaveBeenCalledTimes(1);
  });
});
