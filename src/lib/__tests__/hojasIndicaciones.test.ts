import { describe, expect, it } from "vitest";
import { hojasIndicaciones } from "../hojasIndicaciones";

describe("hojasIndicaciones", () => {
  it("la hoja de cirugía bucal recoge las indicaciones postquirúrgicas del consultorio y las 72 horas", () => {
    const hoja = hojasIndicaciones.cirugiaBucal;
    const texto = hoja.instrucciones.join(" ");
    for (const frase of ["calor", "paleta de hielo", "popote", "gárgaras", "semillas", "cerdo", "mariscos", "huevo duro", "papaya", "caldo de pollo"]) {
      expect(texto).toContain(frase);
    }
    expect(hoja.destacado).toContain("72 horas");
  });

  it("no manda enjuagar antes de las 72 horas (se contradeciría con evitar los buches)", () => {
    const enjuagues = hojasIndicaciones.cirugiaBucal.instrucciones.find((i) => i.includes("enjuagues"));
    expect(enjuagues).toMatch(/Pasadas las 72 horas/);
  });

  it("las demás hojas siguen sin línea destacada", () => {
    expect(hojasIndicaciones.protesis.destacado).toBeUndefined();
    expect(hojasIndicaciones.ortodoncia.destacado).toBeUndefined();
    expect(hojasIndicaciones.odontopediatria.destacado).toBeUndefined();
  });
});
