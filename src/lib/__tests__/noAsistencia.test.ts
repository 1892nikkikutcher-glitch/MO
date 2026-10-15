import { describe, expect, it } from "vitest";
import {
  aplicarEstatusConMotivo,
  cancelacionTardia,
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

describe("cancelación fuera de tiempo", () => {
  const cita = { fecha: "2026-10-14", horaFin: "11:00" };

  it("es tardía solo cuando ya pasó la hora de fin de la cita", () => {
    expect(cancelacionTardia(cita, new Date("2026-10-14T10:59:00"))).toBe(false);
    expect(cancelacionTardia(cita, new Date("2026-10-14T11:00:00"))).toBe(true);
    expect(cancelacionTardia(cita, new Date("2026-10-15T09:00:00"))).toBe(true);
    expect(cancelacionTardia(cita, new Date("2026-10-13T20:00:00"))).toBe(false);
  });

  it("con datos faltantes o inválidos no asume nada", () => {
    expect(cancelacionTardia({}, new Date())).toBe(false);
    expect(cancelacionTardia({ fecha: "no-fecha", horaFin: "11:00" }, new Date())).toBe(false);
  });

  it("al cancelar después de la hora, la cita queda marcada; antes de la hora, no", () => {
    type C = { estatus: string; fecha: string; horaFin: string; canceladaTarde?: boolean };
    const base: C = { estatus: "Confirmada", fecha: "2026-10-14", horaFin: "11:00" };
    expect(aplicarEstatusConMotivo(base, "Cancelada", undefined, { ahora: new Date("2026-10-14T12:00:00") }).canceladaTarde).toBe(true);
    expect(aplicarEstatusConMotivo(base, "Cancelada", undefined, { ahora: new Date("2026-10-14T08:00:00") })).not.toHaveProperty("canceladaTarde");
  });

  it("se puede corregir a mano, se conserva al cambiar el motivo y se quita al dejar de estar cancelada", () => {
    type C = { estatus: string; fecha: string; horaFin: string; canceladaTarde?: boolean };
    const cancelada: C = { estatus: "Cancelada", fecha: "2026-10-14", horaFin: "11:00", canceladaTarde: true };
    expect(aplicarEstatusConMotivo(cancelada, "Cancelada", { razon: "olvido" }).canceladaTarde).toBe(true); // se conserva
    expect(aplicarEstatusConMotivo(cancelada, "Cancelada", undefined, { canceladaTarde: false })).not.toHaveProperty("canceladaTarde");
    expect(aplicarEstatusConMotivo({ ...cancelada, canceladaTarde: undefined }, "Cancelada", undefined, { canceladaTarde: true }).canceladaTarde).toBe(true);
    expect(aplicarEstatusConMotivo(cancelada, "Atendida")).not.toHaveProperty("canceladaTarde");
    expect(aplicarEstatusConMotivo(cancelada, "No Asistió")).not.toHaveProperty("canceladaTarde");
  });
});
