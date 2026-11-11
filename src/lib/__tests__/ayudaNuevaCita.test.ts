import { describe, expect, it } from "vitest";
import { avanceAyudaNuevaCita, pasosAyudaNuevaCita, type CamposNuevaCita } from "../ayudaNuevaCita";

const vacios: CamposNuevaCita = {
  paciente: false,
  medicoOUnidad: false,
  procedimiento: false,
  fechaYHora: false,
  telefono: false,
};

describe("ayudaNuevaCita", () => {
  it("recorre los campos en el orden del diálogo y termina en Guardar", () => {
    expect(pasosAyudaNuevaCita(vacios).map((p) => p.id)).toEqual([
      "paciente",
      "medicoOUnidad",
      "procedimiento",
      "fechaYHora",
      "telefono",
      "guardar",
    ]);
  });

  it("marca como hechos solo los campos capturados", () => {
    const pasos = pasosAyudaNuevaCita({ ...vacios, paciente: true, fechaYHora: true });
    expect(pasos.filter((p) => p.hecho).map((p) => p.id)).toEqual(["paciente", "fechaYHora"]);
  });

  it("cuenta el avance sin contar el paso de Guardar", () => {
    expect(avanceAyudaNuevaCita(pasosAyudaNuevaCita(vacios))).toEqual({ hechos: 0, total: 5 });
    expect(avanceAyudaNuevaCita(pasosAyudaNuevaCita({ ...vacios, paciente: true, telefono: true }))).toEqual({
      hechos: 2,
      total: 5,
    });
  });

  it("el aviso de Guardar cambia cuando ya están paciente, médico y fecha", () => {
    const falta = pasosAyudaNuevaCita({ ...vacios, paciente: true }).at(-1)!;
    const listo = pasosAyudaNuevaCita({ ...vacios, paciente: true, medicoOUnidad: true, fechaYHora: true }).at(-1)!;
    expect(falta.detalle).toContain("Cuando estén");
    expect(listo.detalle).toContain("Todo listo");
  });
});
