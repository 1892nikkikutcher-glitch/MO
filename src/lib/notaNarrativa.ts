/** Compositor determinístico de la narrativa clínica de "Registrar atención
 * de hoy" — cada función `narrar*` SOLO convierte en prosa lo que el campo
 * estructurado ya contiene. Si un campo opcional está vacío, la cláusula
 * correspondiente se omite (nunca "no se especificó" inventado), salvo que
 * el dato capturado *sea* una confirmación explícita de ausencia (chip
 * "sin_hallazgos_relevantes", "indicaciones no fueron necesarias", etc.) —
 * eso sí se narra, porque es un hecho registrado, no una suposición. Nunca
 * usar IA generativa aquí: es pura composición de texto a partir de datos
 * ya capturados. */

import type {
  ChipHallazgo,
  ChipEstadoFinal,
  ComoLlegaHoy,
  DiagnosticoNota,
  DiagnosticoPaciente,
  EstadoFinalNota,
  IndicacionesSiguientePaso,
  NotaEvolucionV2,
  Pronostico,
  QueEncontraste,
} from "./notasEvolucion";
import type { DetalleProcedimiento } from "./procedimientoNotaPlantillas";

function narrarComoLlega(c: ComoLlegaHoy): string {
  const clausulas: string[] = [];
  if (c.chips.includes("sin_molestias")) clausulas.push("sin molestias");
  if (c.chips.includes("con_dolor")) {
    let dolor = "dolor";
    if (c.intensidadDolor !== undefined) dolor += ` (${c.intensidadDolor}/10)`;
    if (c.localizacion?.trim()) dolor += ` en ${c.localizacion.trim()}`;
    clausulas.push(dolor);
  }
  if (c.chips.includes("inflamacion")) clausulas.push("inflamación");
  if (c.chips.includes("sensibilidad")) clausulas.push("sensibilidad");
  if (c.chips.includes("sangrado")) clausulas.push("sangrado");
  if (c.chips.includes("dificultad_masticar")) clausulas.push("dificultad para masticar");
  if (c.chips.includes("mejoro")) clausulas.push("mejoría desde la última consulta");
  if (c.chips.includes("empeoro")) clausulas.push("empeoramiento desde la última consulta");
  if (c.chips.includes("sin_cambios")) clausulas.push("sin cambios desde la última consulta");
  if (c.tiempoEvolucion?.trim() && !c.chips.includes("con_dolor")) clausulas.push(`con evolución de ${c.tiempoEvolucion.trim()}`);

  const partes: string[] = [];
  if (clausulas.length > 0) partes.push(`Paciente refiere ${clausulas.join(", ")}.`);
  if (c.textoLibre?.trim()) partes.push(c.textoLibre.trim());
  return partes.join(" ");
}

const etiquetaHallazgo: Record<Exclude<ChipHallazgo, "sin_hallazgos_relevantes" | "otro">, string> = {
  caries: "caries",
  fractura: "fractura",
  movilidad: "movilidad",
  inflamacion_gingival: "inflamación gingival",
  absceso: "absceso",
  fistula: "fístula",
  sensibilidad_percusion: "sensibilidad a la percusión",
  calculo: "cálculo",
  placa: "placa dentobacteriana",
  restauracion_defectuosa: "restauración defectuosa",
};

