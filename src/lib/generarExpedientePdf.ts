import { ConstructorPdf, dineroPdf, fechaPdf, nombreArchivoPdf } from "./pdfDocumento";
import {
  calcularEdadDetallada,
  computeTratamientosPendientes,
  type CitaAgenda,
  type DevolucionPago,
  type Pago,
  type Patient,
  type SavedBudget,
} from "./patientData";
import {
  claveDetalleSiNo,
  condicionesSistemicasPositivas,
  type HistoriaClinicaTemplate,
  type RespuestasHistoriaClinica,
} from "./historiaClinica";
import { esNotaAdministrativa, esNotaV2, type NotaEvolucionAny } from "./notasEvolucion";

export type DatosExpedientePdf = {
  patient: Patient;
  clinicaNombre: string;
  direccion?: string;
  logoUrl?: string;
  historiaTemplate: HistoriaClinicaTemplate;
  historiaRespuestas: RespuestasHistoriaClinica;
  notas: NotaEvolucionAny[];
  citas: CitaAgenda[];
  presupuestos: SavedBudget[];
  pagos: Pago[];
  devoluciones: DevolucionPago[];
  /** Presupuestos, pagos y saldo solo salen si quien descarga puede ver finanzas. */
  incluirFinanzas: boolean;
};

const estadoNotaTexto: Record<string, string> = {
  borrador: "Borrador",
  lista_revision: "En revisión",
  firmada: "Firmada",
  con_aclaracion: "Firmada, con aclaración",
};

function edadTexto(birthDate: string): string {
  const e = calcularEdadDetallada(birthDate);
  if (!e) return "";
  return e.years > 0 ? `${e.years} años` : `${e.months} meses`;
}

/** Lo que queda escrito en una nota, sea del formato nuevo, del anterior (PSOAP) o administrativa. */
export function resumenDeNota(nota: NotaEvolucionAny): { fecha: string; medico: string; estado: string; texto: string } {
  if (esNotaAdministrativa(nota)) {
    const partes = [nota.motivo, nota.notaLibre].filter((t) => t && String(t).trim());
    return { fecha: nota.creadoEn.slice(0, 10), medico: "", estado: "Nota administrativa", texto: partes.join(". ") };
  }
  if (esNotaV2(nota)) {
    const ind = nota.indicaciones;
    const partes = [
      nota.narrativa?.texto?.trim(),
      ind?.pronostico ? `Pronóstico: ${ind.pronostico}` : "",
      ind?.tratamientoPendiente ? `Tratamiento pendiente: ${ind.tratamientoPendiente}` : "",
      ind?.proximoProcedimiento ? `Próximo procedimiento: ${ind.proximoProcedimiento}` : "",
      ...(nota.aclaraciones ?? []).map((a) => `Aclaración: ${(a as { texto?: string }).texto ?? ""}`),
    ].filter(Boolean);
    return { fecha: nota.creadoEn.slice(0, 10), medico: nota.encabezado.medico, estado: estadoNotaTexto[nota.estado] ?? nota.estado, texto: partes.join("\n") };
  }
  const partes = [
    nota.presentacion && `Presentación: ${nota.presentacion}`,
    nota.subjetivo && `S: ${nota.subjetivo}`,
    nota.objetivo && `O: ${nota.objetivo}`,
    nota.analisis && `A: ${nota.analisis}`,
    nota.pronostico && `Pronóstico: ${nota.pronostico}`,
  ].filter(Boolean);
  return { fecha: nota.fecha.slice(0, 10), medico: nota.medico, estado: "Nota", texto: partes.join("\n") };
}

