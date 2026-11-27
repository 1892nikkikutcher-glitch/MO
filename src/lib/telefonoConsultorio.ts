import type { Recurso } from "./patientData";

/** Un solo lugar decide qué teléfono lleva cada documento del consultorio, para que todos (recetas, presupuestos, recibos,
 * consentimientos, reportes…) se comporten igual y un documento nuevo solo tenga que llamar a estas funciones. */

type MedicoConTelefono = Pick<Recurso, "nombre" | "tipo" | "telefono">;

/** Teléfono del consultorio a imprimir en un documento. Si el documento es de un médico, el de SU consultorio
 * (Administración → Médicos y Recetas); si ese médico no lo capturó —o el documento no es de un médico en particular—, el
 * teléfono general del consultorio (Administración → Consultorio). Vacío si no hay ninguno. */
export function telefonoConsultorioDe(
  nombreMedico: string | null | undefined,
  recursos: MedicoConTelefono[],
  telefonoGeneral?: string | null
): string {
  const medico = nombreMedico ? recursos.find((r) => r.tipo === "medico" && r.nombre === nombreMedico) : undefined;
  return medico?.telefono?.trim() || telefonoGeneral?.trim() || "";
}

/** "Tel. 722 123 4567", o vacío si no hay teléfono. */
export function textoTelefono(telefono: string | null | undefined): string {
  const limpio = telefono?.trim();
  return limpio ? `Tel. ${limpio}` : "";
}

/** Dirección y teléfono en un solo texto de dos renglones, para los encabezados de PDF que reciben "la dirección" como texto. */
export function direccionConTelefono(direccion: string | null | undefined, telefono: string | null | undefined): string {
  return [direccion?.trim() ?? "", textoTelefono(telefono)].filter(Boolean).join("\n");
}

/** Renglones del bloque de contacto de un PDF (dirección ajustada al ancho y, debajo, el teléfono) listo para `doc.text`. */
export function lineasContactoConsultorio(
  doc: { splitTextToSize: (texto: string, ancho: number) => string[] },
  direccion: string | null | undefined,
  telefono: string | null | undefined,
  ancho: number
): string[] {
  const lineas: string[] = [];
  if (direccion?.trim()) lineas.push(...doc.splitTextToSize(direccion.trim(), ancho));
  const tel = textoTelefono(telefono);
  if (tel) lineas.push(tel);
  return lineas;
}

/** Interlineado, en mm, del pie de contacto en letra de 8 pt. */
export const INTERLINEADO_PIE_PDF = 3.6;

/** Y de la primera línea de un pie de `n` renglones para que el último quede a `distanciaBorde` mm del borde inferior. */
export function yPieContacto(alturaHoja: number, n: number, distanciaBorde = 10): number {
  return alturaHoja - distanciaBorde - Math.max(0, n - 1) * INTERLINEADO_PIE_PDF;
}
