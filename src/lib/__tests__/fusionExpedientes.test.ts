import { describe, expect, it } from "vitest";
import { aplicarResolucionesConflicto, fusionarAlergias, fusionarCamposPorClave } from "../fusionExpedientes";

describe("fusionarCamposPorClave", () => {
  it("si solo el sobreviviente tiene valor, lo usa sin reportar conflicto", () => {
    const { fusionado, conflictos } = fusionarCamposPorClave({ nombre: "Alexis" }, {});
    expect(fusionado.nombre).toBe("Alexis");
    expect(conflictos).toHaveLength(0);
  });

  it("si solo el perdedor tiene valor, lo usa sin reportar conflicto", () => {
    const { fusionado, conflictos } = fusionarCamposPorClave({}, { apellido: "Rosales" });
    expect(fusionado.apellido).toBe("Rosales");
    expect(conflictos).toHaveLength(0);
  });

  it("si ambos tienen el mismo valor, no hay conflicto", () => {
    const { fusionado, conflictos } = fusionarCamposPorClave({ telefono: "7226707165" }, { telefono: "7226707165" });
    expect(fusionado.telefono).toBe("7226707165");
    expect(conflictos).toHaveLength(0);
  });

  it("si ambos están vacíos, la clave no aparece en el resultado", () => {
    const { fusionado, conflictos } = fusionarCamposPorClave({ correo: "" }, { correo: undefined });
    expect(fusionado.correo).toBeUndefined();
    expect(conflictos).toHaveLength(0);
  });

  it("detecta un conflicto real cuando ambos tienen valores distintos", () => {
    const { fusionado, conflictos } = fusionarCamposPorClave(
      { birthDate: "2004-11-28" },
      { birthDate: "2025-11-10" }
    );
    expect(conflictos).toEqual([{ clave: "birthDate", valorSobreviviente: "2004-11-28", valorPerdedor: "2025-11-10" }]);
    // Sin resolver a mano, el default es el valor del sobreviviente — nunca oculto.
    expect(fusionado.birthDate).toBe("2004-11-28");
  });

  it("arreglos distintos también cuentan como conflicto real", () => {
    const { conflictos } = fusionarCamposPorClave({ servicios: ["luz"] }, { servicios: ["agua"] });
    expect(conflictos).toHaveLength(1);
  });

  it("varias claves se resuelven de forma independiente", () => {
    const { fusionado, conflictos } = fusionarCamposPorClave(
      { nombre: "Alexis Osiel Salinas", birthDate: "2004-11-28", telefono: "" },
      { nombre: "Alexis Osiel Salinas Rosales", birthDate: "2025-11-10", telefono: "7226707165" }
    );
    expect(conflictos.map((c) => c.clave).sort()).toEqual(["birthDate", "nombre"]);
    expect(fusionado.telefono).toBe("7226707165");
  });
});

describe("aplicarResolucionesConflicto", () => {
  it("sobreescribe solo las claves resueltas a mano, deja el resto igual", () => {
    const fusionado = { nombre: "Alexis Osiel Salinas", birthDate: "2004-11-28" };
    const resultado = aplicarResolucionesConflicto(fusionado, { nombre: "Alexis Osiel Salinas Rosales" });
    expect(resultado.nombre).toBe("Alexis Osiel Salinas Rosales");
    expect(resultado.birthDate).toBe("2004-11-28");
  });
});

describe("fusionarAlergias", () => {
  it("concatena en vez de competir cuando ambos expedientes tienen alergias distintas", () => {
    expect(fusionarAlergias("Penicilina", "Aspirina")).toBe("Penicilina, Aspirina");
  });

  it("nunca pierde una alergia por resolver a favor del otro expediente", () => {
    const resultado = fusionarAlergias("Penicilina", "Aspirina");
    expect(resultado).toContain("Penicilina");
    expect(resultado).toContain("Aspirina");
  });

  it("no duplica la misma alergia si ambos la registraron igual", () => {
    expect(fusionarAlergias("Penicilina", "penicilina")).toBe("Penicilina");
  });

  it("funciona si uno de los dos no tiene alergias registradas", () => {
    expect(fusionarAlergias("Penicilina", undefined)).toBe("Penicilina");
    expect(fusionarAlergias(undefined, "Aspirina")).toBe("Aspirina");
  });
});
