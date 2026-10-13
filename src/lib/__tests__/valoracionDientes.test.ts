import { describe, expect, it } from "vitest";
import {
  DIENTES_VALORACION,
  ID_PREGUNTA_VALORACION_DIENTES,
  VERSION_PLANTILLA,
  conCeldaValoracion,
  conSeccionValoracionDientes,
  dientesConValoracion,
  plantillaInicial,
  valorComoValoracionDientes,
  type HistoriaClinicaTemplate,
} from "../historiaClinica";

const seccion = (id: string, tipo: "texto" | "odontograma" | "valoracionDientes") => ({
  id,
  titulo: id,
  preguntas: [{ id: `p-${id}`, tipo, etiqueta: id }],
});

describe("plantilla por defecto", () => {
  it("trae el cuadro por diente justo después del odontograma", () => {
    const tipos = plantillaInicial.secciones.map((s) => s.preguntas[0]?.tipo);
    const iOdonto = tipos.indexOf("odontograma");
    expect(tipos[iOdonto + 1]).toBe("valoracionDientes");
    expect(plantillaInicial.version).toBe(VERSION_PLANTILLA);
    // Era la sección 12 → el cuadro es la 13 y el resto se recorre (17 → 18 secciones).
    expect(iOdonto + 2).toBe(13);
    expect(plantillaInicial.secciones).toHaveLength(18);
  });
});

describe("conSeccionValoracionDientes", () => {
  const vieja: HistoriaClinicaTemplate = {
    secciones: [seccion("a", "texto"), seccion("odo", "odontograma"), seccion("b", "texto")],
  };

  it("agrega el cuadro después del odontograma y marca la versión", () => {
    const r = conSeccionValoracionDientes(vieja);
    expect(r.secciones.map((s) => s.id)).toEqual(["a", "odo", "sec_valoracion_dientes", "b"]);
    expect(r.secciones[2].preguntas[0]).toMatchObject({ id: ID_PREGUNTA_VALORACION_DIENTES, tipo: "valoracionDientes" });
    expect(r.version).toBe(VERSION_PLANTILLA);
    expect(vieja.version).toBeUndefined(); // no muta
  });

  it("no la repite: si ya está al día devuelve la misma plantilla", () => {
    const una = conSeccionValoracionDientes(vieja);
    expect(conSeccionValoracionDientes(una)).toBe(una);
  });

  it("si el dueño la quitó después de actualizar, no vuelve a aparecer", () => {
    const una = conSeccionValoracionDientes(vieja);
    const sinCuadro = { ...una, secciones: una.secciones.filter((s) => s.id !== "sec_valoracion_dientes") };
    expect(conSeccionValoracionDientes(sinCuadro)).toBe(sinCuadro);
  });

  it("si ya tenía un cuadro por diente propio (sin versión) no agrega otro", () => {
    const propia: HistoriaClinicaTemplate = { secciones: [seccion("odo", "odontograma"), seccion("mio", "valoracionDientes")] };
    const r = conSeccionValoracionDientes(propia);
    expect(r.secciones).toHaveLength(2);
    expect(r.version).toBe(VERSION_PLANTILLA);
  });

  it("sin odontograma no inserta nada, solo se marca al día", () => {
    const r = conSeccionValoracionDientes({ secciones: [seccion("a", "texto")] });
    expect(r.secciones).toHaveLength(1);
    expect(r.version).toBe(VERSION_PLANTILLA);
  });
});

describe("nombre del cuadro", () => {
  it("se llama Evaluación Radiográfica y Pronóstico", () => {
    const s = plantillaInicial.secciones.find((x) => x.id === "sec_valoracion_dientes");
    expect(s?.titulo).toBe("Evaluación Radiográfica y Pronóstico");
  });

  it("una clínica que ya lo guardó con el nombre de estreno lo recibe actualizado", () => {
    const vieja: HistoriaClinicaTemplate = {
      version: VERSION_PLANTILLA,
      secciones: [
        {
          id: "sec_valoracion_dientes",
          titulo: "Valoración por Diente y Pronóstico",
          preguntas: [{ id: ID_PREGUNTA_VALORACION_DIENTES, tipo: "valoracionDientes", etiqueta: "Valoración por diente" }],
        },
      ],
    };
    const r = conSeccionValoracionDientes(vieja);
    expect(r.secciones[0].titulo).toBe("Evaluación Radiográfica y Pronóstico");
    expect(r.secciones[0].preguntas[0].etiqueta).toBe("Evaluación radiográfica por diente");
    expect(conSeccionValoracionDientes(r)).toBe(r); // ya al día: no cambia de nuevo
  });

  it("si el dueño le puso su propio nombre, no se toca", () => {
    const propia: HistoriaClinicaTemplate = {
      version: VERSION_PLANTILLA,
      secciones: [
        {
          id: "sec_valoracion_dientes",
          titulo: "Mi cuadro de pronóstico",
          preguntas: [{ id: ID_PREGUNTA_VALORACION_DIENTES, tipo: "valoracionDientes", etiqueta: "Mi etiqueta" }],
        },
      ],
    };
    expect(conSeccionValoracionDientes(propia)).toBe(propia);
  });
});

describe("captura del cuadro", () => {
  it("lee cualquier valor raro como cuadro vacío", () => {
    expect(valorComoValoracionDientes(undefined)).toEqual({});
    expect(valorComoValoracionDientes("texto")).toEqual({});
    expect(valorComoValoracionDientes([1, 2])).toEqual({});
  });

  it("guarda solo celdas con algo escrito y deja {} al borrar todo", () => {
    let v = conCeldaValoracion({}, 16, "pronostico", "Bueno");
    v = conCeldaValoracion(v, 16, "caries", "Profunda");
    expect(v).toEqual({ "16": { pronostico: "Bueno", caries: "Profunda" } });
    v = conCeldaValoracion(v, 16, "caries", "   ");
    expect(v).toEqual({ "16": { pronostico: "Bueno" } });
    v = conCeldaValoracion(v, 16, "pronostico", "");
    expect(v).toEqual({});
  });

  it("no muta el cuadro anterior", () => {
    const antes = { "11": { pronostico: "Malo" } };
    conCeldaValoracion(antes, 11, "pronostico", "Bueno");
    expect(antes).toEqual({ "11": { pronostico: "Malo" } });
  });

  it("lista los dientes con datos en el orden del formato", () => {
    let v = conCeldaValoracion({}, 48, "pronostico", "Malo");
    v = conCeldaValoracion(v, 18, "furcas", "Grado II");
    v = conCeldaValoracion(v, 21, "caries", "Sí");
    expect(dientesConValoracion(v)).toEqual([18, 21, 48]);
  });

  it("el formato trae los 32 permanentes, sin repetir", () => {
    expect(DIENTES_VALORACION).toHaveLength(32);
    expect(new Set(DIENTES_VALORACION).size).toBe(32);
  });
});