function narrarHallazgos(q: QueEncontraste): string {
  const partes: string[] = [];
  const organos = q.organosDentales.length > 0 ? ` en el órgano dental ${q.organosDentales.join(", ")}` : "";

  if (q.chips.includes("sin_hallazgos_relevantes")) {
    partes.push(`A la exploración, no se identificaron hallazgos clínicos relevantes${organos}.`);
  } else {
    const lista = q.chips
      .filter((c): c is Exclude<ChipHallazgo, "sin_hallazgos_relevantes" | "otro"> => c !== "otro" && c in etiquetaHallazgo)
      .map((c) => etiquetaHallazgo[c]);
    if (lista.length > 0) partes.push(`A la exploración${organos} se observa ${lista.join(", ")}.`);
  }

  if (q.exploracionClinica?.trim()) partes.push(q.exploracionClinica.trim());
  if (q.estudiosRevisados?.trim()) partes.push(`Estudios revisados: ${q.estudiosRevisados.trim()}.`);

  const sv = q.signosVitales;
  if (sv?.accion === "registrados_ahora" && sv.valores) {
    const lista = [
      sv.valores.presionArterial && `TA ${sv.valores.presionArterial}`,
      sv.valores.frecuenciaCardiaca && `FC ${sv.valores.frecuenciaCardiaca}`,
      sv.valores.frecuenciaRespiratoria && `FR ${sv.valores.frecuenciaRespiratoria}`,
      sv.valores.temperatura && `T ${sv.valores.temperatura}`,
      sv.valores.saturacion && `SpO₂ ${sv.valores.saturacion}`,
      sv.valores.peso && `peso ${sv.valores.peso}`,
    ].filter((s): s is string => Boolean(s));
    if (lista.length > 0) partes.push(`Signos vitales: ${lista.join(", ")}.`);
  } else if (sv?.accion === "reutilizados_recientes") {
    partes.push(
      sv.fuenteReciente?.fecha
        ? `Se reutilizan signos vitales recientes (${sv.fuenteReciente.fecha}).`
        : "Se reutilizan signos vitales recientes."
    );
  } else if (sv?.accion === "no_necesario") {
    partes.push("No se consideró necesario repetir signos vitales en esta atención.");
  }

  return partes.join(" ");
}

function narrarDiagnostico(d: DiagnosticoNota, catalogo: DiagnosticoPaciente[]): string {
  if (d.diagnosticosIds.length === 0) {
    return d.justificacionSinDiagnostico?.trim() ? `Diagnóstico: ${d.justificacionSinDiagnostico.trim()}.` : "";
  }
  const diagnosticos = d.diagnosticosIds
    .map((id) => catalogo.find((c) => c.id === id))
    .filter((x): x is DiagnosticoPaciente => Boolean(x));
  if (diagnosticos.length === 0) return "";
  const frases = diagnosticos.map((dg) => {
    const organos = dg.dientes.length > 0 ? ` (OD ${dg.dientes.join(", ")})` : "";
    const estado = dg.estado === "provisional" ? " (provisional)" : "";
    return `${dg.diagnostico}${organos}${estado}`;
  });
  return `Diagnóstico: ${frases.join("; ")}.`;
}

