import { describe, expect, it } from "vitest";
import { puedeTransicionarNota } from "../notasEvolucionEstado";

describe("puedeTransicionarNota", () => {
  it("el autor manda su borrador a revisión", () => {
    expect(puedeTransicionarNota("borrador", "lista_revision", { esAutor: true, puedeFirmar: false })).toBe(true);
  });

  it("alguien que no es el autor no puede mandar la nota a revisión", () => {
    expect(puedeTransicionarNota("borrador", "lista_revision", { esAutor: false, puedeFirmar: true })).toBe(false);
  });

  it("el autor puede regresar su nota de revisión a borrador", () => {
    expect(puedeTransicionarNota("lista_revision", "borrador", { esAutor: true, puedeFirmar: false })).toBe(true);
  });

  it("alguien que no es el autor no puede regresarla a borrador", () => {
    expect(puedeTransicionarNota("lista_revision", "borrador", { esAutor: false, puedeFirmar: true })).toBe(false);
  });

  it("firmar exige puedeFirmar, no basta con ser el autor", () => {
    expect(puedeTransicionarNota("lista_revision", "firmada", { esAutor: true, puedeFirmar: false })).toBe(false);
    expect(puedeTransicionarNota("lista_revision", "firmada", { esAutor: false, puedeFirmar: true })).toBe(true);
  });

  it("borrador nunca salta directo a firmada, siempre debe pasar por revisión", () => {
    expect(puedeTransicionarNota("borrador", "firmada", { esAutor: true, puedeFirmar: true })).toBe(false);
  });

  it("firmada es terminal — ninguna transición sale de ahí, ni con todos los permisos", () => {
    expect(puedeTransicionarNota("firmada", "borrador", { esAutor: true, puedeFirmar: true })).toBe(false);
    expect(puedeTransicionarNota("firmada", "lista_revision", { esAutor: true, puedeFirmar: true })).toBe(false);
  });

  it("un mismo estado nunca 'transiciona' a sí mismo", () => {
    expect(puedeTransicionarNota("borrador", "borrador", { esAutor: true, puedeFirmar: true })).toBe(false);
    expect(puedeTransicionarNota("lista_revision", "lista_revision", { esAutor: true, puedeFirmar: true })).toBe(false);
    expect(puedeTransicionarNota("firmada", "firmada", { esAutor: true, puedeFirmar: true })).toBe(false);
  });
});