/** Expediente completo del paciente en PDF: datos, antecedentes, notas de evolución, citas y (si se permite) presupuestos y pagos. */
export async function generarExpedientePdf(datos: DatosExpedientePdf): Promise<{ blob: Blob; nombre: string }> {
  const { patient } = datos;
  const pdf = new ConstructorPdf({
    titulo: "Expediente clínico",
    subtitulo: patient.name,
    clinicaNombre: datos.clinicaNombre,
    direccion: datos.direccion,
    logoUrl: datos.logoUrl,
    pieDePagina: `Expediente de ${patient.name} · Documento confidencial`,
  });
  await pdf.encabezado();

  pdf.seccion("Datos del paciente");
  pdf.pares([
    ["Nombre", patient.name],
    ["Fecha de nacimiento", patient.birthDate ? `${fechaPdf(patient.birthDate)} (${edadTexto(patient.birthDate)})` : ""],
    ["Sexo", patient.sexo],
    ["Teléfono", patient.phone],
    ["Teléfono fijo", patient.telefonoFijo],
    ["Correo", patient.email],
    ["Domicilio", [patient.direccion, patient.codigoPostal && `C.P. ${patient.codigoPostal}`].filter(Boolean).join(", ")],
    ["Estado civil", patient.estadoCivil],
    ["Ocupación", patient.ocupacion],
    ["Escolaridad", patient.escolaridad],
    ["Lugar de nacimiento", patient.lugarNacimiento],
    ["Padre, madre o tutor", patient.nombreTutor],
    ["Contacto de emergencia", [patient.contactoNombre, patient.contactoParentesco && `(${patient.contactoParentesco})`, patient.contactoTelefono].filter(Boolean).join(" ")],
    ["Alta en la clínica", patient.createdAt ? fechaPdf(patient.createdAt) : ""],
    ["Notas", patient.notas],
  ]);

  // ----- Historia clínica -----
  const alergias = datos.historiaRespuestas.alergias?.trim();
  const condiciones = condicionesSistemicasPositivas(datos.historiaTemplate, datos.historiaRespuestas);
  pdf.seccion("Antecedentes y alertas");
  pdf.pares([["Alergias", alergias || "Ninguna registrada"]], 1);
  if (condiciones.length > 0) {
    pdf.tabla(
      [
        { titulo: "Condición o antecedente", ancho: 2 },
        { titulo: "Detalle", ancho: 3 },
      ],
      condiciones.map((c) => [c.etiqueta, c.detalle])
    );
  } else {
    pdf.parrafo("Sin antecedentes patológicos positivos registrados.", { gris: true });
  }

  const respuestas = datos.historiaRespuestas.porPregunta;
  let hayHistoria = false;
  for (const seccion of datos.historiaTemplate.secciones) {
    const filas: [string, string][] = [];
    for (const pregunta of seccion.preguntas) {
      if (pregunta.tipo === "odontograma" || pregunta.tipo === "valoracionDientes" || pregunta.tipo === "listaPrioridad") continue;
      const valor = respuestas[pregunta.id];
      let texto = "";
      if (pregunta.tipo === "sino") {
        if (valor === "si") {
          const detalle = respuestas[claveDetalleSiNo(pregunta.id)];
          texto = typeof detalle === "string" && detalle.trim() ? `Sí — ${detalle.trim()}` : "Sí";
        } else if (valor === "no") texto = "No";
      } else if (Array.isArray(valor)) texto = (valor as unknown[]).join(", ");
      else if (typeof valor === "string") texto = valor.trim();
      if (texto) filas.push([pregunta.etiqueta, texto]);
    }
    if (filas.length === 0) continue;
    if (!hayHistoria) {
      pdf.seccion("Historia clínica");
      hayHistoria = true;
    }
    pdf.subseccion(seccion.titulo);
    pdf.pares(filas, 1);
  }
  if (datos.historiaRespuestas.actualizadoEn) {
    pdf.parrafo(`Historia clínica actualizada el ${fechaPdf(datos.historiaRespuestas.actualizadoEn)}.`, { gris: true, tamano: 8.5 });
  }

  // ----- Notas de evolución -----
  const notas = datos.notas
    .map(resumenDeNota)
    .filter((n) => n.texto.trim() && n.estado !== "Borrador")
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  pdf.seccion("Notas de evolución");
  if (notas.length === 0) {
    pdf.parrafo("Sin notas de evolución registradas.", { gris: true });
  } else {
    pdf.tabla(
      [
        { titulo: "Fecha", ancho: 1.1 },
        { titulo: "Médico", ancho: 1.6 },
        { titulo: "Nota", ancho: 5 },
      ],
      notas.map((n) => [fechaPdf(n.fecha), n.medico, n.texto])
    );
  }

  // ----- Citas -----
  const citas = datos.citas
    .filter((c) => c.patientId === patient.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.horaInicio.localeCompare(a.horaInicio));
  pdf.seccion("Historial de citas");
  pdf.tabla(
    [
      { titulo: "Fecha", ancho: 1.2 },
      { titulo: "Hora", ancho: 0.8 },
      { titulo: "Motivo o tratamiento", ancho: 4 },
      { titulo: "Estatus", ancho: 1.4 },
    ],
    citas.map((c) => [fechaPdf(c.fecha), c.horaInicio, c.tratamientos.join(", ") || c.comentarios || "—", c.estatus]),
    { vacio: "Sin citas registradas." }
  );

  // ----- Finanzas del paciente -----
  if (datos.incluirFinanzas) {
    pdf.seccion("Presupuestos");
    pdf.tabla(
      [
        { titulo: "Folio", ancho: 1.1 },
        { titulo: "Fecha", ancho: 1.1 },
        { titulo: "Tratamientos", ancho: 4 },
        { titulo: "Estado", ancho: 1.2 },
        { titulo: "Total", ancho: 1.3, alinear: "derecha" },
      ],
      [...datos.presupuestos]
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map((p) => [p.folio, fechaPdf(p.fecha), p.items.map((i) => i.procedure).join(", "), p.estado ?? "pendiente", dineroPdf(p.total)]),
      { vacio: "Sin presupuestos registrados." }
    );

    pdf.seccion("Pagos");
    const pagos = [...datos.pagos].sort((a, b) => a.fecha.localeCompare(b.fecha));
    pdf.tabla(
      [
        { titulo: "Fecha", ancho: 1.1 },
        { titulo: "Conceptos", ancho: 4 },
        { titulo: "Forma de pago", ancho: 1.5 },
        { titulo: "Monto", ancho: 1.3, alinear: "derecha" },
      ],
      pagos.map((p) => [fechaPdf(p.fecha), p.lineas.map((l) => l.label).join(", "), p.formaPago, dineroPdf(p.total)]),
      { vacio: "Sin pagos registrados." }
    );

    const totalPagado = pagos.reduce((a, p) => a + p.total, 0);
    const devuelto = datos.devoluciones.filter((d) => d.estado === "completada").reduce((a, d) => a + d.monto, 0);
    const pendientes = computeTratamientosPendientes(datos.presupuestos, datos.pagos, datos.devoluciones);
    const saldo = pendientes.reduce((a, t) => a + t.pendiente, 0);
    pdf.subseccion("Resumen de cuenta");
    pdf.pares(
      [
        ["Total pagado", dineroPdf(totalPagado)],
        ["Devoluciones", devuelto > 0 ? dineroPdf(devuelto) : ""],
        ["Saldo pendiente", dineroPdf(saldo)],
      ],
      2
    );
    if (pendientes.length > 0) {
      pdf.tabla(
        [
          { titulo: "Tratamiento pendiente de pago", ancho: 4 },
          { titulo: "Pendiente", ancho: 1.3, alinear: "derecha" },
        ],
        pendientes.map((t) => [t.label, dineroPdf(t.pendiente)])
      );
    }
  }

  return { blob: pdf.finalizar(), nombre: nombreArchivoPdf("Expediente", patient.name) };
}
