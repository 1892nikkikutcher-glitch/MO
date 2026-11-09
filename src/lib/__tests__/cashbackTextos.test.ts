import { describe, expect, it } from "vitest";
import { cashbackConfigInicial } from "../cashback";
import { avisoCashbackEnPago, mensajeSaldoWhatsApp, monederoEnCita, terminosCashback } from "../cashbackTextos";

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

describe("aviso de cashback al cobrar", () => {
  const sinSaldo = { disponible: 0, porLiberar: 0, porAprobar: 0, proximoAVencer: null };
  const config = { ...cashbackConfigInicial, activo: true };

  it("con saldo disponible dice cuánto tiene, sus límites y deja usarlo", () => {
    const aviso = avisoCashbackEnPago({ ...sinSaldo, disponible: 350, proximoAVencer: { fecha: "2027-10-26", monto: 350 } }, config);
    expect(aviso?.puedeUsar).toBe(true);
    expect(aviso?.titulo).toBe("Este paciente tiene $350 de Cashback disponible.");
    expect(aviso?.detalle.join(" ")).toContain("hasta 20% del valor de la atención, máximo $500 por visita");
    expect(aviso?.detalle.join(" ")).toContain("Vence el 26 de octubre de 2027");
  });

  it("avisa aparte lo que se libera mañana", () => {
    const aviso = avisoCashbackEnPago({ ...sinSaldo, disponible: 100, porLiberar: 60 }, config);
    expect(aviso?.detalle.join(" ")).toContain("Además tiene $60 que podrá usar desde mañana");
  });

  it("lo ganado hoy se avisa pero todavía no se puede usar", () => {
    const aviso = avisoCashbackEnPago({ ...sinSaldo, porLiberar: 60 }, config);
    expect(aviso?.puedeUsar).toBe(false);
    expect(aviso?.titulo).toContain("$60");
    expect(aviso?.titulo).toContain("desde mañana");
  });

  it("lo que espera aprobación se avisa y no se puede usar", () => {
    const aviso = avisoCashbackEnPago({ ...sinSaldo, porAprobar: 45 }, config);
    expect(aviso?.puedeUsar).toBe(false);
    expect(aviso?.titulo).toContain("esperando aprobación");
  });

  it("sin nada no hay aviso, y con el programa apagado solo cuenta el saldo ya disponible", () => {
    expect(avisoCashbackEnPago(sinSaldo, config)).toBeNull();
    expect(avisoCashbackEnPago({ ...sinSaldo, porLiberar: 60 }, { ...config, activo: false })).toBeNull();
    expect(avisoCashbackEnPago({ ...sinSaldo, disponible: 80 }, { ...config, activo: false })?.puedeUsar).toBe(true);
  });
});

describe("monedero electrónico en la cita", () => {
  const sinSaldo = { disponible: 0, porLiberar: 0, porAprobar: 0, proximoAVencer: null };
  const config = { ...cashbackConfigInicial, activo: true };

  it("con saldo y costo estimado dice cuánto puede usar en esta cita", () => {
    const m = monederoEnCita({ ...sinSaldo, disponible: 350 }, config, "$550");
    expect(m?.titulo).toBe("$350 disponibles");
    expect(m?.lineas[0]).toBe("Con el costo estimado de $550 puede usar hasta $110 en esta cita.");
    expect(m?.lineas.join(" ")).toContain("recordatorio de WhatsApp");
  });

  it("el tope por visita y el saldo limitan lo que puede usar", () => {
    expect(monederoEnCita({ ...sinSaldo, disponible: 800 }, config, "$10,000")?.lineas[0]).toContain("hasta $500");
    expect(monederoEnCita({ ...sinSaldo, disponible: 350 }, config, "$10,000")?.lineas[0]).toContain("hasta $350");
    expect(monederoEnCita({ ...sinSaldo, disponible: 50 }, config, "$1,000")?.lineas[0]).toContain("hasta $50 ");
  });

  it("sin costo estimado explica los límites y pide el costo", () => {
    const m = monederoEnCita({ ...sinSaldo, disponible: 350 }, config, "");
    expect(m?.lineas[0]).toContain("hasta 20% del valor de la atención");
    expect(m?.lineas[0]).toContain("Escribe el costo estimado");
  });

  it("lo ganado hoy y lo pendiente de aprobar se dicen aparte", () => {
    expect(monederoEnCita({ ...sinSaldo, porLiberar: 60 }, config, "")?.titulo).toContain("desde mañana");
    expect(monederoEnCita({ ...sinSaldo, porAprobar: 45 }, config, "")?.titulo).toContain("esperando aprobación");
  });

  it("sin saldo muestra cuánto gana, y con el programa apagado no muestra nada", () => {
    expect(monederoEnCita(sinSaldo, config, "")?.titulo).toBe("Sin saldo por ahora");
    expect(monederoEnCita(sinSaldo, { ...config, activo: false }, "")).toBeNull();
  });
});
