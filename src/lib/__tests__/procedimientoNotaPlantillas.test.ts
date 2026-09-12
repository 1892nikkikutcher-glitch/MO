import { describe, expect, it } from "vitest";
import {
  actividadRealizadaSugerida,
  narrarCamposPlantilla,
  plantillaCamposPorTipo,
  tipoProcedimientoNotaSugerido,
  tiposProcedimientoNota,
  type DetalleGenerico,
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

  it("odontopediatría: sin manejoConducta confirmado, nunca lo asume", () => {
    const detalle: DetalleProcedimiento = {
      tipo: "odontopediatria",
      procedimientoNombre: "Consulta",
      actividadRealizada: "",
      organosDentales: [],
    };
    expect(actividadRealizadaSugerida(detalle)).toBe("Odontopediatría");
  });

  it("odontopediatría: con manejoConducta confirmado, lo incluye", () => {
    const detalle: DetalleProcedimiento = {
      tipo: "odontopediatria",
      procedimientoNombre: "Consulta",
      actividadRealizada: "",
      organosDentales: [55],
      manejoConducta: "avanzado",
    };
    expect(actividadRealizadaSugerida(detalle)).toBe("Odontopediatría — manejo de conducta avanzado OD 55");
  });
});

describe("tipoProcedimientoNotaSugerido", () => {
  const catalogo = [
    { nombre: "Ajuste de brackets", especialidad: "Ortodoncia" },
    { nombre: "Endodoncia unirradicular", especialidad: "Endodoncia" },
    { nombre: "Consulta general", especialidad: "Odontología General" },
    { nombre: "Blanqueamiento", especialidad: "Estética Dental" },
  ];

  it("sugiere el tipo cuando el nombre coincide EXACTO (insensible a mayúsculas) y la especialidad es conocida", () => {
    expect(tipoProcedimientoNotaSugerido("ajuste de brackets", catalogo)).toBe("control_ortodoncia");
    expect(tipoProcedimientoNotaSugerido("Endodoncia unirradicular", catalogo)).toBe("endodoncia");
  });

  it("no sugiere nada si el nombre no coincide con ningún procedimiento del catálogo", () => {
    expect(tipoProcedimientoNotaSugerido("Tratamiento inventado", catalogo)).toBeUndefined();
  });

  it("no sugiere nada si la especialidad del catálogo no tiene un tipo de plantilla asociado (nunca adivina)", () => {
    expect(tipoProcedimientoNotaSugerido("Consulta general", catalogo)).toBeUndefined();
    expect(tipoProcedimientoNotaSugerido("Blanqueamiento", catalogo)).toBeUndefined();
  });

  it("no sugiere nada si el nombre del tratamiento viene vacío", () => {
    expect(tipoProcedimientoNotaSugerido("", catalogo)).toBeUndefined();
    expect(tipoProcedimientoNotaSugerido("   ", catalogo)).toBeUndefined();
  });
});

describe("narrarCamposPlantilla", () => {
  it("solo narra los campos que el profesional llenó, en el orden de captura", () => {
    const detalle: DetalleGenerico = {
      tipo: "cirugia",
      procedimientoNombre: "Cirugía",
      actividadRealizada: "Cirugía",
      organosDentales: [],
      camposAdicionales: { tipoCirugia: "Extracción de terceros molares", hemostasia: "Adecuada" },
    };
    expect(narrarCamposPlantilla(detalle)).toEqual([
      "Tipo de cirugía: Extracción de terceros molares",
      "Hemostasia: Adecuada",
    ]);
  });

  it("nunca inventa un valor para un campo vacío", () => {
    const detalle: DetalleGenerico = {
      tipo: "cirugia",
      procedimientoNombre: "Cirugía",
      actividadRealizada: "Cirugía",
      organosDentales: [],
      camposAdicionales: { tipoCirugia: "Extracción de terceros molares" },
    };
    expect(narrarCamposPlantilla(detalle)).toEqual(["Tipo de cirugía: Extracción de terceros molares"]);
  });

  it("un tipo sin plantilla declarativa (otro) no narra nada extra", () => {
    const detalle: DetalleGenerico = {
      tipo: "otro",
      procedimientoNombre: "Revisión",
      actividadRealizada: "Revisión",
      organosDentales: [],
    };
    expect(narrarCamposPlantilla(detalle)).toEqual([]);
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
