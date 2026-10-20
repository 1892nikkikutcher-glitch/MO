import { describe, expect, it } from "vitest";
import {
  conDetallesRadiografia,
  descripcionDeRadiografia,
  detallesParaGuardar,
  esTipoRadiografia,
  etiquetaRadiografia,
  limpiarNotaRadiografia,
  nombreCompartidoDeRadiografia,
  NOTA_RADIOGRAFIA_MAX,
} from "../radiografias";

describe("tipo y nota de una radiografía", () => {
  it("solo acepta los tipos de la lista", () => {
    expect(esTipoRadiografia("Panorámica")).toBe(true);
    expect(esTipoRadiografia("panoramica")).toBe(false);
    expect(esTipoRadiografia(undefined)).toBe(false);
  });

  it("limpia la nota: espacios, caracteres de control y largo máximo", () => {
    expect(limpiarNotaRadiografia("  dolor   en el 46 \u0000 ")).toBe("dolor en el 46");
    expect(limpiarNotaRadiografia(undefined)).toBe("");
    expect(limpiarNotaRadiografia("x".repeat(500))).toHaveLength(NOTA_RADIOGRAFIA_MAX);
    // Respeta los saltos de línea normales.
    expect(limpiarNotaRadiografia("línea 1\nlínea 2")).toBe("línea 1\nlínea 2");
  });

  it("guarda solo las llaves que traen algo (nunca undefined)", () => {
    expect(detallesParaGuardar({})).toEqual({});
    expect(detallesParaGuardar({ tipo: "Oclusal", nota: "  " })).toEqual({ tipo: "Oclusal" });
    expect(detallesParaGuardar({ tipo: "inventado", nota: "ok" })).toEqual({ nota: "ok" });
    expect(Object.keys(detallesParaGuardar({ tipo: "Oclusal", nota: "n" }))).toEqual(["tipo", "nota"]);
  });

  it("reemplaza los detalles de una foto y los quita si se vacían", () => {
    const foto = { id: "a", url: "u", path: "p", name: "n.jpg", fecha: "2026-10-20T10:00:00Z", tipo: "Periapical", nota: "vieja" };
    expect(conDetallesRadiografia(foto, { tipo: "Panorámica", nota: "nueva" })).toMatchObject({ id: "a", tipo: "Panorámica", nota: "nueva" });
    const vacia = conDetallesRadiografia(foto, {});
    expect(vacia).not.toHaveProperty("tipo");
    expect(vacia).not.toHaveProperty("nota");
    expect(vacia.id).toBe("a");
  });

  it("etiqueta y descripción", () => {
    expect(etiquetaRadiografia({ tipo: "Periapical" })).toBe("Periapical");
    expect(etiquetaRadiografia({})).toBe("Radiografía");
    expect(descripcionDeRadiografia({ tipo: "Periapical", nota: "diente 46" })).toBe("Periapical — diente 46");
    expect(descripcionDeRadiografia({ tipo: "Periapical" })).toBe("Periapical");
    expect(descripcionDeRadiografia({ nota: "diente 46" })).toBe("diente 46");
    expect(descripcionDeRadiografia({})).toBeUndefined();
  });

  it("nombre del archivo que ve el colega", () => {
    expect(nombreCompartidoDeRadiografia({ tipo: "Panorámica", name: "IMG_2034.jpg", fecha: "2026-10-20T08:00:00Z" })).toBe("Radiografía Panorámica (2026-10-20).jpg");
    expect(nombreCompartidoDeRadiografia({ name: "IMG_2034.jpg", fecha: "2026-10-20T08:00:00Z" })).toBe("IMG_2034.jpg");
    expect(nombreCompartidoDeRadiografia({ name: "", fecha: "2026-10-20" })).toBe("radiografia.jpg");
  });
});
