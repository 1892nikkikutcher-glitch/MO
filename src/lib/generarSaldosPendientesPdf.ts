import { ConstructorPdf, dineroPdf, nombreArchivoPdf } from "./pdfDocumento";
import type { SaldoPendienteEntry } from "./saldosPendientes";

export type DatosSaldosPendientesPdf = {
  saldos: SaldoPendienteEntry[];
  /** Teléfono por id de paciente, para poder llamar a quien debe. */
  telefonos: Record<string, string>;
  clinicaNombre: string;
  direccion?: string;
  logoUrl?: string;
  /** Si los saldos son el último resumen guardado y no el recálculo con los expedientes reales. */
  provisional?: boolean;
  /** Fecha del cálculo (por defecto, ahora). */
  fecha?: Date;
};

/** Reporte de saldos pendientes en PDF: quién debe, cuánto se presupuestó, cuánto ha pagado y cuánto falta, de mayor a menor deuda. */
export async function generarSaldosPendientesPdf(datos: DatosSaldosPendientesPdf): Promise<{ blob: Blob; nombre: string }> {
  const fecha = datos.fecha ?? new Date();
  const fechaTexto = fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
  const filas = datos.saldos
    .map((s) => ({ ...s, saldo: Math.round((s.totalPresupuestado - s.totalPagado) * 100) / 100 }))
    .filter((s) => s.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo);

  const totalPresupuestado = filas.reduce((a, s) => a + s.totalPresupuestado, 0);
  const totalPagado = filas.reduce((a, s) => a + s.totalPagado, 0);
  const totalSaldo = filas.reduce((a, s) => a + s.saldo, 0);

  const pdf = new ConstructorPdf({
    titulo: "Saldos pendientes",
    subtitulo: `Al ${fechaTexto}`,
    clinicaNombre: datos.clinicaNombre,
    direccion: datos.direccion,
    logoUrl: datos.logoUrl,
    pieDePagina: "Saldos pendientes · Documento confidencial",
  });
  await pdf.encabezado();

  pdf.pares([
    ["Pacientes con saldo", String(filas.length)],
    ["Total por cobrar", dineroPdf(totalSaldo)],
    ["Presupuestado", dineroPdf(totalPresupuestado)],
    ["Pagado", dineroPdf(totalPagado)],
  ]);
  if (datos.provisional) {
    pdf.parrafo("Cifras provisionales: son el último resumen guardado, no el recálculo con los expedientes. Vuelve a calcular el reporte y descarga de nuevo para tener las cifras reales.", { gris: true, tamano: 8.5 });
  }

  pdf.seccion("Detalle por paciente");
  pdf.tabla(
    [
      { titulo: "Paciente", ancho: 3.2 },
      { titulo: "Teléfono", ancho: 1.6 },
      { titulo: "Presupuestado", ancho: 1.5, alinear: "derecha" },
      { titulo: "Pagado", ancho: 1.4, alinear: "derecha" },
      { titulo: "Saldo", ancho: 1.5, alinear: "derecha" },
    ],
    [
      ...filas.map((s) => [s.patientName, datos.telefonos[s.patientId] ?? "", dineroPdf(s.totalPresupuestado), dineroPdf(s.totalPagado), dineroPdf(s.saldo)]),
      ...(filas.length > 0
        ? [{ celdas: ["Total", "", dineroPdf(totalPresupuestado), dineroPdf(totalPagado), dineroPdf(totalSaldo)], negrita: true, relleno: true }]
        : []),
    ],
    { vacio: "Ningún paciente tiene saldo pendiente." }
  );

  return { blob: pdf.finalizar(), nombre: nombreArchivoPdf("Saldos pendientes", fecha.toISOString().slice(0, 10), datos.clinicaNombre) };
}
