import { describe, expect, it } from "vitest";
import { construirEntradaPapelera, etiquetaDeRegistro } from "../papelera";

describe("expediente de paciente en la Papelera", () => {
  it("se reconoce por nombre y teléfono", () => {
    expect(etiquetaDeRegistro("pacientes", { name: "Paola Almazán", phone: "7291322354" }, "p1")).toBe("Paola Almazán · 7291322354");
  });

  it("la entrada apunta al documento del paciente para poder restaurarlo", () => {
    const r = construirEntradaPapelera({
      ruta: "users/clinica1/pacientes",
      item: { id: "p1", name: "Paola Almazán", phone: "7291322354" },
      usuario: { uid: "u1", email: "admin@mo.test" },
      ahora: new Date("2026-11-27T12:00:00Z"),
    });
    expect(r?.entrada.tipo).toBe("pacientes");
    expect(r?.entrada.docId).toBe("p1");
    expect(r?.entrada.pacienteId).toBeNull();
    expect(r?.entrada.eliminadoPorEmail).toBe("admin@mo.test");
  });
});
