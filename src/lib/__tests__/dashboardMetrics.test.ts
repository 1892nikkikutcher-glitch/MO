import { describe, expect, it } from "vitest";
import type { CitaAgenda } from "../patientData";
import {
  calcularRangoPeriodo,
  citasProximas,
  pacientesEnRangoDetalle,
  sumarPresupuestosEnRango,
} from "../dashboardMetrics";

function cita(overrides: Partial<CitaAgenda>): CitaAgenda {
  return {
    id: overrides.id ?? "c1",
    folio: "1",
    recursoId: "",
    patientId: "p1",
    paciente: "Paciente Uno",
    tratamientos: [],
    comentarios: "",
    fecha: "2026-06-15",
    horaInicio: "09:00",
    horaFin: "10:00",
    estatus: "Atendida",
    recurrenciaId: null,
    ...overrides,
  } as CitaAgenda;
}

describe("sumarPresupuestosEnRango", () => {
  const presupuestosPorFecha = {
    "2026-06-01": { cantidad: 2, valor: 3000 },
    "2026-06-15": { cantidad: 1, valor: 1500 },
    "2026-07-01": { cantidad: 3, valor: 4500 },
  };

  it("suma cantidad y valor de las fechas dentro del rango (inclusive)", () => {
    const resultado = sumarPresupuestosEnRango(presupuestosPorFecha, "2026-06-01", "2026-06-30");
    expect(resultado).toEqual({ cantidad: 3, valor: 4500 });
  });

  it("{cantidad:0, valor:0} cuando el rollup no existe (documentos legados)", () => {
    expect(sumarPresupuestosEnRango(undefined, "2026-06-01", "2026-06-30")).toEqual({ cantidad: 0, valor: 0 });
  });

  it("{cantidad:0, valor:0} cuando ninguna fecha cae dentro del rango", () => {
    const resultado = sumarPresupuestosEnRango(presupuestosPorFecha, "2026-01-01", "2026-01-31");
    expect(resultado).toEqual({ cantidad: 0, valor: 0 });
  });

  it("incluye los límites del rango", () => {
    const resultado = sumarPresupuestosEnRango({ "2026-06-01": { cantidad: 5, valor: 100 } }, "2026-06-01", "2026-06-01");
    expect(resultado).toEqual({ cantidad: 5, valor: 100 });
  });
});

describe("calcularRangoPeriodo (regresión — ya existía, sin test hasta ahora)", () => {
  it("'hoy' cubre solo el día actual", () => {
    const hoy = new Date(2026, 5, 15);
    const rango = calcularRangoPeriodo("hoy", hoy);
    expect(rango.desdeISO).toBe("2026-06-15");
    expect(rango.hastaISO).toBe("2026-06-15");
    expect(rango.label).toBe("Hoy");
  });

  it("'mes' arranca el día 1 del mes actual", () => {
    const hoy = new Date(2026, 5, 15);
    const rango = calcularRangoPeriodo("mes", hoy);
    expect(rango.desdeISO).toBe("2026-06-01");
    expect(rango.hastaISO).toBe("2026-06-15");
  });

  it("'personalizado' respeta el rango exacto capturado, incluso invertido", () => {
    const hoy = new Date(2026, 5, 15);
    const rango = calcularRangoPeriodo("personalizado", hoy, { desdeISO: "2026-03-10", hastaISO: "2026-01-05" });
    expect(rango.desdeISO).toBe("2026-01-05");
    expect(rango.hastaISO).toBe("2026-03-10");
    expect(rango.label).toBe("Personalizado");
  });

  it("el rango anterior tiene el mismo número de días, justo antes", () => {
    const hoy = new Date(2026, 5, 15);
    const rango = calcularRangoPeriodo("semana", hoy);
    const dias = (new Date(`${rango.hastaISO}T00:00:00`).getTime() - new Date(`${rango.desdeISO}T00:00:00`).getTime()) / 86_400_000 + 1;
    const diasAnterior =
      (new Date(`${rango.hastaAnteriorISO}T00:00:00`).getTime() - new Date(`${rango.desdeAnteriorISO}T00:00:00`).getTime()) / 86_400_000 + 1;
    expect(diasAnterior).toBe(dias);
    expect(rango.hastaAnteriorISO < rango.desdeISO).toBe(true);
  });
});

