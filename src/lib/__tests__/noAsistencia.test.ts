import { describe, expect, it } from "vitest";
import {
  aplicarEstatusConMotivo,
  estatusAdmiteMotivo,
  razonesNoAsistencia,
  razonNoAsistenciaLabel,
  textoMotivoNoAsistencia,
} from "../noAsistencia";

type Cita = { id: string; estatus: string; razonNoAsistencia?: string; detalleNoAsistencia?: string };

describe("aplicarEstatusConMotivo", () => {
  it("guarda razón y detalle al pasar a No Asistió", () => {
    const r = aplicarEstatusConMotivo<Cita>({ id: "c", estatus: "Agendada" }, "No Asistió", {
      razon: "olvido",
      detalle: " avisó tarde ",
    });
    expect(r).toMatchObject({ estatus: "No Asistió", razonNoAsistencia: "olvido", detalleNoAsistencia: "avisó tarde" });
  });

  it("sin motivo nuevo conserva el que ya tenía", () => {
    const r = aplicarEstatusConMotivo<Cita>(
      { id: "c", estatus: "Cancelada", razonNoAsistencia: "enfermedad" },
      "Reagendada"
    );
    expect(r.razonNoAsistencia).toBe("enfermedad");
  });

  it("al pasar a Atendida quita el motivo viejo", () => {
    const r = aplicarEstatusConMotivo<Cita>(
      { id: "c", estatus: "No Asistió", razonNoAsistencia: "olvido", detalleNoAsistencia: "x" },
      "Atendida"
    );
    expect("razonNoAsistencia" in r).toBe(false);
    expect("detalleNoAsistencia" in r).toBe(false);
    expect(r.estatus).toBe("Atendida");
  });

  it("no deja claves undefined", () => {
    const r = aplicarEstatusConMotivo<Cita>({ id: "c", estatus: "Agendada" }, "Cancelada", { detalle: "  " });
    expect(Object.keys(r).sort()).toEqual(["estatus", "id"]);
  });
});

describe("catálogo", () => {
  it("todas las razones tienen etiqueta", () => {
    razonesNoAsistencia.forEach((r) => expect(razonNoAsistenciaLabel[r].length).toBeGreaterThan(0));
  });
  it("solo Cancelada, Reagendada y No Asistió admiten motivo", () => {
    expect(["Cancelada", "Reagendada", "No Asistió"].every(estatusAdmiteMotivo)).toBe(true);
    expect(["Agendada", "Confirmada", "En espera", "Atendida"].some(estatusAdmiteMotivo)).toBe(false);
  });
  it("textoMotivoNoAsistencia une razón y detalle", () => {
    expect(textoMotivoNoAsistencia({ razonNoAsistencia: "olvido", detalleNoAsistencia: "avisó tarde" })).toBe(
      "Olvidó la cita (avisó tarde)"
    );
    expect(textoMotivoNoAsistencia({})).toBe("");
  });
});
