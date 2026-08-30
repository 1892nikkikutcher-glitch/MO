import { describe, expect, it } from "vitest";
import { confirmarHorarioPuro, editarCampoHorario } from "../horarioAtencion";
import type { HorarioAtencion } from "../patientData";

const horarioConfirmado: HorarioAtencion = {
  apertura: "09:00",
  comidaInicio: "14:00",
  comidaFin: "15:00",
  cierre: "19:00",
  confirmado: true,
  confirmadoEn: "2026-08-01T10:00:00.000Z",
  confirmadoPorUid: "uid-doctor",
};

describe("editarCampoHorario", () => {
  it("invalida una confirmación previa al editar cualquier campo", () => {
    const resultado = editarCampoHorario(horarioConfirmado, { apertura: "10:00" });
    expect(resultado.confirmado).toBe(false);
    expect(resultado.apertura).toBe("10:00");
  });

  it("omite confirmadoEn/confirmadoPorUid por completo, no los deja en undefined", () => {
    const resultado = editarCampoHorario(horarioConfirmado, { cierre: "20:00" });
    expect("confirmadoEn" in resultado).toBe(false);
    expect("confirmadoPorUid" in resultado).toBe(false);
  });

  it("conserva los campos no editados", () => {
    const resultado = editarCampoHorario(horarioConfirmado, { apertura: "08:00" });
    expect(resultado.comidaInicio).toBe("14:00");
    expect(resultado.comidaFin).toBe("15:00");
    expect(resultado.cierre).toBe("19:00");
  });
});

describe("confirmarHorarioPuro", () => {
  it("marca confirmado con fecha y uid", () => {
    const resultado = confirmarHorarioPuro(horarioConfirmado, "uid-123", "2026-08-30T10:00:00.000Z");
    expect(resultado.confirmado).toBe(true);
    expect(resultado.confirmadoEn).toBe("2026-08-30T10:00:00.000Z");
    expect(resultado.confirmadoPorUid).toBe("uid-123");
  });

  it("sin uid disponible, omite confirmadoPorUid en vez de dejarlo undefined", () => {
    const resultado = confirmarHorarioPuro(horarioConfirmado, undefined, "2026-08-30T10:00:00.000Z");
    expect(resultado.confirmado).toBe(true);
    expect("confirmadoPorUid" in resultado).toBe(false);
  });
});
