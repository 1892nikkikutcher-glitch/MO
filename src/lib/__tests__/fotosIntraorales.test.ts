import { describe, expect, it } from "vitest";
import {
  conVista,
  esVistaIntraoral,
  fotosDeVista,
  fotosSinClasificar,
  VISTAS_INTRAORALES,
  vistasCompletadas,
} from "../fotosIntraorales";
import type { FotoPaciente } from "../patientData";

const foto = (id: string, fecha: string, vista?: string): FotoPaciente => ({
  id,
  url: `u-${id}`,
  path: `p-${id}`,
  name: `${id}.jpg`,
  fecha,
  ...(vista ? { vista } : {}),
});

describe("fotos intraorales por vista", () => {
  it("son las seis vistas, en el orden de la serie", () => {
    expect(VISTAS_INTRAORALES.map((v) => v.etiqueta)).toEqual(["Superior", "Inferior", "Derecha", "Izquierda", "Anterior", "Acercamiento"]);
  });

  it("reconoce solo vistas válidas", () => {
    expect(esVistaIntraoral("anterior")).toBe(true);
    expect(esVistaIntraoral("oclusal")).toBe(false);
    expect(esVistaIntraoral(undefined)).toBe(false);
  });

  it("la foto de una vista más reciente va primero y las demás vistas no se mezclan", () => {
    const fotos = [foto("a", "2026-01-01", "superior"), foto("b", "2026-06-01", "superior"), foto("c", "2026-03-01", "inferior")];
    expect(fotosDeVista(fotos, "superior").map((f) => f.id)).toEqual(["b", "a"]);
    expect(fotosDeVista(fotos, "inferior").map((f) => f.id)).toEqual(["c"]);
    expect(fotosDeVista(fotos, "derecha")).toEqual([]);
  });

  it("las fotos sin vista (o con una vista que ya no existe) quedan sin clasificar", () => {
    const fotos = [foto("a", "2026-01-01"), foto("b", "2026-02-01", "oclusal"), foto("c", "2026-03-01", "anterior")];
    expect(fotosSinClasificar(fotos).map((f) => f.id)).toEqual(["b", "a"]);
  });

  it("cuenta cuántas de las seis vistas tienen foto, sin contar repetidas ni sin clasificar", () => {
    const fotos = [foto("a", "2026-01-01", "superior"), foto("b", "2026-02-01", "superior"), foto("c", "2026-03-01", "acercamiento"), foto("d", "2026-04-01")];
    expect(vistasCompletadas(fotos)).toBe(2);
    expect(vistasCompletadas([])).toBe(0);
  });

  it("asignar una vista no toca el resto de la foto, y se puede quitar", () => {
    const original = foto("a", "2026-01-01");
    const asignada = conVista(original, "izquierda");
    expect(asignada).toEqual({ ...original, vista: "izquierda" });
    expect(conVista(asignada, null)).toEqual(original);
    expect(conVista(asignada, null)).not.toHaveProperty("vista");
  });
});
