import { describe, expect, it } from "vitest";
import {
  calcularFlujoFormatos,
  conMarcaFormato,
  FORMATOS_FLUJO,
  type DatosFlujoFormatos,
} from "../flujoFormatos";

const vacio: DatosFlujoFormatos = {
  paciente: {},
  tieneIne: false,
  historiaClinicaCapturada: false,
  diagnosticos: 0,
  planTratamiento: 0,
  presupuestos: 0,
  notasEvolucion: 0,
  recetas: 0,
  pagos: 0,
  laboratorios: 0,
  encuestasEnviadas: 0,
  encuestasRespondidas: 0,
};

const estadoDe = (datos: DatosFlujoFormatos, clave: string) =>
  calcularFlujoFormatos(datos).filas.find((f) => f.formato.clave === clave)!.estado;

describe("flujoFormatos", () => {
  it("el catálogo trae los 24 formatos de la hoja, numerados del 1 al 24 y sin claves repetidas", () => {
    expect(FORMATOS_FLUJO.map((f) => f.numero)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    expect(new Set(FORMATOS_FLUJO.map((f) => f.clave)).size).toBe(24);
  });

  it("solo dos formatos están como próximamente", () => {
    expect(FORMATOS_FLUJO.filter((f) => f.modo === "proximamente")).toHaveLength(2);
  });

  it("un paciente recién creado no tiene nada realizado y los próximamente no cuentan en el avance", () => {
    const { filas, resumen } = calcularFlujoFormatos({
      ...vacio,
      paciente: { name: "Ana", phone: "5512345678", birthDate: "1990-01-01" },
    });
    expect(filas).toHaveLength(24);
    expect(resumen.hechos).toBe(0);
    expect(resumen.aplicables).toBe(22);
    expect(resumen.porcentaje).toBe(0);
  });

  it("datos generales: pendientes, incompletos sin INE y realizados con INE", () => {
    expect(estadoDe(vacio, "datosGenerales")).toBe("pendiente");
    const paciente = { name: "Ana", phone: "5512345678", birthDate: "1990-01-01" };
    expect(estadoDe({ ...vacio, paciente }, "datosGenerales")).toBe("parcial");
    expect(estadoDe({ ...vacio, paciente, tieneIne: true }, "datosGenerales")).toBe("hecho");
  });

  it("estudio socioeconómico: parcial con datos sueltos, realizado con el nivel", () => {
    expect(estadoDe({ ...vacio, paciente: { ingresoFamiliar: "10000" } }, "estudioSocioeconomico")).toBe("parcial");
    expect(estadoDe({ ...vacio, paciente: { nivelSocioeconomico: "C" } }, "estudioSocioeconomico")).toBe("hecho");
  });

  it("los formatos que MO ya guarda se marcan solos", () => {
    const datos: DatosFlujoFormatos = {
      ...vacio,
      historiaClinicaCapturada: true,
      diagnosticos: 2,
      presupuestos: 1,
      notasEvolucion: 3,
      recetas: 1,
      pagos: 2,
      laboratorios: 1,
    };
    for (const clave of [
      "historiaClinica",
      "diagnosticoTratamiento",
      "presupuesto",
      "notasEvolucion",
      "receta",
      "historialPagos",
      "formatoLaboratorio",
    ]) {
      expect(estadoDe(datos, clave)).toBe("hecho");
    }
  });

  it("la encuesta enviada sin respuesta queda incompleta; con respuesta, realizada", () => {
    expect(estadoDe({ ...vacio, encuestasEnviadas: 1 }, "encuestaSatisfaccion")).toBe("parcial");
    expect(estadoDe({ ...vacio, encuestasEnviadas: 1, encuestasRespondidas: 1 }, "encuestaSatisfaccion")).toBe("hecho");
  });

  it("los papeles firmados a mano quedan pendientes hasta que se marcan, con su fecha", () => {
    expect(estadoDe(vacio, "avisoPrivacidad")).toBe("pendiente");
    const marcado = { ...vacio, paciente: { flujoFormatos: { avisoPrivacidad: "2026-11-19" } } };
    const fila = calcularFlujoFormatos(marcado).filas.find((f) => f.formato.clave === "avisoPrivacidad")!;
    expect(fila.estado).toBe("hecho");
    expect(fila.marcadoEl).toBe("2026-11-19");
  });

  it('"No aplica" saca el formato del avance, pero solo en los que son "si aplica"', () => {
    const base = { ...vacio, paciente: { flujoFormatos: { consentimientoOrtodoncia: "na", avisoPrivacidad: "na" } } };
    const { filas, resumen } = calcularFlujoFormatos(base);
    expect(filas.find((f) => f.formato.clave === "consentimientoOrtodoncia")!.estado).toBe("noAplica");
    // El aviso de privacidad no es "si aplica": una marca "na" no lo quita del flujo.
    expect(filas.find((f) => f.formato.clave === "avisoPrivacidad")!.estado).toBe("pendiente");
    expect(resumen.aplicables).toBe(21);
  });

  it("una marca a mano también cuenta en un formato automático (el papel se hizo fuera de MO)", () => {
    expect(estadoDe({ ...vacio, paciente: { flujoFormatos: { receta: "2026-11-19" } } }, "receta")).toBe("hecho");
  });

  it("una marca con formato inválido se ignora", () => {
    expect(estadoDe({ ...vacio, paciente: { flujoFormatos: { avisoPrivacidad: "ayer" } } }, "avisoPrivacidad")).toBe("pendiente");
  });

  it("calcula el porcentaje de avance", () => {
    const { resumen } = calcularFlujoFormatos({ ...vacio, historiaClinicaCapturada: true, presupuestos: 1 });
    expect(resumen.hechos).toBe(2);
    expect(resumen.porcentaje).toBe(Math.round((2 / 22) * 100));
  });

  it("conMarcaFormato agrega, cambia y quita marcas sin tocar el original", () => {
    const original = { a: "na" };
    const con = conMarcaFormato(original, "b", "2026-11-19");
    expect(con).toEqual({ a: "na", b: "2026-11-19" });
    expect(original).toEqual({ a: "na" });
    expect(conMarcaFormato(con, "a", null)).toEqual({ b: "2026-11-19" });
    expect(conMarcaFormato(undefined, "x", "na")).toEqual({ x: "na" });
  });
});
