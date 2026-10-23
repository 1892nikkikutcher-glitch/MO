import { describe, expect, it } from "vitest";
import { medicoPredeterminadoParaPago } from "../medicoDelPago";

const recursos = [
  { id: "r1", nombre: "Dra. Ana", tipo: "medico" },
  { id: "r2", nombre: "Dr. Luis", tipo: "medico" },
  { id: "u1", nombre: "Unidad 1", tipo: "unidad" },
];
const cita = (extra: Record<string, unknown>) => ({ patientId: "p1", fecha: "2026-10-20", horaInicio: "10:00", estatus: "Atendida", medicoId: "r1", recursoId: "r1", ...extra });
const base = { patientId: "p1", recursos, hoyISO: "2026-10-23" };

describe("médico por defecto al cobrar", () => {
  it("primero el médico responsable que se le asignó al paciente", () => {
    expect(medicoPredeterminadoParaPago({ ...base, medicoResponsableId: "r2", citas: [cita({ fecha: "2026-10-23", medicoId: "r1" })] })).toBe("Dr. Luis");
  });

  it("si no hay responsable, el de su cita de hoy", () => {
    expect(medicoPredeterminadoParaPago({ ...base, citas: [cita({ fecha: "2026-10-23", medicoId: "r2" }), cita({ fecha: "2026-10-01", medicoId: "r1" })] })).toBe("Dr. Luis");
  });

  it("si hoy no vino, el de su última cita pasada", () => {
    const citas = [cita({ fecha: "2026-09-01", medicoId: "r1" }), cita({ fecha: "2026-10-10", medicoId: "r2" })];
    expect(medicoPredeterminadoParaPago({ ...base, citas })).toBe("Dr. Luis");
  });

  it("no cuenta citas canceladas, reagendadas ni de otro paciente, ni citas futuras", () => {
    const citas = [
      cita({ fecha: "2026-10-23", estatus: "Cancelada", medicoId: "r2" }),
      cita({ fecha: "2026-10-22", estatus: "Reagendada", medicoId: "r2" }),
      cita({ fecha: "2026-10-22", patientId: "otro", medicoId: "r2" }),
      cita({ fecha: "2026-10-30", medicoId: "r2" }),
    ];
    expect(medicoPredeterminadoParaPago({ ...base, citas })).toBe("");
  });

  it("una unidad nunca es médico, y sin ningún dato no inventa uno", () => {
    expect(medicoPredeterminadoParaPago({ ...base, citas: [cita({ fecha: "2026-10-23", medicoId: null, recursoId: "u1" })] })).toBe("");
    expect(medicoPredeterminadoParaPago({ ...base, medicoResponsableId: "u1", citas: [] })).toBe("");
  });

  it("usa recursoId cuando la cita es antigua y no tiene medicoId", () => {
    expect(medicoPredeterminadoParaPago({ ...base, citas: [cita({ fecha: "2026-10-23", medicoId: undefined, recursoId: "r2" })] })).toBe("Dr. Luis");
  });
});
