import { describe, expect, it } from "vitest";
import { ESPECIALIDAD_SIN_CLASIFICAR, esSinClasificar, especialidadesPredefinidas, ramasDelCatalogo, type Procedimiento } from "../procedimientos";

const proc = (id: string, especialidad: string, costoPaciente = 100): Procedimiento => ({
  id,
  nombre: id,
  especialidad,
  costoPaciente,
  costoOdontologo: 0,
  duracionMinutos: 30,
});

describe("ramasDelCatalogo", () => {
  it("muestra todas las ramas predefinidas aunque estén vacías, con «Sin clasificar» al final si no hay nada por ubicar", () => {
    const r = ramasDelCatalogo([proc("a", "Ortodoncia y Ortopedia", 500)]);
    expect(r.map((x) => x.nombre)).toEqual([...especialidadesPredefinidas, ESPECIALIDAD_SIN_CLASIFICAR]);
    expect(r.find((x) => x.nombre === "Ortodoncia y Ortopedia")?.procedimientos).toHaveLength(1);
    expect(r[r.length - 1]).toMatchObject({ sinClasificar: true, procedimientos: [], desde: null });
  });

  it("pone «Sin clasificar» al frente cuando tiene algo por ubicar (incluye especialidad vacía)", () => {
    const r = ramasDelCatalogo([proc("a", "Sin clasificar"), proc("b", ""), proc("c", "Endodoncia")]);
    expect(r[0]).toMatchObject({ nombre: ESPECIALIDAD_SIN_CLASIFICAR, sinClasificar: true });
    expect(r[0].procedimientos.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("las especialidades que la clínica creó tienen su propia rama, después de las predefinidas", () => {
    const r = ramasDelCatalogo([proc("a", "Odontología del deporte")]);
    const nombres = r.map((x) => x.nombre);
    expect(nombres.indexOf("Odontología del deporte")).toBe(especialidadesPredefinidas.length);
    expect(nombres[nombres.length - 1]).toBe(ESPECIALIDAD_SIN_CLASIFICAR);
  });

  it("calcula desde / hasta con lo que ya tiene precio", () => {
    const r = ramasDelCatalogo([proc("a", "Ortodoncia y Ortopedia", 0), proc("b", "Ortodoncia y Ortopedia", 600), proc("c", "Ortodoncia y Ortopedia", 18000)]);
    expect(r.find((x) => x.nombre === "Ortodoncia y Ortopedia")).toMatchObject({ desde: 600, hasta: 18000 });
  });

  it("esSinClasificar reconoce mayúsculas y vacío", () => {
    expect(esSinClasificar({ especialidad: " sin CLASIFICAR " })).toBe(true);
    expect(esSinClasificar({ especialidad: "Ortodoncia" })).toBe(false);
  });
});
