import { describe, expect, it } from "vitest";
import { idRelacionClinica } from "../relacionClinica";

describe("idRelacionClinica", () => {
  it("concatena expedienteId y clinicaId con guion bajo", () => {
    expect(idRelacionClinica("exp1", "clinicaA")).toBe("exp1_clinicaA");
  });

  it("dos clínicas distintas para el mismo expediente dan ids distintos", () => {
    expect(idRelacionClinica("exp1", "clinicaA")).not.toBe(idRelacionClinica("exp1", "clinicaB"));
  });
});
