import { describe, expect, it } from "vitest";
import {
  FORMA_PAGO_CASHBACK,
  ajusteValido,
  ajustarMontoGenerado,
  aprobarMovimiento,
  baseCashbackDePago,
  calcularCashback,
  cashbackConfigInicial,
  crearTransferencia,
  rechazarMovimiento,
  saldoCashback,
  sincronizarCashbackConPagos,
  validarTransferencia,
  type CashbackConfig,
  type MovimientoCashback,
} from "../cashback";
import type { Pago } from "../patientData";

const config: CashbackConfig = { activo: true, porcentaje: 3, vigenciaMeses: 12, transferible: true };
const AHORA = "2026-10-20T12:00:00.000Z";
const HOY = "2026-10-20";

const pago = (id: string, fecha: string, lineas: { monto: number; ligado?: boolean }[], formaPago = "Efectivo"): Pago => ({
  id,
  fecha,
  medico: "Dra. Ana",
  formaPago,
  lineas: lineas.map((l, i) => ({ id: `${id}-${i}`, tratamientoId: l.ligado === false ? null : `t${i}`, folio: null, label: "x", monto: l.monto })),
  total: lineas.reduce((s, l) => s + l.monto, 0),
  facturar: false,
  firma: null,
});

const mov = (extra: Partial<MovimientoCashback>): MovimientoCashback => ({
  id: "m",
  patientId: "p1",
  patientName: "Ana",
  tipo: "generado",
  estado: "aprobado",
  monto: 100,
  fecha: "2026-09-01",
  creadoEn: "2026-09-01T10:00:00.000Z",
  ...extra,
});

describe("cálculo del cashback", () => {
  it("da el porcentaje de lo pagado: 3% de $1,000 son $30", () => {
    expect(calcularCashback(1000, 3)).toBe(30);
    expect(calcularCashback(2350, 3)).toBe(70.5);
    expect(calcularCashback(0, 3)).toBe(0);
    expect(calcularCashback(1000, 0)).toBe(0);
  });

  it("solo cuenta lo pagado en tratamientos, y nada si se pagó con cashback", () => {
    expect(baseCashbackDePago(pago("a", "01/10/2026", [{ monto: 800 }, { monto: 200, ligado: false }]))).toBe(800);
    expect(baseCashbackDePago(pago("b", "01/10/2026", [{ monto: 500 }], FORMA_PAGO_CASHBACK))).toBe(0);
  });
});

