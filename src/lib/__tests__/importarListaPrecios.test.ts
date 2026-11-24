import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { zipSync, strToU8 } from "fflate";
import {
  clasificarListaPrecios,
  filasDeMatriz,
  leerListaPrecios,
  parsePrecio,
  procedimientoDesdeFila,
} from "../importarListaPrecios";
import type { Procedimiento } from "../procedimientos";

const aBuffer = (u8: Uint8Array): ArrayBuffer => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer;
const textoABuffer = (t: string) => aBuffer(strToU8(t));

function excel(hojas: Record<string, unknown[][]>, formato: "xlsx" | "xls" = "xlsx"): ArrayBuffer {
  const libro = XLSX.utils.book_new();
  for (const [nombre, filas] of Object.entries(hojas)) XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(filas), nombre);
  const out = XLSX.write(libro, { type: "array", bookType: formato }) as ArrayBuffer;
  return out;
}

function docx(cuerpoXml: string): ArrayBuffer {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${cuerpoXml}</w:body></w:document>`;
  return aBuffer(zipSync({ "word/document.xml": strToU8(xml), "[Content_Types].xml": strToU8("<Types/>") }));
}
const p = (t: string) => `<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
const celda = (t: string) => `<w:tc><w:tcPr/>${p(t)}</w:tc>`;
const fila = (...c: string[]) => `<w:tr>${c.map(celda).join("")}</w:tr>`;
const tabla = (...filas: string[]) => `<w:tbl><w:tblPr/>${filas.join("")}</w:tbl>`;

const proc = (nombre: string, costoPaciente: number, extra: Partial<Procedimiento> = {}): Procedimiento => ({
  id: `id-${nombre}`,
  nombre,
  especialidad: "Odontología General",
  costoPaciente,
  costoOdontologo: 0,
  duracionMinutos: 30,
  ...extra,
});

describe("parsePrecio", () => {
  it("entiende los formatos que usan los consultorios", () => {
    expect(parsePrecio("$1,200.00")).toBe(1200);
    expect(parsePrecio("1200")).toBe(1200);
    expect(parsePrecio("$ 850 MXN")).toBe(850);
    expect(parsePrecio("1.200,50")).toBe(1200.5);
    expect(parsePrecio("1,200")).toBe(1200);
    expect(parsePrecio("350,50")).toBe(350.5);
    expect(parsePrecio("1.200")).toBe(1200);
    expect(parsePrecio("12.5")).toBe(12.5);
  });
  it("lo que no es un precio devuelve null", () => {
    expect(parsePrecio("")).toBeNull();
    expect(parsePrecio("Consultar")).toBeNull();
    expect(parsePrecio("ORTODONCIA")).toBeNull();
    expect(parsePrecio("-5")).toBeNull();
  });
});

describe("filasDeMatriz", () => {
  it("reconoce las columnas por su encabezado en cualquier orden", () => {
    const r = filasDeMatriz([
      ["Precio", "Duración (min)", "Tratamiento"],
      ["$500", "45", "Limpieza dental"],
      ["$1,800", "", "Resina"],
    ]);
    expect(r.filas).toEqual([
      { nombre: "Limpieza dental", precio: 500, especialidad: "Odontología General", duracionMinutos: 45 },
      { nombre: "Resina", precio: 1800, especialidad: "Odontología General" },
    ]);
  });

  it("salta los renglones de arriba hasta encontrar los encabezados", () => {
    const r = filasDeMatriz([
      ["LISTA DE PRECIOS 2026", ""],
      ["Consultorio Dental Sonrisa", ""],
      ["Concepto", "Precio público"],
      ["Extracción simple", "700"],
    ]);
    expect(r.filas.map((f) => [f.nombre, f.precio])).toEqual([["Extracción simple", 700]]);
  });

  it("un renglón de título es la especialidad de lo que sigue", () => {
    const r = filasDeMatriz([
      ["Tratamiento", "Precio"],
      ["ORTODONCIA", ""],
      ["Brackets metálicos", "18000"],
      ["Retenedor", "1500"],
      ["Endodoncia", ""],
      ["Endodoncia molar", "4500"],
    ]);
    expect(r.filas.map((f) => [f.nombre, f.especialidad])).toEqual([
      ["Brackets metálicos", "Ortodoncia"],
      ["Retenedor", "Ortodoncia"],
      ["Endodoncia molar", "Endodoncia"],
    ]);
  });

  it("usa la columna de especialidad cuando existe", () => {
    const r = filasDeMatriz([
      ["Servicio", "Área", "Costo"],
      ["Blanqueamiento", "Estética Dental", "3500"],
    ]);
    expect(r.filas[0].especialidad).toBe("Estética Dental");
  });

  it("no confunde el costo al odontólogo o interno con el precio", () => {
    const r = filasDeMatriz([
      ["Tratamiento", "Costo odontólogo", "Costo interno", "Precio al paciente"],
      ["Corona", "800", "300", "4000"],
    ]);
    expect(r.filas[0].precio).toBe(4000);
  });

  it("avisa cuando hay más de una columna de precio", () => {
    const r = filasDeMatriz([
      ["Tratamiento", "Precio", "Precio con tarjeta"],
      ["Corona", "4000", "4200"],
    ]);
    expect(r.filas[0].precio).toBe(4000);
    expect(r.avisos.join(" ")).toContain("Precio con tarjeta");
  });

  it("sin encabezados, adivina el nombre y el precio por su contenido y lo avisa", () => {
    const r = filasDeMatriz([
      ["Limpieza dental", "500"],
      ["Resina", "1800"],
    ]);
    expect(r.filas.map((f) => [f.nombre, f.precio])).toEqual([["Limpieza dental", 500], ["Resina", 1800]]);
    expect(r.avisos.join(" ")).toContain("no trae encabezados");
  });

  it("cuenta los renglones sin precio y los repetidos", () => {
    const r = filasDeMatriz([
      ["Tratamiento", "Precio", "Nota"],
      ["Valoración", "Gratis", "con cita"],
      ["Limpieza", "500", ""],
      ["Limpieza", "500", ""],
    ]);
    expect(r.filas).toHaveLength(1);
    expect(r.sinPrecio).toBe(1);
    expect(r.repetidos).toBe(1);
  });

  it("un reporte con varias columnas de dinero: toma la que sí trae precios y agrupa por el tipo", () => {
    const r = filasDeMatriz([
      ["Consultorio Médico Profesional"],
      [" "],
      ["Grupo tratamiento", "Tipo costo tratamiento", "Codigo", "Nombre tratamiento", "Costo tratamiento", "Aplica costos aseguradora", "Precio aseguradora", "Precio paciente", "Comision doctor", "Numero de eventos", "Costo produccion", "Clasificacion Tratamiento"],
      ["Consultorio", "ORTODONCIA", "117", "BRACKET DESPEGADO AUTOLIGADO", "600.0000", "True", "0.0000", "0.0000", "0.0000", "0", "0.0000", ""],
      ["Consultorio", "ENDODONCIAS", "008", "Acceso endodóntico", "2000.0000", "True", "0.0000", "0.0000", "0.0000", "0", "0.0000", "Curativos"],
      ["Consultorio", "General", "102", "Aplicacion de Fluór", "290.0000", "True", "0.0000", "0.0000", "0.0000", "0", "0.0000", ""],
      ["Consultorio", "CONSULTA", "001", "Resina", "0.0000", "True", "0.0000", "0.0000", "0.0000", "0", "0.0000", ""],
    ]);
    expect(r.filas.map((f) => [f.nombre, f.precio, f.especialidad])).toEqual([
      ["Bracket despegado autoligado", 600, "Ortodoncia"],
      ["Acceso endodóntico", 2000, "Endodoncias"],
      ["Aplicacion de Fluór", 290, "Odontología General"],
    ]);
    expect(r.sinPrecio).toBe(1);
  });

  it("pasa nombres todo en mayúsculas a formato normal", () => {
    const r = filasDeMatriz([["Tratamiento", "Precio"], ["LIMPIEZA DENTAL PROFUNDA", "900"]]);
    expect(r.filas[0].nombre).toBe("Limpieza dental profunda");
  });
});

describe("leerListaPrecios", () => {
  it("lee un Excel .xlsx", () => {
    const r = leerListaPrecios(excel({ Precios: [["Tratamiento", "Precio"], ["Limpieza", 500], ["Resina", 1800.5]] }), "lista.xlsx");
    expect(r.filas.map((f) => [f.nombre, f.precio])).toEqual([["Limpieza", 500], ["Resina", 1800.5]]);
  });

  it("lee un Excel .xls antiguo", () => {
    const r = leerListaPrecios(excel({ Hoja1: [["Servicio", "Costo"], ["Extracción", 700]] }, "xls"), "lista.xls");
    expect(r.filas.map((f) => f.nombre)).toEqual(["Extracción"]);
  });

  it("una hoja con nombre de especialidad se la asigna a lo que trae", () => {
    const r = leerListaPrecios(
      excel({ Ortodoncia: [["Tratamiento", "Precio"], ["Brackets", 18000]], General: [["Tratamiento", "Precio"], ["Limpieza", 500]] }),
      "lista.xlsx"
    );
    expect(r.filas.map((f) => [f.nombre, f.especialidad])).toEqual([
      ["Brackets", "Ortodoncia"],
      ["Limpieza", "Odontología General"],
    ]);
  });

  it("lee una tabla de Word (.docx)", () => {
    const buffer = docx(
      p("Lista de precios") +
        tabla(fila("Tratamiento", "Precio"), fila("Limpieza dental", "$500"), fila("Resina &amp; pulido", "$1,800.00"))
    );
    const r = leerListaPrecios(buffer, "precios.docx");
    expect(r.filas.map((f) => [f.nombre, f.precio])).toEqual([["Limpieza dental", 500], ["Resina & pulido", 1800]]);
  });

  it("lee un Word sin tablas con renglones tipo «Concepto ..... $precio»", () => {
    const buffer = docx(p("Precios vigentes") + p("Limpieza dental ........ $500") + p("Resina: $1,800") + p("Atención con previa cita"));
    const r = leerListaPrecios(buffer, "precios.docx");
    expect(r.filas.map((f) => [f.nombre, f.precio])).toEqual([["Limpieza dental", 500], ["Resina", 1800]]);
  });

  it("lee un CSV con punto y coma y acentos", () => {
    const r = leerListaPrecios(textoABuffer("Tratamiento;Precio\nEndodoncia unirradicular;$3,200\nCorona de porcelana;$5,500\n"), "lista.csv");
    expect(r.filas.map((f) => [f.nombre, f.precio])).toEqual([["Endodoncia unirradicular", 3200], ["Corona de porcelana", 5500]]);
  });

  it("explica lo que no se puede leer", () => {
    expect(() => leerListaPrecios(textoABuffer("%PDF-1.7 ..."), "lista.pdf")).toThrow(/PDF/);
    expect(() => leerListaPrecios(textoABuffer("nada que ver\notra cosa"), "lista.txt")).toThrow(/No encontré tratamientos/);
    expect(() => leerListaPrecios(docx(p("Solo texto sin precios")), "vacio.docx")).toThrow(/No encontré tratamientos/);
  });
});

describe("clasificarListaPrecios", () => {
  const existentes = [proc("Limpieza dental", 500), proc("Resina compuesta", 1500), proc("Endodoncia molar", 4500)];
  const filas = [
    { nombre: "limpieza  DENTAL", precio: 500, especialidad: "Odontología General" },
    { nombre: "Resina compuesta", precio: 1800, especialidad: "Odontología General" },
    { nombre: "Endodoncia molares", precio: 4800, especialidad: "Endodoncia" },
    { nombre: "Blanqueamiento", precio: 3500, especialidad: "Estética Dental" },
  ];

  it("distingue lo igual, lo que cambia de precio, lo parecido y lo nuevo", () => {
    const r = clasificarListaPrecios(filas, existentes);
    expect(r.map((i) => i.clasificacion)).toEqual(["igual", "cambia_precio", "posible_duplicado", "nuevo"]);
    expect(r[1].existente?.id).toBe("id-Resina compuesta");
    expect(r[2].existente?.nombre).toBe("Endodoncia molar");
  });

  it("sin catálogo todo es nuevo", () => {
    expect(clasificarListaPrecios(filas, []).every((i) => i.clasificacion === "nuevo")).toBe(true);
  });
});

describe("procedimientoDesdeFila", () => {
  it("crea el tratamiento con su precio y el costo al odontólogo sin configurar", () => {
    const nuevo = procedimientoDesdeFila({ nombre: "Blanqueamiento", precio: 3500, especialidad: "Estética Dental" }, "proc1", "2026-11-24T10:00:00.000Z");
    expect(nuevo).toMatchObject({
      id: "proc1",
      nombre: "Blanqueamiento",
      costoPaciente: 3500,
      costoOdontologo: 0,
      costoSinConfigurar: true,
      duracionMinutos: 30,
      activo: true,
      especialidad: "Estética Dental",
    });
  });
});
