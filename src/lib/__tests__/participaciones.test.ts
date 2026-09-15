import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import {
  idParticipacion,
  esParticipacionGeneral,
  participacionActiva,
  participacionVigente,
  esResponsablePrincipal,
  type Participacion,
} from "../participaciones";

const AHORA = Timestamp.fromDate(new Date("2026-09-14T12:00:00.000Z"));

function participacion(overrides: Partial<Participacion>): Participacion {
  return {
    id: "p1",
    expedienteId: "exp1",
    profesionalUid: "uid1",
    clinicaId: "clinica-a",
    rol: "colaborador",
    nivelAcceso: "lectura",
    alcance: "completo",
    consentimientoId: "cons1",
    solicitudAccesoId: "sol1",
    interconsultaId: "ic1",
    desde: Timestamp.fromDate(new Date("2026-09-07T00:00:00.000Z")),
    estado: "activa",
    createdBy: "uid-remitente",
    ...overrides,
  };
}

describe("idParticipacion", () => {
  it("usa 'general' cuando no hay episodioId", () => {
    expect(idParticipacion("exp1", "uid1")).toBe("exp1_uid1_general");
  });

  it("usa el episodioId cuando se da uno", () => {
    expect(idParticipacion("exp1", "uid1", "ep1")).toBe("exp1_uid1_ep1");
  });

  it("distingue expedientes/profesionales distintos", () => {
    expect(idParticipacion("exp2", "uid1")).not.toBe(idParticipacion("exp1", "uid1"));
    expect(idParticipacion("exp1", "uid2")).not.toBe(idParticipacion("exp1", "uid1"));
  });
});

describe("esParticipacionGeneral", () => {
  it("true cuando no hay episodioId", () => {
    expect(esParticipacionGeneral(participacion({ episodioId: undefined }))).toBe(true);
  });

  it("false cuando hay un episodioId", () => {
    expect(esParticipacionGeneral(participacion({ episodioId: "ep1" }))).toBe(false);
  });
});

describe("participacionActiva", () => {
  it("true solo para estado activa", () => {
    expect(participacionActiva(participacion({ estado: "activa" }))).toBe(true);
    expect(participacionActiva(participacion({ estado: "concluida" }))).toBe(false);
    expect(participacionActiva(participacion({ estado: "revocada" }))).toBe(false);
  });
});

describe("participacionVigente", () => {
  it("una participación activa sin fecha de vencimiento permite acceso", () => {
    expect(participacionVigente(participacion({ estado: "activa", hasta: undefined }), AHORA)).toBe(true);
  });

  it("una participación activa y vigente (hasta en el futuro) permite acceso", () => {
    const hasta = Timestamp.fromDate(new Date("2026-12-31T00:00:00.000Z"));
    expect(participacionVigente(participacion({ estado: "activa", hasta }), AHORA)).toBe(true);
  });

  it("una participación vencida (hasta en el pasado) rechaza acceso aunque el estado siga 'activa'", () => {
    const hasta = Timestamp.fromDate(new Date("2026-01-01T00:00:00.000Z"));
    expect(participacionVigente(participacion({ estado: "activa", hasta }), AHORA)).toBe(false);
  });

  it("una fecha ausente se interpreta como sin vencimiento explícito, nunca como vencida", () => {
    expect(participacionVigente(participacion({ estado: "activa", hasta: undefined }), AHORA)).toBe(true);
  });

  it("un estado no-activo nunca produce acceso, sin importar la fecha", () => {
    const hasta = Timestamp.fromDate(new Date("2027-01-01T00:00:00.000Z")); // muy en el futuro
    expect(participacionVigente(participacion({ estado: "concluida", hasta }), AHORA)).toBe(false);
    expect(participacionVigente(participacion({ estado: "revocada", hasta }), AHORA)).toBe(false);
  });
});

describe("esResponsablePrincipal", () => {
  it("true solo con rol responsable_principal + general + activa", () => {
    expect(
      esResponsablePrincipal(participacion({ rol: "responsable_principal", episodioId: undefined, estado: "activa" }))
    ).toBe(true);
  });

  it("false si el rol no es responsable_principal", () => {
    expect(
      esResponsablePrincipal(participacion({ rol: "colaborador", episodioId: undefined, estado: "activa" }))
    ).toBe(false);
  });

  it("false si está limitado a un episodio (aunque el rol coincida por error)", () => {
    expect(
      esResponsablePrincipal(participacion({ rol: "responsable_principal", episodioId: "ep1", estado: "activa" }))
    ).toBe(false);
  });

  it("false si ya está concluida", () => {
    expect(
      esResponsablePrincipal(participacion({ rol: "responsable_principal", episodioId: undefined, estado: "concluida" }))
    ).toBe(false);
  });
});
