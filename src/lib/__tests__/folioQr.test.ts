import { describe, expect, it } from "vitest";
import { generarFolioCrudo } from "../folioPaciente";
import { construirPayloadFolioQr } from "../folioQr";

describe("construirPayloadFolioQr", () => {
  it("codifica el folio normalizado tal cual, sin envolverlo en una URL", () => {
    const folio = generarFolioCrudo();
    expect(construirPayloadFolioQr(folio)).toBe(folio);
  });

  it("normaliza antes de codificar (espacios/guiones/minúsculas)", () => {
    const folio = generarFolioCrudo();
    const conRuido = `  ${folio.slice(0, 2)}-${folio.slice(2).toLowerCase()}  `;
    expect(construirPayloadFolioQr(conRuido)).toBe(folio);
  });

  it("nunca genera un payload de un folio con formato inválido", () => {
    expect(() => construirPayloadFolioQr("no-es-un-folio")).toThrow();
    expect(() => construirPayloadFolioQr("")).toThrow();
  });

  it("el payload nunca es más largo que el folio mismo — nunca agrega una URL ni datos extra", () => {
    const folio = generarFolioCrudo();
    expect(construirPayloadFolioQr(folio).length).toBe(folio.length);
  });
});