function narrarProcedimiento(detalle: DetalleProcedimiento): string {
  const partes: string[] = [];
  if (detalle.actividadRealizada?.trim()) partes.push(`${detalle.actividadRealizada.trim()}.`);

  if (detalle.anestesico?.nombre) {
    const a = detalle.anestesico;
    partes.push(
      `Se aplica anestesia con ${a.nombre}${a.concentracion ? ` ${a.concentracion}` : ""}${a.cantidad ? `, ${a.cantidad}` : ""}${a.via ? ` vía ${a.via}` : ""}.`
    );
  }
  if (detalle.aislamiento?.trim()) partes.push(`Aislamiento: ${detalle.aislamiento.trim()}.`);
  if (detalle.tecnica?.trim()) partes.push(`Técnica: ${detalle.tecnica.trim()}.`);
  if (detalle.materiales?.trim()) partes.push(`Materiales: ${detalle.materiales.trim()}.`);

  if (detalle.tipo === "endodoncia") {
    if (detalle.conductosLocalizados?.trim()) partes.push(`Conductos localizados: ${detalle.conductosLocalizados.trim()}.`);
    if (detalle.longitudesTrabajo?.trim()) partes.push(`Longitudes de trabajo: ${detalle.longitudesTrabajo.trim()}.`);
    if (detalle.irrigantes?.trim()) partes.push(`Irrigación con ${detalle.irrigantes.trim()}.`);
    if (detalle.medicacionIntraconducto?.trim()) partes.push(`Medicación intraconducto: ${detalle.medicacionIntraconducto.trim()}.`);
    if (detalle.tecnicaObturacion?.trim() || detalle.materialObturacion?.trim()) {
      partes.push(
        `Obturación${detalle.tecnicaObturacion ? ` (${detalle.tecnicaObturacion.trim()})` : ""}${detalle.materialObturacion ? ` con ${detalle.materialObturacion.trim()}` : ""}.`
      );
    }
    if (detalle.controlRadiografico?.trim()) partes.push(`Control radiográfico: ${detalle.controlRadiografico.trim()}.`);
  } else if (detalle.tipo === "extraccion") {
    if (detalle.indicacion?.trim()) partes.push(`Indicación: ${detalle.indicacion.trim()}.`);
    if (detalle.revisionAlveolo?.trim()) partes.push(`Revisión del alveolo: ${detalle.revisionAlveolo.trim()}.`);
    if (detalle.hemostasia?.trim()) partes.push(`Hemostasia: ${detalle.hemostasia.trim()}.`);
    if (detalle.sutura?.requerida) partes.push(`Sutura${detalle.sutura.material ? ` con ${detalle.sutura.material}` : ""}.`);
  } else if (detalle.tipo === "resina") {
    if (detalle.superficiesTratadas.length > 0) partes.push(`Superficies tratadas: ${detalle.superficiesTratadas.join(", ")}.`);
    if (detalle.materialRestaurador?.trim()) {
      partes.push(`Material restaurador: ${detalle.materialRestaurador.trim()}${detalle.color ? ` color ${detalle.color}` : ""}.`);
    }
  } else if (detalle.tipo === "limpieza") {
    if (detalle.metodoUsado.length > 0) {
      const etiquetas = detalle.metodoUsado.map((m) => (m === "ultrasonido" ? "ultrasonido" : "instrumentación manual"));
      partes.push(`Método: ${etiquetas.join(" y ")}.`);
    }
    if (detalle.fluorAplicado) partes.push("Se aplica flúor.");
    if (detalle.recomendaciones?.trim()) partes.push(detalle.recomendaciones.trim());
  } else if (detalle.tipo === "control_ortodoncia") {
    if (detalle.arco?.retirado || detalle.arco?.colocado) {
      const acciones = [detalle.arco.retirado && "retiro", detalle.arco.colocado && "colocación"].filter(Boolean).join(" y ");
      partes.push(`Se realiza ${acciones} de arco${detalle.arco.detalle ? ` (${detalle.arco.detalle})` : ""}.`);
    }
    if (detalle.activaciones?.trim()) partes.push(`Activaciones: ${detalle.activaciones.trim()}.`);
  }

  if (detalle.observaciones?.trim()) partes.push(detalle.observaciones.trim());
  if (detalle.incidentes?.trim()) partes.push(`Incidentes durante el procedimiento: ${detalle.incidentes.trim()}.`);

  return partes.join(" ");
}

const etiquetaEstadoFinal: Record<Exclude<ChipEstadoFinal, "incidente" | "otro">, string> = {
  asintomatico: "asintomático",
  molestia_leve_esperada: "con molestia leve esperada",
  dolor_controlado: "con dolor controlado",
  hemostasia_adecuada: "con hemostasia adecuada",
  bien_tolerado: "el procedimiento se toleró bien",
  estable: "estable",
  sin_incidentes: "sin incidentes",
};

