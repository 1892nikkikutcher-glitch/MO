import { describe, expect, it } from "vitest";
import type { Receta } from "../patientData";
import type { RecetaLogEntry } from "../recetasLog";
import { foliosIrregulares, planificarRenumeracion } from "../recetasFolios";

const fila = (id: string, folio: string, creadoEn: string, patientId = "p1"): RecetaLogEntry => ({
  id,
  patientId,
  patientName: `Paciente ${patientId}`,
  folio,
  fecha: "26/11/2026",
  medico: "Dra. Ana",
  medicamentos: ["Amoxicilina"],
  creadoEn,
});

const receta = (id: string, folio: string): Receta => ({
  id,
  folio,
  fecha: "26/11/2026",
  hora: "10:00",
  medico: "Dra. Ana",
  edadTexto: "",
  sexo: "",
  peso: "",
  estatura: "",
  temperatura: "",
  alergias: "",
  diagnostico: "",
  medicamentos: [],
  notas: "",
});

describe("foliosIrregulares", () => {
  it("detecta repetidos, saltos y un inicio distinto de 1", () => {
    expect(foliosIrregulares([fila("a", "1", "2026-01-01"), fila("b", "2", "2026-01-02")])).toBe(false);
    expect(foliosIrregulares([fila("a", "6", "2026-01-01"), fila("b", "7", "2026-01-02")])).toBe(true);
    expect(foliosIrregulares([fila("a", "1", "2026-01-01"), fila("b", "1", "2026-01-02")])).toBe(true);
    expect(foliosIrregulares([fila("a", "1", "2026-01-01"), fila("b", "3", "2026-01-02")])).toBe(true);
    expect(foliosIrregulares([])).toBe(false);
  });
});

describe("planificarRenumeracion", () => {
  it("renumera desde 1 en el orden de expedición, sin saltos", () => {
    const bitacora = [fila("c", "10", "2026-03-01", "p2"), fila("a", "6", "2026-01-01"), fila("b", "9", "2026-02-01")];
    const recetas = { p1: [receta("a", "6"), receta("b", "9")], p2: [receta("c", "10")] };
    const plan = planificarRenumeracion(bitacora, recetas);
    expect(plan.bitacora.map((f) => [f.id, f.folio])).toEqual([["a", "1"], ["b", "2"], ["c", "3"]]);
    expect(plan.cambios.map((c) => [c.recetaId, c.folioNuevo])).toEqual([["a", "1"], ["b", "2"], ["c", "3"]]);
    expect(plan.siguiente).toBe(4);
    expect(plan.repetidasFusionadas).toBe(0);
  });

  it("los reintentos con el mismo folio cuentan como una sola receta y apuntan a la que quedó en el expediente", () => {
    // Tres filas con el folio 9: la receta del expediente es la última (los reintentos reemplazaron a las anteriores).
    const bitacora = [
      fila("x1", "9", "2026-02-01T10:00"),
      fila("x2", "9", "2026-02-01T10:01"),
      fila("x3", "9", "2026-02-01T10:02"),
      fila("y", "11", "2026-02-02", "p2"),
    ];
    const recetas = { p1: [receta("x3", "9")], p2: [receta("y", "11")] };
    const plan = planificarRenumeracion(bitacora, recetas);
    expect(plan.bitacora.map((f) => [f.id, f.folio])).toEqual([["x3", "1"], ["y", "2"]]);
    expect(plan.repetidasFusionadas).toBe(2);
    expect(plan.cambios).toEqual([
      { patientId: "p1", recetaId: "x3", folioAnterior: "9", folioNuevo: "1" },
      { patientId: "p2", recetaId: "y", folioAnterior: "11", folioNuevo: "2" },
    ]);
  });

  it("una fila sin receta en el expediente se conserva, renumerada, sin nada que actualizar allá", () => {
    const plan = planificarRenumeracion([fila("a", "5", "2026-01-01"), fila("b", "8", "2026-01-02")], { p1: [receta("b", "8")] });
    expect(plan.bitacora.map((f) => f.folio)).toEqual(["1", "2"]);
    expect(plan.cambios.map((c) => c.recetaId)).toEqual(["b"]);
  });

  it("si ya están en orden no cambia nada", () => {
    const plan = planificarRenumeracion([fila("a", "1", "2026-01-01"), fila("b", "2", "2026-01-02")], { p1: [receta("a", "1"), receta("b", "2")] });
    expect(plan.cambios).toEqual([]);
    expect(plan.siguiente).toBe(3);
  });

  it("una bitácora vacía deja el siguiente folio en 1", () => {
    expect(planificarRenumeracion([], {})).toMatchObject({ bitacora: [], cambios: [], siguiente: 1 });
  });
});
