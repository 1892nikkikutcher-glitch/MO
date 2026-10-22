import { ConstructorPdf, dineroPdf, fechaPdf, nombreArchivoPdf, porcentajePdf } from "./pdfDocumento";
import { FORMA_PAGO_CASHBACK } from "./cashback";

export type DatosCorteCajaPdf = {
  /** "Corte de caja" (por defecto) o "Corte diario": el mismo documento, con otro título y nombre de archivo. */
  titulo?: string;
  /** Día del corte (AAAA-MM-DD). */
  fecha: string;
  cobrosBrutos: number;
  devoluciones: number;
  /** Cobros del día por forma de pago. */
  formas: [string, number][];
  /** Devoluciones del día por método. */
  metodosDevolucion: [string, number][];
  /** Cobros por médico, con su % de comisión si lo tiene configurado. */
  medicos: { nombre: string; monto: number; porcentajeComision: number | null }[];
  /** Últimos días con cobros (más reciente primero). */
  ultimosDias: [string, number][];
  clinicaNombre: string;
  direccion?: string;
  logoUrl?: string;
};

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const dia = DIAS[new Date(a, m - 1, d).getDay()];
  return `${dia} ${d} de ${MESES[m - 1]} de ${a}`;
}

/** Corte de caja de un día en PDF: cobros, devoluciones, ingreso neto, desglose por forma de pago y por médico (con su comisión). */
export async function generarCorteCajaPdf(datos: DatosCorteCajaPdf): Promise<{ blob: Blob; nombre: string }> {
  const neto = Math.round((datos.cobrosBrutos - datos.devoluciones) * 100) / 100;
  const titulo = datos.titulo ?? "Corte de caja";
  const pdf = new ConstructorPdf({
    titulo,
    subtitulo: fechaLarga(datos.fecha),
    clinicaNombre: datos.clinicaNombre,
    direccion: datos.direccion,
    logoUrl: datos.logoUrl,
    pieDePagina: `${titulo} · ${fechaPdf(datos.fecha)} · Documento confidencial`,
  });
  await pdf.encabezado();

  pdf.pares([
    ["Cobros brutos", dineroPdf(datos.cobrosBrutos)],
    ["Devoluciones", datos.devoluciones > 0 ? dineroPdf(-datos.devoluciones) : dineroPdf(0)],
    ["Ingreso neto", dineroPdf(neto)],
  ]);

  // ----- Forma de pago -----
  pdf.seccion("Desglose por forma de pago");
  pdf.tabla(
    [
      { titulo: "Forma de pago", ancho: 3 },
      { titulo: "% del día", ancho: 1, alinear: "derecha" },
      { titulo: "Monto", ancho: 1.4, alinear: "derecha" },
    ],
    [
      ...datos.formas.map(([forma, monto]) => [forma, datos.cobrosBrutos > 0 ? porcentajePdf(monto / datos.cobrosBrutos) : "0%", dineroPdf(monto)]),
      ...(datos.formas.length > 0 ? [{ celdas: ["Total cobrado", "", dineroPdf(datos.formas.reduce((a, [, m]) => a + m, 0))], negrita: true, relleno: true }] : []),
    ],
    {
      vacio:
        datos.cobrosBrutos > 0
          ? "Este total incluye pagos registrados antes de activarse el desglose por forma de pago."
          : "No hay pagos registrados en esta fecha.",
    }
  );
  if (datos.formas.some(([forma]) => forma === FORMA_PAGO_CASHBACK)) {
    pdf.parrafo("Lo pagado con Saldo Sonríe cuenta como venta, pero no es dinero que entró a caja.", { gris: true, tamano: 8.5 });
  }

  // ----- Devoluciones -----
  if (datos.metodosDevolucion.length > 0) {
    pdf.seccion("Devoluciones por método");
    pdf.tabla(
      [
        { titulo: "Método", ancho: 3 },
        { titulo: "% de devoluciones", ancho: 1.4, alinear: "derecha" },
        { titulo: "Monto", ancho: 1.4, alinear: "derecha" },
      ],
      datos.metodosDevolucion.map(([metodo, monto]) => [metodo, datos.devoluciones > 0 ? porcentajePdf(monto / datos.devoluciones) : "0%", dineroPdf(-monto)])
    );
  }

  // ----- Médicos -----
  if (datos.medicos.length > 0) {
    pdf.seccion("Desglose por médico");
    pdf.tabla(
      [
        { titulo: "Médico", ancho: 3 },
        { titulo: "Cobrado", ancho: 1.4, alinear: "derecha" },
        { titulo: "Comisión", ancho: 1, alinear: "derecha" },
        { titulo: "A pagar", ancho: 1.4, alinear: "derecha" },
      ],
      datos.medicos.map((m) => [
        m.nombre,
        dineroPdf(m.monto),
        m.porcentajeComision != null ? `${m.porcentajeComision}%` : "Sin %",
        m.porcentajeComision != null ? dineroPdf((m.monto * m.porcentajeComision) / 100) : "—",
      ])
    );
    pdf.parrafo("El % es la comisión del médico (cuánto pagarle), no su parte del total del día. Se configura en Agenda > Recursos.", { gris: true, tamano: 8.5 });
  }

  // ----- Últimos días -----
  if (datos.ultimosDias.length > 0) {
    pdf.seccion("Últimos días con cobros");
    pdf.tabla(
      [
        { titulo: "Fecha", ancho: 2 },
        { titulo: "Cobrado", ancho: 1.4, alinear: "derecha" },
      ],
      [
        ...datos.ultimosDias.map(([iso, monto]) => [fechaPdf(iso), dineroPdf(monto)]),
        { celdas: ["Total", dineroPdf(datos.ultimosDias.reduce((a, [, m]) => a + m, 0))], negrita: true, relleno: true },
      ]
    );
  }

  return { blob: pdf.finalizar(), nombre: nombreArchivoPdf(titulo, datos.fecha, datos.clinicaNombre) };
}