describe("calcularRangoPeriodo — navegación con ancla distinta a hoy", () => {
  it("'mes' del periodo ACTUAL sigue recortado a hoy (mes en curso, no se puede reportar el futuro)", () => {
    const hoy = new Date(2026, 8, 2); // 2 de septiembre de 2026
    const rango = calcularRangoPeriodo("mes", hoy, undefined, hoy);
    expect(rango.desdeISO).toBe("2026-09-01");
    expect(rango.hastaISO).toBe("2026-09-02");
    expect(rango.label).toBe("Este mes");
    expect(rango.detalleFecha).toBe("Septiembre 2026");
  });

  it("navegar 'mes' un paso atrás muestra el mes COMPLETO (agosto), no recortado al día del ancla", () => {
    const hoyReal = new Date(2026, 8, 2); // hoy sigue siendo 2 de septiembre
    const ancla = new Date(2026, 7, 2); // ancla movida a agosto (mismo día de mes)
    const rango = calcularRangoPeriodo("mes", ancla, undefined, hoyReal);
    expect(rango.desdeISO).toBe("2026-08-01");
    expect(rango.hastaISO).toBe("2026-08-31");
    expect(rango.label).toBe("Agosto 2026");
    expect(rango.detalleFecha).toBe("Agosto 2026");
  });

  it("navegar 'mes' un paso adelante (mes futuro) también muestra el rango natural completo", () => {
    const hoyReal = new Date(2026, 8, 2);
    const ancla = new Date(2026, 9, 2); // octubre, todavía no llega
    const rango = calcularRangoPeriodo("mes", ancla, undefined, hoyReal);
    expect(rango.desdeISO).toBe("2026-10-01");
    expect(rango.hastaISO).toBe("2026-10-31");
    expect(rango.label).toBe("Octubre 2026");
  });

  it("'año' navegado muestra el año completo (1 ene – 31 dic), no recortado", () => {
    const hoyReal = new Date(2026, 8, 2);
    const ancla = new Date(2025, 8, 2);
    const rango = calcularRangoPeriodo("año", ancla, undefined, hoyReal);
    expect(rango.desdeISO).toBe("2025-01-01");
    expect(rango.hastaISO).toBe("2025-12-31");
    expect(rango.label).toBe("2025");
    expect(rango.detalleFecha).toBe("2025");
  });

  it("'trimestre' navegado muestra el trimestre natural completo con el nombre de sus meses", () => {
    const hoyReal = new Date(2026, 8, 2); // Q3 2026 (jul-sep)
    const ancla = new Date(2026, 3, 15); // Q2 2026 (abr-jun)
    const rango = calcularRangoPeriodo("trimestre", ancla, undefined, hoyReal);
    expect(rango.desdeISO).toBe("2026-04-01");
    expect(rango.hastaISO).toBe("2026-06-30");
    expect(rango.label).toBe("Abril – Junio 2026");
  });

  it("'hoy' navegado a un día distinto de hoy real vuelve a la fecha concreta", () => {
    const hoyReal = new Date(2026, 8, 2);
    const ancla = new Date(2026, 8, 1);
    const rango = calcularRangoPeriodo("hoy", ancla, undefined, hoyReal);
    expect(rango.desdeISO).toBe("2026-09-01");
    expect(rango.hastaISO).toBe("2026-09-01");
    expect(rango.label).not.toBe("Hoy");
    expect(rango.label).toContain("2026");
  });
});

describe("pacientesEnRangoDetalle", () => {
  it("devuelve un renglón por paciente distinto con cita Atendida en el rango", () => {
    const citas = [
      cita({ id: "c1", patientId: "p1", paciente: "Ana", fecha: "2026-06-05" }),
      cita({ id: "c2", patientId: "p1", paciente: "Ana", fecha: "2026-06-10" }),
      cita({ id: "c3", patientId: "p2", paciente: "Beto", fecha: "2026-06-12" }),
    ];
    const detalle = pacientesEnRangoDetalle(citas, "2026-06-01", "2026-06-30");
    expect(detalle).toHaveLength(2);
    expect(detalle.map((d) => d.patientId).sort()).toEqual(["p1", "p2"]);
    expect(detalle.find((d) => d.patientId === "p1")?.patientName).toBe("Ana");
  });

  it("ignora citas fuera del rango, sin patientId, o no Atendidas", () => {
    const citas = [
      cita({ id: "c1", patientId: "p1", fecha: "2026-05-30" }),
      cita({ id: "c2", patientId: null, fecha: "2026-06-05" }),
      cita({ id: "c3", patientId: "p2", fecha: "2026-06-05", estatus: "Cancelada" }),
    ];
    expect(pacientesEnRangoDetalle(citas, "2026-06-01", "2026-06-30")).toEqual([]);
  });

  it("length coincide con pacientesAtendidosEnRango (mismo criterio, distinta forma)", () => {
    const citas = [
      cita({ id: "c1", patientId: "p1", fecha: "2026-06-05" }),
      cita({ id: "c2", patientId: "p2", fecha: "2026-06-05" }),
    ];
    expect(pacientesEnRangoDetalle(citas, "2026-06-01", "2026-06-30")).toHaveLength(2);
  });
});

describe("citasProximas", () => {
  it("incluye citas no resueltas dentro de la ventana de días, desde hoy", () => {
    const citas = [
      cita({ id: "c1", fecha: "2026-06-16", estatus: "Confirmada" }),
      cita({ id: "c2", fecha: "2026-06-25", estatus: "Agendada" }),
    ];
    const detalle = citasProximas(citas, "2026-06-15", 7);
    expect(detalle.map((c) => c.id)).toEqual(["c1"]);
  });

  it("excluye citas ya resueltas (Atendida, Cancelada, etc.) aunque caigan en la ventana", () => {
    const citas = [cita({ id: "c1", fecha: "2026-06-16", estatus: "Atendida" })];
    expect(citasProximas(citas, "2026-06-15", 7)).toEqual([]);
  });
});