describe("saldo de cashback", () => {
  it("suma lo aprobado y deja aparte lo que espera aprobación o se rechazó", () => {
    const s = saldoCashback(
      [mov({ id: "a", monto: 30 }), mov({ id: "b", monto: 60, estado: "pendiente" }), mov({ id: "c", monto: 90, estado: "rechazado" })],
      "p1",
      config,
      HOY
    );
    expect(s.disponible).toBe(30);
    expect(s.porAprobar).toBe(60);
  });

  it("resta lo usado en pagos", () => {
    const s = saldoCashback([mov({ id: "a", monto: 100 }), mov({ id: "c", tipo: "canje", monto: 40, fecha: "2026-10-01" })], "p1", config, HOY);
    expect(s.disponible).toBe(60);
  });

  it("vence el saldo pasada la vigencia", () => {
    const s = saldoCashback([mov({ id: "a", monto: 100, fecha: "2025-09-01" })], "p1", config, HOY);
    expect(s.disponible).toBe(0);
    expect(s.vencido).toBe(100);
  });

  it("sin vigencia el saldo no vence", () => {
    const s = saldoCashback([mov({ id: "a", monto: 100, fecha: "2020-01-01" })], "p1", { ...config, vigenciaMeses: 0 }, HOY);
    expect(s.disponible).toBe(100);
    expect(s.proximoAVencer).toBeNull();
  });

  it("gasta primero lo más antiguo y avisa lo próximo a vencer", () => {
    const s = saldoCashback(
      [mov({ id: "a", monto: 50, fecha: "2025-11-01" }), mov({ id: "b", monto: 50, fecha: "2026-06-01" }), mov({ id: "c", tipo: "canje", monto: 50, fecha: "2026-07-01" })],
      "p1",
      config,
      HOY
    );
    expect(s.disponible).toBe(50);
    expect(s.proximoAVencer).toEqual({ fecha: "2027-06-01", monto: 50 });
  });

  it("un gasto no consume saldo que ya había vencido ese día", () => {
    const s = saldoCashback(
      [mov({ id: "a", monto: 50, fecha: "2024-01-01" }), mov({ id: "b", monto: 50, fecha: "2026-06-01" }), mov({ id: "c", tipo: "canje", monto: 30, fecha: "2026-07-01" })],
      "p1",
      config,
      HOY
    );
    expect(s.disponible).toBe(20);
    expect(s.vencido).toBe(50);
  });

  it("la transferencia sale del origen apenas se pide y llega al destino solo si se aprueba", () => {
    const base = mov({ id: "a", monto: 100 });
    const t = (estado: MovimientoCashback["estado"]) => mov({ id: "t", tipo: "transferencia", estado, monto: 40, fecha: "2026-10-10", destinoId: "p2", destinoNombre: "Beto", resueltoEn: "2026-10-11T10:00:00.000Z" });
    const pendiente = [base, t("pendiente")];
    expect(saldoCashback(pendiente, "p1", config, HOY)).toMatchObject({ disponible: 60, enTransferencia: 40 });
    expect(saldoCashback(pendiente, "p2", config, HOY).disponible).toBe(0);
    const aprobada = [base, t("aprobado")];
    expect(saldoCashback(aprobada, "p1", config, HOY).disponible).toBe(60);
    expect(saldoCashback(aprobada, "p2", config, HOY).disponible).toBe(40);
    const rechazada = [base, t("rechazado")];
    expect(saldoCashback(rechazada, "p1", config, HOY).disponible).toBe(100);
    expect(saldoCashback(rechazada, "p2", config, HOY).disponible).toBe(0);
  });
});

describe("decisiones del administrador", () => {
  const generado = mov({ id: "g", estado: "pendiente", monto: 30, montoCalculado: 30 });

  it("aprueba con el monto calculado o con otro", () => {
    expect(aprobarMovimiento(generado, "admin@x.com", AHORA)).toMatchObject({ estado: "aprobado", monto: 30, resueltoPor: "admin@x.com" });
    expect(aprobarMovimiento(generado, "admin@x.com", AHORA, 45)).toMatchObject({ estado: "aprobado", monto: 45, montoCalculado: 30 });
  });

  it("rechaza con motivo", () => {
    expect(rechazarMovimiento(generado, "admin@x.com", AHORA, " Promoción distinta ")).toMatchObject({ estado: "rechazado", nota: "Promoción distinta" });
  });

  it("no deja bajar un monto por debajo de lo que el paciente ya usó", () => {
    const aprobado = mov({ id: "g", monto: 100, montoCalculado: 100 });
    const usado = mov({ id: "c", tipo: "canje", monto: 80, fecha: "2026-10-01" });
    expect(ajusteValido([aprobado, usado], ajustarMontoGenerado(aprobado, 90), config, HOY)).toBe(true);
    expect(ajusteValido([aprobado, usado], ajustarMontoGenerado(aprobado, 50), config, HOY)).toBe(false);
    expect(ajusteValido([aprobado, usado], ajustarMontoGenerado(aprobado, 0), config, HOY)).toBe(false);
  });
});

describe("transferencias", () => {
  const saldo = [mov({ id: "a", monto: 100 })];

  it("valida cada caso", () => {
    expect(validarTransferencia(saldo, "p1", "p2", 50, config, HOY)).toBeNull();
    expect(validarTransferencia(saldo, "p1", "p2", 50, { ...config, transferible: false }, HOY)).toBe("apagada");
    expect(validarTransferencia(saldo, "p1", "p1", 50, config, HOY)).toBe("mismo-paciente");
    expect(validarTransferencia(saldo, "p1", "p2", 0, config, HOY)).toBe("monto-invalido");
    expect(validarTransferencia(saldo, "p1", "p2", 150, config, HOY)).toBe("saldo-insuficiente");
  });

  it("nace pendiente, con origen y destino", () => {
    const t = crearTransferencia({ origenId: "p1", origenNombre: "Ana", destinoId: "p2", destinoNombre: "Beto", monto: 40, nota: " para su hijo ", ahoraIso: AHORA });
    expect(t).toMatchObject({ tipo: "transferencia", estado: "pendiente", monto: 40, patientId: "p1", destinoId: "p2", nota: "para su hijo" });
  });
});

