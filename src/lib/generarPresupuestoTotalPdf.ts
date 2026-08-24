import jsPDF from "jspdf";
import { cargarImagen, type ImagenCargada } from "./imagenesPdf";
import type { PerfilDoctor, SavedBudget } from "./patientData";

export type DatosPresupuestoTotalPdf = {
  presupuestos: SavedBudget[];
  fechaLarga: string;
  pacienteNombre: string;
  pacienteCorreo: string;
  pacienteTelefono: string;
  perfilDoctor: PerfilDoctor;
};

function formatCurrency(valor: number): string {
  return `$${valor.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Genera el PDF consolidado de varios folios de presupuesto de un mismo
 * paciente ("Plan de Tratamiento Completo") — un bloque por folio con su
 * subtotal, y al final el total general de todos juntos. Espejo de
 * `PresupuestoTotalImpreso.tsx` pero para impresión/envío por WhatsApp. */
export async function generarPresupuestoTotalPdf(datos: DatosPresupuestoTotalPdf): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const marginBottom = 22;

  const xTotal = pageWidth - marginX;
  const xNombre = marginX;
  const anchoNombre = xTotal - xNombre - 26;

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
  doc.setFontSize(15);
  doc.text("PLAN DE TRATAMIENTO COMPLETO", pageWidth / 2, y + 8, { align: "center" });

  y += 24;
  if (datos.perfilDoctor.direccionClinica) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const lineasDir = doc.splitTextToSize(datos.perfilDoctor.direccionClinica, anchoNombre);
    doc.text(lineasDir, xNombre, y);
    y += lineasDir.length * 4;
  }

  y += 5;
  doc.setFontSize(10);
  doc.text(`Paciente: ${datos.pacienteNombre}`, xNombre, y);
  doc.text(datos.fechaLarga, xTotal, y, { align: "right" });
  y += 5;
  doc.text(`Correo electrónico: ${datos.pacienteCorreo || "Sin registro"}`, xNombre, y);
  y += 5;
  doc.text(`Teléfono: ${datos.pacienteTelefono || "Sin registro"}`, xNombre, y);
  y += 8;

  const asegurarEspacio = (alturaNecesaria: number) => {
    if (y + alturaNecesaria > pageHeight - marginBottom) {
      doc.addPage();
      y = 20;
    }
  };

  datos.presupuestos.forEach((p) => {
    asegurarEspacio(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(`Folio #${p.folio} — ${p.fecha}`, xNombre, y);
    y += 1.5;
    doc.setLineWidth(0.3);
    doc.line(xNombre, y, xTotal, y);
    y += 5;

    if (p.diagnostico) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const lineasDiag = doc.splitTextToSize(p.diagnostico, anchoNombre);
      asegurarEspacio(lineasDiag.length * 4 + 3);
      doc.text(lineasDiag, xNombre, y);
      y += lineasDiag.length * 4 + 2;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Tratamiento / Pieza dental", xNombre, y);
    doc.text("Total", xTotal, y, { align: "right" });
    y += 2;
    doc.setLineWidth(0.15);
    doc.line(xNombre, y, xTotal, y);
    y += 5;
    doc.setFont("helvetica", "normal");

    p.items.forEach((item) => {
      const dientesTexto =
        item.teeth.length > 0 ? `Piezas: ${[...item.teeth].sort((a, b) => a - b).join(", ")}` : "";
      const notaTexto = item.note ? ` (${item.note})` : "";
      const textoCompleto = `${item.procedure}${dientesTexto ? ` — ${dientesTexto}` : ""}${notaTexto}`;

      doc.setFontSize(9.5);
      const nombreLineas = doc.splitTextToSize(textoCompleto, anchoNombre);
      const alturaLinea = nombreLineas.length * 4.5 + 2;
      asegurarEspacio(alturaLinea);

      doc.text(nombreLineas, xNombre, y);
      doc.text(formatCurrency(item.price), xTotal, y, { align: "right" });
      y += alturaLinea;
    });

    asegurarEspacio(8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(`Subtotal folio #${p.folio}: ${formatCurrency(p.total)}`, xTotal, y, { align: "right" });
    y += 9;
  });

  const granTotal = datos.presupuestos.reduce((sum, p) => sum + p.total, 0);
  asegurarEspacio(14);
  doc.setLineWidth(0.4);
  doc.line(xNombre, y, xTotal, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("TOTAL GENERAL", xNombre, y);
  doc.text(formatCurrency(granTotal), xTotal, y, { align: "right" });

  if (datos.perfilDoctor.direccionClinica) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(datos.perfilDoctor.direccionClinica, pageWidth / 2, pageHeight - 12, { align: "center" });
  }

  return doc.output("blob");
}
