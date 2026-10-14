import { describe, expect, it } from "vitest";
import { descripcionRolClinica, etiquetaRolClinica, moduloVisibleParaRol, puedeEliminarConRol } from "../permisosRol";

describe("permisosRol", () => {
  it("solo el Cirujano dentista no puede eliminar", () => {
    expect(puedeEliminarConRol("odontologo")).toBe(false);
    expect(puedeEliminarConRol("admin")).toBe(true);
    expect(puedeEliminarConRol("colaborador")).toBe(true);
    expect(puedeEliminarConRol(null)).toBe(true); // aún sin rol: mandan las reglas del servidor
  });

  it("cada rol tiene nombre y descripción en español", () => {
    expect(etiquetaRolClinica.odontologo).toBe("Cirujano dentista");
    for (const rol of ["admin", "colaborador", "odontologo"] as const) {
      expect(etiquetaRolClinica[rol].length).toBeGreaterThan(3);
      expect(descripcionRolClinica[rol].length).toBeGreaterThan(20);
    }
  });
});

describe("moduloVisibleParaRol", () => {
  it("el Cirujano dentista ve lo clínico y no lo administrativo ni financiero", () => {
    for (const id of ["inicio", "pacientes", "agenda", "recetas", "proveedores", "mo-conecta", "documentos", "educacion", "membresias", "contrasena"]) {
      expect(moduloVisibleParaRol("odontologo", id)).toBe(true);
    }
    for (const id of ["reportes", "reportes-pagos", "reportes-corte-caja", "administracion", "administracion-colaboradores", "gastos", "contabilidad", "planes", "asistencia", "rpbi", "regulacion-sanitaria"]) {
      expect(moduloVisibleParaRol("odontologo", id)).toBe(false);
    }
  });

  it("el administrador y el colaborador ven todo, como siempre", () => {
    for (const rol of ["admin", "colaborador"] as const) {
      expect(moduloVisibleParaRol(rol, "reportes-pagos")).toBe(true);
      expect(moduloVisibleParaRol(rol, "administracion")).toBe(true);
    }
    expect(moduloVisibleParaRol(null, "reportes")).toBe(true);
  });
});
