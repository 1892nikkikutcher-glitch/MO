import { describe, expect, it } from "vitest";
import {
  citaIdDeNota,
  esNotaAdministrativa,
  esNotaV2,
  estadoSeccion,
  normalizarRevision,
  notaAdministrativaInicial,
  notaEvolucionV2Inicial,
  obtenerFaltantesNota,
  recomendacionSignosVitales,
  sugerirProcedimientoDesdeCatalogo,
  validarNotaParaFirmar,
  type EncabezadoNota,
  type NotaEvolucionV2,
} from "../notasEvolucion";
import type { Procedimiento } from "../procedimientos";
import type { NotaEvolucion } from "../patientData";

const encabezado: EncabezadoNota = {
  patientId: "pac1",
  pacienteNombreSnapshot: "Juan Pérez",
  medico: "Dr. Nicolás Medina",
  organosDentales: [],
};

/** Nota "completa" de referencia — cada prueba parte de aquí y rompe
 * exactamente el campo que quiere probar, en vez de reconstruir todo. */
function notaCompleta(): NotaEvolucionV2 {
  const base = notaEvolucionV2Inicial(encabezado, "rapido", "uid-1");
  return {
    ...base,
    comoLlegaHoy: { chips: ["sin_molestias"] },
    queEncontraste: { organosDentales: [], chips: ["sin_hallazgos_relevantes"] },
    diagnostico: { diagnosticosIds: ["dx1"] },
    detalleProcedimiento: {
      tipo: "otro",
      procedimientoNombre: "Consulta",
      actividadRealizada: "Valoración general",
      organosDentales: [],
    },
    estadoFinal: { chips: ["sin_incidentes"] },
    indicaciones: { medicamentos: [], pronostico: "favorable", indicacionesNoNecesarias: true },
  };
}

describe("notaEvolucionV2Inicial", () => {
  it("crea una nota en borrador, versión 2, con las secciones vacías", () => {
    const nota = notaEvolucionV2Inicial(encabezado, "rapido", "uid-1");
    expect(nota.version).toBe(2);
    expect(nota.estado).toBe("borrador");
    expect(nota.comoLlegaHoy.chips).toEqual([]);
    expect(nota.diagnostico.diagnosticosIds).toEqual([]);
    expect(nota.aclaraciones).toEqual([]);
    expect(nota.creadoPorUid).toBe("uid-1");
  });

  it("cada nota tiene un id distinto", () => {
    const a = notaEvolucionV2Inicial(encabezado, "rapido", "uid-1");
    const b = notaEvolucionV2Inicial(encabezado, "rapido", "uid-1");
    expect(a.id).not.toBe(b.id);
  });

  it("nace en revisión 1 — la base para la detección de conflictos", () => {
    const nota = notaEvolucionV2Inicial(encabezado, "rapido", "uid-1");
    expect(nota.revision).toBe(1);
  });
});

describe("normalizarRevision", () => {
  it("deja intacta una nota que ya tiene revision", () => {
    const nota = { ...notaEvolucionV2Inicial(encabezado, "rapido", "uid-1"), revision: 8 };
    expect(normalizarRevision(nota).revision).toBe(8);
  });

  it("una nota v2 creada antes de este campo (revision ausente) se normaliza a 1, nunca a 0", () => {
    const nota = notaEvolucionV2Inicial(encabezado, "rapido", "uid-1");
    // Simula un documento real de producción escrito antes de esta corrección.
    const legacy = { ...nota } as NotaEvolucionV2;
    // @ts-expect-error -- se borra a propósito para simular el documento legado.
    delete legacy.revision;
    expect(normalizarRevision(legacy).revision).toBe(1);
  });
});

