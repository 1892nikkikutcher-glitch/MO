import { describe, expect, it } from "vitest";
import {
  bloquesQueSePisan,
  describirBloque,
  diaDeLaSemana,
  errorDeBloque,
  etiquetaDias,
  evaluarCitaContraBloques,
  horariosSeguidos,
  mensajeFueraDeBloque,
  normalizarBloques,
  sedeDeCita,
  type BloqueAtencion,
  type Sede,
} from "../sedesBloques";

const sedes: Sede[] = [
  { id: "jc", nombre: "Juan Corrales" },
  { id: "emsa", nombre: "EMSA" },
];

// 2026-10-19 es lunes, 2026-10-20 martes.
const LUNES = "2026-10-19";
const MARTES = "2026-10-20";

const enrique: BloqueAtencion = { id: "b1", sedeId: "jc", dias: [1, 3, 5], inicio: "09:00", fin: "14:00" };
const nicolas: BloqueAtencion = { id: "b2", sedeId: "emsa", dias: [2, 4], inicio: "10:00", fin: "18:00" };

describe("días y etiquetas", () => {
  it("calcula el día de la semana de una fecha ISO", () => {
    expect(diaDeLaSemana(LUNES)).toBe(1);
    expect(diaDeLaSemana(MARTES)).toBe(2);
    expect(diaDeLaSemana("2026-10-18")).toBe(0);
  });

  it("escribe los días de lunes a domingo", () => {
    expect(etiquetaDias([5, 1, 3])).toBe("Lun, Mié y Vie");
    expect(etiquetaDias([0, 6])).toBe("Sáb y Dom");
    expect(etiquetaDias([2])).toBe("Mar");
    expect(etiquetaDias([])).toBe("");
  });

  it("describe un bloque con su sede", () => {
    expect(describirBloque(enrique, sedes)).toBe("Lun, Mié y Vie · 9:00–14:00 · Juan Corrales");
  });
});

describe("evaluar una cita contra los bloques", () => {
  it("sin bloques capturados no hay nada que comparar", () => {
    expect(evaluarCitaContraBloques(undefined, LUNES, "10:00", "10:30").estado).toBe("sin_bloques");
    expect(evaluarCitaContraBloques([], LUNES, "10:00", "10:30").estado).toBe("sin_bloques");
  });

  it("dentro del bloque", () => {
    const r = evaluarCitaContraBloques([enrique], LUNES, "09:00", "09:30");
    expect(r.estado).toBe("dentro");
    if (r.estado === "dentro") expect(r.bloque.sedeId).toBe("jc");
  });

  it("la cita puede terminar justo a la hora de cierre del bloque, no pasarse", () => {
    expect(evaluarCitaContraBloques([enrique], LUNES, "13:30", "14:00").estado).toBe("dentro");
    const pasada = evaluarCitaContraBloques([enrique], LUNES, "13:30", "14:30");
    expect(pasada).toMatchObject({ estado: "fuera", motivo: "fuera_de_horas" });
  });

  it("un día sin bloque queda fuera", () => {
    expect(evaluarCitaContraBloques([enrique], MARTES, "10:00", "10:30")).toMatchObject({ estado: "fuera", motivo: "dia_sin_bloque" });
  });

  it("con dos bloques, elige el que la cubre", () => {
    const doble: BloqueAtencion[] = [
      { id: "m", sedeId: "jc", dias: [1], inicio: "09:00", fin: "12:00" },
      { id: "t", sedeId: "emsa", dias: [1], inicio: "16:00", fin: "19:00" },
    ];
    const r = evaluarCitaContraBloques(doble, LUNES, "16:30", "17:00");
    expect(r.estado === "dentro" && r.bloque.sedeId).toBe("emsa");
    expect(evaluarCitaContraBloques(doble, LUNES, "13:00", "13:30").estado).toBe("fuera");
  });

  it("explica por qué queda fuera", () => {
    const dia = evaluarCitaContraBloques([enrique], MARTES, "10:00", "10:30");
    const horas = evaluarCitaContraBloques([enrique], LUNES, "15:00", "15:30");
    if (dia.estado !== "fuera" || horas.estado !== "fuera") throw new Error("debían quedar fuera");
    expect(mensajeFueraDeBloque(dia, MARTES, "Dr. Enrique", sedes)).toBe("Dr. Enrique no atiende los martes según sus bloques.");
    expect(mensajeFueraDeBloque(horas, LUNES, "Dr. Enrique", sedes)).toContain("9:00–14:00 en Juan Corrales");
  });
});

