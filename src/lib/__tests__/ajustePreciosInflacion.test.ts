import { describe, expect, it } from "vitest";
import { ajustePendiente, aplicarPorcentaje, calcularAjustePrecios, mesesDesdeAjuste, proximoPrimeroDeEnero, redondearPrecio, siguienteAjuste, tocaAjusteAnual } from "../ajustePreciosInflacion";
import type { Procedimiento } from "../procedimientos";

const proc = (id: string, costoPaciente: number, extra: Partial<Procedimiento> = {}): Procedimiento => ({
  id,
  nombre: id,
  especialidad: "Odontología General",
  costoPaciente,
  costoOdontologo: 0,
  duracionMinutos: 30,
  ...extra,
});

describe("redondearPrecio", () => {
  it("redondea al múltiplo más cercano", () => {
    expect(redondearPrecio(1043.5, 1)).toBe(1044);
    expect(redondearPrecio(1043, 5)).toBe(1045);
    expect(redondearPrecio(1041, 10)).toBe(1040);
    expect(redondearPrecio(1025, 50)).toBe(1050);
    expect(redondearPrecio(1024, 50)).toBe(1000);
  });
  it("aplica el porcentaje y redondea", () => {
    expect(aplicarPorcentaje(1000, 4.5, 10)).toBe(1050);
    expect(aplicarPorcentaje(850, 4.5, 1)).toBe(888);
  });
});

describe("calcularAjustePrecios", () => {
  const base = { porcentaje: 5, paso: 10, incluirCostos: false };

  it("sube el precio de todos los que tienen precio y deja en paz los de $0", () => {
    const r = calcularAjustePrecios([proc("a", 1000), proc("b", 0), proc("c", 4500)], base);
    expect(r.map((c) => [c.id, c.nuevoCostoPaciente])).toEqual([
      ["a", 1050],
      ["c", 4730],
    ]);
  });

  it("no toca el costo al odontólogo salvo que se pida, y entonces solo si está configurado", () => {
    const lista = [
      proc("a", 1000, { costoOdontologo: 300 }),
      proc("b", 1000, { costoOdontologo: 0, costoSinConfigurar: true }),
      proc("c", 1000, { costoOdontologo: 200, costoSinConfigurar: true }),
    ];
    expect(calcularAjustePrecios(lista, base)[0].campos).toEqual({ costoPaciente: 1050 });
    const con = calcularAjustePrecios(lista, { ...base, incluirCostos: true });
    expect(con[0].campos).toEqual({ costoPaciente: 1050, costoOdontologo: 320 });
    expect(con[1].campos).toEqual({ costoPaciente: 1050 });
    expect(con[2].campos).toEqual({ costoPaciente: 1050 });
  });

  it("sube también el precio promocional y guarda los valores de antes", () => {
    const [c] = calcularAjustePrecios([proc("a", 1000, { precioPromocional: 800 })], base);
    expect(c.campos).toEqual({ costoPaciente: 1050, precioPromocional: 840 });
    expect(c.anteriores).toEqual({ costoPaciente: 1000, precioPromocional: 800 });
  });

  it("filtra por especialidad", () => {
    const lista = [proc("a", 1000), proc("b", 1000, { especialidad: "Ortodoncia" })];
    expect(calcularAjustePrecios(lista, { ...base, especialidad: "Ortodoncia" }).map((c) => c.id)).toEqual(["b"]);
  });

  it("omite lo que el redondeo deja igual y rechaza porcentajes inválidos", () => {
    expect(calcularAjustePrecios([proc("a", 1000)], { porcentaje: 1, paso: 50, incluirCostos: false })).toEqual([]);
    for (const porcentaje of [0, -3, NaN, 101]) expect(calcularAjustePrecios([proc("a", 1000)], { ...base, porcentaje })).toEqual([]);
  });
});

describe("recordatorio anual", () => {
  const registro = { fecha: "2025-12-10T12:00:00.000Z", porcentaje: 4.5, cantidad: 30 };
  it("cuenta los meses completos", () => {
    expect(mesesDesdeAjuste(registro, new Date("2026-11-09T12:00:00Z"))).toBe(10);
    expect(mesesDesdeAjuste(registro, new Date("2026-11-24T12:00:00Z"))).toBe(11);
    expect(mesesDesdeAjuste(null, new Date())).toBeNull();
  });
  it("avisa a partir de los 11 meses y nunca si no hay ajuste previo", () => {
    expect(tocaAjusteAnual(registro, new Date("2026-11-24T12:00:00Z"))).toBe(true);
    expect(tocaAjusteAnual(registro, new Date("2026-06-01T12:00:00Z"))).toBe(false);
    expect(tocaAjusteAnual(null, new Date("2026-11-24T12:00:00Z"))).toBe(false);
  });
});

describe("ajuste anual con aprobación", () => {
  const hoy = new Date(2027, 0, 5);
  it("el primer aviso propuesto es el siguiente 1 de enero", () => {
    expect(proximoPrimeroDeEnero(new Date(2026, 10, 24))).toBe("2027-01-01");
  });
  it("al aprobar, la siguiente fecha es un año después de la programada y siempre queda en el futuro", () => {
    expect(siguienteAjuste("2027-01-01", hoy)).toBe("2028-01-01");
    expect(siguienteAjuste("2027-01-01", new Date(2027, 11, 20))).toBe("2028-01-01");
    expect(siguienteAjuste("2024-03-10", hoy)).toBe("2027-03-10");
    expect(siguienteAjuste("2028-02-29", new Date(2028, 2, 5))).toBe("2029-02-28");
  });
  it("pide permiso solo cuando llega la fecha, y no si lo pospuso", () => {
    const cfg = { automatico: true, porcentajeAnual: 4.5, proximoAjuste: "2027-01-01" };
    expect(ajustePendiente(cfg, null, new Date(2026, 11, 31))).toBeNull();
    expect(ajustePendiente(cfg, null, hoy)).toEqual({ tipo: "aprobacion", programada: "2027-01-01", porcentaje: 4.5 });
    expect(ajustePendiente({ ...cfg, posponerHasta: "2027-01-12" }, null, hoy)).toBeNull();
    expect(ajustePendiente({ ...cfg, posponerHasta: "2027-01-12" }, null, new Date(2027, 0, 12))).not.toBeNull();
  });
  it("sin ajuste automático, queda el recordatorio de los 11 meses", () => {
    const registro = { fecha: "2025-12-10T12:00:00.000Z", porcentaje: 4, cantidad: 3 };
    expect(ajustePendiente({}, registro, new Date("2026-11-24T12:00:00Z"))).toEqual({ tipo: "recordatorio" });
    expect(ajustePendiente({ automatico: true, proximoAjuste: "2027-06-01" }, registro, new Date("2026-11-24T12:00:00Z"))).toBeNull();
    expect(ajustePendiente(null, null, hoy)).toBeNull();
  });
});
