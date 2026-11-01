import { describe, expect, it } from "vitest";
import {
  faltantesFiscales,
  filasCsvFacturas,
  filtrarFacturas,
  folioFiscalValido,
  folioRepetido,
  formaPagoDeGrupo,
  mensajeFacturaLista,
  mensajeSolicitarDatosFiscales,
  pagosPendientesDeFacturar,
  pagosYaFacturados,
  resumenFacturas,
  rfcValido,
  seriesUsadas,
  siguienteFolio,
  totalDePagos,
  type Factura,
} from "../facturacion";
import type { PagoRealizado } from "../pagosRealizados";

const HOY = new Date(2026, 10, 1); // 1 de noviembre de 2026

const realizado = (id: string, extra: { fecha?: string; facturar?: boolean; total?: number; formaPago?: string; patientId?: string } = {}): PagoRealizado => ({
  id,
  patientId: extra.patientId ?? "p1",
  patientName: "Ana López",
  pago: { id, fecha: extra.fecha ?? "20/10/2026", medico: "Dra. Ana", formaPago: extra.formaPago ?? "Efectivo", lineas: [], total: extra.total ?? 1000, facturar: extra.facturar ?? true, firma: null },
  registradoEn: "2026-10-20T10:00:00.000Z",
  registradoPor: "a@b.mx",
});

const factura = (extra: Partial<Factura> = {}): Factura => ({
  id: "f1",
  patientId: "p1",
  patientName: "Ana López",
  pagoIds: ["a"],
  rfc: "LOPA800101ABC",
  razonSocial: "Ana López",
  regimenFiscal: "612",
  codigoPostal: "42000",
  usoCfdi: "D01",
  serie: "A",
  folio: "10",
  uuid: "",
  fecha: "2026-10-25",
  total: 1000,
  formaPago: "Efectivo",
  estado: "emitida",
  notas: "",
  registradaPor: "a@b.mx",
  creadoEn: "2026-10-25T10:00:00.000Z",
  ...extra,
});

describe("validaciones fiscales", () => {
  it("acepta RFC de persona física, moral y genéricos; rechaza los mal formados", () => {
    expect(rfcValido("LOPA800101ABC")).toBe(true);
    expect(rfcValido("lopa800101abc")).toBe(true);
    expect(rfcValido("ABC800101XY1")).toBe(true);
    expect(rfcValido("XAXX010101000")).toBe(true);
    expect(rfcValido("LOPA8001")).toBe(false);
    expect(rfcValido("1234567890123")).toBe(false);
  });

  it("valida el folio fiscal (UUID)", () => {
    expect(folioFiscalValido("6f1c2b3a-4d5e-4f60-8a9b-0c1d2e3f4a5b")).toBe(true);
    expect(folioFiscalValido("6F1C2B3A-4D5E-4F60-8A9B-0C1D2E3F4A5B")).toBe(true);
    expect(folioFiscalValido("123")).toBe(false);
  });

  it("dice qué le falta a los datos fiscales", () => {
    expect(faltantesFiscales(undefined)).toEqual(["RFC", "nombre o razón social", "régimen fiscal", "código postal fiscal", "uso de CFDI"]);
    expect(faltantesFiscales({ rfc: "LOPA800101ABC", razonSocial: "Ana", regimenFiscal: "612", codigoPostal: "42000", usoCfdi: "D01" })).toEqual([]);
    expect(faltantesFiscales({ rfc: "MAL", razonSocial: "Ana", regimenFiscal: "612", codigoPostal: "4200", usoCfdi: "D01" })).toEqual(["RFC válido", "código postal fiscal"]);
  });
});

describe("pagos pendientes de facturar", () => {
  it("solo los marcados para facturar y sin factura vigente, del más antiguo al más reciente", () => {
    const realizados = [
      realizado("a", { fecha: "25/10/2026" }),
      realizado("b", { fecha: "05/10/2026" }),
      realizado("c", { facturar: false }),
      realizado("d", { fecha: "10/10/2026" }),
    ];
    const facturas = [factura({ pagoIds: ["d"] })];
    const r = pagosPendientesDeFacturar(realizados, facturas, HOY);
    expect(r.map((x) => x.registro.id)).toEqual(["b", "a"]);
    expect(r[0].dias).toBe(27);
    expect(r[1].fechaISO).toBe("2026-10-25");
  });

  it("una factura cancelada libera sus pagos para facturarlos de nuevo", () => {
    const realizados = [realizado("a")];
    expect(pagosPendientesDeFacturar(realizados, [factura({ pagoIds: ["a"] })], HOY)).toHaveLength(0);
    expect(pagosPendientesDeFacturar(realizados, [factura({ pagoIds: ["a"], estado: "cancelada" })], HOY)).toHaveLength(1);
    expect([...pagosYaFacturados([factura({ estado: "cancelada" })])]).toEqual([]);
  });

  it("suma el total y resume la forma de pago", () => {
    const pagos = [realizado("a", { total: 1500.5 }), realizado("b", { total: 499.5, formaPago: "Tarjeta" })];
    expect(totalDePagos(pagos)).toBe(2000);
    expect(formaPagoDeGrupo(pagos)).toBe("Varias");
    expect(formaPagoDeGrupo([pagos[0]])).toBe("Efectivo");
    expect(formaPagoDeGrupo([])).toBe("");
  });
});