describe("validar y limpiar bloques", () => {
  it("rechaza un bloque incompleto o al revés", () => {
    expect(errorDeBloque({ sedeId: "", dias: [1], inicio: "09:00", fin: "10:00" })).toMatch(/sede/i);
    expect(errorDeBloque({ sedeId: "jc", dias: [], inicio: "09:00", fin: "10:00" })).toMatch(/día/i);
    expect(errorDeBloque({ sedeId: "jc", dias: [1], inicio: "10:00", fin: "09:00" })).toMatch(/después/i);
    expect(errorDeBloque({ sedeId: "jc", dias: [1], inicio: "09:00", fin: "10:00" })).toBeNull();
  });

  it("detecta bloques que se pisan solo si comparten día y horas", () => {
    const otro: BloqueAtencion = { id: "x", sedeId: "emsa", dias: [1], inicio: "13:00", fin: "16:00" };
    expect(bloquesQueSePisan(enrique, otro)).toBe(true);
    expect(bloquesQueSePisan(enrique, { ...otro, inicio: "14:00" })).toBe(false); // uno termina cuando empieza el otro
    expect(bloquesQueSePisan(enrique, { ...otro, dias: [2] })).toBe(false);
  });

  it("normaliza datos viejos o dañados sin reventar", () => {
    expect(normalizarBloques(undefined)).toEqual([]);
    expect(normalizarBloques("x")).toEqual([]);
    const limpio = normalizarBloques([
      enrique,
      { id: "mal1", sedeId: "jc", dias: [9], inicio: "09:00", fin: "10:00" },
      { id: "mal2", sedeId: "jc", dias: [1], inicio: "11:00", fin: "10:00" },
      { id: "mal3", sedeId: "jc", dias: [1], inicio: "9", fin: "10:00" },
      null,
      { id: "ok", sedeId: "jc", dias: [5, 1, 1], inicio: "08:00", fin: "09:00" },
    ]);
    expect(limpio.map((b) => b.id)).toEqual(["b1", "ok"]);
    expect(limpio[1].dias).toEqual([1, 5]);
  });
});

describe("horarios seguidos dentro del bloque", () => {
  const cita = (horaInicio: string, horaFin: string, estatus = "Agendada") => ({ fecha: LUNES, horaInicio, horaFin, estatus });

  it("con el bloque vacío, ofrece su inicio", () => {
    expect(horariosSeguidos(enrique, [], 30)[0]).toBe("09:00");
  });

  it("pega la cita nueva a la que ya está, sin dejar huecos", () => {
    const r = horariosSeguidos(enrique, [cita("09:00", "10:00")], 30);
    expect(r[0]).toBe("10:00");
  });

  it("también ofrece quedar justo antes de la siguiente cita", () => {
    const r = horariosSeguidos(enrique, [cita("10:00", "11:00")], 30);
    expect(r).toContain("09:30");
    expect(r).toContain("11:00");
    expect(r).not.toContain("09:00"); // pegarse al inicio del bloque deja un hueco de 30 min, va después
  });

  it("no ofrece huecos que no alcanzan para la duración", () => {
    const r = horariosSeguidos(enrique, [cita("09:00", "09:40"), cita("10:00", "14:00")], 60);
    expect(r).toEqual([]);
  });

  it("las canceladas no ocupan lugar y la cita que se edita no cuenta contra sí misma", () => {
    expect(horariosSeguidos(enrique, [cita("09:00", "10:00", "Cancelada")], 30)[0]).toBe("09:00");
    const propia = { id: "yo", ...cita("09:00", "10:00") };
    expect(horariosSeguidos(enrique, [propia], 30, "yo")[0]).toBe("09:00");
  });

  it("devuelve a lo más 4, en orden de hora", () => {
    const r = horariosSeguidos(enrique, [cita("09:30", "10:00"), cita("11:00", "11:30"), cita("12:30", "13:00")], 30);
    expect(r.length).toBeLessThanOrEqual(4);
    expect([...r].sort()).toEqual(r);
  });
});

