import { describe, expect, it } from "vitest";
import { armarCierre, duracionLegible, fechaLargaConDia, siguienteDiaDeAtencion, textoDelCierre } from "../cierreDelDia";
import type { BloqueAtencion, Sede } from "../sedesBloques";

const sedes: Sede[] = [
  { id: "jc", nombre: "Juan Corrales" },
  { id: "emsa", nombre: "EMSA" },
];
// 2026-10-19 es lunes; 2026-10-20 martes; 2026-10-23 viernes.
const enrique: BloqueAtencion = { id: "b1", sedeId: "jc", dias: [1, 3, 5], inicio: "09:00", fin: "14:00" };
const nicolas: BloqueAtencion = { id: "b2", sedeId: "emsa", dias: [2, 4], inicio: "10:00", fin: "18:00" };
const recursos = [
  { id: "e", tipo: "medico", nombre: "Dr. Enrique", bloques: [enrique] },
  { id: "n", tipo: "medico", nombre: "Dr. Nicolás", bloques: [nicolas] },
];
const pacientes = [
  { id: "p1", name: "Brenda Cruz", phone: "55 1234 5678" },
  { id: "p2", name: "Luis Salazar", phone: "" },
  { id: "p3", name: "Ana Torres", phone: "55 9999 0000" },
];

const cita = (id: string, fecha: string, ini: string, fin: string, estatus: string, extra: Record<string, unknown> = {}) => ({
  id,
  fecha,
  horaInicio: ini,
  horaFin: fin,
  estatus,
  medicoId: "e",
  patientId: "p1",
  paciente: "Brenda Cruz",
  tratamientos: ["Limpieza"],
  ...extra,
});

describe("siguiente día de atención", () => {
  it("salta los días en que nadie atiende", () => {
    // Viernes 23 → sábado y domingo no tienen bloques → el lunes 26.
    expect(siguienteDiaDeAtencion("2026-10-23", recursos, [])).toBe("2026-10-26");
    // Lunes 19 → martes 20 (bloque de Nicolás).
    expect(siguienteDiaDeAtencion("2026-10-19", recursos, [])).toBe("2026-10-20");
  });

  it("un día con citas cuenta aunque no haya bloques", () => {
    expect(siguienteDiaDeAtencion("2026-10-23", [], [{ fecha: "2026-10-24", estatus: "Confirmada" }])).toBe("2026-10-24");
    // Una cancelada no cuenta como día de atención.
    expect(siguienteDiaDeAtencion("2026-10-23", [], [{ fecha: "2026-10-24", estatus: "Cancelada" }])).toBe("2026-10-24");
  });

  it("sin bloques ni citas, mañana", () => {
    expect(siguienteDiaDeAtencion("2026-10-19", [], [])).toBe("2026-10-20");
  });
});

describe("armar el cierre", () => {
  const citas = [
    cita("1", "2026-10-19", "09:00", "10:00", "Confirmada"),
    cita("2", "2026-10-19", "10:00", "10:30", "Agendada", { patientId: "p2", paciente: "Luis Salazar" }),
    cita("3", "2026-10-19", "12:00", "13:00", "Agendada", { patientId: "p3", paciente: "Ana Torres", fueraDeBloque: false }),
    cita("4", "2026-10-19", "11:00", "11:30", "Cancelada"), // no cuenta
    cita("5", "2026-10-26", "09:00", "10:00", "Confirmada"), // otro día
    // Ana faltó antes.
    cita("6", "2026-10-12", "09:00", "10:00", "No Asistió", { patientId: "p3", paciente: "Ana Torres" }),
  ];
  const cierre = armarCierre({
    fecha: "2026-10-19",
    recursos,
    sedes,
    citas,
    pacientes,
    laboratorios: [
      { patientId: "p1", laboratorio: "Lab Dental MX", trabajo: "Corona de zirconia", fechaEntrega: "22/10/2026", estatus: "Enviado" },
      { patientId: "p3", laboratorio: "Lab X", trabajo: "Guarda", fechaEntrega: "15/10/2026", estatus: "Recibido" }, // ya llegó
    ],
    saldos: [{ patientId: "p3", totalPresupuestado: 3000, totalPagado: 1000 }],
  });

  it("lista solo las citas vigentes del día, en orden de hora, con su sede", () => {
    expect(cierre.citas.map((c) => c.id)).toEqual(["1", "2", "3"]);
    expect(cierre.citas[0]).toMatchObject({ medicoNombre: "Dr. Enrique", sedeNombre: "Juan Corrales", duracionMin: 60, telefono: "55 1234 5678", motivo: "Limpieza" });
  });

  it("cuenta confirmadas y por confirmar", () => {
    expect(cierre.confirmadas).toBe(1);
    expect(cierre.porConfirmar).toBe(2);
  });

  it("calcula los espacios libres de los bloques de ese día", () => {
    // Bloque de Enrique 9–14: ocupado 9–10, 10–10:30, 12–13 → libres 10:30–12:00 y 13:00–14:00.
    const libres = cierre.espacios.filter((e) => e.medicoNombre === "Dr. Enrique").map((e) => `${e.inicio}-${e.fin}`);
    expect(libres).toEqual(["10:30-12:00", "13:00-14:00"]);
    expect(cierre.minutosLibres).toBe(90 + 60);
    // Nicolás no atiende los lunes: no aparece.
    expect(cierre.espacios.some((e) => e.medicoNombre === "Dr. Nicolás")).toBe(false);
  });

  it("junta los pendientes: laboratorio, teléfono, saldo e inasistencias", () => {
    const tipos = cierre.pendientes.map((p) => `${p.paciente}:${p.tipo}`);
    expect(tipos).toContain("Brenda Cruz:laboratorio");
    expect(tipos).toContain("Luis Salazar:sin_telefono");
    expect(tipos).toContain("Ana Torres:saldo");
    expect(tipos).toContain("Ana Torres:inasistencias");
    // El laboratorio ya recibido no es pendiente.
    expect(tipos).not.toContain("Ana Torres:laboratorio");
    const lab = cierre.pendientes.find((p) => p.tipo === "laboratorio")!;
    expect(lab.texto).toContain("después de la cita");
  });

  it("marca las citas fuera de bloque y sin médico", () => {
    const c2 = armarCierre({
      fecha: "2026-10-20", // martes: Enrique no atiende
      recursos,
      sedes,
      citas: [cita("a", "2026-10-20", "10:00", "11:00", "Agendada"), cita("b", "2026-10-20", "12:00", "13:00", "Agendada", { medicoId: null, recursoId: "" })],
      pacientes,
    });
    expect(c2.pendientes.map((p) => p.tipo)).toEqual(expect.arrayContaining(["fuera_de_bloque", "sin_medico"]));
  });

  it("un día sin citas deja todos los bloques como espacio", () => {
    const vacio = armarCierre({ fecha: "2026-10-20", recursos, sedes, citas: [], pacientes });
    expect(vacio.citas).toHaveLength(0);
    expect(vacio.espacios).toHaveLength(1);
    expect(vacio.espacios[0]).toMatchObject({ medicoNombre: "Dr. Nicolás", inicio: "10:00", fin: "18:00", minutos: 480 });
  });

  it("no ofrece huecos menores a 30 minutos", () => {
    const c = armarCierre({
      fecha: "2026-10-19",
      recursos: [recursos[0]],
      sedes,
      citas: [cita("x", "2026-10-19", "09:00", "13:45", "Agendada")],
      pacientes,
    });
    expect(c.espacios).toHaveLength(0); // queda 13:45–14:00 (15 min)
  });
});

