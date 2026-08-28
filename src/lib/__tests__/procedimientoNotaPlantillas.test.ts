import { describe, expect, it } from "vitest";
import {
  actividadRealizadaSugerida,
  plantillaCamposPorTipo,
  tiposProcedimientoNota,
  type DetalleProcedimiento,
} from "../procedimientoNotaPlantillas";

describe("actividadRealizadaSugerida", () => {
  it("genera una frase a partir de la etapa de endodoncia y el órgano dental", () => {
    const detalle: DetalleProcedimiento = {
      tipo: "endodoncia",
      procedimientoNombre: "Endodoncia",
      actividadRealizada: "",
      organosDentales: [36],
      etapaRealizada: "instrumentacion",
    };
    expect(actividadRealizadaSugerida(detalle)).toMatch(/instrumentación/i);
    expect(actividadRealizadaSugerida(detalle)).toMatch(/36/);
  });

  it("distingue extracción simple de quirúrgica", () => {
    const simple: DetalleProcedimiento = {
      tipo: "extraccion",
      procedimientoNombre: "Extracción",
      actividadRealizada: "",
      organosDentales: [],
      indicacion: "",
      tipoExtraccion: "simple",
    };
    const quirurgica: DetalleProcedimiento = { ...simple, tipoExtraccion: "quirurgica" };
    expect(actividadRealizadaSugerida(simple)).toMatch(/simple/i);
    expect(actividadRealizadaSugerida(quirurgica)).toMatch(/quirúrgica/i);
  });

  it("para el tipo genérico, usa el nombre del procedimiento capturado", () => {
    const detalle: DetalleProcedimiento = {
      tipo: "otro",
      procedimientoNombre: "Revisión de férula",
      actividadRealizada: "",
      organosDentales: [],
    };
    expect(actividadRealizadaSugerida(detalle)).toContain("Revisión de férula");
  });
});

describe("plantillaCamposPorTipo — patrón extensible", () => {
  it("cubre los tipos genéricos declarados (prótesis, cirugía, valoración, urgencia)", () => {
    for (const tipo of ["protesis", "cirugia", "valoracion", "urgencia"] as const) {
      expect(plantillaCamposPorTipo[tipo]?.length).toBeGreaterThan(0);
    }
  });

  it("cada tipo declarado en tiposProcedimientoNota es una cadena conocida", () => {
    expect(tiposProcedimientoNota).toContain("endodoncia");
    expect(tiposProcedimientoNota).toContain("otro");
  });
});