function narrarEstadoFinal(e: EstadoFinalNota): string {
  const partes: string[] = [];
  const normales = e.chips
    .filter((c): c is Exclude<ChipEstadoFinal, "incidente" | "otro"> => c !== "incidente" && c !== "otro" && c in etiquetaEstadoFinal)
    .map((c) => etiquetaEstadoFinal[c]);
  if (normales.length > 0) partes.push(`El paciente se retira ${normales.join(", ")}.`);

  if (e.chips.includes("incidente") && e.incidente) {
    const inc = e.incidente;
    partes.push(
      `Se presentó un incidente: ${inc.queOcurrio} Se atendió de la siguiente manera: ${inc.comoSeAtendio} Estado final del paciente: ${inc.estadoFinalPaciente} Seguimiento requerido: ${inc.seguimientoRequerido}`
    );
  }
  if (e.textoLibre?.trim()) partes.push(e.textoLibre.trim());
  return partes.join(" ");
}

const etiquetaPronostico: Record<Pronostico, string> = {
  favorable: "favorable",
  reservado: "reservado",
  desfavorable: "desfavorable",
};

function narrarIndicaciones(i: IndicacionesSiguientePaso): string {
  const partes: string[] = [];
  if (i.indicacionesPosoperatorias?.trim()) {
    partes.push(`Se proporcionan las siguientes indicaciones: ${i.indicacionesPosoperatorias.trim()}.`);
  } else if (i.indicacionesNoNecesarias) {
    partes.push("No se consideraron necesarias indicaciones adicionales.");
  }
  if (i.signosAlarmaExplicados?.trim()) partes.push(`Se explican signos de alarma: ${i.signosAlarmaExplicados.trim()}.`);

  if (i.medicamentos.length > 0) {
    const lista = i.medicamentos.map((m) => {
      const partesMed = [
        `${m.principioActivo}${m.presentacion ? ` ${m.presentacion}` : ""}`,
        m.dosis,
        m.via,
        m.frecuencia,
        m.duracion ? `por ${m.duracion}` : "",
      ].filter(Boolean);
      return partesMed.join(", ");
    });
    partes.push(`Se indica: ${lista.join("; ")}.`);
  }
  if (i.recetaVinculadaId) partes.push("Se emite receta.");

  if (i.pronostico) partes.push(`Pronóstico ${etiquetaPronostico[i.pronostico]}.`);
  if (i.tratamientoPendiente?.trim()) partes.push(`Tratamiento pendiente: ${i.tratamientoPendiente.trim()}.`);
  if (i.proximoProcedimiento?.trim()) partes.push(`Próximo procedimiento: ${i.proximoProcedimiento.trim()}.`);
  if (i.proximaCitaId || i.fechaSugeridaProximaCita) {
    partes.push(`Próxima cita${i.fechaSugeridaProximaCita ? ` sugerida para ${i.fechaSugeridaProximaCita}` : " programada"}.`);
  }
  if (i.necesitaInterconsulta) {
    partes.push(`Se solicita interconsulta${i.interconsultaDetalle ? `: ${i.interconsultaDetalle.trim()}.` : "."}`);
  }
  return partes.join(" ");
}

export type ContextoNarrativa = {
  diagnosticosCatalogo: DiagnosticoPaciente[];
};

/** Une las 6 secciones en una narrativa determinística — solo transforma en
 * prosa lo que ya está capturado en `nota`, nunca inventa hechos. Vista
 * previa editable antes de firmar (ver PantallaFirma.tsx); si se edita a
 * mano, `narrativa.editadaManualmente = true` pero los datos estructurados
 * originales nunca se sobrescriben. */
export function generarNarrativa(nota: NotaEvolucionV2, contexto: ContextoNarrativa): string {
  const partes = [
    narrarComoLlega(nota.comoLlegaHoy),
    narrarHallazgos(nota.queEncontraste),
    narrarDiagnostico(nota.diagnostico, contexto.diagnosticosCatalogo),
    nota.detalleProcedimiento ? narrarProcedimiento(nota.detalleProcedimiento) : "",
    nota.estadoFinal ? narrarEstadoFinal(nota.estadoFinal) : "",
    nota.indicaciones ? narrarIndicaciones(nota.indicaciones) : "",
  ].filter((s): s is string => Boolean(s && s.trim()));
  return partes.join("\n\n");
}
