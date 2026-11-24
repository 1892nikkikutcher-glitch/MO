import { describe, expect, it } from "vitest";
import {
  ESPECIALIDAD_SIN_CLASIFICAR,
  especialidadesPredefinidas,
  normalizarNombreRama,
  quitarRama,
  ramasDelCatalogo,
  renombrarRama,
  validarNombreRama,
  type Procedimiento,
} from "../procedimientos";

const proc = (id: string, especialidad: string): Procedimiento => ({
  id,
  nombre: id,
  especialidad,
  costoPaciente: 100,
  costoOdontologo: 0,
  duracionMinutos: 30,
});

describe("ramas propias de la clínica", () => {
  it("una rama creada aparece aunque no tenga procedimientos, después de las base y marcada como propia", () => {
    const r = ramasDelCatalogo([], ["Prevención"]);
    const nombres = r.map((x) => x.nombre);
    expect(nombres.indexOf("Prevención")).toBe(especialidadesPredefinidas.length);
    expect(r.find((x) => x.nombre === "Prevención")).toMatchObject({ propia: true, procedimientos: [], sinClasificar: false });
    expect(r.find((x) => x.nombre === "Ortodoncia")?.propia).toBe(false);
    expect(r.find((x) => x.sinClasificar)?.propia).toBe(false);
  });

  it("no duplica una rama que ya existe por sus procedimientos ni repite una base o «Sin clasificar»", () => {
    const r = ramasDelCatalogo([proc("a", "Prevención")], ["Prevención", "Ortodoncia", "sin clasificar"]);
    expect(r.filter((x) => x.nombre === "Prevención")).toHaveLength(1);
    expect(r.filter((x) => x.nombre === "Ortodoncia")).toHaveLength(1);
    expect(r.filter((x) => x.sinClasificar)).toHaveLength(1);
    expect(r.find((x) => x.nombre === "Prevención")?.procedimientos).toHaveLength(1);
  });

  it("normaliza el nombre: espacios limpios y primera letra en mayúscula", () => {
    expect(normalizarNombreRama("  prevención   dental ")).toBe("Prevención dental");
    expect(normalizarNombreRama("   ")).toBe("");
  });

  describe("validarNombreRama", () => {
    const existentes = [...especialidadesPredefinidas, "Prevención", ESPECIALIDAD_SIN_CLASIFICAR];
    it("acepta un nombre nuevo", () => {
      expect(validarNombreRama("Odontología del deporte", existentes)).toBeNull();
    });
    it("rechaza vacío, demasiado largo y «Sin clasificar»", () => {
      expect(validarNombreRama("   ", existentes)).toMatch(/Escribe/);
      expect(validarNombreRama("x".repeat(61), existentes)).toMatch(/largo/);
      expect(validarNombreRama("SIN CLASIFICAR", existentes)).toMatch(/Sin clasificar/);
    });
    it("rechaza repetidas sin importar mayúsculas ni acentos", () => {
      expect(validarNombreRama("prevencion", existentes)).toMatch(/Ya existe/);
      expect(validarNombreRama("ORTODONCIA", existentes)).toMatch(/Ya existe/);
    });
    it("al renombrar, la rama puede conservar su nombre con otra escritura", () => {
      expect(validarNombreRama("prevención", existentes, "Prevención")).toBeNull();
      expect(validarNombreRama("Ortodoncia", existentes, "Prevención")).toMatch(/Ya existe/);
    });
  });

  it("renombrar cambia solo los procedimientos de esa rama", () => {
    const lista = [proc("a", "Prevención"), proc("b", "Ortodoncia")];
    const r = renombrarRama(lista, "Prevención", "Prevención y salud", "2026-11-24T00:00:00.000Z");
    expect(r.map((p) => p.especialidad)).toEqual(["Prevención y salud", "Ortodoncia"]);
    expect(r[0].actualizadoEl).toBe("2026-11-24T00:00:00.000Z");
    expect(r[1]).toBe(lista[1]);
  });

  it("quitar una rama pasa sus procedimientos a «Sin clasificar» sin perderlos", () => {
    const r = quitarRama([proc("a", "Prevención"), proc("b", "Ortodoncia")], "Prevención", "2026-11-24T00:00:00.000Z");
    expect(r.map((p) => p.especialidad)).toEqual([ESPECIALIDAD_SIN_CLASIFICAR, "Ortodoncia"]);
  });
});