describe("esNotaV2", () => {
  it("distingue una nota v1 (sin campo version) de una v2", () => {
    const v1: NotaEvolucion = {
      id: "n1",
      fecha: "01/01/2026",
      medico: "Dr. X",
      presentacion: "",
      subjetivo: "",
      objetivo: "",
      analisis: "",
      pronostico: "",
    };
    const v2 = notaEvolucionV2Inicial(encabezado, "rapido", "uid-1");
    expect(esNotaV2(v1)).toBe(false);
    expect(esNotaV2(v2)).toBe(true);
  });
});

describe("notaAdministrativaInicial / esNotaAdministrativa / citaIdDeNota", () => {
  const v1: NotaEvolucion = {
    id: "n1",
    fecha: "01/01/2026",
    medico: "Dr. X",
    presentacion: "",
    subjetivo: "",
    objetivo: "",
    analisis: "",
    pronostico: "",
  };
  const v2 = notaEvolucionV2Inicial({ ...encabezado, citaId: "cita1" }, "rapido", "uid-1");
  const administrativa = notaAdministrativaInicial({
    patientId: "pac1",
    pacienteNombreSnapshot: "Juan Pérez",
    citaId: "cita2",
    motivo: "cancela_paciente",
    registradoPorUid: "uid-1",
  });

  it("crea una nota administrativa con los datos dados y un id propio", () => {
    expect(administrativa.tipo).toBe("administrativa");
    expect(administrativa.citaId).toBe("cita2");
    expect(administrativa.motivo).toBe("cancela_paciente");
    expect(administrativa.notaLibre).toBeUndefined();
  });

  it("esNotaAdministrativa distingue el tipo administrativa de v1 y v2", () => {
    expect(esNotaAdministrativa(v1)).toBe(false);
    expect(esNotaAdministrativa(v2)).toBe(false);
    expect(esNotaAdministrativa(administrativa)).toBe(true);
  });

  it("citaIdDeNota lee el citaId correcto según el tipo — null para v1", () => {
    expect(citaIdDeNota(v1)).toBeNull();
    expect(citaIdDeNota(v2)).toBe("cita1");
    expect(citaIdDeNota(administrativa)).toBe("cita2");
  });
});

describe("obtenerFaltantesNota / validarNotaParaFirmar", () => {
  it("una nota completa no tiene faltantes y es válida para firmar", () => {
    const nota = notaCompleta();
    expect(obtenerFaltantesNota(nota)).toEqual([]);
    expect(validarNotaParaFirmar(nota).valido).toBe(true);
  });

  it("rechaza una nota sin nada capturado en '¿Cómo llega hoy?'", () => {
    const nota = { ...notaCompleta(), comoLlegaHoy: { chips: [] } };
    const faltantes = obtenerFaltantesNota(nota);
    expect(faltantes.some((f) => f.seccion === "como_llega")).toBe(true);
  });

  it('acepta "sin hallazgos relevantes" como confirmación explícita, no como vacío', () => {
    const nota = notaCompleta();
    expect(obtenerFaltantesNota(nota).some((f) => f.seccion === "que_encontraste")).toBe(false);
  });

  it("exige diagnóstico o una justificación explícita de por qué no aplica", () => {
    const sinNada = { ...notaCompleta(), diagnostico: { diagnosticosIds: [] } };
    expect(obtenerFaltantesNota(sinNada).some((f) => f.seccion === "diagnostico")).toBe(true);

    const conJustificacion = {
      ...notaCompleta(),
      diagnostico: { diagnosticosIds: [], justificacionSinDiagnostico: "Control de rutina sin hallazgos nuevos" },
    };
    expect(obtenerFaltantesNota(conJustificacion).some((f) => f.seccion === "diagnostico")).toBe(false);
  });

  it('un chip "incidente" exige el detalle completo del incidente', () => {
    const nota: NotaEvolucionV2 = { ...notaCompleta(), estadoFinal: { chips: ["incidente"] } };
    expect(obtenerFaltantesNota(nota).some((f) => f.seccion === "estado_final")).toBe(true);

    const completo: NotaEvolucionV2 = {
      ...notaCompleta(),
      estadoFinal: {
        chips: ["incidente"],
        incidente: {
          queOcurrio: "Sangrado prolongado",
          comoSeAtendio: "Compresión con gasa",
          estadoFinalPaciente: "Estable",
          seguimientoRequerido: "Revisión en 24h",
        },
      },
    };
    expect(obtenerFaltantesNota(completo).some((f) => f.seccion === "estado_final")).toBe(false);
  });

  it("nunca exige signos vitales para firmar", () => {
    const nota: NotaEvolucionV2 = { ...notaCompleta(), queEncontraste: { organosDentales: [], chips: ["sin_hallazgos_relevantes"] } };
    expect(obtenerFaltantesNota(nota)).toEqual([]);
  });

  it("un medicamento incompleto (sin vía) hace fallar la validación", () => {
    const nota: NotaEvolucionV2 = {
      ...notaCompleta(),
      indicaciones: {
        medicamentos: [{ id: "m1", principioActivo: "Amoxicilina", dosis: "500mg", via: "", frecuencia: "cada 8h" }],
        pronostico: "favorable",
      },
    };
    expect(validarNotaParaFirmar(nota).valido).toBe(false);
  });

  it("exige pronóstico para firmar", () => {
    const nota = { ...notaCompleta(), indicaciones: { medicamentos: [], indicacionesNoNecesarias: true } };
    expect(obtenerFaltantesNota(nota).some((f) => f.seccion === "indicaciones")).toBe(true);
  });

  it("indicaciones vacías sin confirmación explícita cuentan como faltante", () => {
    const nota: NotaEvolucionV2 = { ...notaCompleta(), indicaciones: { medicamentos: [], pronostico: "favorable" } };
    expect(obtenerFaltantesNota(nota).some((f) => f.seccion === "indicaciones")).toBe(true);
  });
});

