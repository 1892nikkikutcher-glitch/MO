import { describe, expect, it } from "vitest";
import {
  PRESETS_INTERVALO,
  calcularFechaSeguimiento,
  crearSiguienteCitaSeguimiento,
  detectarPresetIntervalo,
  intervaloValido,
} from "../seguimientoAutomatico";
import type { CitaAgenda, HorarioAtencion, IntervaloSeguimiento, Recurso } from "../patientData";

const horario: HorarioAtencion = {
  apertura: "09:00",
  comidaInicio: "14:00",
  comidaFin: "15:00",
  cierre: "19:00",
};

const recursos: Recurso[] = [{ id: "med-1", nombre: "Dra. López", color: "#000", tipo: "medico" }];

function citaBase(overrides: Partial<CitaAgenda> = {}): CitaAgenda {
  return {
    id: "C1",
    folio: "F-000001",
    recursoId: "med-1",
    medicoId: "med-1",
    unidadId: null,
    patientId: "P1",
    paciente: "María Fernanda López",
    tratamientos: ["Limpieza dental"],
    costo: "$800",
    comentarios: "",
    fecha: "2026-06-01",
    horaInicio: "10:00",
    horaFin: "10:30",
    estatus: "Atendida",
    recurrenciaId: null,
    horaLlegada: null,
    seguimientoAutomatico: true,
    seguimientoIntervalo: { cantidad: 7, unidad: "dias" },
    seguimientoMotivo: "Revisión de evolución",
    ...overrides,
  };
}

describe("calcularFechaSeguimiento", () => {
  const casos: { desc: string; base: string; intervalo: IntervaloSeguimiento; esperado: string }[] = [
    { desc: "+7 días", base: "2026-06-01", intervalo: { cantidad: 7, unidad: "dias" }, esperado: "2026-06-08" },
    { desc: "+14 días", base: "2026-06-01", intervalo: { cantidad: 14, unidad: "dias" }, esperado: "2026-06-15" },
    { desc: "+1 semana", base: "2026-06-01", intervalo: { cantidad: 1, unidad: "semanas" }, esperado: "2026-06-08" },
    { desc: "+2 semanas", base: "2026-06-01", intervalo: { cantidad: 2, unidad: "semanas" }, esperado: "2026-06-15" },
    { desc: "+1 mes", base: "2026-06-01", intervalo: { cantidad: 1, unidad: "meses" }, esperado: "2026-07-01" },
    { desc: "+3 meses", base: "2026-06-01", intervalo: { cantidad: 3, unidad: "meses" }, esperado: "2026-09-01" },
    { desc: "+6 meses", base: "2026-06-01", intervalo: { cantidad: 6, unidad: "meses" }, esperado: "2026-12-01" },
    { desc: "cambio de año", base: "2026-11-10", intervalo: { cantidad: 3, unidad: "meses" }, esperado: "2027-02-10" },
    { desc: "fin de febrero (no bisiesto)", base: "2026-08-31", intervalo: { cantidad: 6, unidad: "meses" }, esperado: "2027-02-28" },
    { desc: "año bisiesto", base: "2027-08-31", intervalo: { cantidad: 6, unidad: "meses" }, esperado: "2028-02-29" },
    { desc: "día 31 recortado", base: "2026-01-31", intervalo: { cantidad: 1, unidad: "meses" }, esperado: "2026-02-28" },
  ];

  casos.forEach(({ desc, base, intervalo, esperado }) => {
    it(desc, () => {
      expect(calcularFechaSeguimiento(base, intervalo)).toBe(esperado);
    });
  });
});

describe("intervaloValido", () => {
  it("cantidad 0 es inválida", () => {
    expect(intervaloValido({ cantidad: 0, unidad: "dias" })).toBe(false);
  });

  it("cantidad negativa es inválida", () => {
    expect(intervaloValido({ cantidad: -5, unidad: "dias" })).toBe(false);
  });

  it("cantidad NaN es inválida", () => {
    expect(intervaloValido({ cantidad: NaN, unidad: "dias" })).toBe(false);
  });

  it("cantidad decimal es inválida", () => {
    expect(intervaloValido({ cantidad: 1.5, unidad: "meses" })).toBe(false);
  });

  it("undefined es inválido", () => {
    expect(intervaloValido(undefined)).toBe(false);
  });

  it("fuera del límite por unidad es inválido (400 días, 60 semanas, 30 meses)", () => {
    expect(intervaloValido({ cantidad: 400, unidad: "dias" })).toBe(false);
    expect(intervaloValido({ cantidad: 60, unidad: "semanas" })).toBe(false);
    expect(intervaloValido({ cantidad: 30, unidad: "meses" })).toBe(false);
  });

  it("casos válidos en cada unidad", () => {
    expect(intervaloValido({ cantidad: 7, unidad: "dias" })).toBe(true);
    expect(intervaloValido({ cantidad: 2, unidad: "semanas" })).toBe(true);
    expect(intervaloValido({ cantidad: 6, unidad: "meses" })).toBe(true);
  });
});

