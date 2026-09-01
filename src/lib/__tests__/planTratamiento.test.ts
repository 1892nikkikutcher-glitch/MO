import { describe, expect, it } from "vitest";
import {
  agregarPresupuestoVinculado,
  buscarProcedimientoPorNombre,
  construirPlanTratamientoItem,
  validarCreacionPlanTratamiento,
  type PresupuestoVinculado,
} from "../planTratamiento";
import type { Procedimiento } from "../procedimientos";

function procedimiento(overrides: Partial<Procedimiento> = {}): Procedimiento {
  return {
    id: "proc-1",
    nombre: "Resina clase I",
    especialidad: "Odontología General",
    costoPaciente: 800,
    costoOdontologo: 400,
    duracionMinutos: 30,
    ...overrides,
  };
}

describe("validarCreacionPlanTratamiento", () => {
  it("diagnóstico sin estado nunca autoriza nada", () => {
    expect(validarCreacionPlanTratamiento(undefined, "tratamiento_clinica").permitido).toBe(false);
    expect(validarCreacionPlanTratamiento(undefined, "vigilancia").permitido).toBe(false);
  });

  it("descartado bloquea cualquier destino, no solo tratamiento_clinica", () => {
    expect(validarCreacionPlanTratamiento("descartado", "tratamiento_clinica").permitido).toBe(false);
    expect(validarCreacionPlanTratamiento("descartado", "referencia").permitido).toBe(false);
    expect(validarCreacionPlanTratamiento("descartado", "vigilancia").permitido).toBe(false);
    expect(validarCreacionPlanTratamiento("descartado", "sin_tratamiento").permitido).toBe(false);
  });

  it("sospecha nunca permite tratamiento_clinica, pero sí otros destinos", () => {
    expect(validarCreacionPlanTratamiento("sospecha", "tratamiento_clinica").permitido).toBe(false);
    expect(validarCreacionPlanTratamiento("sospecha", "vigilancia").permitido).toBe(true);
    expect(validarCreacionPlanTratamiento("sospecha", "referencia").permitido).toBe(true);
    expect(validarCreacionPlanTratamiento("sospecha", "sin_tratamiento").permitido).toBe(true);
  });

  it("provisional bloquea tratamiento_clinica hasta confirmar, pero permite otros destinos", () => {
    const resultado = validarCreacionPlanTratamiento("provisional", "tratamiento_clinica");
    expect(resultado.permitido).toBe(false);
    expect(validarCreacionPlanTratamiento("provisional", "vigilancia").permitido).toBe(true);
    expect(validarCreacionPlanTratamiento("provisional", "referencia").permitido).toBe(true);
  });

  it("confirmado permite todo el flujo", () => {
    expect(validarCreacionPlanTratamiento("confirmado", "tratamiento_clinica").permitido).toBe(true);
    expect(validarCreacionPlanTratamiento("confirmado", "referencia").permitido).toBe(true);
    expect(validarCreacionPlanTratamiento("confirmado", "vigilancia").permitido).toBe(true);
    expect(validarCreacionPlanTratamiento("confirmado", "sin_tratamiento").permitido).toBe(true);
  });
});

describe("buscarProcedimientoPorNombre", () => {
  it("match único por texto normalizado (sin acentos/mayúsculas)", () => {
    const catalogo = [procedimiento({ id: "p1", nombre: "Resina Clase I" })];
    const resultado = buscarProcedimientoPorNombre("resina clase i", catalogo);
    expect(resultado.tipo).toBe("match_unico");
    if (resultado.tipo === "match_unico") expect(resultado.procedimiento.id).toBe("p1");
  });

  it("sin match cuando no hay coincidencia exacta", () => {
    const catalogo = [procedimiento({ nombre: "Endodoncia" })];
    expect(buscarProcedimientoPorNombre("Resina clase I", catalogo).tipo).toBe("sin_match");
  });

  it("sin match para texto vacío", () => {
    expect(buscarProcedimientoPorNombre("   ", [procedimiento()]).tipo).toBe("sin_match");
  });

  it("match ambiguo con 2+ candidatos del mismo nombre normalizado, nunca elige sola", () => {
    const catalogo = [
      procedimiento({ id: "p1", nombre: "Resina", costoPaciente: 800 }),
      procedimiento({ id: "p2", nombre: "Resina", costoPaciente: 950 }),
    ];
    const resultado = buscarProcedimientoPorNombre("Resina", catalogo);
    expect(resultado.tipo).toBe("match_ambiguo");
    if (resultado.tipo === "match_ambiguo") expect(resultado.candidatos).toHaveLength(2);
  });

  it("no usa similitud aproximada — un nombre parecido pero distinto no cuenta como match", () => {
    const catalogo = [procedimiento({ nombre: "Resina clase II" })];
    expect(buscarProcedimientoPorNombre("Resina clase I", catalogo).tipo).toBe("sin_match");
  });
});

describe("construirPlanTratamientoItem", () => {
  const base = {
    id: "plan-1",
    patientId: "pac-1",
    diagnosticoId: "diag-1",
    preguntaId: "preg-1",
    diagnosticoTexto: "Caries clase I OD 16",
    estadoDiagnosticoSnapshot: "confirmado" as const,
    dientes: [16],
    tratamiento: "Resina clase I",
    prioridad: "media" as const,
    destino: "tratamiento_clinica" as const,
    creadoEn: "2026-06-01T10:00:00.000Z",
    creadoPorUid: "uid-doctor",
  };

  it("construye el plan con estadoClinico activo y sin procedimientoId si no se confirmó", () => {
    const plan = construirPlanTratamientoItem(base);
    expect(plan.estadoClinico).toBe("activo");
    expect(plan.procedimientoId).toBeUndefined();
    expect(plan.estadoDiagnosticoSnapshot).toBe("confirmado");
  });

  it("incluye procedimientoId solo si se pasó explícitamente (confirmación real)", () => {
    const plan = construirPlanTratamientoItem({ ...base, procedimientoId: "proc-9" });
    expect(plan.procedimientoId).toBe("proc-9");
  });

  it("el estadoDiagnosticoSnapshot queda congelado con lo que se pasó, no se recalcula", () => {
    const plan = construirPlanTratamientoItem({ ...base, estadoDiagnosticoSnapshot: "provisional" });
    expect(plan.estadoDiagnosticoSnapshot).toBe("provisional");
  });
});

describe("agregarPresupuestoVinculado", () => {
  const vinculo1: PresupuestoVinculado = { presupuestoId: "pres-100", budgetItemId: "item-1", fecha: "2026-06-01", prioridad: "media" };
  const vinculo2: PresupuestoVinculado = { presupuestoId: "pres-101", budgetItemId: "item-2", fecha: "2026-07-01", prioridad: "alta" };

  it("agrega la primera cotización a un plan sin cotizaciones previas", () => {
    expect(agregarPresupuestoVinculado(undefined, vinculo1)).toEqual([vinculo1]);
  });

  it("agrega una segunda cotización SIN pisar la primera — nunca 1:1", () => {
    const conUna = agregarPresupuestoVinculado(undefined, vinculo1);
    const conDos = agregarPresupuestoVinculado(conUna, vinculo2);
    expect(conDos).toEqual([vinculo1, vinculo2]);
    expect(conDos).toHaveLength(2);
  });

  it("nunca muta el array original", () => {
    const original = [vinculo1];
    const resultado = agregarPresupuestoVinculado(original, vinculo2);
    expect(original).toEqual([vinculo1]);
    expect(resultado).not.toBe(original);
  });
});
