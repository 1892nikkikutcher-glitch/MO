import { describe, expect, it } from "vitest";
import { catalogoRecomendado, serviciosComplementarios } from "../catalogoRecomendado";
import { especialidadesPredefinidas } from "../procedimientos";

describe("catálogo recomendado — integridad del dataset", () => {
  it("tiene exactamente 20 tratamientos principales", () => {
    expect(catalogoRecomendado).toHaveLength(20);
  });

  it("tiene exactamente 10 servicios complementarios", () => {
    expect(serviciosComplementarios).toHaveLength(10);
  });

  it("todos los códigos (principales + complementarios) son únicos", () => {
    const codigos = [...catalogoRecomendado, ...serviciosComplementarios].map((p) => p.codigo);
    expect(new Set(codigos).size).toBe(codigos.length);
  });

  it("ningún tratamiento ni servicio complementario es un implante", () => {
    const todos = [...catalogoRecomendado, ...serviciosComplementarios];
    for (const p of todos) {
      const texto = `${p.nombre} ${p.codigo}`.toLowerCase();
      expect(texto).not.toContain("implant");
    }
  });

  it("cada especialidadSugerida pertenece a especialidadesPredefinidas", () => {
    const validas = new Set<string>(especialidadesPredefinidas);
    const todos = [...catalogoRecomendado, ...serviciosComplementarios];
    for (const p of todos) {
      expect(validas.has(p.especialidadSugerida)).toBe(true);
    }
  });

  it("cada código sigue el formato XXX-XX(XX) (letras mayúsculas, un guion)", () => {
    const todos = [...catalogoRecomendado, ...serviciosComplementarios];
    for (const p of todos) {
      expect(p.codigo).toMatch(/^[A-Z]{3}-[A-Z]{2,4}$/);
    }
  });

  it("ningún tratamiento principal trae precio (no hay campos de precio en la plantilla)", () => {
    for (const p of catalogoRecomendado) {
      expect(p).not.toHaveProperty("costoPaciente");
      expect(p).not.toHaveProperty("precio");
    }
  });
});
