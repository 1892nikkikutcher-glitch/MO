import { describe, expect, it } from "vitest";
import { puedeTransferirResponsable } from "../responsabilidadExpediente";

const EXPEDIENTE = { responsablePrincipalUid: "uid-responsable-actual" };

describe("puedeTransferirResponsable", () => {
  it("el responsable principal actual puede transferir si el receptor ya aceptó", () => {
    expect(
      puedeTransferirResponsable(EXPEDIENTE, { uid: "uid-responsable-actual", esAdmin: false }, true)
    ).toBe(true);
  });

  it("un admin puede transferir aunque no sea el responsable actual, si el receptor ya aceptó", () => {
    expect(puedeTransferirResponsable(EXPEDIENTE, { uid: "uid-admin", esAdmin: true }, true)).toBe(true);
  });

  it("nadie puede transferir si el receptor todavía no aceptó, ni siquiera el responsable actual", () => {
    expect(
      puedeTransferirResponsable(EXPEDIENTE, { uid: "uid-responsable-actual", esAdmin: false }, false)
    ).toBe(false);
  });

  it("un profesional que no es ni el responsable actual ni admin no puede transferir", () => {
    expect(puedeTransferirResponsable(EXPEDIENTE, { uid: "uid-cualquiera", esAdmin: false }, true)).toBe(false);
  });
});
