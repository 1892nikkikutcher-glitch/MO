import { describe, expect, it } from "vitest";
import { conciliarDocumentoUnico, idDocumentoRepetibleMigrado } from "../conciliacionMigracion";

describe("idDocumentoRepetibleMigrado", () => {
  it("combina migracionId y el id de origen — dos clínicas nunca chocan", () => {
    expect(idDocumentoRepetibleMigrado("migA", "nota1")).toBe("migA_nota1");
    expect(idDocumentoRepetibleMigrado("migB", "nota1")).not.toBe(idDocumentoRepetibleMigrado("migA", "nota1"));
  });
});

describe("conciliarDocumentoUnico", () => {
  it("si el destino no tiene nada todavía, escribe limpio", () => {
    expect(conciliarDocumentoUnico(undefined, "clinicaA", "migA")).toEqual({ tipo: "escribir_limpio" });
  });

  it("mismo origen y misma migración = reintento de un lote ya aplicado, no un conflicto", () => {
    expect(
      conciliarDocumentoUnico({ origenClinicaId: "clinicaA", migracionId: "migA" }, "clinicaA", "migA")
    ).toEqual({ tipo: "ya_migrado_por_esta_clinica" });
  });

  it("misma clínica pero otra migración (reintento con id de migración distinto) escribe limpio", () => {
    expect(
      conciliarDocumentoUnico({ origenClinicaId: "clinicaA", migracionId: "migVieja" }, "clinicaA", "migNueva")
    ).toEqual({ tipo: "escribir_limpio" });
  });

  it("otra clínica ya aportó contenido: conflicto, nunca se sobrescribe en silencio", () => {
    const r = conciliarDocumentoUnico({ origenClinicaId: "clinicaA", migracionId: "migA" }, "clinicaB", "migB");
    expect(r.tipo).toBe("conflicto");
  });
});
