import { describe, expect, it } from "vitest";
import { buscarPacientes, coincidePaciente } from "../buscarPacientes";

describe("coincidePaciente", () => {
  it("ignora acentos, mayúsculas y el orden de las palabras", () => {
    expect(coincidePaciente("Albertina López Juárez", "lopez juarez")).toBe(true);
    expect(coincidePaciente("Albertina López Juárez", "JUAREZ albertina")).toBe(true);
    expect(coincidePaciente("Miguel Ortiz Niño", "nino")).toBe(true);
  });

  it("encuentra los nombres que quedaron con '?' por la importación", () => {
    expect(coincidePaciente("Albertina L?pez Ju?rez", "lopez")).toBe(true);
    expect(coincidePaciente("Albertina L?pez Ju?rez", "lop")).toBe(true);
    expect(coincidePaciente("Carolina P?rez Serrano", "perez serrano")).toBe(true);
    expect(coincidePaciente("Miguel Ortiz Ni?o", "niño")).toBe(true);
  });

  it("no confunde otros nombres", () => {
    expect(coincidePaciente("Albertina L?pez Ju?rez", "garcia")).toBe(false);
    expect(coincidePaciente("Ana Rosa Guadarrama", "lopez")).toBe(false);
    expect(coincidePaciente("Fernando Becerril Nava", "")).toBe(true);
  });
});

describe("buscarPacientes", () => {
  const lista = [{ name: "Ana Pérez" }, { name: "Pedro Pérez" }, { name: "Perla Ruiz" }, { name: "Luis Gómez" }];
  it("pone primero a los que empiezan con lo escrito", () => {
    expect(buscarPacientes(lista, "per").map((p) => p.name)).toEqual(["Perla Ruiz", "Ana Pérez", "Pedro Pérez"]);
  });
  it("sin búsqueda devuelve todos en su orden", () => {
    expect(buscarPacientes(lista, "  ")).toEqual(lista);
  });
});
