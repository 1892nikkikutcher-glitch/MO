import { describe, expect, it } from "vitest";
import { estadoPromocion, promocionVigente, type Promocion } from "../catalogosVarios";

const promo = (extra: Partial<Promocion> = {}): Promocion => ({
  id: "p1",
  nombre: "Brackets para todos",
  descripcion: "",
  descuento: "$99",
  vigenciaInicio: "2026-11-24",
  vigenciaFin: "2026-12-31",
  activa: true,
  ...extra,
});

describe("estadoPromocion", () => {
  it("vigente desde el primer día hasta el último", () => {
    expect(estadoPromocion(promo(), "2026-11-24").vigente).toBe(true);
    expect(estadoPromocion(promo(), "2026-12-31").vigente).toBe(true);
  });
  it("dice que está desactivada aunque las fechas sí sirvan", () => {
    const e = estadoPromocion(promo({ activa: false }), "2026-11-24");
    expect(e).toMatchObject({ vigente: false, etiqueta: "Desactivada" });
    expect(e.motivo).toContain("Promoción activa");
  });
  it("dice cuándo empieza o cuándo venció", () => {
    expect(estadoPromocion(promo(), "2026-11-23")).toMatchObject({ vigente: false, etiqueta: "Aún no inicia", motivo: "Empieza el 24 nov 2026." });
    expect(estadoPromocion(promo(), "2027-01-01")).toMatchObject({ vigente: false, etiqueta: "Venció", motivo: "Venció el 31 dic 2026." });
  });
  it("sin fechas, solo importa que esté activa", () => {
    expect(estadoPromocion(promo({ vigenciaInicio: "", vigenciaFin: "" }), "2030-01-01").vigente).toBe(true);
  });
  it("coincide siempre con promocionVigente", () => {
    for (const activa of [true, false]) for (const hoy of ["2026-11-23", "2026-11-24", "2027-01-01"]) {
      expect(estadoPromocion(promo({ activa }), hoy).vigente).toBe(promocionVigente(promo({ activa }), hoy));
    }
  });
});
