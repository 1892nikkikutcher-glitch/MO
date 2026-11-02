import { describe, expect, it } from "vitest";
import {
  armarCfdi,
  claveFormaPagoSat,
  conceptoCfdi,
  conceptosDePago,
  faltantesConfigTimbrado,
  fechaCfdi,
  formaPagoDelCfdi,
  leerRespuestaCancelacion,
  leerRespuestaTimbrado,
  mensajeErrorPac,
  type ConfigTimbrado,
  type PagoParaCfdi,
} from "../timbrado";
import type { DatosFiscales } from "../facturacion";

const config: ConfigTimbrado = { razonSocial: "Ana López Pérez", regimenFiscal: "612", codigoPostal: "42000", claveProdServ: "85122001", tratamientoIva: "noObjeto" };
const receptor: DatosFiscales = { rfc: "pejo900202xyz", razonSocial: "José Pérez", regimenFiscal: "605", codigoPostal: "06600", usoCfdi: "D01", correo: "" };

const pago = (id: string, total: number, formaPago = "Efectivo", lineas: { label: string; monto: number }[] = []): PagoParaCfdi => ({
  id,
  pago: { formaPago, total, lineas: lineas.map((l, i) => ({ id: `${id}l${i}`, tratamientoId: null, folio: null, ...l })) },
});

describe("configuración del emisor", () => {
  it("dice qué falta para poder timbrar", () => {
    expect(faltantesConfigTimbrado(undefined, undefined)).toEqual([
      "RFC del consultorio (Administración → Consultorio)",
      "razón social",
      "régimen fiscal",
      "código postal fiscal",
      "clave de producto o servicio (8 dígitos)",
    ]);
    expect(faltantesConfigTimbrado("LOPA800101ABC", config)).toEqual([]);
    expect(faltantesConfigTimbrado("LOPA800101ABC", { ...config, codigoPostal: "420" })).toEqual(["código postal fiscal"]);
  });
});

describe("formas de pago", () => {
  it("traduce a las claves del SAT y rechaza las que no tienen equivalencia", () => {
    expect(claveFormaPagoSat("Efectivo")).toBe("01");
    expect(claveFormaPagoSat("Transferencia")).toBe("03");
    expect(claveFormaPagoSat("Tarjeta de crédito")).toBe("04");
    expect(claveFormaPagoSat("Tarjeta de débito")).toBe("28");
    expect(claveFormaPagoSat("Cashback")).toBeNull();
    expect(formaPagoDelCfdi([pago("a", 100, "Cashback")])).toHaveProperty("error");
  });

  it("con varias formas de pago usa la que más dinero representa", () => {
    expect(formaPagoDelCfdi([pago("a", 500, "Efectivo"), pago("b", 2000, "Transferencia"), pago("c", 300, "Efectivo")])).toEqual({ clave: "03" });
  });
});

describe("conceptos", () => {
  it("un concepto por línea cuando las líneas suman el total del pago", () => {
    const p = pago("a", 1500, "Efectivo", [
      { label: "Limpieza", monto: 500 },
      { label: "Resina", monto: 1000 },
    ]);
    expect(conceptosDePago(p)).toEqual([
      { descripcion: "Limpieza", monto: 500 },
      { descripcion: "Resina", monto: 1000 },
    ]);
  });

  it("si las líneas no cuadran con el total, factura un solo concepto por el total", () => {
    const p = pago("a", 1500, "Efectivo", [{ label: "Limpieza", monto: 500 }]);
    expect(conceptosDePago(p)).toEqual([{ descripcion: "Limpieza", monto: 1500 }]);
    expect(conceptosDePago(pago("b", 300))).toEqual([{ descripcion: "Servicio dental", monto: 300 }]);
  });

  it("sin IVA: no objeto de impuesto y el monto tal cual", () => {
    const c = conceptoCfdi("Resina", 1000, config);
    expect(c).toMatchObject({ TaxObject: "01", UnitCode: "E48", ProductCode: "85122001", UnitPrice: 1000, Subtotal: 1000, Total: 1000 });
    expect(c.Taxes).toBeUndefined();
  });

  it("con IVA 16% incluido: separa subtotal e IVA", () => {
    const c = conceptoCfdi("Blanqueamiento", 1160, { ...config, tratamientoIva: "tasa16" });
    expect(c).toMatchObject({ TaxObject: "02", Subtotal: 1000, Total: 1160 });
    expect(c.Taxes).toEqual([{ Total: 160, Name: "IVA", Base: 1000, Rate: 0.16, IsRetention: false }]);
  });
});

