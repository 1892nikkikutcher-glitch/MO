import { describe, expect, it } from "vitest";
import {
  DIAS_VIGENCIA_ENLACE_RECIBO,
  enlaceVigente,
  fechaDeVencimiento,
  mensajeConEnlaceRecibo,
  reciboCompartidoSchema,
  tokenReciboValido,
  urlRecibo,
} from "../recibosCompartidos";

const valido = {
  clinicaId: "clinica1",
  pacienteNombre: "María del Carmen Paloma",
  clinicaNombre: "Sonríe X Todos Dental",
  pago: {
    id: "1700000000000",
    fecha: "22/10/2026",
    medico: "Dra. Ana",
    formaPago: "Efectivo",
    total: 1000,
    facturar: false,
    firma: null,
    lineas: [{ id: "l1", label: "Endodoncia", monto: 1000, tratamientoId: "t1", folio: "1001" }],
  },
};

describe("datos del recibo compartido", () => {
  it("acepta un recibo normal y rellena lo opcional", () => {
    const r = reciboCompartidoSchema.parse(valido);
    expect(r.logoClinicaUrl).toBe("");
    expect(r.notaPie).toBe("");
    expect(r.pago.firma).toBeNull();
  });

  it("rechaza campos que no son del recibo (no se cuela teléfono ni correo)", () => {
    expect(reciboCompartidoSchema.safeParse({ ...valido, telefono: "7751234567" }).success).toBe(false);
    expect(reciboCompartidoSchema.safeParse({ ...valido, pago: { ...valido.pago, notasClinicas: "x" } }).success).toBe(false);
  });

  it("rechaza montos absurdos, recibos sin conceptos válidos o firmas gigantes", () => {
    expect(reciboCompartidoSchema.safeParse({ ...valido, pago: { ...valido.pago, total: -5 } }).success).toBe(false);
    expect(reciboCompartidoSchema.safeParse({ ...valido, pago: { ...valido.pago, total: Number.NaN } }).success).toBe(false);
    expect(reciboCompartidoSchema.safeParse({ ...valido, pago: { ...valido.pago, firma: "x".repeat(400_001) } }).success).toBe(false);
    expect(reciboCompartidoSchema.safeParse({ ...valido, clinicaId: "" }).success).toBe(false);
  });
});

describe("la liga", () => {
  it("arma la URL con el token", () => {
    expect(urlRecibo("abc", "https://mo-ten-lime.vercel.app")).toBe("https://mo-ten-lime.vercel.app/recibo/abc");
  });

  it("solo acepta tokens de 48 caracteres hexadecimales", () => {
    expect(tokenReciboValido("a".repeat(48))).toBe(true);
    expect(tokenReciboValido("A".repeat(48))).toBe(false);
    expect(tokenReciboValido("a".repeat(47))).toBe(false);
    expect(tokenReciboValido("../../etc/passwd")).toBe(false);
    expect(tokenReciboValido("")).toBe(false);
  });

  it("vence a los 90 días", () => {
    const ahora = new Date("2026-10-22T12:00:00.000Z");
    const vence = fechaDeVencimiento(ahora);
    expect(DIAS_VIGENCIA_ENLACE_RECIBO).toBe(90);
    expect(vence.slice(0, 10)).toBe("2027-01-20");
    expect(enlaceVigente(vence, ahora)).toBe(true);
    expect(enlaceVigente(vence, new Date("2027-01-21T00:00:00.000Z"))).toBe(false);
    expect(enlaceVigente(undefined, ahora)).toBe(false);
  });

  it("el mensaje de WhatsApp lleva el texto del recibo y la liga", () => {
    const m = mensajeConEnlaceRecibo("Hola, María.\nGracias por tu pago.  ", "https://x.test/recibo/abc");
    expect(m).toBe("Hola, María.\nGracias por tu pago.\n\nDescarga tu recibo en PDF aquí:\nhttps://x.test/recibo/abc");
  });
});
