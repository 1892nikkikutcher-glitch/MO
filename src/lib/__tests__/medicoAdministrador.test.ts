import { describe, expect, it } from "vitest";
import { debeCrearMedicoAdministrador } from "../medicoAdministrador";

describe("debeCrearMedicoAdministrador", () => {
  it("crea al administrador cuando la clínica no tiene ningún médico", () => {
    expect(debeCrearMedicoAdministrador("Ricardo Salazar Fuentes", [])).toBe(true);
    expect(debeCrearMedicoAdministrador("Ricardo Salazar", [{ nombre: "Sillón 1", tipo: "unidad" }])).toBe(true);
  });

  it("no hace nada sin nombre de administrador", () => {
    expect(debeCrearMedicoAdministrador("", [])).toBe(false);
    expect(debeCrearMedicoAdministrador("   ", [])).toBe(false);
    expect(debeCrearMedicoAdministrador(undefined, [])).toBe(false);
  });

  it("no agrega nada si ya hay algún médico dado de alta", () => {
    expect(debeCrearMedicoAdministrador("Ricardo Salazar", [{ nombre: "Laura Méndez", tipo: "medico" }])).toBe(false);
  });

  it("no duplica a quien ya está dado de alta con otro tipo o con acentos distintos", () => {
    expect(debeCrearMedicoAdministrador("Ricardo Salazar", [{ nombre: "ricardo  salazar", tipo: "unidad" }])).toBe(false);
  });
});
