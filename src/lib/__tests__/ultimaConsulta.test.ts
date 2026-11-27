import { describe, expect, it } from "vitest";
import { coincideAusencia, fechaISODeReceta, mesesEntre, textoHace, ultimaConsultaDe } from "../ultimaConsulta";

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

describe("las recetas también cuentan como consulta", () => {
  it("el caso de Paola: sin citas atendidas, su receta es su última consulta", () => {
    const r = ultimaConsultaDe([], HOY, ["2026-11-25"]);
    expect(r?.fecha).toBe("2026-11-25");
    expect(r?.origen).toBe("receta");
    expect(r?.atendida).toBe(true);
    expect(r?.nivel).toBe("reciente");
  });

  it("gana la más reciente entre la cita atendida y la receta", () => {
    expect(ultimaConsultaDe([cita("2026-03-01", "Atendida")], HOY, ["2026-09-10"])?.origen).toBe("receta");
    expect(ultimaConsultaDe([cita("2026-10-01", "Atendida")], HOY, ["2026-09-10"])?.origen).toBe("atendida");
    expect(ultimaConsultaDe([cita("2026-09-10", "Atendida")], HOY, ["2026-09-10"])?.origen).toBe("atendida");
  });

  it("una receta pesa más que una cita agendada sin marcar", () => {
    const r = ultimaConsultaDe([cita("2026-11-01", "Agendada")], HOY, ["2026-06-01"]);
    expect(r?.fecha).toBe("2026-06-01");
    expect(r?.origen).toBe("receta");
  });

  it("ignora recetas con fecha futura y, sin nada más, cae en la agenda", () => {
    expect(ultimaConsultaDe([], HOY, ["2026-12-30"])).toBeNull();
    expect(ultimaConsultaDe([cita("2026-02-10", "Agendada")], HOY, ["2026-12-30"])?.origen).toBe("agenda");
  });

  it("lee la fecha de la receta como se imprime (dd/mm/aaaa) o en ISO", () => {
    expect(fechaISODeReceta({ fecha: "26/11/2026" })).toBe("2026-11-26");
    expect(fechaISODeReceta({ fecha: "6/1/2026" })).toBe("2026-01-06");
    expect(fechaISODeReceta({ fecha: "2026-11-26" })).toBe("2026-11-26");
    expect(fechaISODeReceta({ fecha: "no es fecha", creadoEn: "2026-11-26T19:59:00.000Z" })).toBe("2026-11-26");
    expect(fechaISODeReceta({ fecha: "", creadoEn: "" })).toBeNull();
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

describe("filtro por tiempo sin venir", () => {
  const u = (meses: number) => ({ meses });
  it("'todos' deja pasar a cualquiera", () => {
    expect(coincideAusencia(null, "todos")).toBe(true);
    expect(coincideAusencia(u(1), "todos")).toBe(true);
  });
  it("N meses incluye a quien lleva N o más, y deja fuera a quien nunca vino", () => {
    expect(coincideAusencia(u(5), 6)).toBe(false);
    expect(coincideAusencia(u(6), 6)).toBe(true);
    expect(coincideAusencia(u(9), 8)).toBe(true);
    expect(coincideAusencia(u(9), 10)).toBe(false);
    expect(coincideAusencia(u(30), 12)).toBe(true);
    expect(coincideAusencia(null, 6)).toBe(false);
  });
  it("'nunca' solo deja a quien no tiene ninguna consulta", () => {
    expect(coincideAusencia(null, "nunca")).toBe(true);
    expect(coincideAusencia(u(0), "nunca")).toBe(false);
  });
});
