import { describe, expect, it } from "vitest";
import { calcularResponsableActual, type CasoParaResponsable } from "../responsableActualInterconsulta";

function caso(overrides: Partial<CasoParaResponsable> = {}): CasoParaResponsable {
  return {
    estado: "accepted",
    actualizadoEl: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("calcularResponsableActual", () => {
  it("sin ninguna interconsulta, la propia clínica es responsable", () => {
    expect(calcularResponsableActual([])).toEqual({ tipo: "propia_clinica" });
  });

  it("con interconsultas activas pero ninguna transferida, sigue siendo la propia clínica", () => {
    const casos = [caso({ estado: "accepted" }), caso({ estado: "closed" })];
    expect(calcularResponsableActual(casos)).toEqual({ tipo: "propia_clinica" });
  });

  it("una interconsulta transferida pasa la responsabilidad a su destinatario", () => {
    const casos = [caso({ estado: "transferida", destinatarioUid: "uid-colega" })];
    expect(calcularResponsableActual(casos)).toEqual({ tipo: "colega_transferido", uid: "uid-colega" });
  });

  it("con varias transferidas, gana la más reciente (por concluidoEl)", () => {
    const casos = [
      caso({ estado: "transferida", destinatarioUid: "uid-viejo", concluidoEl: "2026-01-01T00:00:00.000Z" }),
      caso({ estado: "transferida", destinatarioUid: "uid-nuevo", concluidoEl: "2026-06-01T00:00:00.000Z" }),
    ];
    expect(calcularResponsableActual(casos)).toEqual({ tipo: "colega_transferido", uid: "uid-nuevo" });
  });

  it("si falta concluidoEl, usa actualizadoEl como respaldo para ordenar", () => {
    const casos = [
      caso({ estado: "transferida", destinatarioUid: "uid-viejo", actualizadoEl: "2026-01-01T00:00:00.000Z" }),
      caso({ estado: "transferida", destinatarioUid: "uid-nuevo", actualizadoEl: "2026-06-01T00:00:00.000Z" }),
    ];
    expect(calcularResponsableActual(casos)).toEqual({ tipo: "colega_transferido", uid: "uid-nuevo" });
  });

  it("una transferida sin destinatarioUid (dato inconsistente) nunca se considera — la propia clínica sigue siendo responsable", () => {
    const casos = [caso({ estado: "transferida", destinatarioUid: undefined })];
    expect(calcularResponsableActual(casos)).toEqual({ tipo: "propia_clinica" });
  });
});