describe("folios", () => {
  it("sugiere el siguiente folio de la serie y detecta repetidos", () => {
    const facturas = [factura({ id: "1", serie: "A", folio: "10" }), factura({ id: "2", serie: "A", folio: "12" }), factura({ id: "3", serie: "B", folio: "99" })];
    expect(siguienteFolio(facturas, "A")).toBe("13");
    expect(siguienteFolio(facturas, "a")).toBe("13");
    expect(siguienteFolio(facturas, "C")).toBe("1");
    expect(folioRepetido(facturas, "A", "12")).toBe(true);
    expect(folioRepetido(facturas, "A", "12", "2")).toBe(false);
    expect(folioRepetido(facturas, "A", "13")).toBe(false);
    expect(folioRepetido([factura({ estado: "cancelada" })], "A", "10")).toBe(false);
  });
});

describe("búsqueda y resumen", () => {
  const lista = [
    factura({ id: "1", folio: "10", fecha: "2026-10-05", patientName: "Ana López", total: 1000 }),
    factura({ id: "2", folio: "11", fecha: "2026-10-20", patientName: "José Pérez", rfc: "PEJO900202XYZ", total: 2500, serie: "B" }),
    factura({ id: "3", folio: "12", fecha: "2026-10-28", patientName: "Luz Ruiz", total: 700, estado: "cancelada" }),
  ];
  const sinFiltro = { texto: "", desde: "", hasta: "", serie: "", estado: "todas" as const };

  it("busca sin importar acentos ni mayúsculas, por paciente, RFC o folio", () => {
    expect(filtrarFacturas(lista, { ...sinFiltro, texto: "jose perez" }).map((f) => f.id)).toEqual(["2"]);
    expect(filtrarFacturas(lista, { ...sinFiltro, texto: "pejo9002" }).map((f) => f.id)).toEqual(["2"]);
    expect(filtrarFacturas(lista, { ...sinFiltro, texto: "A-10" }).map((f) => f.id)).toEqual(["1"]);
  });

  it("filtra por fechas, serie y estado, con las más recientes primero", () => {
    expect(filtrarFacturas(lista, sinFiltro).map((f) => f.id)).toEqual(["3", "2", "1"]);
    expect(filtrarFacturas(lista, { ...sinFiltro, desde: "2026-10-10", hasta: "2026-10-25" }).map((f) => f.id)).toEqual(["2"]);
    expect(filtrarFacturas(lista, { ...sinFiltro, serie: "B" }).map((f) => f.id)).toEqual(["2"]);
    expect(filtrarFacturas(lista, { ...sinFiltro, estado: "cancelada" }).map((f) => f.id)).toEqual(["3"]);
  });

  it("el total facturado no cuenta las canceladas", () => {
    expect(resumenFacturas(lista)).toEqual({ emitidas: 2, totalFacturado: 3500, canceladas: 1, totalCancelado: 700 });
    expect(seriesUsadas(lista)).toEqual(["A", "B"]);
  });

  it("exporta una fila por factura con su estado", () => {
    const filas = filasCsvFacturas(lista);
    expect(filas).toHaveLength(3);
    expect(filas[0][0]).toBe("A");
    expect(filas[2][12]).toBe("Cancelada");
    expect(filas[1][12]).toBe("Emitida");
  });
});

describe("mensajes", () => {
  it("pide los datos que faltan o, si no se sabe cuáles, todos", () => {
    const t = mensajeSolicitarDatosFiscales({ clinica: "Clínica Sonrisa", paciente: "Ana López", faltan: ["RFC"] });
    expect(t).toContain("Hola Ana");
    expect(t).toContain("Clínica Sonrisa");
    expect(t).toContain("RFC.");
    expect(t).toContain("Constancia de Situación Fiscal");
    expect(mensajeSolicitarDatosFiscales({ clinica: "", paciente: "", faltan: [] })).toContain("régimen fiscal");
    expect(mensajeSolicitarDatosFiscales({ clinica: "", paciente: "", faltan: [] })).toContain("te escribimos del consultorio");
  });

  it("avisa que la factura está lista con folio, fecha y total", () => {
    const t = mensajeFacturaLista({ clinica: "Clínica Sonrisa", factura: factura({ folio: "10", total: 1234.5 }) });
    expect(t).toContain("factura A-10");
    expect(t).toContain("25 de octubre de 2026");
    expect(t).toContain("1,234.50");
  });
});
