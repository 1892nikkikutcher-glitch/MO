import { describe, expect, it } from "vitest";
import {
  consentimientoRespaldaParticipacion,
  formaConsentimientoValida,
  requiereCapturadoPor,
} from "../consentimientoExpediente";

describe("requiereCapturadoPor", () => {
  it("true solo para asistido_con_evidencia", () => {
    expect(requiereCapturadoPor("asistido_con_evidencia")).toBe(true);
  });

  it("false para todos los métodos directos", () => {
    expect(requiereCapturadoPor("cuenta_paciente")).toBe(false);
    expect(requiereCapturadoPor("enlace_verificado")).toBe(false);
    expect(requiereCapturadoPor("codigo_un_uso")).toBe(false);
    expect(requiereCapturadoPor("firma_electronica")).toBe(false);
  });
});

describe("formaConsentimientoValida", () => {
  it("consentimiento directo válido: otorgante presente, sin capturadoPorUid", () => {
    expect(
      formaConsentimientoValida({
        metodoVerificacion: "cuenta_paciente",
        otorgantePacienteUid: "uid-paciente",
        capturadoPorUid: undefined,
        representanteLegalId: undefined,
      })
    ).toBe(true);
  });

  it("consentimiento asistido válido: capturadoPorUid presente y distinto del otorgante", () => {
    expect(
      formaConsentimientoValida({
        metodoVerificacion: "asistido_con_evidencia",
        otorgantePacienteUid: "uid-paciente",
        capturadoPorUid: "uid-odontologo",
        representanteLegalId: undefined,
      })
    ).toBe(true);
  });

  it("prueba prioritaria de Fase 0: un odontólogo no puede otorgar consentimiento directo fingiendo ser el paciente", () => {
    // Método directo (sin intermediario) pero con capturadoPorUid presente
    // — exactamente el patrón de "alguien más además del paciente estuvo
    // involucrado", que un método directo nunca debería permitir.
    expect(
      formaConsentimientoValida({
        metodoVerificacion: "cuenta_paciente",
        otorgantePacienteUid: "uid-paciente",
        capturadoPorUid: "uid-odontologo",
        representanteLegalId: undefined,
      })
    ).toBe(false);
  });

  it("un consentimiento asistido nunca es válido si quien captura la evidencia es la misma persona que otorga", () => {
    expect(
      formaConsentimientoValida({
        metodoVerificacion: "asistido_con_evidencia",
        otorgantePacienteUid: "uid-mismo",
        capturadoPorUid: "uid-mismo",
        representanteLegalId: undefined,
      })
    ).toBe(false);
  });

  it("un consentimiento asistido sin capturadoPorUid es inválido", () => {
    expect(
      formaConsentimientoValida({
        metodoVerificacion: "asistido_con_evidencia",
        otorgantePacienteUid: "uid-paciente",
        capturadoPorUid: undefined,
        representanteLegalId: undefined,
      })
    ).toBe(false);
  });

  it("debe existir un otorgante (paciente o representante legal) siempre", () => {
    expect(
      formaConsentimientoValida({
        metodoVerificacion: "cuenta_paciente",
        otorgantePacienteUid: undefined,
        capturadoPorUid: undefined,
        representanteLegalId: undefined,
      })
    ).toBe(false);
  });

  it("un representante legal como otorgante también es válido, sin cuenta de paciente", () => {
    expect(
      formaConsentimientoValida({
        metodoVerificacion: "asistido_con_evidencia",
        otorgantePacienteUid: undefined,
        capturadoPorUid: "uid-odontologo",
        representanteLegalId: "repr-1",
      })
    ).toBe(true);
  });
});

describe("consentimientoRespaldaParticipacion — el consentimiento debe ser específico por profesional y expediente", () => {
  const consentimientoBase = {
    odontologoAutorizadoUid: "uid-dr-garcia",
    expedienteId: "exp1",
    estado: "vigente" as const,
  };

  it("respalda la participación cuando profesional y expediente coinciden y está vigente", () => {
    expect(
      consentimientoRespaldaParticipacion(consentimientoBase, { profesionalUid: "uid-dr-garcia", expedienteId: "exp1" })
    ).toBe(true);
  });

  it("NO respalda una participación de otro profesional, aunque el consentimiento esté vigente", () => {
    expect(
      consentimientoRespaldaParticipacion(consentimientoBase, { profesionalUid: "uid-otro-doctor", expedienteId: "exp1" })
    ).toBe(false);
  });

  it("NO respalda una participación sobre otro expediente, aunque sea el mismo profesional", () => {
    expect(
      consentimientoRespaldaParticipacion(consentimientoBase, { profesionalUid: "uid-dr-garcia", expedienteId: "exp-otro" })
    ).toBe(false);
  });

  it("un consentimiento revocado nunca respalda ninguna participación, aunque el resto coincida exactamente", () => {
    expect(
      consentimientoRespaldaParticipacion(
        { ...consentimientoBase, estado: "revocado" },
        { profesionalUid: "uid-dr-garcia", expedienteId: "exp1" }
      )
    ).toBe(false);
  });
});
