import { describe, expect, it } from "vitest";
import { formaPagoHabitual } from "../formaPagoHabitual";

const PERMITIDAS = ["Efectivo", "Tarjeta de crédito", "Tarjeta de débito", "Transferencia", "Cheque"];
const pago = (id: string, formaPago: string) => ({ id, formaPago });

describe("formaPagoHabitual", () => {
  it("sin pagos no sugiere nada", () => {
    expect(formaPagoHabitual([], PERMITIDAS)).toBeNull();
  });

  it("devuelve la forma que más ha usado", () => {
    const pagos = [pago("3", "Transferencia"), pago("2", "Efectivo"), pago("1", "Transferencia")];
    expect(formaPagoHabitual(pagos, PERMITIDAS)).toBe("Transferencia");
  });

  it("en empate gana la más reciente, sin importar el orden de la lista", () => {
    const pagos = [pago("100", "Efectivo"), pago("300", "Tarjeta de débito"), pago("200", "Efectivo"), pago("250", "Tarjeta de débito")];
    expect(formaPagoHabitual(pagos, PERMITIDAS)).toBe("Tarjeta de débito");
    expect(formaPagoHabitual([...pagos].reverse(), PERMITIDAS)).toBe("Tarjeta de débito");
  });

  it("ignora formas que no se pueden elegir (Cashback, textos viejos)", () => {
    const pagos = [pago("3", "Cashback"), pago("2", "Cashback"), pago("1", "Cheque")];
    expect(formaPagoHabitual(pagos, PERMITIDAS)).toBe("Cheque");
    expect(formaPagoHabitual([pago("1", "Cashback")], PERMITIDAS)).toBeNull();
  });

  it("con ids que no son hora, empata por el orden de la lista (el primero es el más nuevo)", () => {
    const pagos = [pago("a", "Transferencia"), pago("b", "Efectivo")];
    expect(formaPagoHabitual(pagos, PERMITIDAS)).toBe("Transferencia");
  });
});
