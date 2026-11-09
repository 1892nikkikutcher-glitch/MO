import { describe, expect, it } from "vitest";
import {
  avanceTutorial,
  leerEstadoTutorial,
  PASOS_TUTORIAL,
  pasoEstaHecho,
  pasosParaRol,
  type DatosTutorial,
} from "../tutorialInicio";

const vacio: DatosTutorial = {
  consultorioCapturado: false,
  hayMedicos: false,
  hayMedicoConCedula: false,
  hayPacientes: false,
  hayCitas: false,
  hayPresupuestos: false,
  hayPagos: false,
};

const ids = (rol: Parameters<typeof pasosParaRol>[0]) => pasosParaRol(rol).map((p) => p.id);

describe("pasos del tutorial", () => {
  it("empiezan por el consultorio y el médico, y el primer paciente va antes que la primera cita", () => {
    const orden = PASOS_TUTORIAL.map((p) => p.id);
    expect(orden[0]).toBe("consultorio");
    expect(orden.indexOf("medicos")).toBeLessThan(orden.indexOf("receta"));
    expect(orden.indexOf("paciente")).toBeLessThan(orden.indexOf("cita"));
    expect(orden.indexOf("cita")).toBeLessThan(orden.indexOf("pago"));
  });

  it("cada paso tiene qué es, cómo se hace y un botón que lleva a algún lado", () => {
    for (const p of PASOS_TUTORIAL) {
      expect(p.titulo.length).toBeGreaterThan(0);
      expect(p.que.length).toBeGreaterThan(0);
      expect(p.como.length).toBeGreaterThanOrEqual(2);
      expect(p.accion?.etiqueta).toBeTruthy();
    }
  });

  it("los ids no se repiten", () => {
    const todos = PASOS_TUTORIAL.map((p) => p.id);
    expect(new Set(todos).size).toBe(todos.length);
  });
});

describe("pasos por rol", () => {
  it("el administrador ve todos", () => {
    expect(ids("admin")).toHaveLength(PASOS_TUTORIAL.length);
  });

  it("el colaborador no ve cobro ni equipo, pero sí consultorio y receta", () => {
    const colaborador = ids("colaborador");
    expect(colaborador).not.toContain("pago");
    expect(colaborador).not.toContain("equipo");
    expect(colaborador).toContain("consultorio");
    expect(colaborador).toContain("cita");
  });

  it("el cirujano dentista no ve lo administrativo (su menú no lo muestra)", () => {
    const dentista = ids("odontologo");
    expect(dentista).not.toContain("consultorio");
    expect(dentista).not.toContain("receta");
    expect(dentista).not.toContain("pago");
    expect(dentista).toEqual(["medicos", "paciente", "cita", "expediente", "recetas"]);
  });
});

describe("pasos hechos", () => {
  const paso = (id: string) => PASOS_TUTORIAL.find((p) => p.id === id)!;

  it("se marcan con los datos de la clínica", () => {
    expect(pasoEstaHecho(paso("paciente"), vacio)).toBe(false);
    expect(pasoEstaHecho(paso("paciente"), { ...vacio, hayPacientes: true })).toBe(true);
    expect(pasoEstaHecho(paso("receta"), { ...vacio, hayMedicoConCedula: true })).toBe(true);
  });

  it("un paso informativo nunca aparece como hecho", () => {
    expect(pasoEstaHecho(paso("recetas"), { ...vacio, hayCitas: true })).toBe(false);
  });

  it("el avance cuenta solo los pasos que se pueden comprobar", () => {
    const todos = PASOS_TUTORIAL;
    expect(avanceTutorial(todos, vacio)).toEqual({ hechos: 0, total: 7 });
    expect(avanceTutorial(todos, { ...vacio, hayPacientes: true, hayCitas: true })).toEqual({ hechos: 2, total: 7 });
  });
});

describe("avance recordado", () => {
  it("sin nada guardado empieza desde el principio", () => {
    expect(leerEstadoTutorial(null)).toEqual({ visto: false, paso: 0 });
  });

  it("lee lo guardado", () => {
    expect(leerEstadoTutorial(JSON.stringify({ visto: true, paso: 3 }))).toEqual({ visto: true, paso: 3 });
  });

  it("con datos dañados o raros no revienta", () => {
    expect(leerEstadoTutorial("{no es json")).toEqual({ visto: false, paso: 0 });
    expect(leerEstadoTutorial(JSON.stringify({ visto: "sí", paso: -2 }))).toEqual({ visto: false, paso: 0 });
    expect(leerEstadoTutorial("null")).toEqual({ visto: false, paso: 0 });
  });
});
