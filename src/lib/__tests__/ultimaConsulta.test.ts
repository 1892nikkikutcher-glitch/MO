import { describe, expect, it } from "vitest";
import { mesesEntre, textoHace, ultimaConsultaDe } from "../ultimaConsulta";

const HOY = "2026-11-26";
const cita = (fecha: string, estatus: string) => ({ fecha, estatus }) as never;

describe("última consulta de un paciente", () => {
  it("toma la cita atendida más reciente, no la última agendada", () => {
    const r = ultimaConsultaDe([cita("2026-03-10", "Atendida"), cita("2026-08-01", "Atendida"), cita("2026-10-01", "Cancelada"), cita("2026-11-01", "No Asistió")], HOY);
    expect(r?.fecha).toBe("2026-08-01");
    expect(r?.atendida).toBe(true);
    expect(r?.meses).toBe(3);
  });

  it("ignora las citas futuras", () => {
    expect(ultimaConsultaDe([cita("2026-12-10", "Atendida")], HOY)).toBeNull();
  });

  it("si la clínica nunca marca 'Atendida', usa la última cita que sí se dio y lo indica", () => {
    const r = ultimaConsultaDe([cita("2026-01-05", "Agendada"), cita("2026-02-01", "Cancelada"), cita("2026-02-10", "Reagendada")], HOY);
    expect(r?.fecha).toBe("2026-01-05");
    expect(r?.atendida).toBe(false);
  });

  it("sin citas o solo canceladas, nada", () => {
    expect(ultimaConsultaDe([], HOY)).toBeNull();
    expect(ultimaConsultaDe([cita("2026-02-01", "Cancelada"), cita("2026-03-01", "No Asistió")], HOY)).toBeNull();
  });

  it("clasifica la ausencia: <6 meses reciente, 6–11 revisar, 12+ urgente", () => {
    expect(ultimaConsultaDe([cita("2026-06-27", "Atendida")], HOY)?.nivel).toBe("reciente"); // 4 meses 29 días
    expect(ultimaConsultaDe([cita("2026-05-26", "Atendida")], HOY)?.nivel).toBe("revisar"); // 6 meses justos
    expect(ultimaConsultaDe([cita("2025-12-01", "Atendida")], HOY)?.nivel).toBe("revisar"); // 11 meses
    expect(ultimaConsultaDe([cita("2025-11-26", "Atendida")], HOY)?.nivel).toBe("urgente"); // 12 meses justos
  });
});

describe("textos de tiempo", () => {
  it("meses completos", () => {
    expect(mesesEntre("2026-01-15", "2026-02-14")).toBe(0);
    expect(mesesEntre("2026-01-15", "2026-02-15")).toBe(1);
  });
  it("hace cuánto", () => {
    expect(textoHace({ meses: 0, dias: 0 })).toBe("hoy");
    expect(textoHace({ meses: 0, dias: 1 })).toBe("hace 1 día");
    expect(textoHace({ meses: 0, dias: 12 })).toBe("hace 12 días");
    expect(textoHace({ meses: 1, dias: 35 })).toBe("hace 1 mes");
    expect(textoHace({ meses: 5, dias: 160 })).toBe("hace 5 meses");
    expect(textoHace({ meses: 12, dias: 365 })).toBe("hace 1 año");
    expect(textoHace({ meses: 15, dias: 460 })).toBe("hace 1 año y 3 meses");
    expect(textoHace({ meses: 26, dias: 800 })).toBe("hace 2 años y 2 meses");
  });
});