describe("sede de una cita", () => {
  const recursos = [
    { id: "enrique", tipo: "medico", bloques: [enrique] },
    { id: "nicolas", tipo: "medico", bloques: [nicolas] },
    { id: "u1", tipo: "unidad" },
  ];

  it("usa la que se le estampó al agendar", () => {
    const c = { fecha: MARTES, horaInicio: "10:00", horaFin: "10:30", medicoId: "enrique", sedeId: "emsa" };
    expect(sedeDeCita(c, recursos, sedes)?.nombre).toBe("EMSA");
  });

  it("en citas anteriores a las sedes, la deduce del bloque del médico", () => {
    const c = { fecha: LUNES, horaInicio: "10:00", horaFin: "10:30", medicoId: "enrique" };
    expect(sedeDeCita(c, recursos, sedes)?.nombre).toBe("Juan Corrales");
  });

  it("si no cae en ningún bloque, no inventa una sede", () => {
    const c = { fecha: MARTES, horaInicio: "10:00", horaFin: "10:30", medicoId: "enrique" };
    expect(sedeDeCita(c, recursos, sedes)).toBeUndefined();
  });
});

describe("ubicación en el recordatorio de WhatsApp", () => {
  it("arma las líneas de sede, dirección y médico", async () => {
    const { ubicacionParaMensaje } = await import("../formatosWhatsapp");
    expect(ubicacionParaMensaje({ sede: "EMSA", direccion: "Av. Reforma 10", medico: "Dr. Nicolás" })).toBe(
      "📍 *EMSA* — Av. Reforma 10\nLe atiende: *Dr. Nicolás*"
    );
    expect(ubicacionParaMensaje({ medico: "Dr. Nicolás" })).toBe("Le atiende: *Dr. Nicolás*");
    expect(ubicacionParaMensaje({})).toBe("");
  });

  it("agrega la ubicación tras el primer párrafo solo si la plantilla no la trae", async () => {
    const { plantillaConUbicacion } = await import("../formatosWhatsapp");
    const vieja = "Hola {{paciente}}.\n\nConfirma tu cita.";
    expect(plantillaConUbicacion(vieja, "📍 *EMSA*")).toBe("Hola {{paciente}}.\n\n{{ubicacion}}\n\nConfirma tu cita.");
    expect(plantillaConUbicacion("Hola\n\n{{sede}}", "📍 *EMSA*")).toBe("Hola\n\n{{sede}}"); // ya la tiene
    expect(plantillaConUbicacion(vieja, "")).toBe(vieja); // sin ubicación no toca nada
    expect(plantillaConUbicacion("Una sola línea", "📍 *EMSA*")).toBe("Una sola línea\n\n{{ubicacion}}");
  });
});

describe("número de semana del año", () => {
  it("dice la semana y el total de semanas del año", async () => {
    const { semanaConTotalDelAnio } = await import("../fondosFinancieros");
    // 2026 empieza en jueves: tiene 53 semanas, y la 1 arranca el 29 dic 2025.
    expect(semanaConTotalDelAnio(new Date(2026, 9, 12))).toEqual({ semana: 42, total: 53 });
    expect(semanaConTotalDelAnio(new Date(2026, 0, 1))).toEqual({ semana: 1, total: 53 });
    expect(semanaConTotalDelAnio(new Date(2025, 11, 29))).toEqual({ semana: 1, total: 53 }); // ya es semana 1 de 2026
    // 2025 tiene 52.
    expect(semanaConTotalDelAnio(new Date(2025, 5, 18))).toEqual({ semana: 25, total: 52 });
    // 2024 (bisiesto que empieza en lunes) tiene 52.
    expect(semanaConTotalDelAnio(new Date(2024, 11, 30))).toEqual({ semana: 1, total: 52 });
  });
});
