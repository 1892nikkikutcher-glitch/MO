import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import { calcularExpiresAt, idSesionAccesoExpediente, sesionAccesoActivaValida } from "../sesionAccesoExpediente";

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

describe("calcularExpiresAt — v3 §10: min(inactividad 15 min, duración absoluta 60 min)", () => {
  it("al abrir la sesión (iniciadaEl == ahora), gana la ventana de inactividad de 15 min — es menor que el tope de 60", () => {
    const resultado = calcularExpiresAt(AHORA, AHORA);
    expect(resultado.toMillis()).toBe(AHORA.toMillis() + 15 * 60_000);
  });

  it("al renovar bien entrada la sesión, sigue ganando la inactividad si todavía falta para el tope absoluto", () => {
    const iniciadaEl = AHORA;
    const ahoraRenovando = Timestamp.fromMillis(AHORA.toMillis() + 20 * 60_000); // 20 min después de abrir
    const resultado = calcularExpiresAt(iniciadaEl, ahoraRenovando);
    expect(resultado.toMillis()).toBe(ahoraRenovando.toMillis() + 15 * 60_000);
  });

  it("cerca del tope absoluto, la renovación queda recortada al tope — nunca lo rebasa", () => {
    const iniciadaEl = AHORA;
    // A 50 min de iniciada — 15 min de inactividad la llevarían a 65 min,
    // pero el tope absoluto es 60 min desde iniciadaEl.
    const ahoraRenovando = Timestamp.fromMillis(AHORA.toMillis() + 50 * 60_000);
    const resultado = calcularExpiresAt(iniciadaEl, ahoraRenovando);
    expect(resultado.toMillis()).toBe(iniciadaEl.toMillis() + 60 * 60_000);
  });

  it("justo en el momento de abrir, el resultado nunca excede el tope absoluto de 60 min", () => {
    const resultado = calcularExpiresAt(AHORA, AHORA);
    expect(resultado.toMillis()).toBeLessThanOrEqual(AHORA.toMillis() + 60 * 60_000);
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
