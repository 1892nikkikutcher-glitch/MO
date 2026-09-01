import jsPDF from "jspdf";
import { cargarImagen } from "./imagenesPdf";
import { formatCurrency, metodoDevolucionLabel, motivoDevolucionLabel, type DevolucionPago, type Pago } from "./patientData";

export type DatosComprobanteDevolucionPdf = {
  devolucion: DevolucionPago;
  pagoOrigen: Pago;
  pacienteNombre: string;
  clinicaNombre: string;
  /** Nombre visible de quien registró la devolución (registradoPorUid ya
   * resuelto a un nombre legible por quien llama). */
  registradoPorNombre: string;
};

/** Comprobante de devolución — siempre regenerable a partir de los datos
 * en Firestore (igual que recetas/presupuestos/comparativas), nunca se
 * sube a Storage. La firma de recepción (si existe) documenta ÚNICAMENTE
 * que el dinero fue recibido — nunca renuncia de derechos ni liberación de
 * responsabilidad, eso requeriría revisión jurídica aparte. */
export async function generarComprobanteDevolucionPdf(datos: DatosComprobanteDevolucionPdf): Promise<Blob> {
  const { devolucion, pagoOrigen } = datos;
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 18;
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Comprobante de Devolución", pageWidth / 2, y, { align: "center" });
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(datos.clinicaNombre || "—", pageWidth / 2, y, { align: "center" });
  y += 12;

  doc.setFontSize(9);
  const fechaCompleta = devolucion.completadoEn ?? devolucion.creadoEn;
  doc.text(`Folio de devolución: ${devolucion.id.slice(-8)}`, marginX, y);
  doc.text(`Folio del pago original: ${pagoOrigen.id.slice(-8)}`, pageWidth - marginX, y, { align: "right" });
  y += 5;
  doc.text(`Fecha: ${new Date(fechaCompleta).toLocaleString("es-MX", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`, marginX, y);
  y += 5;
  doc.text(`Paciente: ${datos.pacienteNombre}`, marginX, y);
  y += 8;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 9;

  const fila = (etiqueta: string, valor: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(etiqueta, marginX, y);
    doc.setFont("helvetica", "normal");
    doc.text(valor, marginX + 55, y);
    y += 6.5;
  };

  fila("Monto original del pago:", formatCurrency(pagoOrigen.total));
  fila("Monto devuelto:", formatCurrency(devolucion.monto));
  fila("Tipo:", devolucion.tipo === "total" ? "Devolución total" : "Devolución parcial");
  fila("Método:", metodoDevolucionLabel[devolucion.metodo]);
  if (devolucion.recibidoPor) {
    fila("Recibe:", `${devolucion.recibidoPor.nombre}${devolucion.recibidoPor.relacion ? ` (${devolucion.recibidoPor.relacion})` : ""}`);
  }
  if (devolucion.referenciaTransferencia) fila("Referencia:", devolucion.referenciaTransferencia);
  fila("Motivo:", motivoDevolucionLabel[devolucion.motivo]);
  if (devolucion.detalleMotivo) fila("Detalle:", devolucion.detalleMotivo);
  fila("Registrado por:", datos.registradoPorNombre || "—");

  if (devolucion.itemsAfectados?.length) {
    y += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Conceptos devueltos:", marginX, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    devolucion.itemsAfectados.forEach((item) => {
      doc.text(`- ${item.label}: ${formatCurrency(item.montoDevuelto)}`, marginX + 3, y);
      y += 5;
    });
  }

  if (devolucion.firmaRecepcionUrl) {
    y += 4;
    const firma = await cargarImagen(devolucion.firmaRecepcionUrl);
    if (firma) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Firma de acuse de recepción del dinero:", marginX, y);
      y += 4;
      const w = 55;
      const h = Math.min(30, (firma.alto / firma.ancho) * w);
      try {
        doc.addImage(firma.dataUri, firma.formato, marginX, y, w, h);
      } catch {
        // Formato no soportado por jsPDF — se omite, el comprobante sigue siendo válido sin ella.
      }
      y += h + 6;
    }
  }

  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Este comprobante documenta la entrega/devolución de dinero. No constituye renuncia de derechos, deslinde ni liberación de responsabilidad.",
    marginX,
    Math.max(y + 4, 270),
    { maxWidth: pageWidth - marginX * 2 }
  );

  return doc.output("blob");
}
