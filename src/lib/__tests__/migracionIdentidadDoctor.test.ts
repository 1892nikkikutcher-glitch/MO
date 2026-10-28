import { describe, expect, it } from "vitest";
import { mismoNombre } from "../migracionIdentidadDoctor";

describe("mismoNombre", () => {
  it("ignora acentos, mayúsculas y espacios de más", () => {
    expect(mismoNombre("Nicolás Medina González", "Nicolas Medina Gonzalez")).toBe(true);
    expect(mismoNombre("  nicolas   medina gonzalez ", "NICOLÁS MEDINA GONZÁLEZ")).toBe(true);
  });

  it("distingue personas distintas y nombres vacíos", () => {
    expect(mismoNombre("Enrique Santin", "Nicolas Medina")).toBe(false);
    expect(mismoNombre("", "")).toBe(false);
    expect(mismoNombre(undefined, "Ana")).toBe(false);
  });
});
