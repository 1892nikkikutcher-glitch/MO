import { describe, expect, it } from "vitest";
import { ayudaPaginas } from "../ayudaPaginas";
import { buscarEnIndice, construirIndice, normalizarTexto, type ItemMenu } from "../buscadorPlataforma";

const menu: ItemMenu[] = [
  { id: "inicio", label: "Inicio" },
  { id: "pacientes", label: "Pacientes" },
  { id: "agenda", label: "Agenda" },
  { id: "cashback", label: "Cashback" },
  { id: "membresias", label: "Membresías" },
  {
    id: "reportes",
    label: "Reportes",
    children: [
      { id: "reportes-pagos", label: "Pagos" },
      { id: "reportes-corte-caja", label: "Corte caja" },
      { id: "reportes-saldos-pendientes", label: "Saldos pendientes" },
      { id: "reportes-evaluacion-semanal", label: "Evaluación semanal" },
    ],
  },
  {
    id: "administracion",
    label: "Administración",
    children: [
      { id: "administracion-colaboradores", label: "Colaboradores" },
      { id: "administracion-perfil", label: "Médicos y Recetas" },
      { id: "administracion-papelera", label: "Papelera" },
    ],
  },
  { id: "contabilidad", label: "Contabilidad y finanzas" },
];
const indice = construirIndice(menu, ayudaPaginas);
const primero = (q: string) => buscarEnIndice(indice, q)[0]?.id;

describe("buscador de la plataforma", () => {
  it("normaliza acentos, mayúsculas y signos", () => {
    expect(normalizarTexto("  ¿Médicos y RECETAS? ")).toBe("medicos y recetas");
  });

  it("encuentra una sección por su nombre, con o sin acentos y en plural o singular", () => {
    expect(primero("colaboradores")).toBe("administracion-colaboradores");
    expect(primero("colaborador")).toBe("administracion-colaboradores");
    expect(primero("PAPELERA")).toBe("administracion-papelera");
    expect(primero("evaluacion semanal")).toBe("reportes-evaluacion-semanal");
  });

  it("encuentra una sección por como la llama la gente, no por su nombre", () => {
    expect(primero("usuarios")).toBe("administracion-colaboradores");
    expect(primero("permisos")).toBe("administracion-colaboradores");
    expect(primero("regla de sobres")).toBe("contabilidad");
    expect(primero("recompensas")).toBe("cashback");
    expect(primero("quien me debe")).toBe("reportes-saldos-pendientes");
    expect(primero("cedula")).toBe("administracion-perfil");
    expect(primero("restaurar")).toBe("administracion-papelera");
  });

  it("entiende frases completas ignorando las palabras de relleno", () => {
    expect(primero("donde esta lo de los colaboradores")).toBe("administracion-colaboradores");
    expect(primero("quiero ver mis pagos")).toBe("reportes-pagos");
    expect(primero("como exporto a google calendar")).toBe("agenda");
  });

  it("perdona una letra mal escrita", () => {
    expect(primero("colaboradors")).toBe("administracion-colaboradores");
    expect(primero("papeleria")).toBe("administracion-papelera");
  });

  it("muestra la ruta completa de las secciones que están dentro de un menú", () => {
    const r = buscarEnIndice(indice, "colaboradores")[0];
    expect(r.ruta).toBe("Administración › Colaboradores");
  });

  it("todas las palabras deben encontrar algo: lo que no existe no devuelve nada", () => {
    expect(buscarEnIndice(indice, "zzzxxyy")).toEqual([]);
    expect(buscarEnIndice(indice, "colaboradores zzzxxyy")).toEqual([]);
    expect(buscarEnIndice(indice, "   ")).toEqual([]);
    expect(buscarEnIndice(indice, "de la")).toEqual([]);
  });

  it("respeta el límite de resultados y los ordena del mejor al peor", () => {
    const r = buscarEnIndice(indice, "pagos", 2);
    expect(r.length).toBeLessThanOrEqual(2);
    expect(r[0].id).toBe("reportes-pagos");
    expect(r.every((x, i) => i === 0 || x.puntaje <= r[i - 1].puntaje)).toBe(true);
  });
});
