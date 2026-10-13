import { describe, expect, it } from "vitest";
import { hallazgosOdontogramaCompartibles, valoracionDientesCompartible } from "../expedienteCompartido";
import type { HistoriaClinicaTemplate, RespuestasHistoriaClinica } from "../historiaClinica";

const template: HistoriaClinicaTemplate = {
  secciones: [{ id: "s2", titulo: "Odontograma", preguntas: [{ id: "od", tipo: "odontograma", etiqueta: "Odontograma" }] }],
};

const respuestas = (porPregunta: RespuestasHistoriaClinica["porPregunta"]): RespuestasHistoriaClinica => ({ porPregunta });

describe("hallazgosOdontogramaCompartibles", () => {
  it("conserva dientes, caras y color; salta descartados y sin diagnóstico", () => {
    const r = hallazgosOdontogramaCompartibles(
      template,
      respuestas({
        od: [
          { id: "a", dientes: [16], diagnostico: "Caries", fecha: "", color: "rojo", superficiesPorDiente: { 16: ["oclusal", "mesial"] } },
          { id: "b", dientes: [85, 46], diagnostico: "Corona", fecha: "", color: "azul" },
          { id: "c", dientes: [18], diagnostico: "Ya no", fecha: "", estado: "descartado" },
          { id: "d", dientes: [21], diagnostico: "  ", fecha: "" },
        ] as never,
      })
    );
    expect(r).toEqual([
      { dientes: [16], superficies: { "16": ["oclusal", "mesial"] }, color: "rojo", diagnostico: "Caries" },
      { dientes: [46, 85], color: "azul", diagnostico: "Corona" },
    ]);
  });

  it("no copia valores que no sean caras ni colores reales, y un diagnóstico viejo queda sin color", () => {
    const r = hallazgosOdontogramaCompartibles(
      template,
      respuestas({
        od: [
          { id: "a", dientes: [16], diagnostico: "X", fecha: "", color: "verde", superficiesPorDiente: { 16: ["oclusal", "<script>", "oclusal"] } },
        ] as never,
      })
    );
    expect(r).toEqual([{ dientes: [16], superficies: { "16": ["oclusal"] }, diagnostico: "X" }]);
    expect(r[0]).not.toHaveProperty("color");
  });

  it("sin odontograma capturado, lista vacía", () => {
    expect(hallazgosOdontogramaCompartibles(template, respuestas({}))).toEqual([]);
  });
});

describe("valoracionDientesCompartible", () => {
  // Plantilla guardada antes del cuadro por diente: se adapta igual que en la app.
  it("incluye solo celdas con texto, también en una plantilla vieja", () => {
    const r = valoracionDientesCompartible(
      template,
      respuestas({
        p_valoracion_dientes: {
          "16": { pronostico: "Bueno", furcas: "Grado II", caries: "   " },
          "21": {},
        } as never,
      })
    );
    expect(r).toEqual({ "16": { pronostico: "Bueno", furcas: "Grado II" } });
  });

  it("recorta textos largos y vacío si no hay nada", () => {
    const largo = "x".repeat(500);
    const r = valoracionDientesCompartible(template, respuestas({ p_valoracion_dientes: { "11": { pronostico: largo } } as never }));
    expect(r["11"].pronostico).toHaveLength(120);
    expect(valoracionDientesCompartible(template, respuestas({}))).toEqual({});
  });
});
