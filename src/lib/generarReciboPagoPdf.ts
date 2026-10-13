import jsPDF from "jspdf";
import { cargarImagen, type ImagenCargada } from "./imagenesPdf";
import type { Pago, PerfilDoctor } from "./patientData";

export type DatosReciboPagoPdf = {
  pago: Pago;
  pacienteNombre: string;
  clinicaNombre: string;
  /** Solo se usan el logo y la dirección de la clínica. */
  perfilDoctor: Pick<PerfilDoctor, "logoClinicaUrl" | "direccionClinica">;
  /** Texto libre al pie (ej. la próxima cita del paciente); puede venir con saltos de línea al inicio. */
  notaPie?: string;
};

function dinero(valor: number): string {
  return `$${valor.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Folio corto y estable del recibo: los últimos 8 caracteres del id del pago. */
export function folioReciboPago(pago: Pick<Pago, "id">): string {
  return pago.id.slice(-8).toUpperCase();
}

/** Recibo de pago en PDF — siempre regenerable a partir del pago guardado (igual que
 * presupuestos y recetas): nunca se sube a ningún lado. Carta, con los conceptos cobrados, el
 * total, la forma de pago y la firma del paciente si la dejó. Si hay muchos conceptos pasa a
 * otra hoja en vez de cortarse. */
export async function generarReciboPagoPdf(datos: DatosReciboPagoPdf): Promise<Blob> {
  const { pago } = datos;
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const marginBottom = 22;
  const xDerecha = pageWidth - marginX;

  const [logo, firma] = await Promise.all([cargarImagen(datos.perfilDoctor.logoClinicaUrl), pago.firma ? cargarImagen(pago.firma) : Promise.resolve(null)]);

  const dibujarImagen = (img: ImagenCargada | null, x: number, y: number, anchoMax: number, altoMax: number) => {
    if (!img) return 0;
    const escala = Math.min(anchoMax / img.ancho, altoMax / img.alto);
    const w = img.ancho * escala;
    const h = img.alto * escala;
    try {
      doc.addImage(img.dataUri, img.formato, x, y, w, h);
    } catch {
      return 0; // formato que jsPDF no soporta: el recibo sigue siendo válido sin la imagen
    }
    return h;
  };

  let y = 18;
  dibujarImagen(logo, marginX, y - 2, 22, 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("RECIBO DE PAGO", pageWidth / 2, y + 5, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (datos.clinicaNombre) doc.text(datos.clinicaNombre, pageWidth / 2, y + 11, { align: "center" });
  doc.setFontSize(9);
  doc.text(`Folio: ${folioReciboPago(pago)}`, xDerecha, y + 5, { align: "right" });
  y += 20;

  if (datos.perfilDoctor.direccionClinica) {
    doc.setFontSize(8.5);
    const lineas = doc.splitTextToSize(datos.perfilDoctor.direccionClinica, pageWidth - marginX * 2);
    doc.text(lineas, pageWidth / 2, y, { align: "center" });
    y += lineas.length * 4;
  }

  y += 4;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, xDerecha, y);
  y += 8;

  const datoFila = (etiqueta: string, valor: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(etiqueta, marginX, y);
    doc.setFont("helvetica", "normal");
    doc.text(valor || "—", marginX + 38, y);
    y += 6;
  };
  datoFila("Paciente:", datos.pacienteNombre);
  datoFila("Fecha:", pago.fecha);
  datoFila("Médico:", pago.medico);
  datoFila("Forma de pago:", pago.formaPago);

  y += 4;
  const xMonto = xDerecha;
  const anchoConcepto = xMonto - marginX - 34;
  const encabezadoTabla = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("Concepto", marginX, y);
    doc.text("Monto", xMonto, y, { align: "right" });
    y += 2.5;
    doc.setLineWidth(0.2);
    doc.line(marginX, y, xDerecha, y);
    y += 5.5;
  };
  encabezadoTabla();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const linea of pago.lineas) {
    const partes: string[] = doc.splitTextToSize(linea.label, anchoConcepto);
    const alto = partes.length * 4.8 + 2;
    if (y + alto > pageHeight - marginBottom - 30) {
      doc.addPage();
      y = 20;
      encabezadoTabla();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }
    doc.text(partes, marginX, y);
    doc.text(dinero(linea.monto), xMonto, y, { align: "right" });
    y += alto;
  }

  // Total, firma y notas necesitan lugar completo: si no caben, van en otra hoja.
  if (y + 52 > pageHeight - marginBottom) {
    doc.addPage();
    y = 20;
  }
  y += 1;
  doc.setLineWidth(0.4);
  doc.line(marginX, y, xDerecha, y);
  y += 7;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total pagado", marginX, y);
  doc.text(dinero(pago.total), xMonto, y, { align: "right" });
  y += 8;
  if (pago.facturar) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Requiere factura.", marginX, y);
    y += 6;
  }

  if (firma) {
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Firma del paciente:", marginX, y);
    y += 3;
    const h = dibujarImagen(firma, marginX, y, 60, 24);
    y += h + 4;
  }

  const nota = (datos.notaPie ?? "").trim();
  if (nota) {
    y += 3;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lineas = doc.splitTextToSize(nota, pageWidth - marginX * 2);
    doc.text(lineas, marginX, y);
  }

  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text("Gracias por su preferencia. Este recibo ampara únicamente los conceptos y montos aquí descritos.", pageWidth / 2, pageHeight - 12, {
    align: "center",
  });

  return doc.output("blob");
}
