import { describe, expect, it } from "vitest";
import {
  conDetallesDocumento,
  descripcionDeDocumento,
  detallesDocumentoParaGuardar,
  etiquetaDocumento,
  nombreCompartidoDeDocumento,
  TIPOS_DOCUMENTO,
} from "../documentosPaciente";

describe("documentos del paciente", () => {
  it("solo guarda un tipo conocido y una nota limpia", () => {
    expect(detallesDocumentoParaGuardar({ tipo: "Resumen médico", nota: "  Alta   hospitalaria " })).toEqual({
      tipo: "Resumen médico",
      nota: "Alta hospitalaria",
    });
    expect(detallesDocumentoParaGuardar({ tipo: "Inventado", nota: "   " })).toEqual({});
  });

  it("la nota se corta a 300 caracteres", () => {
    expect(detallesDocumentoParaGuardar({ nota: "a".repeat(400) }).nota).toHaveLength(300);
  });

  it("cambiar los detalles reemplaza los anteriores y no toca el resto de la foto", () => {
    const foto = { id: "a", tipo: "Otro", nota: "vieja" };
    expect(conDetallesDocumento(foto, { tipo: "Estudio de laboratorio" })).toEqual({ id: "a", tipo: "Estudio de laboratorio" });
    expect(conDetallesDocumento(foto, {})).toEqual({ id: "a" });
  });

  it("etiqueta y descripción", () => {
    expect(etiquetaDocumento({ tipo: TIPOS_DOCUMENTO[0] })).toBe("Estudio de laboratorio");
    expect(etiquetaDocumento({})).toBe("Documento");
    expect(descripcionDeDocumento({ tipo: "Otro", nota: "Carta" })).toBe("Otro — Carta");
    expect(descripcionDeDocumento({})).toBeUndefined();
  });

  it("nombre del archivo compartido", () => {
    expect(nombreCompartidoDeDocumento({ tipo: "Receta o indicaciones", fecha: "2026-10-20T10:00:00Z" })).toBe(
      "Documento Receta o indicaciones (2026-10-20).jpg"
    );
    expect(nombreCompartidoDeDocumento({ fecha: "2026-10-20T10:00:00Z" })).toBe("Documento (2026-10-20).jpg");
  });
});
