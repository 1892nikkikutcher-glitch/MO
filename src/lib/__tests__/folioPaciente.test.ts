import { describe, expect, it } from "vitest";
import {
  calcularHashFolio,
  formatoFolioValido,
  generarFolioCrudo,
  normalizarFolio,
  resolverFolioPorVersionDeClave,
} from "../folioPaciente";

// Nunca con el pepper real de ningún entorno — un secreto de prueba basta
// para probar las propiedades del hash sin tocar process.env ni Firestore.
const SECRETO_PRUEBA = "secreto-de-prueba-nunca-real";

describe("calcularHashFolio", () => {
  it("es determinístico: mismo folio + mismo secreto = mismo hash", () => {
    expect(calcularHashFolio("MOABC123", SECRETO_PRUEBA)).toBe(calcularHashFolio("MOABC123", SECRETO_PRUEBA));
  });

  it("folios distintos con el mismo secreto dan hashes distintos", () => {
    expect(calcularHashFolio("MOABC123", SECRETO_PRUEBA)).not.toBe(calcularHashFolio("MOXYZ789", SECRETO_PRUEBA));
  });

  it("el mismo folio con secretos distintos da hashes distintos (rotación de clave)", () => {
    expect(calcularHashFolio("MOABC123", SECRETO_PRUEBA)).not.toBe(calcularHashFolio("MOABC123", "otro-secreto"));
  });

  it("nunca contiene el folio crudo en el resultado", () => {
    expect(calcularHashFolio("MOABC123", SECRETO_PRUEBA)).not.toContain("MOABC123");
  });
});

describe("normalizarFolio", () => {
  it("recorta espacios y pasa a mayúsculas", () => {
    expect(normalizarFolio("  mo7f3k9qpxz  ")).toBe("MO7F3K9QPXZ");
  });

  it("quita guiones y espacios internos", () => {
    expect(normalizarFolio("MO-7F3K-9QPX-Z")).toBe("MO7F3K9QPXZ");
    expect(normalizarFolio("MO 7F3K 9QPX Z")).toBe("MO7F3K9QPXZ");
  });
});

describe("formatoFolioValido", () => {
  it("acepta un folio con la forma correcta", () => {
    const folio = normalizarFolio(generarFolioCrudo());
    expect(formatoFolioValido(folio)).toBe(true);
  });

  it("rechaza longitud incorrecta", () => {
    expect(formatoFolioValido("MO7F3K9")).toBe(false);
    expect(formatoFolioValido("MO7F3K9QPXZ99")).toBe(false);
  });

  it("rechaza caracteres ambiguos excluidos del alfabeto (0, O, 1, I, L)", () => {
    expect(formatoFolioValido("MO0123456789")).toBe(false);
    expect(formatoFolioValido("MOOILXXXXXXX")).toBe(false);
  });

  it("rechaza un folio sin el prefijo MO", () => {
    expect(formatoFolioValido("XX7F3K9QPXZ")).toBe(false);
  });
});

describe("generarFolioCrudo", () => {
  it("genera folios que siempre pasan formatoFolioValido", () => {
    for (let i = 0; i < 200; i++) {
      expect(formatoFolioValido(generarFolioCrudo())).toBe(true);
    }
  });

  it("nunca incluye los caracteres ambiguos excluidos en su parte aleatoria (el prefijo 'MO' no cuenta — no sale del alfabeto aleatorio)", () => {
    for (let i = 0; i < 200; i++) {
      const parteAleatoria = generarFolioCrudo().slice(2);
      expect(parteAleatoria).not.toMatch(/[0O1IL]/);
    }
  });

  it("genera valores distintos entre sí (no es una constante)", () => {
    const folios = new Set(Array.from({ length: 50 }, () => generarFolioCrudo()));
    expect(folios.size).toBeGreaterThan(1);
  });
});

describe("resolverFolioPorVersionDeClave", () => {
  // Simula un almacén { hash: documento } y un hash determinístico
  // dependiente de (folio, version) — sin crypto real, solo para probar
  // el ORDEN de resolución.
  function hashFalso(folio: string, version: number): string {
    return `${folio}::v${version}`;
  }

  it("resuelve con la clave vigente cuando el hash de esa versión coincide", () => {
    const almacen: Record<string, string> = { [hashFalso("MOABC", 3)]: "doc-vigente" };
    const resultado = resolverFolioPorVersionDeClave(
      "MOABC",
      [3, 2, 1],
      hashFalso,
      (hash) => almacen[hash] ?? null
    );
    expect(resultado).toEqual({ encontrado: "doc-vigente", version: 3 });
  });

  it("si la clave vigente no resuelve, prueba las anteriores autorizadas en orden, deteniéndose en la primera coincidencia", () => {
    const almacen: Record<string, string> = { [hashFalso("MOABC", 1)]: "doc-viejo" };
    const resultado = resolverFolioPorVersionDeClave(
      "MOABC",
      [3, 2, 1],
      hashFalso,
      (hash) => almacen[hash] ?? null
    );
    expect(resultado).toEqual({ encontrado: "doc-viejo", version: 1 });
  });

  it("nunca prueba una versión de clave retirada — solo las que vienen en versionesAutorizadas", () => {
    const intentos: number[] = [];
    const buscarConRegistro = (hash: string) => {
      intentos.push(Number(hash.split("::v")[1]));
      return null;
    };
    resolverFolioPorVersionDeClave("MOABC", [3, 2], hashFalso, buscarConRegistro);
    expect(intentos).toEqual([3, 2]);
    expect(intentos).not.toContain(1); // la versión 1 nunca se intenta si no está autorizada
  });

  it("null cuando ninguna versión autorizada resuelve", () => {
    const resultado = resolverFolioPorVersionDeClave("MOABC", [3, 2, 1], hashFalso, () => null);
    expect(resultado).toBeNull();
  });
});
