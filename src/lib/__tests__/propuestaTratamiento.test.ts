import { describe, expect, it } from "vitest";
import { MOTIVO_SOSPECHA, propuestaDesdeOdontograma, sugerirTratamientoDelCatalogo } from "../propuestaTratamiento";
import type { DiagnosticoOdontograma, HistoriaClinicaTemplate, RespuestasHistoriaClinica } from "../historiaClinica";
import type { PlanTratamientoItem } from "../planTratamiento";

const template: HistoriaClinicaTemplate = {
  secciones: [{ id: "s", titulo: "Odontograma", preguntas: [{ id: "od", tipo: "odontograma", etiqueta: "Odontograma" }] }],
};
const resp = (od: Partial<DiagnosticoOdontograma>[]): RespuestasHistoriaClinica => ({
  porPregunta: { od: od.map((e, i) => ({ id: `d${i}`, dientes: [16], diagnostico: "Caries", fecha: "2026-10-01", ...e })) as never },
});
const plan = (p: Partial<PlanTratamientoItem>): PlanTratamientoItem => ({
  id: "pl1", patientId: "p", diagnosticoId: "d0", preguntaId: "od", diagnosticoTexto: "Caries", estadoDiagnosticoSnapshot: "confirmado",
  dientes: [16], tratamiento: "Resina", prioridad: "media", destino: "tratamiento_clinica", estadoClinico: "activo",
  creadoEn: "", creadoPorUid: "u", ...p,
});

describe("propuestaDesdeOdontograma", () => {
  it("propone lo marcado por tratar (rojo o sin color) con sus dientes y tratamiento sugerido", () => {
    const r = propuestaDesdeOdontograma(
      template,
      resp([
        { id: "a", dientes: [36, 37], diagnostico: "Caries", color: "rojo", tratamientoSugerido: " Resina clase II " },
        { id: "b", dientes: [11], diagnostico: "Fractura" }, // diagnóstico anterior, sin color
      ]),
      []
    );
    expect(r.map((p) => p.diagnosticoId)).toEqual(["a", "b"]);
    expect(r[0]).toMatchObject({ dientes: [36, 37], tratamientoInicial: "Resina clase II", preguntaId: "od" });
    expect(r[1].tratamientoInicial).toBe("");
  });

  it("omite lo realizado (azul), descartado, sin diagnóstico y lo ya ligado a un presupuesto", () => {
    const r = propuestaDesdeOdontograma(
      template,
      resp([
        { id: "a", color: "azul" },
        { id: "b", estado: "descartado" },
        { id: "c", diagnostico: "  " },
        { id: "d", presupuestoId: "x" },
        { id: "e", dientes: [] },
        { id: "ok", color: "rojo" },
      ]),
      []
    );
    expect(r.map((p) => p.diagnosticoId)).toEqual(["ok"]);
  });

  it("un hallazgo en sospecha se muestra pero bloqueado", () => {
    const [p] = propuestaDesdeOdontograma(template, resp([{ id: "a", estado: "sospecha" }]), []);
    expect(p.bloqueo).toBe(MOTIVO_SOSPECHA);
  });

  it("con un plan de tratar sin cotizar, se propone cotizar ese mismo", () => {
    const [p] = propuestaDesdeOdontograma(template, resp([{ id: "d0", tratamientoSugerido: "Otra cosa" }]), [plan({ tratamiento: "Resina clase I" })]);
    expect(p.planExistente?.id).toBe("pl1");
    expect(p.tratamientoInicial).toBe("Resina clase I");
  });

  it("no propone lo que ya se cotizó, se completó, o se decidió referir/vigilar; sí lo cancelado", () => {
    const e = resp([{ id: "d0" }]);
    expect(propuestaDesdeOdontograma(template, e, [plan({ presupuestosVinculados: [{ presupuestoId: "x", budgetItemId: "i", fecha: "", prioridad: "media" }] })])).toEqual([]);
    expect(propuestaDesdeOdontograma(template, e, [plan({ estadoClinico: "completado" })])).toEqual([]);
    expect(propuestaDesdeOdontograma(template, e, [plan({ destino: "vigilancia" })])).toEqual([]);
    expect(propuestaDesdeOdontograma(template, e, [plan({ destino: "referencia" })])).toEqual([]);
    const cancelado = propuestaDesdeOdontograma(template, e, [plan({ estadoClinico: "cancelado" })]);
    expect(cancelado).toHaveLength(1);
    expect(cancelado[0].planExistente).toBeUndefined();
  });
});

describe("sugerirTratamientoDelCatalogo", () => {
  const catalogo = ["Profilaxis dental", "Resina clase I", "Resina clase II", "Resina clase V", "Endodoncia unirradicular", "Extracción simple", "Corona de zirconia"];

  it("sugiere un procedimiento que ya existe en el catálogo según el diagnóstico", () => {
    expect(sugerirTratamientoDelCatalogo("Pulpitis irreversible", catalogo)).toBe("Endodoncia unirradicular");
    expect(sugerirTratamientoDelCatalogo("Resto radicular", catalogo)).toBe("Extracción simple");
    expect(sugerirTratamientoDelCatalogo("Gingivitis con sarro", catalogo)).toBe("Profilaxis dental");
  });

  it("entre varios, prefiere el que coincide con lo que dice el diagnóstico (ej. la clase)", () => {
    expect(sugerirTratamientoDelCatalogo("Caries clase II", catalogo)).toBe("Resina clase II");
    expect(sugerirTratamientoDelCatalogo("Caries de segundo grado clase V", catalogo)).toBe("Resina clase V");
  });

  it("si el catálogo no tiene nada parecido, o el diagnóstico no es claro, no inventa nada", () => {
    expect(sugerirTratamientoDelCatalogo("Caries", ["Blanqueamiento"])).toBe("");
    expect(sugerirTratamientoDelCatalogo("Hallazgo raro", catalogo)).toBe("");
    expect(sugerirTratamientoDelCatalogo("Caries", [])).toBe("");
  });

  it("la propuesta arranca con la sugerencia solo cuando el médico no escribió tratamiento", () => {
    const [sin, con] = propuestaDesdeOdontograma(
      template,
      resp([
        { id: "a", diagnostico: "Caries clase I" },
        { id: "b", diagnostico: "Caries clase I", tratamientoSugerido: "Resina especial" },
      ]),
      [],
      catalogo
    );
    expect(sin).toMatchObject({ tratamientoInicial: "Resina clase I", tratamientoDeducido: true });
    expect(con.tratamientoInicial).toBe("Resina especial");
    expect(con.tratamientoDeducido).toBeUndefined();
  });
});
