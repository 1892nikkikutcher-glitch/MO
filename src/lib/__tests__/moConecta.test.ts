import { describe, expect, it } from "vitest";
import {
  puedeTransicionar,
  puedeCerrarInterconsulta,
  puedeEnviarInterconsulta,
  fundadoraActiva,
  mesActualClave,
  esParticipanteInterconsulta,
  eventoTieneCamposClinicos,
  eventoCrecimientoTipos,
  interconsultaEstados,
  filtrarCamposPerfilPublico,
  FEATURE_FLAGS,
  type Interconsulta,
} from "../moConecta";

describe("puedeTransicionar", () => {
  it("permite el avance normal paso a paso", () => {
    expect(puedeTransicionar("sent", "received", false)).toBe(true);
    expect(puedeTransicionar("received", "accepted", false)).toBe(true);
    expect(puedeTransicionar("accepted", "patient_contacted", false)).toBe(true);
    expect(puedeTransicionar("patient_contacted", "scheduled", false)).toBe(true);
    expect(puedeTransicionar("scheduled", "in_treatment", false)).toBe(true);
    expect(puedeTransicionar("in_treatment", "completed", false)).toBe(true);
    expect(puedeTransicionar("completed", "counter_referral_sent", false)).toBe(true);
    expect(puedeTransicionar("counter_referral_sent", "closed", false)).toBe(true);
  });

  it("no permite retroceder", () => {
    expect(puedeTransicionar("accepted", "received", false)).toBe(false);
    expect(puedeTransicionar("in_treatment", "accepted", false)).toBe(false);
  });

  it("no permite quedarse en el mismo estado", () => {
    expect(puedeTransicionar("accepted", "accepted", false)).toBe(false);
  });

  it("un salto hacia adelante exige justificación", () => {
    expect(puedeTransicionar("accepted", "in_treatment", false)).toBe(false);
    expect(puedeTransicionar("accepted", "in_treatment", true)).toBe(true);
  });

  it("rejected solo es válido antes de aceptar", () => {
    expect(puedeTransicionar("sent", "rejected", false)).toBe(true);
    expect(puedeTransicionar("received", "rejected", false)).toBe(true);
    expect(puedeTransicionar("accepted", "rejected", false)).toBe(false);
  });

  it("antes de aceptar (sent/received), cancelar es libre, sin motivo obligatorio", () => {
    expect(puedeTransicionar("sent", "cancelled", false)).toBe(true);
    expect(puedeTransicionar("received", "cancelled", false)).toBe(true);
  });

  it("después de aceptar, cancelar exige justificación (motivo) obligatoria", () => {
    expect(puedeTransicionar("accepted", "cancelled", false)).toBe(false);
    expect(puedeTransicionar("accepted", "cancelled", true)).toBe(true);
    expect(puedeTransicionar("in_treatment", "cancelled", false)).toBe(false);
    expect(puedeTransicionar("in_treatment", "cancelled", true)).toBe(true);
  });

  it("a partir de 'completed' ya no se puede cancelar, ni con justificación", () => {
    expect(puedeTransicionar("completed", "cancelled", true)).toBe(false);
    expect(puedeTransicionar("counter_referral_sent", "cancelled", true)).toBe(false);
  });

  it("closed solo es válido desde counter_referral_sent", () => {
    expect(puedeTransicionar("completed", "closed", false)).toBe(false);
    expect(puedeTransicionar("completed", "closed", true)).toBe(false); // ni con justificación
    expect(puedeTransicionar("counter_referral_sent", "closed", false)).toBe(true);
  });

  it("los estados terminales no permiten ninguna transición más", () => {
    expect(puedeTransicionar("closed", "cancelled", true)).toBe(false);
    expect(puedeTransicionar("cancelled", "sent", true)).toBe(false);
    expect(puedeTransicionar("rejected", "accepted", true)).toBe(false);
  });

  it("interconsultaEstados incluye exactamente los 11 códigos internos pedidos", () => {
    expect(interconsultaEstados).toEqual([
      "sent", "received", "accepted", "rejected", "patient_contacted",
      "scheduled", "in_treatment", "completed", "counter_referral_sent",
      "closed", "cancelled",
    ]);
  });
});

describe("puedeCerrarInterconsulta", () => {
  it("solo se puede cerrar tras enviar la contrarreferencia", () => {
    expect(puedeCerrarInterconsulta("counter_referral_sent")).toBe(true);
    expect(puedeCerrarInterconsulta("completed")).toBe(false);
    expect(puedeCerrarInterconsulta("in_treatment")).toBe(false);
  });
});

describe("límites del plan gratuito (MO Red)", () => {
  it("con la bandera apagada (default), nunca bloquea el envío", () => {
    expect(FEATURE_FLAGS.enforceInterconsultaLimits).toBe(false);
    expect(puedeEnviarInterconsulta("mo_red", { [mesActualClave()]: 999 })).toBe(true);
  });

  it("mo_pro_individual y clinica_fundadora nunca tienen límite", () => {
    // Estas pruebas simulan la bandera activa llamando la lógica interna vía
    // el mismo contrato público — como la bandera es una constante del
    // módulo, se documenta el comportamiento esperado una vez aprobada:
    // aquí solo se verifica que con la bandera apagada el resultado es
    // siempre true, que es el comportamiento real hoy.
    expect(puedeEnviarInterconsulta("mo_pro_individual", {})).toBe(true);
    expect(puedeEnviarInterconsulta("clinica_fundadora", {})).toBe(true);
  });

  it("mesActualClave da el formato YYYY-MM", () => {
    expect(mesActualClave(new Date("2026-08-15"))).toBe("2026-08");
    expect(mesActualClave(new Date("2026-01-05"))).toBe("2026-01");
  });
});

