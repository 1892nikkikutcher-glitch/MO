import { ConstructorPdf, dineroPdf, nombreArchivoPdf, porcentajePdf } from "./pdfDocumento";
import { CATEGORIAS_COSTO_DIRECTO, TOLERANCIA_PUNTUALIDAD_MIN, sumarDias, type CobrosSemana, type CostosSemana, type ResumenSemana, type Veredicto } from "./evaluacionSemanal";

export type DatosEvaluacionSemanalPdf = {
  /** Lunes de la semana evaluada (AAAA-MM-DD). */
  lunes: string;
  resumen: ResumenSemana;
  cobros: CobrosSemana;
  /** Cobros brutos y devoluciones de la semana. */
  brutos: number;
  devoluciones: number;
  costos: CostosSemana;
  comisiones: number;
  veredicto: Veredicto;
  /** Nombre a mostrar de cada operador de cobros (el correo en minúsculas es la llave). */
  nombreOperador: (correo: string) => string;
  clinicaNombre: string;
  direccion?: string;
  logoUrl?: string;
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const corta = (iso: string) => {
  const [a, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]} ${a}`;
};
const hrs = (n: number) => `${n.toLocaleString("es-MX", { maximumFractionDigits: 1 })} h`;
const pct = (n: number) => porcentajePdf(n, 0);

/** Evaluación semanal en PDF: las seis medidas (horas, cancelaciones, puntualidad, cobros, costos), el detalle por
 * médico y sede, los cobros por operador y el veredicto de si ya se pueden abrir más bloques. */
export async function generarEvaluacionSemanalPdf(datos: DatosEvaluacionSemanalPdf): Promise<{ blob: Blob; nombre: string }> {
  const { resumen, cobros, costos, veredicto } = datos;
  const t = resumen.totales;
  const netos = Math.round((datos.brutos - datos.devoluciones) * 100) / 100;
  const sinOperador = Math.max(0, Math.round((datos.brutos - cobros.totalRegistrado) * 100) / 100);
  const costoDirectoTotal = Math.round((costos.totalDirectos + datos.comisiones) * 100) / 100;
  const margenDirecto = Math.round((netos - costoDirectoTotal) * 100) / 100;
  const tasaPuntual = resumen.puntualidad.conLlegada > 0 ? resumen.puntualidad.puntuales / resumen.puntualidad.conLlegada : null;
  const rango = `${corta(datos.lunes)} al ${corta(sumarDias(datos.lunes, 6))}`;

  const pdf = new ConstructorPdf({
    titulo: "Evaluación semanal",
    subtitulo: `Semana del ${rango}`,
    clinicaNombre: datos.clinicaNombre,
    direccion: datos.direccion,
    logoUrl: datos.logoUrl,
    pieDePagina: `Evaluación semanal · ${rango} · Documento confidencial`,
  });
  await pdf.encabezado();

  // ----- Veredicto -----
  const veredictoTitulo =
    veredicto.estado === "consistente"
      ? "Los bloques actuales se ocupan de manera consistente"
      : veredicto.estado === "todavia_no"
        ? "Todavía no abras más bloques"
        : "Aún no hay bloques que evaluar";
  pdf.parrafo(veredictoTitulo, { negrita: true, tamano: 12 });
  pdf.parrafo(
    veredicto.estado === "sin_datos"
      ? "Define los bloques de cada médico en la Agenda."
      : `Se pide que las horas atendidas lleguen al ${pct(veredicto.umbral)} de las disponibles en cada una de las últimas ${veredicto.semanas} semanas completas.`,
    { gris: true }
  );

  // ----- Las medidas de la semana -----
  pdf.seccion("Medidas de la semana");
  pdf.pares([
    ["Horas disponibles", hrs(t.horasDisponibles)],
    ["Horas atendidas", t.horasDisponibles > 0 ? `${hrs(t.horasAtendidas)} (${pct(resumen.ocupacionEfectiva)} de las disponibles)` : hrs(t.horasAtendidas)],
    ["Horas agendadas", t.horasDisponibles > 0 ? `${hrs(t.horasAgendadas)} (${pct(resumen.ocupacionAgendada)})` : hrs(t.horasAgendadas)],
    ["Cancelaciones", `${t.canceladas + t.noAsistio}: ${t.canceladas} canceladas (${t.canceladasTarde} fuera de tiempo) y ${t.noAsistio} no asistieron`],
    ["Citas perdidas", pct(resumen.tasaPerdida)],
    [
      "Puntualidad del paciente",
      tasaPuntual === null
        ? "Sin dato: nadie tiene hora de llegada capturada"
        : `${pct(tasaPuntual)} (${resumen.puntualidad.puntuales} de ${resumen.puntualidad.conLlegada} llegaron a tiempo, hasta ${TOLERANCIA_PUNTUALIDAD_MIN} min)`,
    ],
    ["Cobros netos", `${dineroPdf(netos)} (${dineroPdf(datos.brutos)} cobrados - ${dineroPdf(datos.devoluciones)} devueltos)`],
    ["Costos directos", `${dineroPdf(costoDirectoTotal)} (insumos y laboratorio ${dineroPdf(costos.totalDirectos)} + comisiones estimadas ${dineroPdf(datos.comisiones)})`],
  ]);
  if (resumen.fueraDeBloque.horas > 0 || resumen.citasSinBloques > 0) {
    pdf.parrafo(
      [
        resumen.fueraDeBloque.horas > 0 ? `${hrs(resumen.fueraDeBloque.horas)} de citas cayeron fuera de los bloques (no cuentan en la ocupación).` : "",
        resumen.citasSinBloques > 0 ? `${resumen.citasSinBloques} citas son de médicos que todavía no tienen bloques.` : "",
      ]
        .filter(Boolean)
        .join(" "),
      { gris: true, tamano: 8.5 }
    );
  }
  if (resumen.puntualidad.sinDato > 0) {
    pdf.parrafo(
      `${resumen.puntualidad.sinDato} citas atendidas no tienen hora de llegada (se captura al marcar "En espera"); sin ese dato no entran en la puntualidad.` +
        (resumen.puntualidad.tarde > 0 ? ` Los que llegaron tarde se retrasaron ${resumen.puntualidad.minutosPromedioTarde} min en promedio.` : ""),
      { gris: true, tamano: 8.5 }
    );
  }

  // ----- Por médico y sede -----
  pdf.seccion("Por médico y sede");
  const numero = { alinear: "derecha" as const, ancho: 1 };
  pdf.tabla(
    [
      { titulo: "Médico · sede", ancho: 3 },
      { titulo: "Disp.", ...numero },
      { titulo: "Agend.", ...numero },
      { titulo: "Atend.", ...numero },
      { titulo: "Ocup.", ...numero },
      { titulo: "Cancel.", ...numero },
      { titulo: "No asist.", ...numero },
    ],
    [
      ...resumen.filas.map((f) => [
        `${f.medicoNombre} · ${f.sedeNombre}`,
        hrs(f.horasDisponibles),
        hrs(f.horasAgendadas),
        hrs(f.horasAtendidas),
        pct(f.horasDisponibles > 0 ? f.horasAtendidas / f.horasDisponibles : 0),
        String(f.canceladas),
        String(f.noAsistio),
      ]),
      ...(resumen.filas.length > 0
        ? [{ celdas: ["Total", hrs(t.horasDisponibles), hrs(t.horasAgendadas), hrs(t.horasAtendidas), pct(resumen.ocupacionEfectiva), String(t.canceladas), String(t.noAsistio)], negrita: true, relleno: true }]
        : []),
    ],
    { vacio: "Ningún médico tiene bloques esta semana." }
  );
  if (t.horasNoAsistio + t.horasCanceladas > 0) {
    pdf.parrafo(`Horas de bloque que se perdieron: ${hrs(t.horasNoAsistio)} por inasistencias y ${hrs(t.horasCanceladas)} por cancelaciones.`, { gris: true, tamano: 8.5 });
  }

  // ----- Veredicto por médico -----
  if (veredicto.filas.length > 0) {
    pdf.seccion("¿Ya se pueden abrir más bloques?");
    const semanas = veredicto.filas[0].porSemana;
    pdf.tabla(
      [
        { titulo: "Médico · sede", ancho: 3 },
        ...semanas.map((s) => ({ titulo: `Sem. ${corta(s.lunes).slice(0, -5)}`, ancho: 1, alinear: "derecha" as const })),
        { titulo: "Resultado", ancho: 1.5, alinear: "derecha" as const },
      ],
      veredicto.filas.map((f) => [`${f.medicoNombre} · ${f.sedeNombre}`, ...f.porSemana.map((s) => pct(s.ocupacion)), f.consistente ? "Consistente" : "Todavía no"])
    );
    pdf.parrafo("Se calcula con los bloques que tienen hoy: si cambias un bloque, las semanas pasadas se recalculan con ese cambio.", { gris: true, tamano: 8.5 });
  }

  // ----- Cobros por operador -----
  pdf.seccion("Cobros por operador");
  pdf.tabla(
    [
      { titulo: "Operador", ancho: 3 },
      { titulo: "Pagos", ancho: 1, alinear: "derecha" },
      { titulo: "Total", ancho: 1.4, alinear: "derecha" },
    ],
    [
      ...cobros.porOperador.map((o) => [datos.nombreOperador(o.operador), String(o.pagos), dineroPdf(o.total)]),
      ...(sinOperador > 0 ? [["Sin registro de operador", "—", dineroPdf(sinOperador)]] : []),
    ],
    { vacio: "No hay cobros esta semana." }
  );

  // ----- Costos y margen -----
  pdf.seccion("Costos directos y margen");
  pdf.tabla(
    [
      { titulo: "Concepto", ancho: 4 },
      { titulo: "Importe", ancho: 1.4, alinear: "derecha" },
    ],
    [
      ...costos.directos.map((c) => [c.categoria, dineroPdf(c.monto)]),
      ...(costos.directos.length === 0 ? [[`Sin gastos de ${CATEGORIAS_COSTO_DIRECTO.join(" ni ").toLowerCase()} esta semana`, dineroPdf(0)]] : []),
      ["Comisiones de médicos (estimadas con su %)", dineroPdf(datos.comisiones)],
      { celdas: ["Costos directos", dineroPdf(costoDirectoTotal)], negrita: true, relleno: true },
      { celdas: ["Margen directo (cobros netos - costos directos)", dineroPdf(margenDirecto)], negrita: true },
      ...(t.horasAtendidas > 0 ? [["Por hora atendida: cobros / costo directo", `${dineroPdf(netos / t.horasAtendidas)} / ${dineroPdf(costoDirectoTotal / t.horasAtendidas)}`]] : []),
    ]
  );
  pdf.parrafo(
    `Se toman como costo directo los gastos marcados como costo (por defecto, ${CATEGORIAS_COSTO_DIRECTO.join(" y ").toLowerCase()}) y la comisión de los médicos. Renta, nómina, servicios y marketing` +
      (costos.totalIndirectos > 0 ? ` (${dineroPdf(costos.totalIndirectos)} esta semana)` : "") +
      " son indirectos y no entran. Los gastos no llevan sede, así que este bloque es de toda la clínica." +
      (costos.inversion > 0 ? ` Además se invirtieron ${dineroPdf(costos.inversion)} esta semana (equipo, remodelación...): no es costo ni gasto, así que no entra en el margen.` : ""),
    { gris: true, tamano: 8 }
  );

  return { blob: pdf.finalizar(), nombre: nombreArchivoPdf("Evaluacion semanal", datos.lunes, datos.clinicaNombre) };
}
