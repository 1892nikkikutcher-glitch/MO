import { describe, expect, it } from "vitest";
import {
  contrasenaDescartable,
  correoValido,
  errorDeCambioAdmin,
  mensajeErrorCambioCorreo,
  normalizarCorreo,
} from "../cambioCorreo";

describe("normalizarCorreo / correoValido", () => {
  it("quita espacios y pasa a minúsculas", () => {
    expect(normalizarCorreo("  Dra.Lopez@Gmail.COM ")).toBe("dra.lopez@gmail.com");
  });
  it("acepta correos normales", () => {
    expect(correoValido("dra@clinica.mx")).toBe(true);
    expect(correoValido("a.b+mo@sub.dominio.com.mx")).toBe(true);
  });
  it("rechaza lo que se teclea mal", () => {
    expect(correoValido("")).toBe(false);
    expect(correoValido("sin-arroba.com")).toBe(false);
    expect(correoValido("a@b")).toBe(false);
    expect(correoValido("a b@c.com")).toBe(false);
    expect(correoValido("a@@c.com")).toBe(false);
  });
});

describe("errorDeCambioAdmin", () => {
  const base = {
    correoActual: "vieja@gmail.com",
    correoNuevo: "nueva@gmail.com",
    confirmacionCorreoActual: "vieja@gmail.com",
    verificacion: "Videollamada, mostró cédula y confirmó su teléfono.",
  };

  it("deja pasar una solicitud completa", () => {
    expect(errorDeCambioAdmin(base)).toBeNull();
  });
  it("compara sin importar mayúsculas ni espacios", () => {
    expect(errorDeCambioAdmin({ ...base, confirmacionCorreoActual: "  VIEJA@gmail.com " })).toBeNull();
  });
  it("rechaza un correo nuevo inválido", () => {
    expect(errorDeCambioAdmin({ ...base, correoNuevo: "nueva" })).toMatch(/no parece válido/);
  });
  it("rechaza que el correo nuevo sea el mismo", () => {
    expect(errorDeCambioAdmin({ ...base, correoNuevo: "VIEJA@gmail.com" })).toMatch(/mismo/);
  });
  it("exige teclear el correo actual para confirmar la cuenta", () => {
    expect(errorDeCambioAdmin({ ...base, confirmacionCorreoActual: "otra@gmail.com" })).toMatch(/ACTUAL/);
    expect(errorDeCambioAdmin({ ...base, confirmacionCorreoActual: "" })).toMatch(/ACTUAL/);
  });
  it("exige dejar escrito cómo se verificó la identidad", () => {
    expect(errorDeCambioAdmin({ ...base, verificacion: "ok" })).toMatch(/identidad/);
    expect(errorDeCambioAdmin({ ...base, verificacion: "               " })).toMatch(/identidad/);
  });
});

describe("contrasenaDescartable", () => {
  it("es larga y distinta cada vez", () => {
    const a = contrasenaDescartable();
    const b = contrasenaDescartable();
    expect(a.length).toBeGreaterThanOrEqual(24);
    expect(a).not.toBe(b);
  });
});

describe("mensajeErrorCambioCorreo", () => {
  it("traduce los errores que ve el usuario", () => {
    expect(mensajeErrorCambioCorreo("auth/wrong-password")).toMatch(/contraseña/);
    expect(mensajeErrorCambioCorreo("auth/invalid-credential")).toMatch(/contraseña/);
    expect(mensajeErrorCambioCorreo("auth/email-already-in-use")).toMatch(/en uso/);
  });
  it("tiene un mensaje por omisión", () => {
    expect(mensajeErrorCambioCorreo(undefined)).toMatch(/No se pudo/);
  });
});