describe("fecha del CFDI", () => {
  it("usa la hora de la Ciudad de México, dos minutos atrás", () => {
    // 1 nov 2026 18:30 UTC = 12:30 en CDMX (UTC-6, sin horario de verano)
    expect(fechaCfdi(new Date("2026-11-01T18:30:00Z"))).toBe("2026-11-01T12:28:00");
    // cruza la medianoche local: 2 nov 05:59 UTC = 1 nov 23:59 CDMX → menos 2 min
    expect(fechaCfdi(new Date("2026-11-02T05:59:00Z"))).toBe("2026-11-01T23:57:00");
  });
});

describe("armado del CFDI", () => {
  const ahora = new Date("2026-11-01T18:30:00Z");

  it("arma el cuerpo con receptor, forma de pago, serie/folio y totales", () => {
    const r = armarCfdi({ serie: "A", folio: "12", pagos: [pago("a", 1500, "Efectivo", [{ label: "Limpieza", monto: 500 }, { label: "Resina", monto: 1000 }])], receptor, config, ahora });
    if ("error" in r) throw new Error(r.error);
    expect(r.total).toBe(1500);
    expect(r.payload).toMatchObject({
      NameId: "1",
      CfdiType: "I",
      PaymentForm: "01",
      PaymentMethod: "PUE",
      ExpeditionPlace: "42000",
      Serie: "A",
      Folio: "12",
      Date: "2026-11-01T12:28:00",
      Receiver: { Rfc: "PEJO900202XYZ", Name: "José Pérez", CfdiUse: "D01", FiscalRegime: "605", TaxZipCode: "06600" },
    });
    expect((r.payload.Items as unknown[]).length).toBe(2);
  });

  it("omite serie y folio cuando van vacíos", () => {
    const r = armarCfdi({ serie: "", folio: "", pagos: [pago("a", 300)], receptor, config, ahora });
    if ("error" in r) throw new Error(r.error);
    expect(r.payload).not.toHaveProperty("Serie");
    expect(r.payload).not.toHaveProperty("Folio");
  });

  it("rechaza pagos con una forma de pago sin clave del SAT", () => {
    const r = armarCfdi({ serie: "", folio: "", pagos: [pago("a", 300, "Cashback")], receptor, config, ahora });
    expect(r).toHaveProperty("error");
  });
});

describe("respuestas del PAC", () => {
  it("lee el id y el folio fiscal de un timbrado correcto", () => {
    const r = leerRespuestaTimbrado({ Id: "Y61TLX", Total: 1500, Date: "2026-11-01T12:28:00", Complement: { TaxStamp: { Uuid: "6f1c2b3a-4d5e-4f60-8a9b-0c1d2e3f4a5b", Date: "2026-11-01T12:29:10" } } });
    expect(r).toEqual({ cfdiId: "Y61TLX", uuid: "6f1c2b3a-4d5e-4f60-8a9b-0c1d2e3f4a5b", total: 1500, fecha: "2026-11-01" });
  });

  it("sin UUID es un error, no un éxito", () => {
    expect(leerRespuestaTimbrado({ Id: "Y61TLX" })).toHaveProperty("error");
    expect(leerRespuestaTimbrado(null)).toHaveProperty("error");
  });

  it("arma un mensaje legible con los errores del PAC", () => {
    expect(mensajeErrorPac({ Message: "La solicitud no es válida.", ModelState: { "Receiver.Rfc": ["El RFC no existe."], x: ["Otro."] } }, 400)).toBe("El RFC no existe. · Otro.");
    expect(mensajeErrorPac({ Message: "Solo eso." }, 400)).toBe("Solo eso.");
    expect(mensajeErrorPac(null, 401)).toContain("credenciales");
    expect(mensajeErrorPac(null, 500)).toContain("500");
  });

  it("interpreta el estado de una cancelación", () => {
    expect(leerRespuestaCancelacion({ Status: "canceled", Message: "ok" })).toEqual({ estado: "canceled", mensaje: "ok" });
    expect(leerRespuestaCancelacion({ Status: "pending" }).estado).toBe("pending");
    expect(leerRespuestaCancelacion({ Status: "active", Message: "No cancelable" })).toEqual({ estado: "active", mensaje: "No cancelable" });
  });
});
