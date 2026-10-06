import { describe, expect, it } from "vitest";
import { mesInicial, semanasDelMes, tonoDeEstatus } from "../calendarioCitasCompartidas";

const cita = (fecha: string, hora = "09:00", estatus = "Confirmada") => ({ fecha, hora, estatus, tratamientos: ["Corona"] });

describe("semanasDelMes", () => {
  it("octubre 2026 empieza en jueves: 3 huecos y semanas completas de 7", () => {
    const semanas = semanasDelMes(2026, 9, []);
    expect(semanas.every((s) => s.length === 7)).toBe(true);
    expect(semanas[0].slice(0, 3)).toEqual([null, null, null]);
    expect(semanas[0][3]?.dia).toBe(1);
    expect(semanas.flat().filter(Boolean)).toHaveLength(31);
  });

  it("pone cada cita en su día, ordenadas por hora", () => {
    const semanas = semanasDelMes(2026, 9, [cita("2026-10-06", "11:00"), cita("2026-10-06", "09:00"), cita("2026-11-06")]);
    const dia6 = semanas.flat().find((d) => d?.dia === 6)!;
    expect(dia6.citas.map((c) => c.hora)).toEqual(["09:00", "11:00"]);
    expect(semanas.flat().filter((d) => d && d.citas.length > 0)).toHaveLength(1);
  });

  it("un mes que empieza en lunes no lleva huecos al inicio (junio 2026)", () => {
    expect(semanasDelMes(2026, 5, [])[0][0]?.dia).toBe(1);
  });
});

describe("mesInicial", () => {
  it("elige el mes de la próxima cita", () => {
    expect(mesInicial([cita("2026-08-01"), cita("2026-11-20")], "2026-10-05")).toEqual({ anio: 2026, mes0: 10 });
  });
  it("sin próximas, el de la última; sin citas, el de hoy", () => {
    expect(mesInicial([cita("2026-03-01")], "2026-10-05")).toEqual({ anio: 2026, mes0: 2 });
    expect(mesInicial([], "2026-10-05")).toEqual({ anio: 2026, mes0: 9 });
  });
});

describe("tonoDeEstatus", () => {
  it.each([
    ["Atendida", "exito"],
    ["Cancelada", "peligro"],
    ["No asistió", "peligro"],
    ["Confirmada", "neutro"],
    ["Pendiente", "aviso"],
  ])("%s -> %s", (e, t) => expect(tonoDeEstatus(e)).toBe(t));
});
