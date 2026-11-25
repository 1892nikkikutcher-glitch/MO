import { describe, expect, it } from "vitest";
import {
  calcularCumplimiento,
  categoriasRegulacion,
  checklistRegulacionSanitaria,
  estadoDePunto,
  evaluarPunto,
  puntosComplementarios,
  puntosDeLaGuia,
  type EstadoRegulacionSanitaria,
} from "../regulacionSanitaria";

const punto = (id: string) => checklistRegulacionSanitaria.find((p) => p.id === id)!;

describe("catálogo de la guía COPRISEM", () => {
  it("trae los 43 reactivos de la guía, numerados del 1 al 43 sin saltos ni repetidos", () => {
    expect(puntosDeLaGuia).toHaveLength(43);
    expect(puntosDeLaGuia.map((p) => p.numero)).toEqual(Array.from({ length: 43 }, (_, i) => i + 1));
  });

  it("los ids son únicos y cada punto cae en una categoría que se muestra", () => {
    const ids = checklistRegulacionSanitaria.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of checklistRegulacionSanitaria) expect(categoriasRegulacion).toContain(p.categoria);
  });

  it("el instrumental por especialidad (35 al 41) solo cuenta si se evalúa", () => {
    const especialidad = puntosDeLaGuia.filter((p) => p.soloSiAplica);
    expect(especialidad.map((p) => p.numero)).toEqual([35, 36, 37, 38, 39, 40, 41]);
  });

  it("los puntos de la versión anterior que la guía no trae quedan como complementarios, sin repetir ninguno que sí reemplazó", () => {
    expect(puntosComplementarios.every((p) => p.complementario && p.numero === undefined)).toBe(true);
    const reemplazados = puntosDeLaGuia.map((p) => p.migraDesde).filter(Boolean);
    for (const viejo of reemplazados) expect(puntosComplementarios.some((p) => p.id === viejo)).toBe(false);
    // Los 16 puntos de antes siguen existiendo, ya sea reemplazados o como complementarios.
    const idsAnteriores = [
      "aviso-funcionamiento", "aviso-responsable-sanitario", "licencia-sanitaria", "registro-coprisem", "cedula-visible",
      "capacitacion-rpbi", "expediente-nom004", "consentimientos-firmados", "aviso-privacidad", "rpbi-contrato",
      "rpbi-bitacora", "esterilizacion-bitacora", "recetario-especial", "botiquin-urgencias", "senalizacion", "extintor-vigente",
    ];
    for (const id of idsAnteriores) {
      expect(reemplazados.includes(id) || puntosComplementarios.some((p) => p.id === id)).toBe(true);
    }
  });
});

describe("lo ya marcado antes de la escala 0–2", () => {
  it("un punto marcado como cumplido se lee como 2, y el reemplazo de la guía hereda lo del punto anterior", () => {
    const estados: EstadoRegulacionSanitaria = {
      "aviso-funcionamiento": { cumple: true, fecha: "2026-05-01", notas: "folio 123" },
      "extintor-vigente": { cumple: true },
    };
    expect(evaluarPunto(punto("g01"), estados)).toEqual({ calificacion: 2, aplica: true });
    expect(estadoDePunto(punto("g01"), estados)).toMatchObject({ fecha: "2026-05-01", notas: "folio 123" });
    expect(evaluarPunto(punto("extintor-vigente"), estados)).toEqual({ calificacion: 2, aplica: true });
    expect(evaluarPunto(punto("g02"), estados)).toEqual({ calificacion: null, aplica: true });
  });

  it("el registro propio de la guía manda sobre el del punto anterior", () => {
    const estados: EstadoRegulacionSanitaria = {
      "aviso-funcionamiento": { cumple: true },
      g01: { cumple: false, calificacion: 1 },
    };
    expect(evaluarPunto(punto("g01"), estados).calificacion).toBe(1);
  });
});

describe("cálculo del cumplimiento", () => {
  it("sin nada evaluado: 0 % sobre el máximo de los 36 puntos que cuentan por defecto (43 menos 7 de especialidad)", () => {
    const c = calcularCumplimiento(puntosDeLaGuia, {});
    expect(c).toMatchObject({ total: 36, maximo: 72, obtenidos: 0, porcentaje: 0, evaluados: 0, pendientes: 36, noAplican: 7 });
  });

  it("suma 0, 1 y 2 y da el porcentaje sobre el máximo", () => {
    const estados: EstadoRegulacionSanitaria = {
      g01: { cumple: true, calificacion: 2 },
      g02: { cumple: false, calificacion: 1 },
      g03: { cumple: false, calificacion: 0 },
    };
    const c = calcularCumplimiento(puntosDeLaGuia, estados);
    expect(c.obtenidos).toBe(3);
    expect(c.evaluados).toBe(3);
    expect(c.porcentaje).toBe(Math.round((3 / 72) * 100));
  });

  it("«No aplica» saca el punto del máximo; evaluar una especialidad lo mete", () => {
    const estados: EstadoRegulacionSanitaria = {
      g11: { cumple: false, noAplica: true },
      g35: { cumple: true, calificacion: 2 },
    };
    const c = calcularCumplimiento(puntosDeLaGuia, estados);
    expect(c.total).toBe(36 - 1 + 1);
    expect(c.noAplican).toBe(7 - 1 + 1);
    expect(c.obtenidos).toBe(2);
  });

  it("todo en 2 da 100 %", () => {
    const estados = Object.fromEntries(puntosDeLaGuia.map((p) => [p.id, { cumple: true, calificacion: 2 as const }]));
    expect(calcularCumplimiento(puntosDeLaGuia, estados)).toMatchObject({ porcentaje: 100, obtenidos: 86, maximo: 86 });
  });

  it("una lista vacía no divide entre cero", () => {
    expect(calcularCumplimiento([], {}).porcentaje).toBe(0);
  });
});
