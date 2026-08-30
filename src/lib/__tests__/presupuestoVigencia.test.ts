import { describe, expect, it } from "vitest";
import { calcularFechaVigencia, estaVencido, renovarVigencia } from "../presupuestoVigencia";

describe("calcularFechaVigencia", () => {
  it("suma los días de vigencia a la fecha del presupuesto (DD/MM/YYYY -> ISO)", () => {
    expect(calcularFechaVigencia("01/01/2026", 30)).toBe("2026-01-31");
  });

  it("cruza correctamente de un mes a otro", () => {
    expect(calcularFechaVigencia("15/01/2026", 30)).toBe("2026-02-14");
  });

  it("nunca truena con una fecha corrupta/legada — usa hoy como base", () => {
    expect(() => calcularFechaVigencia("no-es-una-fecha", 30)).not.toThrow();
  });
});

describe("estaVencido", () => {
  it("nunca vencido si no hay fechaVigenciaHasta (presupuestos de antes de este cambio)", () => {
    expect(estaVencido(undefined, "pendiente", "2026-06-01")).toBe(false);
  });

  it("vencido cuando la fecha límite ya pasó y sigue pendiente", () => {
    expect(estaVencido("2026-01-31", "pendiente", "2026-06-01")).toBe(true);
  });

  it("no vencido si la fecha límite todavía no llega", () => {
    expect(estaVencido("2026-12-31", "pendiente", "2026-06-01")).toBe(false);
  });

  it("nunca vencido si el estado ya no es pendiente, sin importar la fecha", () => {
    expect(estaVencido("2026-01-31", "aceptado", "2026-06-01")).toBe(false);
    expect(estaVencido("2026-01-31", "rechazado", "2026-06-01")).toBe(false);
    expect(estaVencido("2026-01-31", "expirado", "2026-06-01")).toBe(false);
  });

  it("estado ausente se trata como pendiente (compatibilidad con presupuestos viejos)", () => {
    expect(estaVencido("2026-01-31", undefined, "2026-06-01")).toBe(true);
  });
});

describe("renovarVigencia", () => {
  it("calcula la nueva fecha límite desde HOY, no desde la fecha original del presupuesto", () => {
    expect(renovarVigencia(30, "2026-06-01")).toBe("2026-07-01");
  });
});
