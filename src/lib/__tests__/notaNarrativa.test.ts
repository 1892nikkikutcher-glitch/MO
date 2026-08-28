import { describe, expect, it } from "vitest";
import { generarNarrativa } from "../notaNarrativa";
import { notaEvolucionV2Inicial, type DiagnosticoPaciente, type EncabezadoNota, type NotaEvolucionV2 } from "../notasEvolucion";

const encabezado: EncabezadoNota = {
  patientId: "pac1",
  pacienteNombreSnapshot: "Juan Pérez",
  medico: "Dr. Nicolás Medina",
  organosDentales: [36],
};

function notaBase(): NotaEvolucionV2 {
  return notaEvolucionV2Inicial(encabezado, "rapido", "uid-1");
}

describe("generarNarrativa", () => {
  it("no produce texto de una nota completamente vacía (nada que inventar)", () => {
    expect(generarNarrativa(notaBase(), { diagnosticosCatalogo: [] })).toBe("");
  });

  it("omite por completo un campo opcional ausente, en vez de mencionarlo como faltante", () => {
    const nota: NotaEvolucionV2 = { ...notaBase(), comoLlegaHoy: { chips: ["sin_molestias"] } };
    const texto = generarNarrativa(nota, { diagnosticosCatalogo: [] });
    expect(texto).not.toMatch(/no se especificó/i);
    expect(texto).not.toMatch(/intensidad/i); // intensidadDolor nunca se capturó
  });

  it('narra "sin hallazgos relevantes" como un hecho confirmado, no lo omite', () => {
    const nota: NotaEvolucionV2 = {
      ...notaBase(),
      queEncontraste: { organosDentales: [36], chips: ["sin_hallazgos_relevantes"] },
    };
    const texto = generarNarrativa(nota, { diagnosticosCatalogo: [] });
    expect(texto).toMatch(/no se identificaron hallazgos clínicos relevantes/i);
  });

  it("nunca preselecciona ni inventa una confirmación de ausencia de incidentes", () => {
    const nota: NotaEvolucionV2 = { ...notaBase(), estadoFinal: { chips: [] } };
    const texto = generarNarrativa(nota, { diagnosticosCatalogo: [] });
    expect(texto).not.toMatch(/sin incidentes/i);
  });

  it("reproduce fielmente el ejemplo del pedido original", () => {
    const catalogo: DiagnosticoPaciente[] = [
      {
        id: "dx1",
        dientes: [36],
        diagnostico: "Necrosis pulpar con periodontitis apical",
        estado: "definitivo",
        creadoEn: "2026-08-01T00:00:00.000Z",
        origen: "nuevo",
      },
    ];
    const nota: NotaEvolucionV2 = {
      ...notaBase(),
      comoLlegaHoy: { chips: ["con_dolor", "mejoro"], intensidadDolor: 2 },
      queEncontraste: { organosDentales: [36], chips: ["sin_hallazgos_relevantes"] },
      diagnostico: { diagnosticosIds: ["dx1"] },
      detalleProcedimiento: {
        tipo: "endodoncia",
        procedimientoNombre: "Endodoncia",
        actividadRealizada: "Se realiza instrumentación y desinfección de conductos",
        organosDentales: [36],
        etapaRealizada: "irrigacion",
        irrigantes: "hipoclorito de sodio",
      },
      estadoFinal: { chips: ["bien_tolerado"] },
    };
    const texto = generarNarrativa(nota, { diagnosticosCatalogo: catalogo });
    expect(texto).toMatch(/dolor \(2\/10\)/i);
    expect(texto).toMatch(/mejoría/i);
    expect(texto).toMatch(/no se identificaron hallazgos clínicos relevantes/i);
    expect(texto).toMatch(/necrosis pulpar con periodontitis apical/i);
    expect(texto).toMatch(/hipoclorito de sodio/i);
    expect(texto).toMatch(/se toleró bien/i);
  });

  it("cada plantilla de procedimiento narra sus propios campos distintivos", () => {
    const casos: Array<[NotaEvolucionV2["detalleProcedimiento"], RegExp]> = [
      [
        {
          tipo: "extraccion",
          procedimientoNombre: "Extracción",
          actividadRealizada: "Extracción simple",
          organosDentales: [18],
          indicacion: "Diente no restaurable",
          tipoExtraccion: "simple",
        },
        /extracción simple/i,
      ],
      [
        {
          tipo: "resina",
          procedimientoNombre: "Resina",
          actividadRealizada: "Restauración con resina",
          organosDentales: [14],
          superficiesTratadas: ["O", "M"],
          materialRestaurador: "Composite nanohíbrido",
        },
        /material restaurador: composite nanohíbrido/i,
      ],
      [
        {
          tipo: "limpieza",
          procedimientoNombre: "Limpieza",
          actividadRealizada: "Limpieza dental",
          organosDentales: [],
          metodoUsado: ["ultrasonido"],
          fluorAplicado: true,
        },
        /se aplica flúor/i,
      ],
      [
        {
          tipo: "control_ortodoncia",
          procedimientoNombre: "Control",
          actividadRealizada: "Control de ortodoncia",
          organosDentales: [],
          arco: { retirado: true, colocado: true },
        },
        /retiro y colocación de arco/i,
      ],
    ];
    for (const [detalle, patron] of casos) {
      const nota: NotaEvolucionV2 = { ...notaBase(), detalleProcedimiento: detalle };
      expect(generarNarrativa(nota, { diagnosticosCatalogo: [] })).toMatch(patron);
    }
  });
});
