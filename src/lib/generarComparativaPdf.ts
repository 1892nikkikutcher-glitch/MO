import jsPDF from "jspdf";
import { cargarImagen, type ImagenCargada } from "./imagenesPdf";
import { etiquetaTratamiento, type ComparativaRehabilitacion } from "./comparativaRehabilitacion";
import type { PerfilDoctor, SavedBudget } from "./patientData";

export type DatosComparativaPdf = {
  comparativa: ComparativaRehabilitacion;
  presupuestos: SavedBudget[];
  fechaLarga: string;
  pacienteNombre: string;
  perfilDoctor: PerfilDoctor;
};

const COLORES: [number, number, number][] = [
  [79, 138, 117],
  [189, 138, 61],
  [122, 75, 140],
  [63, 111, 168],
];

const EJES = ["Economía", "Función", "Estética", "Conservación biológica"] as const;

function formatCurrency(valor: number): string {
  return `$${valor.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Genera el PDF de una Comparativa de Rehabilitación para enviar por
 * WhatsApp — mismo patrón que generarPresupuestoPdf.ts. Compara con barras
 * horizontales en vez de la gráfica de radar que se usa en pantalla e
 * impresión: jsPDF no dibuja SVG, y replicar el radar a mano con líneas
 * vectoriales es innecesariamente frágil — las barras comunican la misma
 * comparación con los rectángulos que jsPDF ya soporta de forma nativa. */
export async function generarComparativaPdf(datos: DatosComparativaPdf): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const marginBottom = 20;
  const xIzq = marginX;
  const xDer = pageWidth - marginX;

  const [logoEscuela, logoClinica] = await Promise.all([
    cargarImagen(datos.perfilDoctor.logoEscuelaUrl),
    cargarImagen(datos.perfilDoctor.logoClinicaUrl),
  ]);
  const dibujarLogo = (logo: ImagenCargada | null, x: number, yPos: number, ladoMax: number) => {
    if (!logo) return;
    const escala = ladoMax / Math.max(logo.ancho, logo.alto);
    try {
      doc.addImage(logo.dataUri, logo.formato, x, yPos, logo.ancho * escala, logo.alto * escala);
    } catch {
      // Formato de imagen no soportado por jsPDF — se omite el logo, no se rompe el PDF.
    }
  };

  let y = 16;
  dibujarLogo(logoEscuela, xIzq, y, 18);
  dibujarLogo(logoClinica, xDer - 18, y, 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(datos.comparativa.titulo.toUpperCase(), pageWidth / 2, y + 8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Comparativa de Rehabilitación", pageWidth / 2, y + 14, { align: "center" });

  y += 26;
  doc.setFontSize(10);
  doc.text(`Paciente: ${datos.pacienteNombre}`, xIzq, y);
  doc.text(datos.fechaLarga, xDer, y, { align: "right" });
  y += 10;

  const opcionesConPresupuesto = datos.comparativa.opciones
    .map((op) => {
      const presupuesto = datos.presupuestos.find((p) => p.id === op.presupuestoId);
      return presupuesto ? { op, presupuesto } : null;
    })
    .filter((x): x is { op: (typeof datos.comparativa.opciones)[number]; presupuesto: SavedBudget } => Boolean(x));

  const anchoBarra = xDer - xIzq - 40;
  const alturaBarra = 3.2;

  const dibujarBarra = (etiqueta: string, nivel: number, color: [number, number, number]) => {
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    doc.text(etiqueta, xIzq, y + 2.4);
    doc.setFillColor(230, 230, 230);
    doc.rect(xIzq + 38, y, anchoBarra, alturaBarra, "F");
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(xIzq + 38, y, (anchoBarra * nivel) / 5, alturaBarra, "F");
    doc.setTextColor(0, 0, 0);
    y += alturaBarra + 3;
  };

  const asegurarEspacio = (alturaNecesaria: number) => {
    if (y + alturaNecesaria > pageHeight - marginBottom) {
      doc.addPage();
      y = 20;
    }
  };

  opcionesConPresupuesto.forEach(({ op, presupuesto }, i) => {
    asegurarEspacio(50);
    const color = COLORES[i % COLORES.length];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(xIzq, y - 3.5, 3, 4.5, "F");
    doc.text(etiquetaTratamiento(presupuesto), xIzq + 6, y);
    doc.text(formatCurrency(presupuesto.total), xDer, y, { align: "right" });
    y += 6;

    doc.setFont("helvetica", "normal");
    dibujarBarra("Economía", 3, color);
    dibujarBarra(EJES[1], op.funcion, color);
    dibujarBarra(EJES[2], op.estetica, color);
    dibujarBarra(EJES[3], op.conservacionBiologica, color);
    y += 2;

    if (op.ventajas) {
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("Ventajas:", xIzq, y);
      doc.setFont("helvetica", "normal");
      const lineas = doc.splitTextToSize(op.ventajas, xDer - xIzq - 20);
      doc.text(lineas, xIzq + 20, y);
      y += lineas.length * 4 + 2;
    }
    if (op.desventajas) {
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("Desventajas:", xIzq, y);
      doc.setFont("helvetica", "normal");
      const lineas = doc.splitTextToSize(op.desventajas, xDer - xIzq - 24);
      doc.text(lineas, xIzq + 24, y);
      y += lineas.length * 4 + 2;
    }

    y += 6;
    doc.setDrawColor(220, 220, 220);
    doc.line(xIzq, y - 3, xDer, y - 3);
  });

  if (datos.perfilDoctor.direccionClinica) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(datos.perfilDoctor.direccionClinica, pageWidth / 2, pageHeight - 12, { align: "center" });
  }

  return doc.output("blob");
}
