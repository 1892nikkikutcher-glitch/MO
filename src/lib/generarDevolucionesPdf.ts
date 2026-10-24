import { ConstructorPdf, dineroPdf, nombreArchivoPdf } from "./pdfDocumento";
import type { EventoDevolucionLog, TipoEventoDevolucion } from "./devolucionesLog";

export type DatosDevolucionesPdf = {
  eventos: EventoDevolucionLog[];
  /** Nombre de quien registró cada movimiento, por uid; si no se conoce, se deja el guion. */
  nombreDeUid: (uid: string) => string;
  clinicaNombre: string;
  direccion?: string;
  logoUrl?: string;
  /** Fecha del reporte (por defecto, ahora). */
  fecha?: Date;
};

export const etiquetaEventoDevolucion: Record<TipoEventoDevolucion, string> = {
  devolucion_completada: "Devolución completada",
  devolucion_cancelada: "Borrador cancelado",
  devolucion_corregida: "Corrección registrada",
  firma_recepcion_agregada: "Firma de recepción agregada",
  comprobante_generado: "Comprobante generado",
  devolucion_creada: "Devolución creada",
};

const fechaHora = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

/** Devoluciones de pago en PDF: la bitácora de auditoría completa (cada movimiento con quién y por qué) y el total devuelto. */
export async function generarDevolucionesPdf(datos: DatosDevolucionesPdf): Promise<{ blob: Blob; nombre: string }> {
  const fecha = datos.fecha ?? new Date();
  const ordenados = [...datos.eventos].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  const completadas = ordenados.filter((e) => e.tipo === "devolucion_completada");
  const totalDevuelto = completadas.reduce((a, e) => a + (e.monto ?? 0), 0);

  const pdf = new ConstructorPdf({
    titulo: "Devoluciones de pago",
    subtitulo: `Bitácora al ${fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}`,
    clinicaNombre: datos.clinicaNombre,
    direccion: datos.direccion,
    logoUrl: datos.logoUrl,
    pieDePagina: "Devoluciones de pago · Documento confidencial",
  });
  await pdf.encabezado();

  pdf.pares([
    ["Devoluciones completadas", String(completadas.length)],
    ["Total devuelto (histórico)", dineroPdf(-totalDevuelto)],
    ["Movimientos en la bitácora", String(ordenados.length)],
  ]);

  pdf.seccion("Bitácora de movimientos");
  pdf.tabla(
    [
      { titulo: "Fecha", ancho: 1.5 },
      { titulo: "Paciente", ancho: 2.2 },
      { titulo: "Evento", ancho: 2 },
      { titulo: "Monto", ancho: 1.2, alinear: "derecha" },
      { titulo: "Motivo", ancho: 2.4 },
      { titulo: "Registró", ancho: 1.6 },
    ],
    [
      ...ordenados.map((e) => [
        fechaHora(e.creadoEn),
        e.patientName || "—",
        etiquetaEventoDevolucion[e.tipo] ?? e.tipo,
        e.monto ? dineroPdf(-e.monto) : "—",
        e.motivo || "—",
        datos.nombreDeUid(e.uid) || "—",
      ]),
      ...(completadas.length > 0 ? [{ celdas: ["Total devuelto", "", "", dineroPdf(-totalDevuelto), "", ""], negrita: true, relleno: true }] : []),
    ],
    { vacio: "No se ha registrado ninguna devolución." }
  );

  return { blob: pdf.finalizar(), nombre: nombreArchivoPdf("Devoluciones", fecha.toISOString().slice(0, 10), datos.clinicaNombre) };
}
