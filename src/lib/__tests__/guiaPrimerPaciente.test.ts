import { describe, expect, it } from "vitest";
import {
  PASOS_GUIA,
  debeOfrecerGuia,
  estadoGuiaInicial,
  leerEstadoGuia,
  pasoGuiaHecho,
  pasosGuiaParaRol,
  type DatosGuia,
} from "../guiaPrimerPaciente";

const sinDatos: DatosGuia = {
  hayPaciente: false,
  datosPacienteCapturados: false,
  historiaClinicaCapturada: false,
  hayPresupuestos: false,
  hayPagos: false,
  hayMembresia: false,
  hayFotografias: false,
  hayLaboratorios: false,
  hayNotasEvolucion: false,
  hayCitas: false,
};

describe("guiaPrimerPaciente — pasos", () => {
  it("empieza creando al paciente y termina agendando la cita", () => {
    expect(PASOS_GUIA[0].tipo).toBe("paciente");
    expect(PASOS_GUIA[PASOS_GUIA.length - 1].tipo).toBe("cita");
  });

  it("recorre todas las pestañas del expediente en el orden en que aparecen", () => {
    const pestanas = PASOS_GUIA.filter((p) => p.tipo === "pestana").map((p) => p.pestana);
    expect(pestanas).toEqual([
      "Datos del Paciente",
      "Consentimientos Informados",
      "Historia Clínica",
      "Plan de Tratamiento y Presupuesto",
      "Pagos",
      "Membresía",
      "Cashback",
      "Fotografías",
      "Laboratorios",
      "Listado de Citas",
      "Notas de Evolución y Seguimiento",
      "MO Conecta",
    ]);
  });

  it("los ids son únicos y cada paso trae qué es y qué llenar", () => {
    expect(new Set(PASOS_GUIA.map((p) => p.id)).size).toBe(PASOS_GUIA.length);
    for (const p of PASOS_GUIA) {
      expect(p.titulo.trim()).not.toBe("");
      expect(p.que.trim()).not.toBe("");
      expect(p.llenar.length).toBeGreaterThan(0);
    }
  });

  it("quien no ve las finanzas no recibe Pagos ni Cashback; el administrador sí", () => {
    const sinFinanzas = pasosGuiaParaRol("colaborador", false).map((p) => p.pestana);
    expect(sinFinanzas).not.toContain("Pagos");
    expect(sinFinanzas).not.toContain("Cashback");
    const admin = pasosGuiaParaRol("admin", true).map((p) => p.pestana);
    expect(admin).toContain("Pagos");
    expect(admin).toContain("Cashback");
  });

  it("marca como hechos solo los pasos que los datos del paciente cubren", () => {
    const plan = PASOS_GUIA.find((p) => p.pestana === "Plan de Tratamiento y Presupuesto")!;
    expect(pasoGuiaHecho(plan, sinDatos)).toBe(false);
    expect(pasoGuiaHecho(plan, { ...sinDatos, hayPresupuestos: true })).toBe(true);
    const cita = PASOS_GUIA.find((p) => p.tipo === "cita")!;
    expect(pasoGuiaHecho(cita, { ...sinDatos, hayCitas: true })).toBe(true);
    const fotos = PASOS_GUIA.find((p) => p.pestana === "MO Conecta")!;
    expect(pasoGuiaHecho(fotos, { ...sinDatos, hayCitas: true })).toBe(false);
  });
});

describe("guiaPrimerPaciente — avance recordado", () => {
  it("sin nada guardado o con datos dañados vuelve al estado inicial", () => {
    expect(leerEstadoGuia(null)).toEqual(estadoGuiaInicial);
    expect(leerEstadoGuia("{no es json")).toEqual(estadoGuiaInicial);
    expect(leerEstadoGuia("null")).toEqual(estadoGuiaInicial);
  });

  it("lee lo guardado y descarta valores inválidos", () => {
    expect(leerEstadoGuia(JSON.stringify({ activa: true, paso: 4, patientId: "p1", minimizada: true }))).toEqual({
      activa: true,
      vista: false,
      paso: 4,
      patientId: "p1",
      minimizada: true,
      lado: "izquierda",
    });
    expect(leerEstadoGuia(JSON.stringify({ lado: "derecha" })).lado).toBe("derecha");
    expect(leerEstadoGuia(JSON.stringify({ lado: "arriba" })).lado).toBe("izquierda");
    expect(leerEstadoGuia(JSON.stringify({ paso: -2, patientId: 7, activa: "sí" }))).toEqual(estadoGuiaInicial);
  });
});

describe("guiaPrimerPaciente — cuándo se ofrece sola", () => {
  const base = { consultorioRecienCapturado: true, hayPacientes: false, estado: estadoGuiaInicial };

  it("se ofrece al terminar de dar de alta el consultorio en una clínica sin pacientes", () => {
    expect(debeOfrecerGuia(base)).toBe(true);
  });

  it("no se ofrece si no acaba de capturarse, si ya hay pacientes, si ya la vio o si ya está en marcha", () => {
    expect(debeOfrecerGuia({ ...base, consultorioRecienCapturado: false })).toBe(false);
    expect(debeOfrecerGuia({ ...base, hayPacientes: true })).toBe(false);
    expect(debeOfrecerGuia({ ...base, estado: { ...estadoGuiaInicial, vista: true } })).toBe(false);
    expect(debeOfrecerGuia({ ...base, estado: { ...estadoGuiaInicial, activa: true } })).toBe(false);
  });
});
