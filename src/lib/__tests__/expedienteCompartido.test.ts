import { describe, expect, it } from "vitest";
import {
  citasCompartibles,
  diagnosticosCompartibles,
  fotosCompartibles,
  historiaClinicaCompartible,
  notasCompartibles,
  odontogramaCompartible,
  planCompartible,
  MAX_FOTOS_COMPARTIDAS,
  MAX_NOTAS_COMPARTIDAS,
} from "../expedienteCompartido";
import type { HistoriaClinicaTemplate, RespuestasHistoriaClinica } from "../historiaClinica";
import type { DiagnosticoPaciente, NotaEvolucionAny } from "../notasEvolucion";
import type { PlanTratamientoItem } from "../planTratamiento";

const template: HistoriaClinicaTemplate = {
  secciones: [
    {
      id: "s1",
      titulo: "Antecedentes",
      preguntas: [
        { id: "q1", tipo: "sino", etiqueta: "¿Diabetes?", mostrarDetalle: true },
        { id: "q2", tipo: "textarea", etiqueta: "Medicamentos" },
        { id: "q3", tipo: "chips", etiqueta: "Hábitos", opciones: ["Tabaco", "Alcohol"] },
        { id: "q4", tipo: "texto", etiqueta: "Vacía" },
      ],
    },
    { id: "s2", titulo: "Odontograma", preguntas: [{ id: "od", tipo: "odontograma", etiqueta: "Odontograma" }] },
  ],
};

const respuestas: RespuestasHistoriaClinica = {
  alergias: "Penicilina",
  porPregunta: {
    q1: "Sí",
    q1__detalle: "controlada con metformina",
    q2: "Losartán",
    q3: ["Tabaco"],
    od: [
      { id: "a", dientes: [36, 46], diagnostico: "Caries clase I", fecha: "2026-10-01", estado: "confirmado" },
      { id: "b", dientes: [36], diagnostico: "Obturación defectuosa", fecha: "2026-10-01" },
      { id: "c", dientes: [18], diagnostico: "Ya no aplica", fecha: "2026-10-01", estado: "descartado" },
    ] as never,
  },
};

describe("historiaClinicaCompartible", () => {
  const r = historiaClinicaCompartible(template, respuestas);
  it("incluye alergias primero y las respuestas con contenido", () => {
    expect(r[0]).toEqual({ titulo: "Alergias", items: [{ pregunta: "Alergias", respuesta: "Penicilina" }] });
    const ant = r.find((s) => s.titulo === "Antecedentes")!;
    expect(ant.items).toEqual([
      { pregunta: "¿Diabetes?", respuesta: "Sí — controlada con metformina" },
      { pregunta: "Medicamentos", respuesta: "Losartán" },
      { pregunta: "Hábitos", respuesta: "Tabaco" },
    ]);
  });
  it("omite preguntas vacías y la pregunta de odontograma", () => {
    expect(JSON.stringify(r)).not.toContain("Vacía");
    expect(r.find((s) => s.titulo === "Odontograma")).toBeUndefined();
  });
});

describe("odontogramaCompartible", () => {
  it("agrupa diagnósticos por diente, en orden clínico, sin descartados", () => {
    const r = odontogramaCompartible(template, respuestas);
    // Orden clínico del odontograma (ordenarDientes): 46 se lista antes que 36.
    expect(r).toEqual([
      { diente: 46, diagnosticos: ["Caries clase I"] },
      { diente: 36, diagnosticos: ["Caries clase I", "Obturación defectuosa"] },
    ]);
  });
});

describe("diagnósticos y plan", () => {
  const dx = [
    { id: "1", dientes: [16], diagnostico: "Pulpitis", estado: "definitivo", creadoEn: "", origen: "nuevo" },
  ] as unknown as DiagnosticoPaciente[];
  it("diagnósticos con estado legible", () => {
    expect(diagnosticosCompartibles(dx)).toEqual([{ dientes: "OD 16", diagnostico: "Pulpitis", estado: "Definitivo" }]);
  });
  it("el plan solo incluye tratamientos activos y no trae precios", () => {
    const plan = [
      { id: "p1", dientes: [16], tratamiento: "Endodoncia", prioridad: "alta", destino: "tratamiento_clinica", estadoClinico: "activo" },
      { id: "p2", dientes: [26], tratamiento: "Corona", prioridad: "media", destino: "tratamiento_clinica", estadoClinico: "cancelado" },
    ] as unknown as PlanTratamientoItem[];
    const r = planCompartible(plan);
    expect(r).toEqual([{ dientes: "OD 16", tratamiento: "Endodoncia", prioridad: "Alta", destino: "Tratar en clínica" }]);
    expect(JSON.stringify(r)).not.toMatch(/precio|price|costo/i);
  });
});

describe("notasCompartibles", () => {
  const v2 = (id: string, creadoEn: string, estado: string, texto: string): NotaEvolucionAny =>
    ({
      id,
      version: 2,
      estado,
      creadoEn,
      encabezado: { medico: "Dra. Mendoza" },
      narrativa: { texto, editadaManualmente: false },
    }) as unknown as NotaEvolucionAny;

  it("solo firmadas, sin administrativas, las 5 más recientes, de la más nueva a la más vieja", () => {
    const notas: NotaEvolucionAny[] = [
      ...Array.from({ length: 7 }, (_, i) => v2(`n${i}`, `2026-09-0${i + 1}T10:00:00Z`, "firmada", `texto ${i}`)),
      v2("borrador", "2026-10-09T10:00:00Z", "borrador", "no debe salir"),
      { id: "adm", tipo: "administrativa", creadoEn: "2026-10-10T00:00:00Z" } as unknown as NotaEvolucionAny,
    ];
    const r = notasCompartibles(notas, []);
    expect(r).toHaveLength(MAX_NOTAS_COMPARTIDAS);
    expect(r[0].texto).toBe("texto 6");
    expect(JSON.stringify(r)).not.toContain("no debe salir");
  });
});

describe("citas y fotos", () => {
  it("citas ordenadas de la más reciente a la más antigua, sin costos ni comentarios", () => {
    const r = citasCompartibles([
      { fecha: "2026-10-01", horaInicio: "09:00", estatus: "Atendida", tratamientos: ["Limpieza"] },
      { fecha: "2026-10-20", horaInicio: "10:00", estatus: "Confirmada", tratamientos: ["Corona"] },
    ]);
    expect(r.map((c) => c.fecha)).toEqual(["2026-10-20", "2026-10-01"]);
    expect(Object.keys(r[0]).sort()).toEqual(["estatus", "fecha", "hora", "tratamientos"]);
  });

  it("fotos: máximo 8, más recientes primero, y nunca perfil ni INE", () => {
    const f = (id: string, fecha: string) => ({ id, path: `p/${id}`, name: id, fecha });
    const r = fotosCompartibles({
      extraorales: Array.from({ length: 6 }, (_, i) => f(`e${i}`, `2026-10-0${i + 1}`)),
      intraorales: Array.from({ length: 6 }, (_, i) => f(`i${i}`, `2026-09-0${i + 1}`)),
      // @ts-expect-error — perfil e INE ni siquiera se aceptan como entrada
      perfil: f("perfil", "2026-12-01"),
    });
    expect(r).toHaveLength(MAX_FOTOS_COMPARTIDAS);
    expect(r[0].id).toBe("e5");
    expect(r.some((x) => x.id === "perfil")).toBe(false);
  });
});
