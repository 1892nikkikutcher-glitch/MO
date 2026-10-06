/** Partes del expediente que el remitente decide compartir con un colega al
 * enviar una interconsulta (ver NuevaInterconsultaDialog en MoConecta.tsx).
 * Todo es una FOTO FIJA tomada al enviar — nunca una referencia viva — y la
 * construye el SERVIDOR leyendo Firestore (el cliente solo dice qué
 * secciones quiere compartir), así que un cliente alterado no puede
 * inventar contenido ni pedir más de lo permitido.
 *
 * Este archivo es la parte pura: recibe datos ya leídos y devuelve el texto
 * que se guarda. Nunca incluye precios, pagos, datos de contacto, INE ni
 * foto de perfil. */

import {
  claveDetalleSiNo,
  todosLosDiagnosticosOdontograma,
  type HistoriaClinicaTemplate,
  type RespuestasHistoriaClinica,
} from "./historiaClinica";
import { generarNarrativa } from "./notaNarrativa";
import { esNotaAdministrativa, esNotaV2, type DiagnosticoPaciente, type NotaEvolucionAny } from "./notasEvolucion";
import { formatearDientes, ordenarDientes } from "./odontograma";
import { destinoPlanTratamientoLabel, prioridadTratamientoLabel, type PlanTratamientoItem } from "./planTratamiento";

export const seccionesCompartibles = [
  "historia_clinica",
  "diagnosticos_plan",
  "odontograma",
  "notas_evolucion",
  "fotos_radiografias",
  "citas",
] as const;
export type SeccionCompartible = (typeof seccionesCompartibles)[number];

export const etiquetaSeccionCompartible: Record<SeccionCompartible, string> = {
  historia_clinica: "Historia clínica general",
  diagnosticos_plan: "Diagnósticos y plan de tratamiento",
  odontograma: "Odontograma",
  notas_evolucion: "Notas de evolución recientes",
  fotos_radiografias: "Fotografías clínicas",
  citas: "Citas del paciente (calendario)",
};

export const descripcionSeccionCompartible: Record<SeccionCompartible, string> = {
  historia_clinica: "Antecedentes y respuestas de la historia clínica (sin datos de contacto).",
  diagnosticos_plan: "Diagnósticos activos y tratamientos planeados, sin precios.",
  odontograma: "Diagnósticos marcados en cada pieza dental.",
  notas_evolucion: "Las últimas 5 notas clínicas firmadas (no las administrativas).",
  fotos_radiografias: "Hasta 8 fotografías clínicas recientes (extraorales e intraorales). Nunca la INE ni la foto de perfil.",
  citas: "Citas pasadas y próximas de este paciente: fecha, hora, estatus y tratamiento. Sin costos ni comentarios.",
};

export const MAX_NOTAS_COMPARTIDAS = 5;
export const MAX_FOTOS_COMPARTIDAS = 8;
export const MAX_CITAS_COMPARTIDAS = 40;
const MAX_TEXTO_NOTA = 3000;
const MAX_FILAS = 120;

export type ExpedienteCompartido = {
  secciones: SeccionCompartible[];
  /** ISO — cuándo se tomó esta foto fija. */
  generadoEl: string;
  historiaClinica?: { titulo: string; items: { pregunta: string; respuesta: string }[] }[];
  diagnosticos?: { dientes: string; diagnostico: string; estado: string; tratamientoSugerido?: string }[];
  planTratamiento?: { dientes: string; tratamiento: string; prioridad: string; destino: string }[];
  odontograma?: { diente: number; diagnosticos: string[] }[];
  notas?: { fecha: string; medico: string; texto: string }[];
  citas?: { fecha: string; hora: string; estatus: string; tratamientos: string[] }[];
  /** Ids de los archivos de la interconsulta que son fotos compartidas. */
  fotosArchivoIds?: string[];
};

function limpiarTexto(t: unknown, max = 600): string {
  return typeof t === "string" ? t.trim().slice(0, max) : "";
}

export function historiaClinicaCompartible(
  template: HistoriaClinicaTemplate,
  respuestas: RespuestasHistoriaClinica
): NonNullable<ExpedienteCompartido["historiaClinica"]> {
  const secciones: NonNullable<ExpedienteCompartido["historiaClinica"]> = [];
  const alergias = limpiarTexto(respuestas.alergias);
  if (alergias) secciones.push({ titulo: "Alergias", items: [{ pregunta: "Alergias", respuesta: alergias }] });

  for (const seccion of template.secciones) {
    const items: { pregunta: string; respuesta: string }[] = [];
    for (const pregunta of seccion.preguntas) {
      if (pregunta.tipo === "odontograma" || pregunta.tipo === "listaPrioridad") continue;
      const valor = respuestas.porPregunta[pregunta.id];
      let texto = "";
      if (Array.isArray(valor)) texto = (valor as unknown[]).map((v) => String(v)).join(", ");
      else if (typeof valor === "string") texto = valor.trim();
      if (!texto) continue;
      if (pregunta.tipo === "sino") {
        const detalle = respuestas.porPregunta[claveDetalleSiNo(pregunta.id)];
        if (typeof detalle === "string" && detalle.trim()) texto = `${texto} — ${detalle.trim()}`;
      }
      items.push({ pregunta: limpiarTexto(pregunta.etiqueta, 200), respuesta: texto.slice(0, 600) });
    }
    if (items.length > 0) secciones.push({ titulo: limpiarTexto(seccion.titulo, 200), items });
  }
  return secciones;
}

