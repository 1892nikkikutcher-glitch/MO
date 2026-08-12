import jsPDF from "jspdf";
import { cargarImagen, type ImagenCargada } from "./imagenesPdf";
import type { LineItem, PerfilDoctor } from "./patientData";

export type DatosPresupuestoPdf = {
  folio: string;
  fechaLarga: string;
  medico: string;
  pacienteNombre: string;
  pacienteCorreo: string;
  pacienteTelefono: string;
  diagnostico: string;
  items: LineItem[];
  total: number;
  perfilDoctor: PerfilDoctor;
};

function formatCurrency(valor: number): string {
  return `$${valor.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Genera el PDF de un presupuesto ("Plan de Tratamiento") con tabla de
 * tratamientos, precio unitario, cantidad, descuento y total por línea —
 * multi-página si la lista de procedimientos no cabe en una sola hoja. */
export async function generarPresupuestoPdf(datos: DatosPresupuestoPdf): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const marginBottom = 22;

  const xTotal = pageWidth - marginX;
  const xDesc = xTotal - 22;
  const xSubtotal = xDesc - 24;
  const xCant = xSubtotal - 16;
  const xUnitario = xCant - 22;
  const xNombre = marginX;
  const anchoNombre = xUnitario - xNombre - 4;

  const [logoEscuela, logoClinica] = await Promise.all([
    cargarImagen(datos.perfilDoctor.logoEscuelaUrl),
    cargarImagen(datos.perfilDoctor.logoClinicaUrl),
  ]);

  const dibujarLogo = (logo: ImagenCargada | null, x: number, yPos: number, ladoMax: number) => {
    if (!logo) return;
    const escala = ladoMax / Math.max(logo.ancho, logo.alto);
    const w = logo.ancho * escala;
    const h = logo.alto * escala;
    try {
      doc.addImage(logo.dataUri, logo.formato, x, yPos, w, h);
    } catch {
      // Formato de imagen no soportado por jsPDF — se omite el logo, no se rompe el PDF.
    }
  };

  let y = 16;
  dibujarLogo(logoEscuela, marginX, y, 18);
  dibujarLogo(logoClinica, xTotal - 18, y, 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PLAN DE TRATAMIENTO", pageWidth / 2, y + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Folio: ${datos.folio}`, xTotal, y + 14, { align: "right" });

  y += 24;
  if (datos.perfilDoctor.direccionClinica) {
    doc.setFontSize(8.5);
    const lineasDir = doc.splitTextToSize(datos.perfilDoctor.direccionClinica, anchoNombre);
    doc.text(lineasDir, xNombre, y);
    y += lineasDir.length * 4;
  }

  y += 5;
  doc.setFontSize(10);
  doc.text(`Paciente: ${datos.pacienteNombre}`, xNombre, y);
  doc.text(datos.medico || datos.perfilDoctor.nombre, xTotal, y, { align: "right" });
  y += 5;
  if (datos.pacienteCorreo) doc.text(`Correo electrónico: ${datos.pacienteCorreo}`, xNombre, y);
  doc.text(datos.fechaLarga, xTotal, y, { align: "right" });
  y += 5;
  if (datos.pacienteTelefono) {
    doc.text(`Teléfono: ${datos.pacienteTelefono}`, xNombre, y);
    y += 5;
  }

  if (datos.diagnostico) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("Diagnóstico y tratamiento:", xNombre, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    const lineasDiag = doc.splitTextToSize(datos.diagnostico, xTotal - xNombre);
    doc.text(lineasDiag, xNombre, y);
    y += lineasDiag.length * 4.5;
  }

  y += 6;

  const dibujarEncabezadoTabla = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Tratamiento / Pieza dental", xNombre, y);
    doc.text("P. Unitario", xUnitario, y, { align: "right" });
    doc.text("Cant", xCant, y, { align: "right" });
    doc.text("Subtotal", xSubtotal, y, { align: "right" });
    doc.text("Desc", xDesc, y, { align: "right" });
    doc.text("Total", xTotal, y, { align: "right" });
    y += 2;
    doc.setLineWidth(0.3);
    doc.line(xNombre, y, xTotal, y);
    y += 5;
    doc.setFont("helvetica", "normal");
  };

  dibujarEncabezadoTabla();

  const asegurarEspacio = (alturaNecesaria: number) => {
    if (y + alturaNecesaria > pageHeight - marginBottom) {
      doc.addPage();
      y = 20;
      dibujarEncabezadoTabla();
    }
  };

  datos.items.forEach((item) => {
    const cantidad = item.cantidad ?? 1;
    const unitario = item.precioUnitario ?? item.price;
    const descuento = item.descuentoPct ?? 0;
    const dientesTexto =
      item.teeth.length > 0 ? `Piezas: ${[...item.teeth].sort((a, b) => a - b).join(", ")}` : "";

    doc.setFontSize(9.5);
    const nombreLineas = doc.splitTextToSize(item.procedure, anchoNombre);
    const alturaLinea = nombreLineas.length * 4.5 + (dientesTexto ? 4 : 0) + 3;
    asegurarEspacio(alturaLinea);

    doc.text(nombreLineas, xNombre, y);
    doc.text(formatCurrency(unitario), xUnitario, y, { align: "right" });
    doc.text(String(cantidad), xCant, y, { align: "right" });
    doc.text(formatCurrency(unitario * cantidad), xSubtotal, y, { align: "right" });
    doc.text(descuento ? `${descuento}%` : "—", xDesc, y, { align: "right" });
    doc.text(formatCurrency(item.price), xTotal, y, { align: "right" });

    let yLinea = y + nombreLineas.length * 4.5;
    if (dientesTexto) {
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(dientesTexto, xNombre, yLinea);
      doc.setTextColor(0, 0, 0);
      yLinea += 4;
    }
    y = yLinea + 3;
  });

  asegurarEspacio(14);
  doc.setLineWidth(0.3);
  doc.line(xNombre, y, xTotal, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL PRESUPUESTO", xDesc, y, { align: "right" });
  doc.text(formatCurrency(datos.total), xTotal, y, { align: "right" });

  if (datos.perfilDoctor.direccionClinica) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(datos.perfilDoctor.direccionClinica, pageWidth / 2, pageHeight - 12, { align: "center" });
  }

  return doc.output("blob");
}
