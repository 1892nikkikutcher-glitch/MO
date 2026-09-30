import { describe, expect, it } from "vitest";
import {
  CUADRANTES,
  cuadranteDeDiente,
  cuadrantePrincipal,
  formatearDientes,
  ordenarDientes,
} from "../odontograma";

describe("cuadranteDeDiente", () => {
  it("clasifica cada permanente en su cuadrante correcto", () => {
    expect(cuadranteDeDiente(18)).toBe(1);
    expect(cuadranteDeDiente(11)).toBe(1);
    expect(cuadranteDeDiente(21)).toBe(2);
    expect(cuadranteDeDiente(28)).toBe(2);
    expect(cuadranteDeDiente(48)).toBe(4);
    expect(cuadranteDeDiente(41)).toBe(4);
    expect(cuadranteDeDiente(31)).toBe(3);
    expect(cuadranteDeDiente(38)).toBe(3);
  });

  it("clasifica cada temporal en su cuadrante correcto", () => {
    expect(cuadranteDeDiente(55)).toBe(1);
    expect(cuadranteDeDiente(51)).toBe(1);
    expect(cuadranteDeDiente(61)).toBe(2);
    expect(cuadranteDeDiente(65)).toBe(2);
    expect(cuadranteDeDiente(85)).toBe(4);
    expect(cuadranteDeDiente(81)).toBe(4);
    expect(cuadranteDeDiente(71)).toBe(3);
    expect(cuadranteDeDiente(75)).toBe(3);
  });

  it("todos los dientes de CUADRANTES resuelven a su propio número, sin excepción", () => {
    for (const c of CUADRANTES) {
      for (const tooth of [...c.permanentes, ...c.temporales]) {
        expect(cuadranteDeDiente(tooth)).toBe(c.numero);
      }
    }
  });

  it("un número que no es un diente FDI reconocido da null, nunca lanza", () => {
    expect(cuadranteDeDiente(0)).toBeNull();
    expect(cuadranteDeDiente(99)).toBeNull();
    expect(cuadranteDeDiente(-5)).toBeNull();
    expect(cuadranteDeDiente(16.5)).toBeNull();
  });
});

describe("cuadrantePrincipal", () => {
  it("un solo diente reconocido da su propio cuadrante", () => {
    expect(cuadrantePrincipal([16])).toBe(1);
    expect(cuadrantePrincipal([36])).toBe(3);
  });

  it("con varios dientes del mismo cuadrante, da ese cuadrante", () => {
    expect(cuadrantePrincipal([16, 11, 14])).toBe(1);
  });

  it("una entrada multicuadrante usa el cuadrante del diente numéricamente menor", () => {
    expect(cuadrantePrincipal([16, 36])).toBe(1); // 16 < 36
    expect(cuadrantePrincipal([48, 21])).toBe(2); // 21 < 48
  });

  it("un valor no reconocido mezclado con uno válido nunca manda la entrada a 'Sin cuadrante'", () => {
    expect(cuadrantePrincipal([0, 36])).toBe(3);
  });

  it("ningún diente reconocido (o arreglo vacío) da null", () => {
    expect(cuadrantePrincipal([0, 99])).toBeNull();
    expect(cuadrantePrincipal([])).toBeNull();
  });
});

describe("ordenarDientes", () => {
  it("ordena dentro de un mismo cuadrante: permanentes primero, luego temporales, en el orden de CUADRANTES", () => {
    expect(ordenarDientes([15, 18, 55, 16])).toEqual([18, 16, 15, 55]);
  });

  it("respeta el orden 1, 2, 4, 3 entre cuadrantes distintos", () => {
    expect(ordenarDientes([36, 21, 48, 11])).toEqual([11, 21, 48, 36]);
  });

  it("nunca muta el arreglo recibido", () => {
    const original = [36, 11, 21];
    const copiaOriginal = [...original];
    const resultado = ordenarDientes(original);
    expect(original).toEqual(copiaOriginal);
    expect(resultado).not.toBe(original);
  });

  it("arreglo vacío da arreglo vacío", () => {
    expect(ordenarDientes([])).toEqual([]);
  });

  it("valores no reconocidos se conservan al final, ordenados numéricamente entre sí, nunca se descartan", () => {
    expect(ordenarDientes([36, 0, 11, 99])).toEqual([11, 36, 0, 99]);
  });

  it("solo valores no reconocidos: se conservan todos, ordenados numéricamente", () => {
    expect(ordenarDientes([99, 0, 50])).toEqual([0, 50, 99]);
  });

  it("duplicados se conservan (el flujo real nunca los produce, pero la función no los descarta ni truena)", () => {
    // 16 va antes que 11 en el orden canónico del propio Cuadrante 1
    // (permanentes de atrás hacia adelante) — el duplicado de 16 se
    // conserva junto a su otra aparición, ambas antes que 11.
    expect(ordenarDientes([16, 16, 11])).toEqual([16, 16, 11]);
  });
});

describe("formatearDientes", () => {
  it("arma 'OD ...' con el orden canónico aplicado", () => {
    expect(formatearDientes([15, 18, 16])).toBe("OD 18, 16, 15");
  });

  it("un solo diente", () => {
    expect(formatearDientes([36])).toBe("OD 36");
  });

  it("arreglo vacío da 'OD ' sin dientes, sin lanzar", () => {
    expect(formatearDientes([])).toBe("OD ");
  });

  it("incluye valores no reconocidos al final", () => {
    expect(formatearDientes([36, 11, 0])).toBe("OD 11, 36, 0");
  });
});