describe("texto para WhatsApp", () => {
  const cierre = armarCierre({
    fecha: "2026-10-19",
    recursos,
    sedes,
    citas: [cita("1", "2026-10-19", "09:00", "10:00", "Confirmada"), cita("2", "2026-10-19", "10:00", "10:30", "Agendada", { patientId: "p2", paciente: "Luis Salazar" })],
    pacientes,
  });

  it("arma el reporte con citas, espacios y pendientes", () => {
    const t = textoDelCierre(cierre, "Clínica MO");
    expect(t).toContain("*CIERRE DEL DÍA — citas del lunes 19 de octubre*");
    expect(t).toContain("Clínica MO");
    expect(t).toContain("📍 *Juan Corrales* — Dr. Enrique (2 citas)");
    expect(t).toContain("✅ 09:00–10:00 · Brenda Cruz · Limpieza · 55 1234 5678");
    expect(t).toContain("⏳ 10:00–10:30 · Luis Salazar · Limpieza");
    expect(t).toContain("✅ Confirmadas: 1 de 2 · ⏳ Por confirmar: 1");
    expect(t).toContain("🕒 *Espacios disponibles*");
    expect(t).toContain("• Juan Corrales · Dr. Enrique: 10:30–14:00 (3 h 30 min)");
    expect(t).toContain("⚠️ *Pendientes*");
  });

  it("un día sin citas lo dice", () => {
    const t = textoDelCierre(armarCierre({ fecha: "2026-10-21", recursos: [], sedes, citas: [], pacientes }));
    expect(t).toContain("Sin citas agendadas.");
    expect(fechaLargaConDia({ fecha: "2026-10-21", diaNombre: "miércoles" })).toBe("miércoles 21 de octubre");
  });
});

describe("empalmes y duraciones", () => {
  it("avisa cuando dos citas del mismo médico se pisan, solo en la que empieza después", () => {
    const c = armarCierre({
      fecha: "2026-10-19",
      recursos,
      sedes,
      citas: [
        cita("a", "2026-10-19", "12:00", "12:45", "Agendada", { patientId: "p1", paciente: "Brenda Cruz" }),
        cita("b", "2026-10-19", "12:30", "13:00", "Agendada", { patientId: "p3", paciente: "Ana Torres" }),
        cita("c", "2026-10-19", "13:00", "13:30", "Agendada", { patientId: "p3", paciente: "Ana Torres" }), // pegada, no se pisa
      ],
      pacientes,
    });
    const empalmes = c.pendientes.filter((p) => p.tipo === "empalme");
    expect(empalmes).toHaveLength(1);
    expect(empalmes[0].citaId).toBe("b");
    expect(empalmes[0].texto).toContain("Brenda Cruz (12:00–12:45)");
  });

  it("citas de médicos distintos a la misma hora no son empalme", () => {
    const c = armarCierre({
      fecha: "2026-10-20",
      recursos,
      sedes,
      citas: [cita("a", "2026-10-20", "10:00", "11:00", "Agendada"), cita("b", "2026-10-20", "10:00", "11:00", "Agendada", { medicoId: "n" })],
      pacientes,
    });
    expect(c.pendientes.some((p) => p.tipo === "empalme")).toBe(false);
  });

  it("escribe las duraciones de forma legible", () => {
    expect(duracionLegible(30)).toBe("30 min");
    expect(duracionLegible(60)).toBe("1 h");
    expect(duracionLegible(75)).toBe("1 h 15 min");
    expect(duracionLegible(210)).toBe("3 h 30 min");
  });
});
