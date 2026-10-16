import { describe, expect, it } from "vitest";
import { mensajeProponerCita, pacientesPorProponerCita } from "../pacientesPorProponer";

const hoy = new Date(2026, 9, 15); // jueves 15 oct. 2026
const atendida = (patientId: string, fecha: string) => ({ patientId, fecha, estatus: "Atendida" });
const p = (id: string, extra: object = {}) => ({ id, name: `Paciente ${id}`, phone: "5512345678", ...extra });

describe("pacientesPorProponerCita", () => {
  it("incluye a quien ya cumplió (o está por cumplir) 6 meses desde su última cita atendida y no tiene cita próxima", () => {
    const r = pacientesPorProponerCita(
      [p("vencido"), p("porVencer"), p("reciente"), p("lejano")],
      [
        atendida("vencido", "2026-03-01"), // toca desde 2026-09-01 → vencido
        atendida("porVencer", "2026-04-20"), // toca desde 2026-10-20 → dentro de 30 días
        atendida("reciente", "2026-09-10"), // toca en marzo → todavía no
        atendida("lejano", "2026-06-01"), // toca en diciembre → falta más de 30 días
      ],
      hoy
    );
    expect(r.map((x) => x.paciente.id)).toEqual(["vencido", "porVencer"]);
    expect(r[0]).toMatchObject({ vencida: true, tocaDesde: "2026-09-01", mesesDesdeUltima: 7 });
    expect(r[1]).toMatchObject({ vencida: false, tocaDesde: "2026-10-20" });
  });

  it("omite a quien ya tiene próxima cita, nunca ha venido, está fusionado o apagó el recordatorio", () => {
    const r = pacientesPorProponerCita(
      [p("conCita"), p("nuncaVino"), p("fusionado", { fusionadoEnId: "x" }), p("apagado", { recordatorioPrevencion: false }), p("ok")],
      [
        atendida("conCita", "2026-01-01"),
        { patientId: "conCita", fecha: "2026-10-20", estatus: "Confirmada" },
        { patientId: "nuncaVino", fecha: "2026-01-01", estatus: "No Asistió" },
        atendida("fusionado", "2026-01-01"),
        atendida("apagado", "2026-01-01"),
        atendida("ok", "2026-01-01"),
        { patientId: "ok", fecha: "2026-10-01", estatus: "Cancelada" }, // una cancelada no cuenta como próxima cita
      ],
      hoy
    );
    expect(r.map((x) => x.paciente.id)).toEqual(["ok"]);
  });

  it("los que llevan más tiempo sin venir van primero y se respeta el límite", () => {
    const pacientes = ["a", "b", "c"].map((id) => p(id));
    const citas = [atendida("a", "2026-03-01"), atendida("b", "2025-12-01"), atendida("c", "2026-02-01")];
    expect(pacientesPorProponerCita(pacientes, citas, hoy).map((x) => x.paciente.id)).toEqual(["b", "c", "a"]);
    expect(pacientesPorProponerCita(pacientes, citas, hoy, 2).map((x) => x.paciente.id)).toEqual(["b", "c"]);
  });

  it("trae su horario preferente, las fechas que le acomodan y su calificación", () => {
    const [r] = pacientesPorProponerCita(
      [p("a", { horarioPreferente: { dias: [1, 3, 5], desde: "18:00" } })],
      [atendida("a", "2026-03-01"), { patientId: "a", fecha: "2026-05-01", estatus: "No Asistió" }],
      hoy
    );
    expect(r.horario).toBe("Lunes, miércoles y viernes · después de las 18:00");
    expect(r.propuestas.map((x) => x.fecha)).toEqual(["2026-10-16", "2026-10-19", "2026-10-21"]);
    expect(r.calificacion.noAsistio).toBe(1);
    expect(r.calificacion.estrellas).toBeLessThan(5);
  });

  it("sin horario preferente no propone fechas (el doctor elige)", () => {
    const [r] = pacientesPorProponerCita([p("a")], [atendida("a", "2026-03-01")], hoy);
    expect(r.horario).toBe("");
    expect(r.propuestas).toEqual([]);
  });

  it("6 meses desde el 31 de agosto cae el último día de febrero, no en marzo", () => {
    const [r] = pacientesPorProponerCita([p("a")], [atendida("a", "2025-08-31")], new Date(2026, 1, 20));
    expect(r.tocaDesde).toBe("2026-02-28");
  });
});

describe("mensajeProponerCita", () => {
  it("con fecha propuesta la ofrece", () => {
    const t = mensajeProponerCita({
      nombrePaciente: "Brenda Ivonne Cruz",
      clinica: "Sonríe X Todos Dental",
      propuesta: { fecha: "2026-10-16", hora: "18:00", etiqueta: "" },
    });
    expect(t).toBe(
      "Hola Brenda, te escribimos de Sonríe X Todos Dental. Ya toca tu revisión y limpieza dental. ¿Te acomoda el viernes 16 de octubre a las 18:00? Si prefieres otro horario, dime y lo acomodamos."
    );
  });

  it("sin fecha pregunta cuándo le acomoda", () => {
    expect(mensajeProponerCita({ nombrePaciente: "Oscar López" })).toBe(
      "Hola Oscar, te escribimos de tu consultorio dental. Ya toca tu revisión y limpieza dental. ¿Qué día y horario te acomoda para agendarla?"
    );
  });
});
