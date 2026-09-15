import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import { idSesionAccesoExpediente, sesionAccesoActivaValida } from "../sesionAccesoExpediente";

const AHORA = Timestamp.fromDate(new Date("2026-09-14T12:00:00.000Z"));
const EN_UNA_HORA = Timestamp.fromDate(new Date("2026-09-14T13:00:00.000Z"));
const HACE_UNA_HORA = Timestamp.fromDate(new Date("2026-09-14T11:00:00.000Z"));

function sesionValida(overrides: Partial<Parameters<typeof sesionAccesoActivaValida>[0]> = {}) {
  return {
    expedienteId: "exp1",
    profesionalUid: "uid1",
    estado: "activa" as const,
    expiresAt: EN_UNA_HORA,
    participacionId: "exp1_uid1_general",
    ...overrides,
  };
}

const CONTEXTO = { expedienteId: "exp1", profesionalUid: "uid1", ahora: AHORA };

describe("idSesionAccesoExpediente", () => {
  it("determinístico y distinto por expediente/profesional", () => {
    expect(idSesionAccesoExpediente("exp1", "uid1")).toBe("exp1_uid1");
    expect(idSesionAccesoExpediente("exp2", "uid1")).not.toBe(idSesionAccesoExpediente("exp1", "uid1"));
    expect(idSesionAccesoExpediente("exp1", "uid2")).not.toBe(idSesionAccesoExpediente("exp1", "uid1"));
  });
});

describe("sesionAccesoActivaValida — prueba prioritaria de Fase 0: sesión válida permite lectura", () => {
  it("true cuando todo coincide y no ha vencido", () => {
    expect(sesionAccesoActivaValida(sesionValida(), CONTEXTO)).toBe(true);
  });
});

describe("sesionAccesoActivaValida — prueba prioritaria: sesión vencida no funciona", () => {
  it("false cuando expiresAt ya pasó, aunque estado siga 'activa'", () => {
    expect(sesionAccesoActivaValida(sesionValida({ expiresAt: HACE_UNA_HORA }), CONTEXTO)).toBe(false);
  });

  it("false cuando expiresAt es exactamente ahora (límite estricto, no inclusivo)", () => {
    expect(sesionAccesoActivaValida(sesionValida({ expiresAt: AHORA }), CONTEXTO)).toBe(false);
  });
});

describe("sesionAccesoActivaValida — prueba prioritaria: sesión de otro usuario no puede reutilizarse", () => {
  it("false si profesionalUid de la sesión no coincide con quien la usa", () => {
    expect(
      sesionAccesoActivaValida(sesionValida({ profesionalUid: "uid-otro-usuario" }), CONTEXTO)
    ).toBe(false);
  });
});

describe("sesionAccesoActivaValida — prueba prioritaria: sesión con expedienteId inconsistente no funciona", () => {
  it("false si expedienteId de la sesión no coincide con el expediente solicitado", () => {
    expect(
      sesionAccesoActivaValida(sesionValida({ expedienteId: "exp-distinto" }), CONTEXTO)
    ).toBe(false);
  });
});

describe("sesionAccesoActivaValida — estado no activo", () => {
  it("false si la sesión está cerrada", () => {
    expect(sesionAccesoActivaValida(sesionValida({ estado: "cerrada" }), CONTEXTO)).toBe(false);
  });

  it("false si la sesión está expirada", () => {
    expect(sesionAccesoActivaValida(sesionValida({ estado: "expirada" }), CONTEXTO)).toBe(false);
  });
});

describe("sesionAccesoActivaValida — participación vinculada debe corresponder al mismo profesional y expediente", () => {
  it("false si participacionId no coincide con el id determinístico esperado (ej. apunta a otro expediente o profesional)", () => {
    expect(
      sesionAccesoActivaValida(sesionValida({ participacionId: "exp-otro_uid1_general" }), CONTEXTO)
    ).toBe(false);
    expect(
      sesionAccesoActivaValida(sesionValida({ participacionId: "exp1_uid-otro_general" }), CONTEXTO)
    ).toBe(false);
  });

  it("false si participacionId apunta a una participación de episodio en vez de la general", () => {
    expect(
      sesionAccesoActivaValida(sesionValida({ participacionId: "exp1_uid1_episodio5" }), CONTEXTO)
    ).toBe(false);
  });
});
