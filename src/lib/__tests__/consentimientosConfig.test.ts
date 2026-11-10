import { describe, expect, it } from "vitest";
import {
  CLAVES_CONSENTIMIENTO,
  consentimientosConfigInicial,
  contenidoConsentimiento,
  contenidoOriginal,
  estaEditado,
  renderConsentimiento,
} from "../consentimientosConfig";
import { consentimientosEspecialidad } from "../consentimientosEspecialidad";

describe("consentimientosConfig", () => {
  it("sin ediciones devuelve el texto original de cada carta", () => {
    for (const clave of CLAVES_CONSENTIMIENTO) {
      expect(contenidoConsentimiento(clave, consentimientosConfigInicial)).toEqual(contenidoOriginal(clave));
    }
  });

  it("la aceptación original, con el médico rellenado, es igual a la de antes de ser editable", () => {
    for (const clave of CLAVES_CONSENTIMIENTO) {
      if (clave === "consentimientoGeneral") continue;
      const plantilla = contenidoOriginal(clave).aceptacion;
      expect(renderConsentimiento(plantilla, clave, { medico: "Dra. Ana Torres" })).toBe(
        consentimientosEspecialidad[clave].aceptacion("Dra. Ana Torres")
      );
    }
  });

  it("sin médico elegido usa el mismo texto de respaldo que antes", () => {
    const base = (clave: "consentimientoEndodoncia" | "consentimientoUsoImagen") =>
      renderConsentimiento(contenidoOriginal(clave).aceptacion, clave, {});
    expect(base("consentimientoEndodoncia")).toBe(consentimientosEspecialidad.consentimientoEndodoncia.aceptacion(""));
    expect(base("consentimientoUsoImagen")).toBe(consentimientosEspecialidad.consentimientoUsoImagen.aceptacion(""));
  });

  it("usa lo que la clínica editó y el original en lo demás", () => {
    const config = { textos: { consentimientoEndodoncia: { declaracion: "Texto propio de {{clinica}}." } } };
    const contenido = contenidoConsentimiento("consentimientoEndodoncia", config);
    expect(contenido.declaracion).toBe("Texto propio de {{clinica}}.");
    expect(contenido.aceptacion).toBe(contenidoOriginal("consentimientoEndodoncia").aceptacion);
    expect(contenido.titulo).toBe(contenidoOriginal("consentimientoEndodoncia").titulo);
  });

  it("un campo vacío o en blanco vuelve al original", () => {
    const config = { textos: { consentimientoGeneral: { titulo: "", declaracion: "   " } } };
    expect(contenidoConsentimiento("consentimientoGeneral", config)).toEqual(contenidoOriginal("consentimientoGeneral"));
    expect(estaEditado("consentimientoGeneral", config)).toBe(false);
  });

  it("estaEditado detecta solo las cartas con cambios reales", () => {
    const config = { textos: { consentimientoCirugiaBucal: { titulo: "Cirugía" }, consentimientoOrtodoncia: { titulo: "" } } };
    expect(estaEditado("consentimientoCirugiaBucal", config)).toBe(true);
    expect(estaEditado("consentimientoOrtodoncia", config)).toBe(false);
    expect(estaEditado("consentimientoEndodoncia", config)).toBe(false);
  });

  it("rellena médico, paciente y clínica", () => {
    expect(
      renderConsentimiento("{{medico}} atiende a {{paciente}} en {{clinica}}", "consentimientoGeneral", {
        medico: "Dr. Luis",
        paciente: "Ana",
        clinica: "Clínica Sol",
      })
    ).toBe("Dr. Luis atiende a Ana en Clínica Sol");
  });
});
