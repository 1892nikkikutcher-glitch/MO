import jsPDF from "jspdf";
import { cargarImagen, type ImagenCargada } from "./imagenesPdf";
import type { MedicamentoRecetado, PerfilDoctor } from "./patientData";

export type DatosRecetaPdf = {
  folio: string;
  fecha: string;
  hora: string;
  fechaLarga: string;
  medico: string;
  pacienteNombre: string;
  edadTexto: string;
  sexo: string;
  estatura: string;
  temperatura: string;
  peso: string;
  diagnostico: string;
  alergias: string;
  medicamentos: MedicamentoRecetado[];
  notas: string;
  perfilDoctor: PerfilDoctor;
};

/** Genera el PDF de una receta con el formato tipo COPRISEM usado en Recetas.tsx,
 * incluyendo el logo de la escuela y, si está configurado, el de la clínica. */
export async function generarRecetaPdf(datos: DatosRecetaPdf): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const yHeader = 16;

  const [logoEscuela, logoClinica, firma] = await Promise.all([
    cargarImagen(datos.perfilDoctor.logoEscuelaUrl),
    cargarImagen(datos.perfilDoctor.logoClinicaUrl),
    cargarImagen(datos.perfilDoctor.firmaDigitalUrl),
  ]);

  const dibujarLogo = (logo: ImagenCargada | null, x: number, ladoMax: number) => {
    if (!logo) return;
    const escala = ladoMax / Math.max(logo.ancho, logo.alto);
    const w = logo.ancho * escala;
    const h = logo.alto * escala;
    try {
      doc.addImage(logo.dataUri, logo.formato, x, yHeader, w, h);
    } catch {
      // Formato de imagen no soportado por jsPDF — se omite el logo, no se rompe el PDF.
    }
  };

  dibujarLogo(logoEscuela, marginX, 22);
  dibujarLogo(logoClinica, pageWidth - marginX - 22, 22);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(datos.perfilDoctor.nombre || datos.medico, pageWidth / 2, yHeader + 6, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let ySub = yHeader + 12;
  if (datos.perfilDoctor.cedulaProfesional) {
    doc.text(`Ced. Prof. ${datos.perfilDoctor.cedulaProfesional}`, pageWidth / 2, ySub, { align: "center" });
    ySub += 5;
  }
  if (datos.perfilDoctor.especialidad) {
    doc.text(datos.perfilDoctor.especialidad, pageWidth / 2, ySub, { align: "center" });
  }

  doc.setFontSize(9);
  doc.text(`Folio: ${datos.folio}`, pageWidth - marginX, yHeader + 28, { align: "right" });
  doc.text(datos.fechaLarga, pageWidth - marginX, yHeader + 33, { align: "right" });
  doc.setTextColor(110, 110, 110);
  doc.text(`${datos.hora} hrs`, pageWidth - marginX, yHeader + 38, { align: "right" });
  doc.setTextColor(0, 0, 0);

  let y = yHeader + 44;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 8;

  doc.setFontSize(10);
  const lineaPaciente = `Nombre del paciente: ${datos.pacienteNombre}   Edad: ${datos.edadTexto || "—"}   Sexo: ${
    datos.sexo || "—"
  }   Talla: ${datos.estatura || "—"}   Temperatura: ${datos.temperatura || "—"}   Peso: ${datos.peso || "—"}`;
  const lineasPaciente = doc.splitTextToSize(lineaPaciente, pageWidth - marginX * 2);
  doc.text(lineasPaciente, marginX, y);
  y += lineasPaciente.length * 5 + 2;

  if (datos.diagnostico) {
    const lineas = doc.splitTextToSize(`Diagnóstico: ${datos.diagnostico}`, pageWidth - marginX * 2);
    doc.text(lineas, marginX, y);
    y += lineas.length * 5 + 1;
  }
  if (datos.alergias) {
    const lineas = doc.splitTextToSize(`Alergias: ${datos.alergias}`, pageWidth - marginX * 2);
    doc.text(lineas, marginX, y);
    y += lineas.length * 5 + 1;
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Rx.", marginX, y);
  y += 7;
  doc.setFontSize(10);

  datos.medicamentos.forEach((m, i) => {
    doc.setFont("helvetica", "bold");
    const nombreLineas = doc.splitTextToSize(`${i + 1}-${m.nombre}`, pageWidth - marginX * 2);
    doc.text(nombreLineas, marginX, y);
    y += nombreLineas.length * 5;
    if (m.instrucciones) {
      doc.setFont("helvetica", "normal");
      const instruccionesLineas = doc.splitTextToSize(m.instrucciones, pageWidth - marginX * 2);
      doc.text(instruccionesLineas, marginX, y);
      y += instruccionesLineas.length * 5;
    }
    y += 3;
  });

  if (datos.notas) {
    y += 3;
    doc.setFont("helvetica", "normal");
    const notasLineas = doc.splitTextToSize(datos.notas, pageWidth - marginX * 2);
    doc.text(notasLineas, marginX, y);
    y += notasLineas.length * 5;
  }

  const yFooter = Math.max(y + 25, pageHeight - 50);
  doc.setFont("helvetica", "normal");
  if (datos.perfilDoctor.textoValidezReceta) {
    doc.setFontSize(10);
    doc.text(datos.perfilDoctor.textoValidezReceta, marginX, yFooter);
    doc.line(marginX, yFooter + 1, marginX + doc.getTextWidth(datos.perfilDoctor.textoValidezReceta), yFooter + 1);
  }
  const firmaBoxX = pageWidth - marginX - 50;
  const firmaBoxAncho = 50;
  if (firma) {
    const alturaMax = 12;
    const escala = Math.min(alturaMax / firma.alto, firmaBoxAncho / firma.ancho);
    const w = firma.ancho * escala;
    const h = firma.alto * escala;
    try {
      doc.addImage(firma.dataUri, firma.formato, firmaBoxX + (firmaBoxAncho - w) / 2, yFooter - h - 1, w, h);
    } catch {
      // Formato de imagen no soportado — la línea de firma queda en blanco.
    }
  }
  doc.line(firmaBoxX, yFooter, pageWidth - marginX, yFooter);
  doc.setFontSize(8);
  doc.text("Firma médico", pageWidth - marginX - 25, yFooter + 5, { align: "center" });

  if (datos.perfilDoctor.direccionClinica) {
    doc.setFontSize(8);
    const direccionLineas = doc.splitTextToSize(datos.perfilDoctor.direccionClinica, pageWidth - marginX * 2);
    doc.text(direccionLineas, pageWidth / 2, pageHeight - 14, { align: "center" });
  }

  return doc.output("blob");
}
