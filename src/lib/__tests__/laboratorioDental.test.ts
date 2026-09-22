import { describe, expect, it } from "vitest";
import { buildMensajeOrdenTrabajo, type OrdenTrabajoLaboratorio } from "../laboratorioDental";

function ordenBase(overrides: Partial<OrdenTrabajoLaboratorio> = {}): OrdenTrabajoLaboratorio {
  return {
    numeroOrden: "",
    fechaIngreso: "",
    fechaEntrega: "",
    medico: "Dr. Enrique Torres",
    paciente: "Juan Pérez",
    trabajo: "Corona de zirconia",
    dientes: [],
    especificaciones: "",
    entregaItems: [],
    etapaItems: [],
    ...overrides,
  };
}

describe("buildMensajeOrdenTrabajo", () => {
  it("incluye todos los campos cuando vienen llenos, en orden", () => {
    const texto = buildMensajeOrdenTrabajo("Sonríe X Todos Dental", {
      numeroOrden: "OT-045",
      fechaIngreso: "22/09/2026",
      fechaEntrega: "29/09/2026",
      medico: "Dr. Enrique Torres",
      paciente: "Juan Pérez",
      trabajo: "Corona de zirconia",
      dientes: [16, 11],
      especificaciones: "Color A2, terminado brillante",
      entregaItems: ["Antagonista", "Registro oclusal"],
      etapaItems: ["Color", "Terminado"],
    });

    expect(texto).toBe(
      [
        "Hola, te envío una orden de trabajo desde Sonríe X Todos Dental.",
        "N° de orden: OT-045",
        "Fecha de ingreso: 22/09/2026",
        "Fecha de entrega: 29/09/2026",
        "Doctor(a): Dr. Enrique Torres",
        "Paciente: Juan Pérez",
        "Trabajo a realizar: Corona de zirconia",
        "Órgano(s) dental(es): OD 11, 16",
        "Especificaciones: Color A2, terminado brillante",
        "Se entrega: Antagonista, Registro oclusal",
        "Etapa: Color, Terminado",
        "¿Me confirmas el costo?",
      ].join("\n")
    );
  });

  it("omite en el mensaje cualquier campo opcional vacío, sin dejar líneas huecas", () => {
    const texto = buildMensajeOrdenTrabajo("MO", ordenBase());
    expect(texto).toBe(
      [
        "Hola, te envío una orden de trabajo desde MO.",
        "Doctor(a): Dr. Enrique Torres",
        "Paciente: Juan Pérez",
        "Trabajo a realizar: Corona de zirconia",
        "¿Me confirmas el costo?",
      ].join("\n")
    );
  });

  it("sin nombre de clínica, usa 'el consultorio' como respaldo", () => {
    const texto = buildMensajeOrdenTrabajo("", ordenBase());
    expect(texto).toContain("desde el consultorio.");
  });

  it("los órganos dentales siempre se muestran ordenados, sin importar el orden de selección", () => {
    const texto = buildMensajeOrdenTrabajo("MO", ordenBase({ dientes: [36, 11, 24] }));
    expect(texto).toContain("Órgano(s) dental(es): OD 11, 24, 36");
  });

  it("siempre cierra preguntando por el costo, incluso con todo lo demás vacío", () => {
    const texto = buildMensajeOrdenTrabajo("MO", ordenBase());
    expect(texto.endsWith("¿Me confirmas el costo?")).toBe(true);
  });

  it("recorta espacios sobrantes en los campos de texto libre", () => {
    const texto = buildMensajeOrdenTrabajo(
      "MO",
      ordenBase({ numeroOrden: "  OT-1  ", paciente: "  Ana  ", trabajo: "  Puente  " })
    );
    expect(texto).toContain("N° de orden: OT-1");
    expect(texto).toContain("Paciente: Ana");
    expect(texto).toContain("Trabajo a realizar: Puente");
  });
});
