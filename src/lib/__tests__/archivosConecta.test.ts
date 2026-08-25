import { describe, expect, it } from "vitest";
import {
  validarFirmaArchivo,
  sanearNombreArchivo,
  excedeLimitePorInterconsulta,
  esMimeTypePermitido,
  TAMANIO_MAXIMO_ARCHIVO_BYTES,
} from "../archivosConecta";

const PDF_VALIDO = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // "%PDF-1.4"
const JPEG_VALIDO = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_VALIDO = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const TEXTO_PLANO = new Uint8Array([0x68, 0x6f, 0x6c, 0x61]); // "hola"

describe("validarFirmaArchivo", () => {
  it("acepta un PDF real declarado como application/pdf", () => {
    expect(validarFirmaArchivo(PDF_VALIDO, "application/pdf")).toBe(true);
  });
  it("acepta un JPEG real declarado como image/jpeg", () => {
    expect(validarFirmaArchivo(JPEG_VALIDO, "image/jpeg")).toBe(true);
  });
  it("acepta un PNG real declarado como image/png", () => {
    expect(validarFirmaArchivo(PNG_VALIDO, "image/png")).toBe(true);
  });

  it("rechaza un archivo de texto plano disfrazado de PDF", () => {
    expect(validarFirmaArchivo(TEXTO_PLANO, "application/pdf")).toBe(false);
  });
  it("rechaza un PDF real declarado con un MIME que no es el suyo", () => {
    expect(validarFirmaArchivo(PDF_VALIDO, "image/jpeg")).toBe(false);
  });
  it("rechaza cualquier MIME fuera de la lista blanca", () => {
    expect(validarFirmaArchivo(TEXTO_PLANO, "application/x-msdownload")).toBe(false);
    expect(validarFirmaArchivo(TEXTO_PLANO, "text/html")).toBe(false);
  });
});

describe("esMimeTypePermitido", () => {
  it("solo pdf/jpeg/png", () => {
    expect(esMimeTypePermitido("application/pdf")).toBe(true);
    expect(esMimeTypePermitido("application/zip")).toBe(false);
  });
});

describe("sanearNombreArchivo", () => {
  it("quita separadores de ruta", () => {
    expect(sanearNombreArchivo("../../etc/passwd")).not.toContain("/");
    expect(sanearNombreArchivo("C:\\Windows\\algo.pdf")).not.toContain("\\");
  });
  it("quita caracteres de control", () => {
    expect(sanearNombreArchivo("radiografia\u0000.pdf")).toBe("radiografia.pdf");
  });
  it("limita la longitud a 150 caracteres", () => {
    const largo = "a".repeat(300) + ".pdf";
    expect(sanearNombreArchivo(largo).length).toBeLessThanOrEqual(150);
  });
  it("nunca regresa un nombre vacío", () => {
    expect(sanearNombreArchivo("   ")).toBe("archivo");
  });
});

describe("excedeLimitePorInterconsulta", () => {
  it("no excede con pocos archivos chicos", () => {
    expect(excedeLimitePorInterconsulta([{ tamanioBytes: 1000 }], 1000)).toBe(false);
  });
  it("excede al llegar al límite de cantidad (20)", () => {
    const actuales = Array.from({ length: 20 }, () => ({ tamanioBytes: 100 }));
    expect(excedeLimitePorInterconsulta(actuales, 100)).toBe(true);
  });
  it("excede al superar el límite de tamaño total (100 MB)", () => {
    const actuales = [{ tamanioBytes: 99 * 1024 * 1024 }];
    expect(excedeLimitePorInterconsulta(actuales, 2 * 1024 * 1024)).toBe(true);
  });
  it("un solo archivo dentro del máximo individual no excede por sí solo", () => {
    expect(excedeLimitePorInterconsulta([], TAMANIO_MAXIMO_ARCHIVO_BYTES)).toBe(false);
  });
});
