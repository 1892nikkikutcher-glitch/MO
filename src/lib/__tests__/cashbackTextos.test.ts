import { describe, expect, it } from "vitest";
import { cashbackConfigInicial } from "../cashback";
import { mensajeSaldoWhatsApp, terminosCashback } from "../cashbackTextos";

describe("términos del programa", () => {
  it("salen de lo configurado: 5%, 20%, $500, $1,000, 12 meses y no transferible", () => {
    const t = terminosCashback(cashbackConfigInicial);
    expect(t).toHaveLength(10);
    expect(t[0]).toContain("5%");
    expect(t[1]).toContain("siguiente visita");
    expect(t[2]).toContain("20%");
    expect(t[2]).toContain("$500");
    expect(t[3]).toContain("$1,000");
    expect(t[4]).toContain("12 meses");
    expect(t[5]).toContain("transferirse");
  });

  it("cambian si se cambia la configuración", () => {
    const t = terminosCashback({ ...cashbackConfigInicial, porcentaje: 3, vigenciaMeses: 1, transferible: true, saldoMaximo: 0, topeCanjePorVisita: 0, porcentajeMaxCanje: 0, liberarSiguienteDia: false });
    expect(t).toHaveLength(9);
    expect(t.join(" ")).toContain("3%");
    expect(t.join(" ")).toContain("1 mes ");
    expect(t.join(" ")).toContain("Puede transferirse");
    expect(t.join(" ")).not.toContain("saldo máximo");
  });
});

describe("mensaje de saldo", () => {
  it("dice el saldo, lo que cubre y cuándo vence, sin presionar", () => {
    const m = mensajeSaldoWhatsApp({
      paciente: "María del Carmen Paloma",
      clinica: "Sonríe X Todos Dental",
      saldo: { disponible: 175, porLiberar: 0, proximoAVencer: { fecha: "2027-10-20", monto: 175 } },
      config: cashbackConfigInicial,
    });
    expect(m).toContain("Hola, María.");
    expect(m).toContain("$175");
    expect(m).toContain("Sonríe X Todos Dental");
    expect(m).toContain("hasta 20% de una atención elegible");
    expect(m).toContain("$500 por visita");
    expect(m).toContain("20 de octubre de 2027");
    expect(m).toContain("seguimiento clínico");
  });

  it("si no tiene saldo, le cuenta cómo acumular", () => {
    const m = mensajeSaldoWhatsApp({ paciente: "Ana", clinica: "X", saldo: { disponible: 0, porLiberar: 0, proximoAVencer: null }, config: cashbackConfigInicial });
    expect(m).toContain("no tienes Cashback");
    expect(m).toContain("5%");
  });

  it("avisa el saldo que se libera mañana", () => {
    const m = mensajeSaldoWhatsApp({ paciente: "Ana", clinica: "X", saldo: { disponible: 0, porLiberar: 40, proximoAVencer: null }, config: cashbackConfigInicial });
    expect(m).toContain("$40");
    expect(m).toContain("a partir de mañana");
  });
});

describe("cashback en el recordatorio de la cita", () => {
  it("avisa cuánto tiene (contando lo que se libera mañana), lo que puede usar y cuándo vence", async () => {
    const { lineaCashbackRecordatorio } = await import("../cashbackTextos");
    const linea = lineaCashbackRecordatorio({ disponible: 100, porLiberar: 60, proximoAVencer: { fecha: "2027-10-26", monto: 160 } }, cashbackConfigInicial);
    expect(linea.startsWith("\n\n")).toBe(true);
    expect(linea).toContain("*$160*");
    expect(linea).toContain("cashback");
    expect(linea).toContain("hasta 20% de tu atención");
    expect(linea).toContain("$500 por visita");
    expect(linea).toContain("26 de octubre de 2027");
  });

  it("si no tiene saldo no agrega nada", async () => {
    const { lineaCashbackRecordatorio } = await import("../cashbackTextos");
    expect(lineaCashbackRecordatorio({ disponible: 0, porLiberar: 0, proximoAVencer: null }, cashbackConfigInicial)).toBe("");
  });
});

describe("cashback en el recibo de pago por WhatsApp", () => {
  it("dice el saldo total, lo ganado hoy aparte y cuándo vence", async () => {
    const { lineaCashbackRecibo } = await import("../cashbackTextos");
    const linea = lineaCashbackRecibo({ disponible: 100, porLiberar: 30, proximoAVencer: { fecha: "2027-10-26", monto: 130 } });
    expect(linea.startsWith("\n\n")).toBe(true);
    expect(linea).toContain("*$130*");
    expect(linea).toContain("incluye $30 ganados hoy");
    expect(linea).toContain("26 de octubre de 2027");
  });

  it("sin lo ganado hoy no menciona el paréntesis, y sin saldo no agrega nada", async () => {
    const { lineaCashbackRecibo } = await import("../cashbackTextos");
    expect(lineaCashbackRecibo({ disponible: 100, porLiberar: 0, proximoAVencer: null })).not.toContain("incluye");
    expect(lineaCashbackRecibo({ disponible: 0, porLiberar: 0, proximoAVencer: null })).toBe("");
  });
});