describe("estadoSeccion", () => {
  it("una sección sin tocar está pendiente", () => {
    const nota = notaEvolucionV2Inicial(encabezado, "rapido", "uid-1");
    expect(estadoSeccion(nota, "como_llega")).toBe("pendiente");
  });

  it('"con_dolor" sin intensidad queda en atención, no en completa', () => {
    const nota = { comoLlegaHoy: { chips: ["con_dolor" as const] } };
    expect(estadoSeccion(nota, "como_llega")).toBe("atencion");
  });

  it("con intensidad de dolor capturada, la sección queda completa", () => {
    const nota = { comoLlegaHoy: { chips: ["con_dolor" as const], intensidadDolor: 3 } };
    expect(estadoSeccion(nota, "como_llega")).toBe("completa");
  });

  it("estado_final con incidente incompleto queda en atención", () => {
    const nota = { estadoFinal: { chips: ["incidente" as const] } };
    expect(estadoSeccion(nota, "estado_final")).toBe("atencion");
  });
});

describe("sugerirProcedimientoDesdeCatalogo", () => {
  const catalogo: Procedimiento[] = [
    { id: "p1", nombre: "Limpieza dental", especialidad: "Odontología General", costoPaciente: 500, costoOdontologo: 200, duracionMinutos: 30 },
  ];

  it("encuentra el procedimiento por nombre exacto, ignorando mayúsculas/espacios", () => {
    expect(sugerirProcedimientoDesdeCatalogo("  limpieza dental ", catalogo)?.id).toBe("p1");
  });

  it("no encuentra nada si el nombre no coincide", () => {
    expect(sugerirProcedimientoDesdeCatalogo("Endodoncia", catalogo)).toBeUndefined();
  });
});

describe("recomendacionSignosVitales", () => {
  it("recomienda signos vitales para procedimientos de mayor riesgo", () => {
    expect(recomendacionSignosVitales("cirugia")).toBe(true);
    expect(recomendacionSignosVitales("extraccion")).toBe(true);
  });

  it("no recomienda para una limpieza de rutina", () => {
    expect(recomendacionSignosVitales("limpieza")).toBe(false);
  });
});
