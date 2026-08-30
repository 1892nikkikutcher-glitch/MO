import { describe, expect, it } from "vitest";
import {
  diasDesde,
  estadoDocumentacionDeCita,
  prioridadPorAntiguedad,
  textoAntiguedad,
} from "../documentacionPendiente";
import type { EstadoNotaEvolucion, NotaEvolucionV2 } from "../notasEvolucion";
import type { NotaEvolucion } from "../patientData";

function notaV2(citaId: string, estado: EstadoNotaEvolucion): NotaEvolucionV2 {
  return {
    id: `nota-${Math.random()}`,
    version: 2,
    estado,
    modoCaptura: "rapido",
    revision: 1,
    encabezado: { patientId: "p1", pacienteNombreSnapshot: "Paciente", citaId, medico: "Dr.", organosDentales: [] },
    comoLlegaHoy: {} as NotaEvolucionV2["comoLlegaHoy"],
    queEncontraste: {} as NotaEvolucionV2["queEncontraste"],
    diagnostico: {} as NotaEvolucionV2["diagnostico"],
    narrativa: {} as NotaEvolucionV2["narrativa"],
    aclaraciones: [],
    creadoPorUid: "uid1",
    creadoEn: "2026-08-01T00:00:00.000Z",
    actualizadoEn: "2026-08-01T00:00:00.000Z",
  };
}

function notaV1(): NotaEvolucion {
  return {
    id: "nota-v1",
    fecha: "2026-01-01",
    medico: "Dr.",
    presentacion: "",
    subjetivo: "",
    objetivo: "",
    analisis: "",
    pronostico: "",
  };
}

describe("estadoDocumentacionDeCita", () => {
  it("cargando o nunca solicitado -> null, nunca sin_nota", () => {
    expect(estadoDocumentacionDeCita("c1", undefined, undefined)).toBeNull();
    expect(estadoDocumentacionDeCita("c1", undefined, "cargando")).toBeNull();
    expect(estadoDocumentacionDeCita("c1", [], "cargando")).toBeNull();
  });

  it("error de carga -> null, nunca sin_nota", () => {
    expect(estadoDocumentacionDeCita("c1", [], "error")).toBeNull();
    expect(estadoDocumentacionDeCita("c1", undefined, "error")).toBeNull();
  });

  it("cargado sin notas relacionadas -> sin_nota", () => {
    expect(estadoDocumentacionDeCita("c1", [], "cargado")).toBe("sin_nota");
    expect(estadoDocumentacionDeCita("c1", [notaV2("c2", "borrador")], "cargado")).toBe("sin_nota");
  });

  it("nunca asocia una nota v1 histórica a una cita (no tiene citaId)", () => {
    expect(estadoDocumentacionDeCita("c1", [notaV1()], "cargado")).toBe("sin_nota");
  });

  it("una sola nota relacionada -> su propio estado", () => {
    expect(estadoDocumentacionDeCita("c1", [notaV2("c1", "borrador")], "cargado")).toBe("borrador");
    expect(estadoDocumentacionDeCita("c1", [notaV2("c1", "lista_revision")], "cargado")).toBe("lista_revision");
    expect(estadoDocumentacionDeCita("c1", [notaV2("c1", "firmada")], "cargado")).toBe("concluida");
    expect(estadoDocumentacionDeCita("c1", [notaV2("c1", "con_aclaracion")], "cargado")).toBe("concluida");
  });

  it("precedencia: borrador + firmada para la misma cita -> concluida", () => {
    const notas = [notaV2("c1", "borrador"), notaV2("c1", "firmada")];
    expect(estadoDocumentacionDeCita("c1", notas, "cargado")).toBe("concluida");
  });

  it("precedencia: borrador + lista_revision para la misma cita -> lista_revision", () => {
    const notas = [notaV2("c1", "borrador"), notaV2("c1", "lista_revision")];
    expect(estadoDocumentacionDeCita("c1", notas, "cargado")).toBe("lista_revision");
  });

  it("estado de nota no reconocido nunca se asume concluida", () => {
    const notaRara = notaV2("c1", "borrador");
    (notaRara as { estado: string }).estado = "algo_no_reconocido";
    expect(estadoDocumentacionDeCita("c1", [notaRara], "cargado")).not.toBe("concluida");
  });
});

describe("prioridadPorAntiguedad", () => {
  it("mismo día -> media", () => {
    expect(prioridadPorAntiguedad(0)).toBe("media");
  });
  it("1 o más días -> alta", () => {
    expect(prioridadPorAntiguedad(1)).toBe("alta");
    expect(prioridadPorAntiguedad(18)).toBe("alta");
  });
});

describe("textoAntiguedad", () => {
  it("distingue una deuda reciente de una antigua", () => {
    expect(textoAntiguedad(0)).toBe("hoy");
    expect(textoAntiguedad(1)).toBe("hace 1 día(s)");
    expect(textoAntiguedad(18)).toBe("hace 18 día(s)");
  });
});

describe("diasDesde", () => {
  it("hoy -> 0", () => {
    expect(diasDesde("2026-08-30", new Date(2026, 7, 30))).toBe(0);
  });
  it("ayer -> 1", () => {
    expect(diasDesde("2026-08-29", new Date(2026, 7, 30))).toBe(1);
  });
  it("cambio de mes", () => {
    expect(diasDesde("2026-07-31", new Date(2026, 7, 1))).toBe(1);
  });
  it("cambio de año", () => {
    expect(diasDesde("2025-12-31", new Date(2026, 0, 1))).toBe(1);
  });
  it("no confunde a los últimos 60 días con una fecha de caducidad — una cita de hace 20 días sigue calculando su antigüedad normalmente", () => {
    expect(diasDesde("2026-08-10", new Date(2026, 7, 30))).toBe(20);
  });
  it("caso defensivo: calcula días calendario, no horas transcurridas", () => {
    expect(diasDesde("2026-08-30", new Date(2026, 7, 30, 23, 59))).toBe(0);
  });
});
