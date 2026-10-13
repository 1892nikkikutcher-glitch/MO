import { describe, expect, it } from "vitest";
import { folioReciboPago, generarReciboPagoPdf } from "../generarReciboPagoPdf";
import type { Pago } from "../patientData";

const pago = (lineas: number): Pago => ({
  id: "pago-1700000000-abcdef12",
  fecha: "13/10/2026",
  medico: "Dra. Ana Mendoza",
  formaPago: "Efectivo",
  lineas: Array.from({ length: lineas }, (_, i) => ({ id: `l${i}`, tratamientoId: null, folio: null, label: `Concepto número ${i + 1} con un nombre bastante largo para probar el salto de línea`, monto: 100 })),
  total: lineas * 100,
  facturar: true,
  firma: null,
});

const base = { pacienteNombre: "Brenda Ivonne Cruz", clinicaNombre: "Consultorio de Prueba", perfilDoctor: { logoClinicaUrl: "", direccionClinica: "Calle 1, Toluca" } };

async function paginas(blob: Blob) {
  const texto = Buffer.from(await blob.arrayBuffer()).toString("latin1");
  return (texto.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

describe("generarReciboPagoPdf", () => {
  it("genera un PDF válido", async () => {
    const blob = await generarReciboPagoPdf({ ...base, pago: pago(2), notaPie: "\n\nSu próxima cita es el lunes." });
    expect(blob.type).toBe("application/pdf");
    expect(blob.size).toBeGreaterThan(1000);
    const cabecera = Buffer.from(await blob.arrayBuffer()).subarray(0, 5).toString("latin1");
    expect(cabecera).toBe("%PDF-");
  });

  it("con muchos conceptos pasa a otra hoja en vez de cortarse", async () => {
    expect(await paginas(await generarReciboPagoPdf({ ...base, pago: pago(2) }))).toBe(1);
    expect(await paginas(await generarReciboPagoPdf({ ...base, pago: pago(60) }))).toBeGreaterThan(1);
  });

  it("el folio son los últimos 8 caracteres del pago, en mayúsculas", () => {
    expect(folioReciboPago({ id: "pago-1700000000-abcdef12" })).toBe("ABCDEF12");
  });
});
