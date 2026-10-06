import { describe, expect, it } from "vitest";
import { sugerirCorreo } from "../correoSugerencia";

describe("sugerirCorreo", () => {
  it.each([
    ["jd282237@gmail.con", "jd282237@gmail.com"],
    ["ana@hotmail.cmo", "ana@hotmail.com"],
    ["ana@gmial.com", "ana@gmail.com"],
    ["ana@gmai.com", "ana@gmail.com"],
    ["ana@hotmial.com", "ana@hotmail.com"],
    ["ana@outlok.com", "ana@outlook.com"],
    ["ana@yaho.com", "ana@yahoo.com"],
    ["ana@gmail.co", "ana@gmail.com"],
    ["  ANA@Gmail.Con ", "ana@gmail.com"],
    ["ana@clinicadental.con", "ana@clinicadental.com"],
  ])("%s -> %s", (entrada, esperado) => {
    expect(sugerirCorreo(entrada)).toBe(esperado);
  });

  it.each([
    "ana@gmail.com",
    "ana@hotmail.com",
    "ana@prodigy.net.mx",
    "ana@mail.com",
    "ana@gmx.com",
    "ana@clinicadental.com",
    "ana@consultorio.mx",
    "no-es-correo",
    "ana@",
    "",
  ])("%s no tiene sugerencia", (entrada) => {
    expect(sugerirCorreo(entrada)).toBeNull();
  });
});
