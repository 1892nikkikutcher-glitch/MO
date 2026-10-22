import { ConstructorPdf, dineroPdf, fechaPdf, nombreArchivoPdf } from "./pdfDocumento";
import type { PagoEliminado } from "./pagosEliminados";
import type { PagoRealizado } from "./pagosRealizados";

export type DatosPagosPdf = {
  /** "Octubre 2026" o "20 - 26 de oct. de 2026": el periodo que se está viendo. */
  periodo: string;
  desdeISO: string;
  hastaISO: string;
  realizados: PagoRealizado[];
  eliminados: PagoEliminado[];
  clinicaNombre: string;
  direccion?: string;
  logoUrl?: string;
};

const conceptos = (lineas: { label: string }[]) => (lineas.length > 0 ? lineas.map((l) => l.label).join(", ") : "—");

/** Pagos del periodo en PDF: los pagos realizados (con su total) y los eliminados con su motivo, para auditoría. */
export async function generarPagosPdf(datos: DatosPagosPdf): Promise<{ blob: Blob; nombre: string }> {
  const totalRealizados = datos.realizados.reduce((a, r) => a + r.pago.total, 0);
  const totalEliminados = datos.eliminados.reduce((a, r) => a + r.pago.total, 0);
  const pdf = new ConstructorPdf({
    titulo: "Pagos",
    subtitulo: datos.periodo,
    clinicaNombre: datos.clinicaNombre,
    direccion: datos.direccion,
    logoUrl: datos.logoUrl,
    pieDePagina: `Pagos · ${datos.periodo} · Documento confidencial`,
  });
  await pdf.encabezado();

  pdf.pares([
    ["Periodo", `${fechaPdf(datos.desdeISO)} al ${fechaPdf(datos.hastaISO)}`],
    ["Pagos realizados", `${datos.realizados.length} por ${dineroPdf(totalRealizados)}`],
    ["Pagos eliminados", `${datos.eliminados.length} por ${dineroPdf(totalEliminados)}`],
  ]);

  pdf.seccion("Pagos realizados");
  pdf.tabla(
    [
      { titulo: "Fecha", ancho: 1.1 },
      { titulo: "Paciente", ancho: 2.4 },
      { titulo: "Conceptos", ancho: 3 },
      { titulo: "Médico", ancho: 1.8 },
      { titulo: "Forma de pago", ancho: 1.5 },
      { titulo: "Monto", ancho: 1.3, alinear: "derecha" },
    ],
    [
      ...datos.realizados.map((r) => [r.pago.fecha, r.patientName, conceptos(r.pago.lineas), r.pago.medico, r.pago.formaPago, dineroPdf(r.pago.total)]),
      ...(datos.realizados.length > 0 ? [{ celdas: ["Total del periodo", "", "", "", "", dineroPdf(totalRealizados)], negrita: true, relleno: true }] : []),
    ],
    { vacio: "No hay pagos registrados en este periodo." }
  );

  pdf.seccion("Pagos eliminados");
  pdf.tabla(
    [
      { titulo: "Eliminado", ancho: 1.2 },
      { titulo: "Paciente", ancho: 2.2 },
      { titulo: "Fecha del pago", ancho: 1.2 },
      { titulo: "Conceptos", ancho: 2.4 },
      { titulo: "Monto", ancho: 1.2, alinear: "derecha" },
      { titulo: "Motivo", ancho: 2.4 },
      { titulo: "Por", ancho: 2 },
    ],
    [
      ...datos.eliminados.map((r) => [fechaPdf(r.eliminadoEn.slice(0, 10)), r.patientName, r.pago.fecha, conceptos(r.pago.lineas), dineroPdf(r.pago.total), r.motivo, r.eliminadoPor]),
      ...(datos.eliminados.length > 0 ? [{ celdas: ["Total", "", "", "", dineroPdf(totalEliminados), "", ""], negrita: true, relleno: true }] : []),
    ],
    { vacio: "No se ha eliminado ningún pago en este periodo." }
  );

  return { blob: pdf.finalizar(), nombre: nombreArchivoPdf("Pagos", datos.desdeISO, datos.hastaISO, datos.clinicaNombre) };
}
