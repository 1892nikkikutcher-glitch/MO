import { describe, expect, it } from "vitest";
import {
  ESPECIALIDAD_SIN_CLASIFICAR,
  especialidadesPredefinidas,
  migrarEspecialidadesRenombradas,
  normalizarNombreRama,
  ordenarProcedimientos,
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
    expect(r.find((x) => x.nombre === "Ortodoncia y Ortopedia")?.propia).toBe(false);
    expect(r.find((x) => x.sinClasificar)?.propia).toBe(false);
  });

  it("no duplica una rama que ya existe por sus procedimientos ni repite una base o «Sin clasificar»", () => {
    const r = ramasDelCatalogo([proc("a", "Prevención")], ["Prevención", "Ortodoncia y Ortopedia", "sin clasificar"]);
    expect(r.filter((x) => x.nombre === "Prevención")).toHaveLength(1);
    expect(r.filter((x) => x.nombre === "Ortodoncia y Ortopedia")).toHaveLength(1);
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
      expect(validarNombreRama("ORTODONCIA Y ORTOPEDIA", existentes)).toMatch(/Ya existe/);
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

describe("«Todos los tratamientos» y el orden", () => {
  const con = (id: string, nombre: string, precio: number): Procedimiento => ({ ...proc(id, "Endodoncia"), nombre, costoPaciente: precio });
  const lista = [con("a", "Limpieza", 500), con("b", "Corona", 4500), con("c", "Ácido", 0), con("d", "Extracción", 500)];

  it("alfabético en los dos sentidos, sin importar acentos", () => {
    expect(ordenarProcedimientos(lista, "nombre-asc").map((p) => p.id)).toEqual(["c", "b", "d", "a"]);
    expect(ordenarProcedimientos(lista, "nombre-desc").map((p) => p.id)).toEqual(["a", "d", "b", "c"]);
  });

  it("por precio: los que no tienen precio van al final en ambos sentidos y los empates se desempatan por nombre", () => {
    expect(ordenarProcedimientos(lista, "precio-asc").map((p) => p.id)).toEqual(["d", "a", "b", "c"]);
    expect(ordenarProcedimientos(lista, "precio-desc").map((p) => p.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("no modifica la lista original", () => {
    const copia = [...lista];
    ordenarProcedimientos(lista, "precio-desc");
    expect(lista).toEqual(copia);
  });

  it("«Todos los tratamientos» no se puede usar como nombre de rama", () => {
    expect(validarNombreRama("todos los tratamientos", [])).toMatch(/no se puede usar/);
  });
});

describe("ramas base renombradas y retirada de Radiología", () => {
  it("las ramas base son las que definió la clínica", () => {
    expect([...especialidadesPredefinidas]).toEqual([
      "Odontología General",
      "O. Preventiva",
      "Operatoria Dental",
      "Ortodoncia y Ortopedia",
      "Endodoncia",
      "Periodoncia",
      "Cirugía Bucal",
      "Odontopediatría",
      "Prótesis",
      "Estética Dental",
      "Implantología",
    ]);
  });

  it("lo guardado con el nombre anterior se muestra en la rama nueva", () => {
    const r = ramasDelCatalogo([proc("a", "Ortodoncia"), proc("b", "Cirugía Oral y Maxilofacial")]);
    expect(r.find((x) => x.nombre === "Ortodoncia y Ortopedia")?.procedimientos.map((p) => p.id)).toEqual(["a"]);
    expect(r.find((x) => x.nombre === "Cirugía Bucal")?.procedimientos.map((p) => p.id)).toEqual(["b"]);
    expect(r.some((x) => x.nombre === "Ortodoncia" || x.nombre === "Cirugía Oral y Maxilofacial")).toBe(false);
  });

  it("la migración pone el nombre actual y no toca lo demás; sin nada que migrar devuelve la misma lista", () => {
    const lista = [proc("a", "Ortodoncia"), proc("b", "Endodoncia")];
    const r = migrarEspecialidadesRenombradas(lista, "2026-11-24T00:00:00.000Z");
    expect(r.map((p) => p.especialidad)).toEqual(["Ortodoncia y Ortopedia", "Endodoncia"]);
    expect(r[1]).toBe(lista[1]);
    expect(migrarEspecialidadesRenombradas(r, "2026-11-24T00:00:00.000Z")).toBe(r);
  });

  it("Radiología ya no es base: si una clínica tiene procedimientos ahí, queda como rama propia que se puede editar", () => {
    const r = ramasDelCatalogo([proc("a", "Radiología")]);
    expect(r.some((x) => x.nombre === "Radiología" && x.propia && x.procedimientos.length === 1)).toBe(true);
    expect(ramasDelCatalogo([]).some((x) => x.nombre === "Radiología")).toBe(false);
  });

  it("no se puede crear una rama con el nombre anterior de una base", () => {
    expect(validarNombreRama("Ortodoncia", [...especialidadesPredefinidas])).toMatch(/Ya existe/);
  });
});