export function diagnosticosCompartibles(
  diagnosticos: DiagnosticoPaciente[]
): NonNullable<ExpedienteCompartido["diagnosticos"]> {
  return diagnosticos
    .slice(0, MAX_FILAS)
    .map((d) => ({
      dientes: formatearDientes(d.dientes ?? []),
      diagnostico: limpiarTexto(d.diagnostico, 300),
      estado: d.estado === "definitivo" ? "Definitivo" : "Provisional",
      ...(d.tratamientoSugerido ? { tratamientoSugerido: limpiarTexto(d.tratamientoSugerido, 300) } : {}),
    }));
}

export function planCompartible(plan: PlanTratamientoItem[]): NonNullable<ExpedienteCompartido["planTratamiento"]> {
  return plan
    .filter((p) => p.estadoClinico === "activo")
    .slice(0, MAX_FILAS)
    .map((p) => ({
      dientes: formatearDientes(p.dientes ?? []),
      tratamiento: limpiarTexto(p.tratamiento, 300),
      prioridad: prioridadTratamientoLabel[p.prioridad] ?? String(p.prioridad),
      destino: destinoPlanTratamientoLabel[p.destino] ?? String(p.destino),
    }));
}

export function odontogramaCompartible(
  template: HistoriaClinicaTemplate,
  respuestas: RespuestasHistoriaClinica
): NonNullable<ExpedienteCompartido["odontograma"]> {
  const porDiente = new Map<number, string[]>();
  for (const { diagnostico } of todosLosDiagnosticosOdontograma(template, respuestas)) {
    if (diagnostico.estado === "descartado" || !diagnostico.diagnostico?.trim()) continue;
    for (const d of diagnostico.dientes) {
      const lista = porDiente.get(d) ?? [];
      lista.push(diagnostico.diagnostico.trim().slice(0, 200));
      porDiente.set(d, lista);
    }
  }
  return ordenarDientes([...porDiente.keys()]).map((diente) => ({ diente, diagnosticos: porDiente.get(diente)! }));
}

function fechaOrdenable(nota: NotaEvolucionAny): string {
  if (esNotaV2(nota)) return nota.creadoEn ?? "";
  const f = (nota as { fecha?: string }).fecha ?? "";
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(f);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : f;
}

export function notasCompartibles(
  notas: NotaEvolucionAny[],
  diagnosticosCatalogo: DiagnosticoPaciente[]
): NonNullable<ExpedienteCompartido["notas"]> {
  return notas
    .filter((n) => !esNotaAdministrativa(n))
    .filter((n) => !esNotaV2(n) || n.estado === "firmada" || n.estado === "con_aclaracion")
    .sort((a, b) => fechaOrdenable(b).localeCompare(fechaOrdenable(a)))
    .slice(0, MAX_NOTAS_COMPARTIDAS)
    .map((n) => {
      if (esNotaV2(n)) {
        const texto = n.narrativa?.texto?.trim() || generarNarrativa(n, { diagnosticosCatalogo });
        return { fecha: fechaOrdenable(n).slice(0, 10), medico: n.encabezado.medico, texto: texto.slice(0, MAX_TEXTO_NOTA) };
      }
      const v1 = n as { fecha?: string; medico?: string; presentacion?: string; subjetivo?: string; objetivo?: string; analisis?: string; pronostico?: string };
      const texto = [
        v1.presentacion && `Presentación: ${v1.presentacion}`,
        v1.subjetivo && `Subjetivo: ${v1.subjetivo}`,
        v1.objetivo && `Objetivo: ${v1.objetivo}`,
        v1.analisis && `Análisis: ${v1.analisis}`,
        v1.pronostico && `Pronóstico: ${v1.pronostico}`,
      ]
        .filter(Boolean)
        .join("\n");
      return { fecha: fechaOrdenable(n).slice(0, 10), medico: v1.medico ?? "", texto: texto.slice(0, MAX_TEXTO_NOTA) };
    });
}

export function citasCompartibles(
  citas: { fecha: string; horaInicio: string; estatus: string; tratamientos?: string[] }[]
): NonNullable<ExpedienteCompartido["citas"]> {
  return citas
    .slice()
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.horaInicio.localeCompare(a.horaInicio))
    .slice(0, MAX_CITAS_COMPARTIDAS)
    .map((c) => ({
      fecha: c.fecha,
      hora: c.horaInicio,
      estatus: c.estatus,
      tratamientos: (c.tratamientos ?? []).filter(Boolean).map((t) => t.slice(0, 200)),
    }));
}

/** Las 8 fotos clínicas más recientes (extraorales e intraorales) — jamás la
 * foto de perfil ni la INE. */
export function fotosCompartibles(fotos: {
  extraorales?: { id: string; path: string; name: string; fecha: string }[];
  intraorales?: { id: string; path: string; name: string; fecha: string }[];
}): { id: string; path: string; name: string; fecha: string }[] {
  return [...(fotos.extraorales ?? []), ...(fotos.intraorales ?? [])]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, MAX_FOTOS_COMPARTIDAS);
}

/** Texto de lo compartido para el registro de consentimiento (lo que el
 * paciente autorizó) — una línea por sección elegida. */
export function textoConsentimientoSecciones(secciones: SeccionCompartible[]): string[] {
  return secciones.map((s) => etiquetaSeccionCompartible[s]);
}