describe("seguir a los pagos", () => {
  it("un pago nuevo genera su cashback pendiente", () => {
    const p = pago("p100", "20/10/2026", [{ monto: 2000 }]);
    const r = sincronizarCashbackConPagos([], "p1", "Ana", [], [p], config, AHORA);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ id: "cb-p100", estado: "pendiente", monto: 60, fecha: "2026-10-20", pagoId: "p100", porcentaje: 3 });
  });

  it("no genera nada si el programa está apagado, pero sí descuenta un pago hecho con cashback", () => {
    const p = pago("p1", "20/10/2026", [{ monto: 2000 }]);
    expect(sincronizarCashbackConPagos([], "p1", "Ana", [], [p], { ...config, activo: false }, AHORA)).toEqual([]);
    const conCashback = pago("p2", "20/10/2026", [{ monto: 300 }], FORMA_PAGO_CASHBACK);
    const r = sincronizarCashbackConPagos([], "p1", "Ana", [], [conCashback], { ...config, activo: false }, AHORA);
    expect(r).toMatchObject([{ id: "cbc-p2", tipo: "canje", estado: "aprobado", monto: 300 }]);
  });

  it("al editar el pago recalcula el cashback pendiente, pero respeta uno ya resuelto o cambiado a mano", () => {
    const p = pago("p1", "20/10/2026", [{ monto: 1000 }]);
    const movs = sincronizarCashbackConPagos([], "p1", "Ana", [], [p], config, AHORA);
    const editado = pago("p1", "20/10/2026", [{ monto: 3000 }]);
    expect(sincronizarCashbackConPagos(movs, "p1", "Ana", [p], [editado], config, AHORA)[0].monto).toBe(90);

    const aprobado = [aprobarMovimiento(movs[0], "a", AHORA)];
    expect(sincronizarCashbackConPagos(aprobado, "p1", "Ana", [p], [editado], config, AHORA)[0].monto).toBe(30);

    const aMano = [ajustarMontoGenerado(movs[0], 50)];
    expect(sincronizarCashbackConPagos(aMano, "p1", "Ana", [p], [editado], config, AHORA)[0].monto).toBe(50);
  });

  it("al eliminar el pago quita el cashback pendiente, anula el aprobado y devuelve lo que se usó", () => {
    const p = pago("p1", "20/10/2026", [{ monto: 1000 }]);
    const pendiente = sincronizarCashbackConPagos([], "p1", "Ana", [], [p], config, AHORA);
    expect(sincronizarCashbackConPagos(pendiente, "p1", "Ana", [p], [], config, AHORA)).toEqual([]);

    const aprobado = [aprobarMovimiento(pendiente[0], "a", AHORA)];
    expect(sincronizarCashbackConPagos(aprobado, "p1", "Ana", [p], [], config, AHORA)[0]).toMatchObject({ estado: "rechazado", nota: "Se eliminó el pago que lo generó" });

    const conCashback = pago("p2", "20/10/2026", [{ monto: 300 }], FORMA_PAGO_CASHBACK);
    const canje = sincronizarCashbackConPagos([], "p1", "Ana", [], [conCashback], config, AHORA);
    expect(sincronizarCashbackConPagos(canje, "p1", "Ana", [conCashback], [], config, AHORA)).toEqual([]);
  });

  it("si no cambió nada devuelve la misma lista", () => {
    const p = pago("p1", "20/10/2026", [{ monto: 1000 }]);
    const movs = sincronizarCashbackConPagos([], "p1", "Ana", [], [p], config, AHORA);
    expect(sincronizarCashbackConPagos(movs, "p1", "Ana", [p], [p], config, AHORA)).toBe(movs);
  });

  it("la configuración inicial viene apagada con 3%", () => {
    expect(cashbackConfigInicial).toMatchObject({ activo: false, porcentaje: 3 });
  });
});
