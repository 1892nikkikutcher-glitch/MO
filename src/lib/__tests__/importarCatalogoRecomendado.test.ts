import { describe, expect, it } from "vitest";
import {
  clasificarPlantillas,
  crearProcedimientoDesdeTemplate,
  idDesdeCodigo,
  similitudNombres,
} from "../importarCatalogoRecomendado";
import { catalogoRecomendado } from "../catalogoRecomendado";
import type { Procedimiento } from "../procedimientos";

const CON_VAL = catalogoRecomendado.find((p) => p.codigo === "CON-VAL")!;
const PRE_LIM = catalogoRecomendado.find((p) => p.codigo === "PRE-LIM")!;

function procedimiento(overrides: Partial<Procedimiento>): Procedimiento {
  return {
    id: overrides.id ?? "x",
    nombre: overrides.nombre ?? "Procedimiento",
    especialidad: "Odontología General",
    costoPaciente: 0,
    costoOdontologo: 0,
    duracionMinutos: 30,
    ...overrides,
  };
}

describe("clasificarPlantillas", () => {
  it("clasifica todo como nuevo cuando la clínica no tiene procedimientos", () => {
    const resultado = clasificarPlantillas(catalogoRecomendado, []);
    expect(resultado.every((c) => c.clasificacion === "nuevo")).toBe(true);
    expect(resultado).toHaveLength(catalogoRecomendado.length);
  });

  it('marca "ya_existe" cuando ya hay un procedimiento con ese origenPlantillaId', () => {
    const existentes = [
      procedimiento({ id: "proc_CON-VAL", nombre: "Valoración dental integral", origenPlantillaId: "CON-VAL" }),
    ];
    const resultado = clasificarPlantillas(catalogoRecomendado, existentes);
    const conVal = resultado.find((c) => c.plantilla.codigo === "CON-VAL")!;
    expect(conVal.clasificacion).toBe("ya_existe");
    expect(conVal.coincidenciaId).toBe("proc_CON-VAL");
    // el resto sigue "nuevo", no se contagia
    const otros = resultado.filter((c) => c.plantilla.codigo !== "CON-VAL");
    expect(otros.every((c) => c.clasificacion === "nuevo")).toBe(true);
  });

  it('marca "posible_duplicado" un nombre casi idéntico sin código', () => {
    const existentes = [procedimiento({ id: "manual1", nombre: "Limpieza Dental / Profilaxis " })];
    const resultado = clasificarPlantillas(catalogoRecomendado, existentes);
    const limpieza = resultado.find((c) => c.plantilla.codigo === "PRE-LIM")!;
    expect(limpieza.clasificacion).toBe("posible_duplicado");
    expect(limpieza.coincidenciaId).toBe("manual1");
  });

  it("no marca falso positivo con un nombre no relacionado", () => {
    const existentes = [procedimiento({ id: "manual2", nombre: "Consulta de nutrición" })];
    const resultado = clasificarPlantillas(catalogoRecomendado, existentes);
    expect(resultado.every((c) => c.clasificacion === "nuevo")).toBe(true);
  });

  it("una coincidencia exacta por código nunca se marca también como posible duplicado", () => {
    const existentes = [
      procedimiento({ id: "proc_PRE-LIM", nombre: "Limpieza dental / profilaxis", origenPlantillaId: "PRE-LIM" }),
    ];
    const resultado = clasificarPlantillas(catalogoRecomendado, existentes);
    const limpieza = resultado.find((c) => c.plantilla.codigo === "PRE-LIM")!;
    expect(limpieza.clasificacion).toBe("ya_existe");
  });

  it("idempotencia: aplicar los 'nuevo' y volver a clasificar da cero nuevos repetidos", () => {
    const ronda1 = clasificarPlantillas(catalogoRecomendado, []);
    const ahora = new Date().toISOString();
    const creados: Procedimiento[] = ronda1
      .filter((c) => c.clasificacion === "nuevo")
      .map((c) => ({ id: idDesdeCodigo(c.plantilla.codigo), ...crearProcedimientoDesdeTemplate(c.plantilla, ahora) }));

    const idsRonda1 = new Set(creados.map((p) => p.id));
    expect(idsRonda1.size).toBe(creados.length); // sin colisiones de id

    const ronda2 = clasificarPlantillas(catalogoRecomendado, creados);
    expect(ronda2.every((c) => c.clasificacion === "ya_existe")).toBe(true);

    // simular un tercer intento de importación: nada nuevo que crear
    const aCrearRonda3 = ronda2.filter((c) => c.clasificacion === "nuevo");
    expect(aCrearRonda3).toHaveLength(0);
  });
});

describe("idDesdeCodigo", () => {
  it("es determinista", () => {
    expect(idDesdeCodigo("CON-VAL")).toBe(idDesdeCodigo("CON-VAL"));
    expect(idDesdeCodigo("CON-VAL")).toBe("proc_CON-VAL");
  });
});

describe("crearProcedimientoDesdeTemplate", () => {
  it("nunca trae precio y siempre queda activo", () => {
    const p = crearProcedimientoDesdeTemplate(CON_VAL, "2026-01-01T00:00:00.000Z");
    expect(p.costoPaciente).toBe(0);
    expect(p.costoOdontologo).toBe(0);
    expect(p.activo).toBe(true);
    expect(p.origenPlantillaId).toBe("CON-VAL");
    expect(p.duracionMinutos).toBe(CON_VAL.duracionMinutosSugerida);
  });
});

describe("similitudNombres", () => {
  it("nombres idénticos dan 1", () => {
    expect(similitudNombres("Limpieza dental", "Limpieza dental")).toBe(1);
  });

  it("acentos/mayúsculas no afectan la igualdad", () => {
    expect(similitudNombres("Endodoncia", "ENDODONCIA")).toBe(1);
    expect(similitudNombres(PRE_LIM.nombre, PRE_LIM.nombre.toUpperCase())).toBe(1);
  });

  it("nombres no relacionados dan baja similitud", () => {
    expect(similitudNombres("Limpieza dental", "Extracción quirúrgica")).toBeLessThan(0.5);
  });
});