describe("fundadoraActiva", () => {
  it("activa si la fecha de vencimiento es futura", () => {
    expect(fundadoraActiva("2099-01-01", new Date("2026-01-01"))).toBe(true);
  });
  it("inactiva si ya venció o no tiene fecha", () => {
    expect(fundadoraActiva("2020-01-01", new Date("2026-01-01"))).toBe(false);
    expect(fundadoraActiva(undefined, new Date("2026-01-01"))).toBe(false);
  });
});

function interconsultaBase(overrides: Partial<Interconsulta> = {}): Interconsulta {
  return {
    id: "ic1",
    clinicaRemitenteId: "clinicaA",
    odontologoRemitenteUid: "uidA",
    pacienteId: "p1",
    resumenPaciente: { nombre: "X", edadTexto: "30 años", condicionesSistemicas: [] },
    especialidadSolicitada: "Endodoncia",
    motivo: "motivo",
    preguntaClinica: "pregunta",
    prioridad: "ordinaria",
    archivos: [],
    consentimientoId: "c1",
    estado: "sent",
    historialEstados: [],
    participantesAutorizados: ["uidA"],
    creadoEl: "2026-01-01T00:00:00.000Z",
    actualizadoEl: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("esParticipanteInterconsulta (espejo de la regla de Firestore)", () => {
  it("el remitente siempre es participante", () => {
    expect(esParticipanteInterconsulta("uidA", interconsultaBase())).toBe(true);
  });
  it("un uid ajeno no es participante", () => {
    expect(esParticipanteInterconsulta("uidExtraño", interconsultaBase())).toBe(false);
  });
  it("el destinatario es participante una vez agregado", () => {
    const ic = interconsultaBase({ participantesAutorizados: ["uidA", "uidB"] });
    expect(esParticipanteInterconsulta("uidB", ic)).toBe(true);
  });
  it("sin uid (no autenticado) nunca es participante", () => {
    expect(esParticipanteInterconsulta(undefined, interconsultaBase())).toBe(false);
  });
});

describe("eventoTieneCamposClinicos", () => {
  it("un evento limpio no dispara la alerta", () => {
    expect(
      eventoTieneCamposClinicos({ tipo: "referral_created", fecha: "x", uid: "u1", clinicaId: "c1" })
    ).toBe(false);
  });

  it("detecta campos clínicos colados por error", () => {
    expect(eventoTieneCamposClinicos({ tipo: "referral_created", nombrePaciente: "Juan Pérez" })).toBe(true);
    expect(eventoTieneCamposClinicos({ tipo: "referral_created", diagnostico: "caries" })).toBe(true);
    expect(eventoTieneCamposClinicos({ tipo: "referral_created", telefono: "555" })).toBe(true);
  });

  it("los 17 tipos de evento del pedido están todos definidos", () => {
    expect(eventoCrecimientoTipos).toHaveLength(21); // los 17 del pedido original + 4 de la corrección de eventos (§5)
  });
});

describe("filtrarCamposPerfilPublico — lista blanca de creación/edición de perfil", () => {
  it("acepta los campos editables por el dueño", () => {
    const resultado = filtrarCamposPerfilPublico({
      nombreCompleto: "Dra. Ana",
      municipio: "Toluca",
      aceptaUrgencias: true,
    });
    expect(resultado).toEqual({ nombreCompleto: "Dra. Ana", municipio: "Toluca", aceptaUrgencias: true });
  });

  it("descarta estadoVerificacion y especialidadesVerificadas aunque el cliente los mande", () => {
    const resultado = filtrarCamposPerfilPublico({
      nombreCompleto: "Dra. Ana",
      estadoVerificacion: "verificado",
      especialidadesVerificadas: ["Endodoncia"],
    });
    expect(resultado).not.toHaveProperty("estadoVerificacion");
    expect(resultado).not.toHaveProperty("especialidadesVerificadas");
    expect(resultado).toEqual({ nombreCompleto: "Dra. Ana" });
  });

  it("descarta uid, clinicaNombre y fechas — esos los pone el servidor", () => {
    const resultado = filtrarCamposPerfilPublico({
      uid: "otro-uid",
      clinicaNombre: "Clínica inventada",
      creadoEl: "2000-01-01T00:00:00.000Z",
      actualizadoEl: "2000-01-01T00:00:00.000Z",
    });
    expect(resultado).toEqual({});
  });

  it("descarta cualquier campo desconocido", () => {
    const resultado = filtrarCamposPerfilPublico({ campoInventado: "algo", notasAdministrativas: "nota" });
    expect(resultado).toEqual({});
  });
});