describe("detectarPresetIntervalo", () => {
  PRESETS_INTERVALO.forEach((p) => {
    it(`reconoce el preset "${p.label}"`, () => {
      expect(detectarPresetIntervalo(p.valor)).toBe(p.label);
    });
  });

  it("una combinación fuera de la lista es Personalizado", () => {
    expect(detectarPresetIntervalo({ cantidad: 21, unidad: "dias" })).toBe("Personalizado");
  });

  it("undefined es Personalizado", () => {
    expect(detectarPresetIntervalo(undefined)).toBe("Personalizado");
  });
});

describe("crearSiguienteCitaSeguimiento", () => {
  it("caso válido: crea la siguiente cita con la fecha, estatus y motivo correctos", () => {
    const resultado = crearSiguienteCitaSeguimiento({
      citaAtendida: citaBase(),
      citasExistentes: [citaBase()],
      recursos,
      horario,
      ahora: 1750000000000,
    });
    expect(resultado.creada).toBe(true);
    if (resultado.creada) {
      expect(resultado.cita.fecha).toBe("2026-06-08");
      expect(resultado.cita.estatus).toBe("Agendada");
      expect(resultado.cita.tratamientos).toEqual(["Revisión de evolución"]);
    }
  });

  it("seguimientoAutomatico en false -> no_aplica", () => {
    const cita = citaBase({ seguimientoAutomatico: false });
    const resultado = crearSiguienteCitaSeguimiento({
      citaAtendida: cita,
      citasExistentes: [cita],
      recursos,
      horario,
      ahora: 1,
    });
    expect(resultado).toEqual({ creada: false, motivo: "no_aplica" });
  });

  it("ya existe una cita generada por esta -> ya_existe, incluso si el intervalo cambió", () => {
    const origen = citaBase({ seguimientoIntervalo: { cantidad: 30, unidad: "dias" } });
    const yaGenerada = citaBase({ id: "seg-C1-1", seguimientoOrigenCitaId: "C1" });
    const resultado = crearSiguienteCitaSeguimiento({
      citaAtendida: origen,
      citasExistentes: [origen, yaGenerada],
      recursos,
      horario,
      ahora: 1,
    });
    expect(resultado).toEqual({ creada: false, motivo: "ya_existe" });
  });

  it("intervalo ausente/inválido -> intervalo_invalido", () => {
    const cita = citaBase({ seguimientoIntervalo: undefined });
    const resultado = crearSiguienteCitaSeguimiento({
      citaAtendida: cita,
      citasExistentes: [cita],
      recursos,
      horario,
      ahora: 1,
    });
    expect(resultado).toEqual({ creada: false, motivo: "intervalo_invalido" });
  });

  it("motivo vacío/ausente -> motivo_invalido, nunca cae a un texto por default", () => {
    const cita = citaBase({ seguimientoMotivo: "" });
    const resultado = crearSiguienteCitaSeguimiento({
      citaAtendida: cita,
      citasExistentes: [cita],
      recursos,
      horario,
      ahora: 1,
    });
    expect(resultado).toEqual({ creada: false, motivo: "motivo_invalido" });
  });

  it("conflicto de horario con otra cita -> conflicto", () => {
    const cita = citaBase();
    const otraCita: CitaAgenda = citaBase({
      id: "C2",
      seguimientoAutomatico: false,
      fecha: "2026-06-08",
      horaInicio: "10:00",
      horaFin: "10:30",
    });
    const resultado = crearSiguienteCitaSeguimiento({
      citaAtendida: cita,
      citasExistentes: [cita, otraCita],
      recursos,
      horario,
      ahora: 1,
    });
    expect(resultado).toEqual({ creada: false, motivo: "conflicto" });
  });

  it("fuera del horario del consultorio -> fuera_de_horario", () => {
    const cita = citaBase({ horaInicio: "08:00", horaFin: "08:30" });
    const resultado = crearSiguienteCitaSeguimiento({
      citaAtendida: cita,
      citasExistentes: [cita],
      recursos,
      horario,
      ahora: 1,
    });
    expect(resultado).toEqual({ creada: false, motivo: "fuera_de_horario" });
  });

  it("hereda patientId/recurso/unidad/horaInicio/horaFin, y NO hereda costo/comentarios/horaLlegada", () => {
    const cita = citaBase({ costo: "$800", comentarios: "Paciente ansioso", horaLlegada: "09:55" });
    const resultado = crearSiguienteCitaSeguimiento({
      citaAtendida: cita,
      citasExistentes: [cita],
      recursos,
      horario,
      ahora: 1,
    });
    expect(resultado.creada).toBe(true);
    if (resultado.creada) {
      expect(resultado.cita.patientId).toBe(cita.patientId);
      expect(resultado.cita.medicoId).toBe(cita.medicoId);
      expect(resultado.cita.unidadId).toBe(cita.unidadId);
      expect(resultado.cita.horaInicio).toBe(cita.horaInicio);
      expect(resultado.cita.horaFin).toBe(cita.horaFin);
      expect(resultado.cita.costo).toBe("");
      expect(resultado.cita.comentarios).toBe("");
      expect(resultado.cita.horaLlegada).toBe(null);
    }
  });

  it("seguimientoCadenaId determinístico e igual en dos intentos sobre la misma cita", () => {
    const cita = citaBase();
    const r1 = crearSiguienteCitaSeguimiento({ citaAtendida: cita, citasExistentes: [cita], recursos, horario, ahora: 1 });
    const r2 = crearSiguienteCitaSeguimiento({ citaAtendida: cita, citasExistentes: [cita], recursos, horario, ahora: 2 });
    expect(r1.creada && r2.creada).toBe(true);
    if (r1.creada && r2.creada) {
      expect(r1.cita.seguimientoCadenaId).toBe(r2.cita.seguimientoCadenaId);
      expect(r1.cita.seguimientoCadenaId).toBe("seg-C1");
    }
  });

  it("seguimientoSecuencia 1 en la primera generada, 2 en la generada a partir de esa; id sin recursión", () => {
    const origen = citaBase();
    const primera = crearSiguienteCitaSeguimiento({ citaAtendida: origen, citasExistentes: [origen], recursos, horario, ahora: 1 });
    expect(primera.creada).toBe(true);
    if (!primera.creada) return;
    expect(primera.cita.seguimientoSecuencia).toBe(1);
    expect(primera.cita.id).toBe("seg-C1-1");

    const segundaAtendida: CitaAgenda = { ...primera.cita, estatus: "Atendida" };
    const segunda = crearSiguienteCitaSeguimiento({
      citaAtendida: segundaAtendida,
      citasExistentes: [origen, segundaAtendida],
      recursos,
      horario,
      ahora: 2,
    });
    expect(segunda.creada).toBe(true);
    if (!segunda.creada) return;
    expect(segunda.cita.seguimientoSecuencia).toBe(2);
    expect(segunda.cita.id).toBe("seg-C1-2");
    expect(segunda.cita.seguimientoCadenaId).toBe("seg-C1");
  });

  it("una cadena de 3 pasos con intervalos y motivos distintos produce las 3 fechas correctas en una sola cadena", () => {
    const origen = citaBase({
      fecha: "2026-06-01",
      seguimientoIntervalo: { cantidad: 7, unidad: "dias" },
      seguimientoMotivo: "Revisión de evolución",
    });
    const paso1 = crearSiguienteCitaSeguimiento({ citaAtendida: origen, citasExistentes: [origen], recursos, horario, ahora: 1 });
    expect(paso1.creada).toBe(true);
    if (!paso1.creada) return;
    expect(paso1.cita.fecha).toBe("2026-06-08");

    const atendida1: CitaAgenda = {
      ...paso1.cita,
      estatus: "Atendida",
      seguimientoIntervalo: { cantidad: 1, unidad: "meses" },
      seguimientoMotivo: "Control postoperatorio",
    };
    const paso2 = crearSiguienteCitaSeguimiento({
      citaAtendida: atendida1,
      citasExistentes: [origen, atendida1],
      recursos,
      horario,
      ahora: 2,
    });
    expect(paso2.creada).toBe(true);
    if (!paso2.creada) return;
    expect(paso2.cita.fecha).toBe("2026-07-08");

    const atendida2: CitaAgenda = {
      ...paso2.cita,
      estatus: "Atendida",
      seguimientoIntervalo: { cantidad: 6, unidad: "meses" },
      seguimientoMotivo: "Mantenimiento",
    };
    const paso3 = crearSiguienteCitaSeguimiento({
      citaAtendida: atendida2,
      citasExistentes: [origen, atendida1, atendida2],
      recursos,
      horario,
      ahora: 3,
    });
    expect(paso3.creada).toBe(true);
    if (!paso3.creada) return;
    expect(paso3.cita.fecha).toBe("2027-01-08");

    expect(paso1.cita.seguimientoCadenaId).toBe("seg-C1");
    expect(paso2.cita.seguimientoCadenaId).toBe("seg-C1");
    expect(paso3.cita.seguimientoCadenaId).toBe("seg-C1");
  });
});
