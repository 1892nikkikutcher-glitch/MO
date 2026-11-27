import { describe, expect, it } from "vitest";
import jsPDF from "jspdf";
import { direccionConTelefono, lineasContactoConsultorio, telefonoConsultorioDe, textoTelefono, yPieContacto } from "../telefonoConsultorio";
import { generarPresupuestoPdf } from "../generarPresupuestoPdf";
import { generarPresupuestoTotalPdf } from "../generarPresupuestoTotalPdf";
import { generarComparativaPdf } from "../generarComparativaPdf";
import { generarReciboPagoPdf } from "../generarReciboPagoPdf";
import { reciboCompartidoSchema } from "../recibosCompartidos";
import { identidadDoctorDe, type Pago, type PerfilDoctor, type Recurso } from "../patientData";

const medicos = [
  { nombre: "Dra. Ana", tipo: "medico", telefono: "722 111 2222" },
  { nombre: "Dr. Luis", tipo: "medico", telefono: "  " },
  { nombre: "Cubículo 1", tipo: "unidad", telefono: "999" },
] as Pick<Recurso, "nombre" | "tipo" | "telefono">[];

describe("qué teléfono lleva cada documento", () => {
  it("usa el del médico del documento", () => {
    expect(telefonoConsultorioDe("Dra. Ana", medicos, "55 000 0000")).toBe("722 111 2222");
  });
  it("si el médico no lo capturó, o el documento no es de un médico, el general", () => {
    expect(telefonoConsultorioDe("Dr. Luis", medicos, "55 000 0000")).toBe("55 000 0000");
    expect(telefonoConsultorioDe(null, medicos, " 55 000 0000 ")).toBe("55 000 0000");
    expect(telefonoConsultorioDe("Nadie", medicos, "55 000 0000")).toBe("55 000 0000");
  });
  it("una unidad (no es médico) nunca presta su teléfono", () => {
    expect(telefonoConsultorioDe("Cubículo 1", medicos, "")).toBe("");
  });
  it("sin ninguno, vacío", () => {
    expect(telefonoConsultorioDe("Dr. Luis", medicos, undefined)).toBe("");
  });
});

describe("texto del contacto", () => {
  it("arma «Tel.» y la dirección en dos renglones", () => {
    expect(textoTelefono(" 722 1 ")).toBe("Tel. 722 1");
    expect(textoTelefono("  ")).toBe("");
    expect(direccionConTelefono("Calle 1, Toluca", "722 1")).toBe("Calle 1, Toluca\nTel. 722 1");
    expect(direccionConTelefono("", "722 1")).toBe("Tel. 722 1");
    expect(direccionConTelefono("Calle 1", "")).toBe("Calle 1");
    expect(direccionConTelefono("", "")).toBe("");
  });
  it("el pie de PDF pone el teléfono debajo de la dirección ajustada al ancho", () => {
    const doc = new jsPDF({ unit: "mm", format: "letter" });
    const lineas = lineasContactoConsultorio(doc, "Calle Hermenegildo Galeana #14, San Francisco Tlalcilalcalpan, Centro. Almoloya de Juárez, Estado de México. CP 50940", "722 1", 60);
    expect(lineas.length).toBeGreaterThan(2);
    expect(lineas[lineas.length - 1]).toBe("Tel. 722 1");
    expect(yPieContacto(279.4, 1)).toBeCloseTo(269.4);
    expect(yPieContacto(279.4, 3)).toBeLessThan(yPieContacto(279.4, 1));
  });
});

async function textoDe(blob: Blob): Promise<string> {
  return new TextDecoder("latin1").decode(await blob.arrayBuffer());
}

const perfil: PerfilDoctor = { logoClinicaUrl: "", direccionClinica: "Calle 1, Toluca", textoValidezReceta: "" };
const identidad = identidadDoctorDe("", []);
const pago: Pago = { id: "pago-12345678", fecha: "2026-11-26", medico: "Dra. Ana", formaPago: "Efectivo", total: 500, facturar: false, firma: null, lineas: [{ id: "l1", tratamientoId: null, folio: null, label: "Limpieza", monto: 500 }] };

describe("el teléfono sale en los PDF de cada documento", () => {
  it("presupuesto", async () => {
    const t = await textoDe(
      await generarPresupuestoPdf({ folio: "P1", fechaLarga: "x", medico: "Dra. Ana", pacienteNombre: "Brenda", pacienteCorreo: "", pacienteTelefono: "", diagnostico: "", items: [], total: 0, identidadDoctor: identidad, perfilDoctor: perfil, telefonoConsultorio: "722 111 2222" })
    );
    expect(t).toContain("Tel. 722 111 2222");
  });
  it("presupuesto completo", async () => {
    const t = await textoDe(
      await generarPresupuestoTotalPdf({ presupuestos: [], fechaLarga: "x", pacienteNombre: "Brenda", pacienteCorreo: "", pacienteTelefono: "", perfilDoctor: perfil, telefonoConsultorio: "722 111 2222" })
    );
    expect(t).toContain("Tel. 722 111 2222");
  });
  it("comparativa", async () => {
    const t = await textoDe(
      await generarComparativaPdf({
        comparativa: { id: "c", titulo: "Comp", opciones: [] } as never,
        presupuestos: [],
        fechaLarga: "x",
        pacienteNombre: "Brenda",
        perfilDoctor: perfil,
        telefonoConsultorio: "722 111 2222",
      })
    );
    expect(t).toContain("Tel. 722 111 2222");
  });
  it("recibo de pago", async () => {
    const t = await textoDe(await generarReciboPagoPdf({ pago, pacienteNombre: "Brenda", clinicaNombre: "Consultorio", perfilDoctor: perfil, telefonoConsultorio: "722 111 2222" }));
    expect(t).toContain("Tel. 722 111 2222");
  });
  it("sin teléfono ningún documento imprime «Tel.»", async () => {
    const t = await textoDe(await generarReciboPagoPdf({ pago, pacienteNombre: "Brenda", clinicaNombre: "Consultorio", perfilDoctor: perfil }));
    expect(t).not.toContain("Tel.");
  });
});

describe("recibo compartido por liga", () => {
  const base = {
    clinicaId: "c1",
    pacienteNombre: "Brenda",
    clinicaNombre: "Consultorio",
    pago: { id: "p1", fecha: "2026-11-26", medico: "Dra. Ana", formaPago: "Efectivo", total: 500, facturar: false, lineas: [] },
  };
  it("acepta el teléfono del consultorio y los recibos viejos (sin él) siguen valiendo", () => {
    expect(reciboCompartidoSchema.parse({ ...base, telefonoClinica: "722 111 2222" }).telefonoClinica).toBe("722 111 2222");
    expect(reciboCompartidoSchema.parse(base).telefonoClinica).toBe("");
  });
});
