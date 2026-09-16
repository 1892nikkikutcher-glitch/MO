import { describe, expect, it } from "vitest";
import { compararCandidatoPaciente, normalizarNombreComparable } from "../vinculacionPosiblePaciente";

describe("normalizarNombreComparable", () => {
  it("minúsculas y espacios colapsados", () => {
    expect(normalizarNombreComparable("  Ana   García ")).toBe("ana garcía");
  });
});

describe("compararCandidatoPaciente", () => {
  it("teléfono + fecha de nacimiento coincidentes: confianza alta, sin conflicto", () => {
    const r = compararCandidatoPaciente(
      { nombre: "Ana García", telefonoNormalizado: "5512345678", fechaNacimiento: "1990-05-01", sexo: "F" },
      { nombre: "Ana García", telefonoNormalizado: "5512345678", fechaNacimiento: "1990-05-01", sexo: "F" }
    );
    expect(r.conflictoGrave).toBe(false);
    expect(r.confianza).toBe(100);
    expect(r.evidenciasCoincidentes).toEqual(expect.arrayContaining(["telefono", "fechaNacimiento", "sexo", "nombre"]));
  });

  it("fecha de nacimiento contradictoria es SIEMPRE grave, aunque el resto coincida", () => {
    const r = compararCandidatoPaciente(
      { nombre: "Ana García", telefonoNormalizado: "5512345678", fechaNacimiento: "1990-05-01", sexo: "F" },
      { nombre: "Ana García", telefonoNormalizado: "5512345678", fechaNacimiento: "1985-01-01", sexo: "F" }
    );
    expect(r.conflictoGrave).toBe(true);
    expect(r.evidenciasContradictorias).toContain("fechaNacimiento");
    expect(r.confianza).toBeLessThanOrEqual(20);
  });

  it("sexo contradictorio es SIEMPRE grave", () => {
    const r = compararCandidatoPaciente(
      { nombre: "Ana García", fechaNacimiento: "1990-05-01", sexo: "F" },
      { nombre: "Ana García", fechaNacimiento: "1990-05-01", sexo: "M" }
    );
    expect(r.conflictoGrave).toBe(true);
  });

  it("el nombre nunca es evidencia suficiente por sí solo", () => {
    const r = compararCandidatoPaciente({ nombre: "Ana García" }, { nombre: "Ana García" });
    expect(r.confianza).toBeLessThan(50);
    expect(r.conflictoGrave).toBe(false);
  });

  it("sin ningún campo comparable en común, confianza cero y sin conflicto", () => {
    const r = compararCandidatoPaciente({ nombre: "Ana García" }, { nombre: "Otra Persona" });
    expect(r.confianza).toBe(0);
    expect(r.conflictoGrave).toBe(false);
  });

  it("campos ausentes en cualquiera de los dos lados no cuentan ni como coincidencia ni como contradicción", () => {
    const r = compararCandidatoPaciente(
      { nombre: "Ana García", telefonoNormalizado: "5512345678" },
      { nombre: "Ana García" }
    );
    expect(r.evidenciasCoincidentes).not.toContain("telefono");
    expect(r.evidenciasContradictorias).not.toContain("telefono");
  });
});
