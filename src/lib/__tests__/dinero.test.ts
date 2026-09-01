import { describe, expect, it } from "vitest";
import { montoMayorQue, montosIguales, redondearDinero } from "../dinero";

describe("redondearDinero", () => {
  it("resuelve sumas de decimales que fallan por representación binaria", () => {
    expect(redondearDinero(100.1 + 200.2)).toBe(300.3);
  });

  it("redondea a centavos", () => {
    expect(redondearDinero(10.005)).toBe(10.01);
    expect(redondearDinero(10.001)).toBe(10);
  });
});

describe("montosIguales", () => {
  it("100.10 + 200.20 se considera igual a 300.30 pese al residuo binario", () => {
    expect(montosIguales(100.1 + 200.2, 300.3)).toBe(true);
  });

  it("detecta una diferencia real de un centavo", () => {
    expect(montosIguales(300.3, 300.31)).toBe(false);
  });
});

describe("montoMayorQue", () => {
  it("no da falso positivo por residuo binario cuando en realidad son iguales", () => {
    expect(montoMayorQue(100.1 + 200.2, 300.3)).toBe(false);
  });

  it("detecta correctamente cuando a es mayor", () => {
    expect(montoMayorQue(300.31, 300.3)).toBe(true);
    expect(montoMayorQue(300.3, 300.31)).toBe(false);
  });
});
