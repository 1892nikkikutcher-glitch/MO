import { ConstructorPdf, nombreArchivoPdf } from "./pdfDocumento";
import { duracionLegible, fechaLargaConDia, type CierreDelDia } from "./cierreDelDia";

export type DatosCierreDelDiaPdf = {
  cierre: CierreDelDia;
  clinicaNombre: string;
  direccion?: string;
  logoUrl?: string;
};

/** Cierre del día en PDF: las citas del siguiente día de atención por sede y médico, cuáles están confirmadas,
 * los espacios libres y lo que falta resolver (material, autorizaciones, datos). Mismos datos que ve la pantalla. */
export async function generarCierreDelDiaPdf(datos: DatosCierreDelDiaPdf): Promise<{ blob: Blob; nombre: string }> {
  const { cierre } = datos;
  const pdf = new ConstructorPdf({
    titulo: "Cierre del día",
    subtitulo: `Citas del ${fechaLargaConDia(cierre)}`,
    clinicaNombre: datos.clinicaNombre,
    direccion: datos.direccion,
    logoUrl: datos.logoUrl,
    pieDePagina: `Cierre del día · ${fechaLargaConDia(cierre)} · Documento confidencial`,
  });
  await pdf.encabezado();

  pdf.pares([
    ["Citas", String(cierre.citas.length)],
    ["Confirmadas", cierre.citas.length > 0 ? `${cierre.confirmadas} de ${cierre.citas.length}` : "0"],
    ["Por confirmar", String(cierre.porConfirmar)],
    ["Espacios disponibles", cierre.espacios.length > 0 ? `${duracionLegible(cierre.minutosLibres)} en ${cierre.espacios.length} ${cierre.espacios.length === 1 ? "hueco" : "huecos"}` : "Sin huecos"],
  ]);

  // ----- Citas por sede y médico -----
  pdf.seccion("Citas");
  if (cierre.citas.length === 0) {
    pdf.parrafo("No hay citas agendadas para este día.", { gris: true });
  } else {
    const grupos = new Map<string, typeof cierre.citas>();
    for (const c of cierre.citas) {
      const clave = `${c.sedeNombre || "Sin sede"}|${c.medicoNombre || "Sin médico"}`;
      grupos.set(clave, [...(grupos.get(clave) ?? []), c]);
    }
    for (const [clave, lista] of [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const [sede, medico] = clave.split("|");
      pdf.subseccion(`${sede} - ${medico} (${lista.length} ${lista.length === 1 ? "cita" : "citas"})`);
      pdf.tabla(
        [
          { titulo: "Horario", ancho: 1.5 },
          { titulo: "Paciente", ancho: 2.6 },
          { titulo: "Motivo", ancho: 2.6 },
          { titulo: "Teléfono", ancho: 1.5 },
          { titulo: "Estatus", ancho: 1.4 },
        ],
        lista.map((c) => [
          `${c.horaInicio}-${c.horaFin}`,
          c.paciente,
          [c.motivo, `${c.duracionMin} min`].filter(Boolean).join(" · "),
          c.telefono || "Sin teléfono",
          c.confirmada ? c.estatus : "Por confirmar",
        ])
      );
    }
  }

  // ----- Espacios -----
  pdf.seccion("Espacios disponibles");
  pdf.tabla(
    [
      { titulo: "Horario", ancho: 1.5 },
      { titulo: "Sede y médico", ancho: 4 },
      { titulo: "Tiempo libre", ancho: 1.4, alinear: "derecha" },
    ],
    cierre.espacios.map((e) => [`${e.inicio}-${e.fin}`, [e.sedeNombre, e.medicoNombre].filter(Boolean).join(" · "), duracionLegible(e.minutos)]),
    { vacio: "Ningún bloque deja espacios libres este día (o los médicos no tienen bloques definidos)." }
  );

  // ----- Pendientes -----
  pdf.seccion("Material, autorizaciones y pendientes");
  pdf.tabla(
    [
      { titulo: "Paciente", ancho: 2 },
      { titulo: "Pendiente", ancho: 5 },
    ],
    cierre.pendientes.map((p) => [p.paciente, p.texto]),
    { vacio: cierre.citas.length > 0 ? "Nada pendiente por resolver para estas citas." : "Sin citas, sin pendientes." }
  );
  pdf.parrafo("Laboratorio y saldos salen de los resúmenes que MO lleva desde que se activaron: lo anterior puede no aparecer.", { gris: true, tamano: 8 });

  return { blob: pdf.finalizar(), nombre: nombreArchivoPdf("Cierre del dia", cierre.fecha, datos.clinicaNombre) };
}
