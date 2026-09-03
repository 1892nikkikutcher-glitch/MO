/** "Registrar atención de hoy" — modelo de datos v2 de las Notas de
 * Evolución. Sustituye la experiencia PSOAP visible (el formato PSOAP sigue
 * existiendo como estructura interna: Presentación≈comoLlegaHoy,
 * Subjetivo/Objetivo≈queEncontraste, Análisis≈diagnostico,
 * Plan≈detalleProcedimiento/indicaciones) por un flujo guiado de 6
 * secciones. Las notas v1 (`NotaEvolucion` en patientData.ts) nunca se
 * migran ni se reescriben — conviven como documentos hermanos en la misma
 * subcolección, distinguidas por el campo `version` (ausente = v1, `2` =
 * v2). Ver el plan de rediseño para el contexto completo de decisiones. */

import type { Procedimiento } from "./procedimientos";
import type { NotaEvolucion } from "./patientData";
import type { DetalleProcedimiento } from "./procedimientoNotaPlantillas";

export const FORMATO_NOTA_VERSION_ACTUAL = 2 as const;
export type EstadoNotaEvolucion = "borrador" | "lista_revision" | "firmada" | "con_aclaracion";
export type ModoCaptura = "rapido" | "detallado";

export type EncabezadoNota = {
  patientId: string;
  pacienteNombreSnapshot: string;
  citaId?: string | null;
  /** cita.tratamientos + comentarios, congelado al crear la nota — la cita
   * representa lo PLANIFICADO, nunca se trata como equivalente a lo
   * realmente realizado. */
  motivoAgendadoSnapshot?: string;
  clinicaNombreSnapshot?: string;
  /** Nombre visible elegido del mismo dropdown de `recursos` de siempre —
   * puede no ser quien firma si alguien más captura por esa persona. Ver
   * `firmadoPorUid` para la identidad real de quién firmó. */
  medico: string;
  organosDentales: number[];
};

export const chipsLlegada = [
  "sin_molestias",
  "con_dolor",
  "inflamacion",
  "sensibilidad",
  "mejoro",
  "empeoro",
  "sin_cambios",
  "sangrado",
  "dificultad_masticar",
  "otro",
] as const;
export type ChipLlegada = (typeof chipsLlegada)[number];

export type ComoLlegaHoy = {
  chips: ChipLlegada[];
  /** 0-10, solo relevante si chips incluye "con_dolor". */
  intensidadDolor?: number;
  tiempoEvolucion?: string;
  localizacion?: string;
  textoLibre?: string;
  capturadoPorVoz?: boolean;
};

export const chipsHallazgos = [
  "caries",
  "fractura",
  "movilidad",
  "inflamacion_gingival",
  "absceso",
  "fistula",
  "sensibilidad_percusion",
  "calculo",
  "placa",
  "restauracion_defectuosa",
  "sin_hallazgos_relevantes",
  "otro",
] as const;
export type ChipHallazgo = (typeof chipsHallazgos)[number];

export type SignosVitales = {
  presionArterial?: string;
  frecuenciaCardiaca?: string;
  frecuenciaRespiratoria?: string;
  temperatura?: string;
  saturacion?: string;
  peso?: string;
};

/** La decisión sobre signos vitales SIEMPRE se registra explícitamente —
 * nunca es "campo opcional que se queda vacío en silencio". Ver
 * `recomendacionSignosVitales` para cuándo se le sugiere al profesional
 * tomarlos, sin bloquear el flujo si decide que no hace falta. */
export type DecisionSignosVitales = {
  accion: "registrados_ahora" | "reutilizados_recientes" | "no_necesario";
  valores?: SignosVitales;
  fuenteReciente?: { notaId: string; fecha: string };
  recomendacionMostrada?: boolean;
};

export type QueEncontraste = {
  organosDentales: number[];
  chips: ChipHallazgo[];
  exploracionClinica?: string;
  estudiosRevisados?: string;
  fotosVinculadasIds?: string[];
  signosVitales?: DecisionSignosVitales;
};

/** Procedimientos que, por su naturaleza, suelen justificar recomendar
 * signos vitales antes de continuar — usada solo para mostrar una
 * recomendación NO bloqueante ("Por el procedimiento seleccionado
 * recomendamos registrar TA y FC antes de continuar"), nunca para exigirlos. */
const TIPOS_QUE_RECOMIENDAN_SIGNOS_VITALES = new Set(["cirugia", "extraccion", "endodoncia", "urgencia"]);

export function recomendacionSignosVitales(tipoProcedimiento: string | undefined): boolean {
  return !!tipoProcedimiento && TIPOS_QUE_RECOMIENDAN_SIGNOS_VITALES.has(tipoProcedimiento);
}

export type EstadoDiagnostico = "provisional" | "definitivo";

/** Catálogo de diagnósticos — PER-PATIENT (no un catálogo global de la
 * clínica), mismo shape que el precedente `DiagnosticoOdontograma` de
 * historiaClinica.ts para no inventar una forma incompatible. Los campos
 * CIE son de captura manual y opcionales en esta fase — MO no sugiere ni
 * valida códigos todavía; se preparan solo para no requerir un cambio de
 * esquema cuando exista un catálogo/sugerencia CIE más adelante. */
export type DiagnosticoPaciente = {
  id: string;
  dientes: number[];
  diagnostico: string;
  estado: EstadoDiagnostico;
  tratamientoSugerido?: string;
  cieCodigo?: string;
  cieDescripcion?: string;
  creadoEn: string;
  actualizadoEn?: string;
  /** Reconfirmar un diagnóstico existente en una nota nueva NUNCA reescribe
   * la entrada vieja — se agrega una entrada nueva con origen
   * "confirmado_de_historial" apuntando a la nota donde se reconfirmó. */
  origen: "nuevo" | "confirmado_de_historial";
  notaOrigenId?: string;
};

export type DiagnosticoNota = {
  diagnosticosIds: string[];
  /** Solo si diagnosticosIds está vacío — por qué esta nota no requiere
   * diagnóstico (ej. "control de rutina sin hallazgos nuevos"). */
  justificacionSinDiagnostico?: string;
};

export const chipsEstadoFinal = [
  "asintomatico",
  "molestia_leve_esperada",
  "dolor_controlado",
  "hemostasia_adecuada",
  "bien_tolerado",
  "estable",
  "sin_incidentes",
  "incidente",
  "otro",
] as const;
export type ChipEstadoFinal = (typeof chipsEstadoFinal)[number];

export type IncidenteNota = {
  queOcurrio: string;
  comoSeAtendio: string;
  estadoFinalPaciente: string;
  seguimientoRequerido: string;
};

export type EstadoFinalNota = {
  /** La UI NUNCA preselecciona ninguno — "sin_incidentes" en particular
   * exige confirmación explícita del profesional. */
  chips: ChipEstadoFinal[];
  incidente?: IncidenteNota;
  textoLibre?: string;
};

// Reutiliza el catálogo YA EXISTENTE `MedicamentoCatalogo` (src/lib/medicamentos.ts,
// hoy usado por Recetas) — no se crea un catálogo paralelo. `MedicamentoNota`
// es un SNAPSHOT de lo realmente indicado en esta atención (igual que Receta
// ya congela edadTexto/sexo al momento de crearse) — sobrevive aunque el
// catálogo cambie después, y permite completar/editar antes de firmar.
export type MedicamentoNota = {
  id: string;
  medicamentoCatalogoId?: string;
  principioActivo: string;
  presentacion?: string;
  dosis: string;
  via: string;
  frecuencia: string;
  duracion?: string;
  advertenciasOEfectosAdversos?: string;
};

export type Pronostico = "favorable" | "reservado" | "desfavorable";

export type IndicacionesSiguientePaso = {
  indicacionesPosoperatorias?: string;
  /** true = el profesional confirmó explícitamente que no hacían falta —
   * distinto de "no se llenó el campo". */
  indicacionesNoNecesarias?: boolean;
  signosAlarmaExplicados?: string;
  medicamentos: MedicamentoNota[];
  recetaVinculadaId?: string | null;
  pronostico?: Pronostico;
  tratamientoPendiente?: string;
  proximoProcedimiento?: string;
  fechaSugeridaProximaCita?: string;
  proximaCitaId?: string | null;
  necesitaInterconsulta?: boolean;
  interconsultaDetalle?: string;
};

export type AclaracionNota = {
  id: string;
  motivo: string;
  contenido: string;
  autorUid: string;
  autorNombre: string;
  fecha: string;
};

/** Firma del paciente/representante — captura de firma manuscrita en
 * pantalla (canvas), NUNCA base64 dentro del documento: el PNG se sube a
 * Storage (ver firmaPacienteNota.ts) y aquí solo vive la referencia.
 * Ausente = no se recabó — nunca se infiere ni se marca "aceptado" en
 * automático. */
export type TipoFirmante = "paciente" | "madre" | "padre" | "tutor" | "representante";
export type FirmaPaciente = {
  tipoFirmante: TipoFirmante;
  nombreFirmante: string;
  relacionConPaciente?: string;
  firmaStoragePath?: string;
  firmaUrl?: string;
  firmadoEn?: unknown;
};

export type NarrativaNota = {
  texto: string;
  editadaManualmente: boolean;
  generadaConIA?: boolean;
};

export type PlantillaNota = {
  id: string;
  nombre: string;
  alcance: "personal" | "clinica";
  autorUid: string;
  modoCaptura: ModoCaptura;
  procedimientoTipo?: DetalleProcedimiento["tipo"];
  /** Deliberadamente solo defaults ESTRUCTURALES (técnica/materiales/
   * anestésico) — nunca síntomas/hallazgos/"sin incidentes"/estado final:
   * eso se reconfirma siempre en cada atención. */
  valoresPorDefecto: {
    detalleProcedimiento?: Partial<DetalleProcedimiento>;
    indicacionesSugerencia?: string;
  };
  creadoEn: string;
};

export type NotaEvolucionV2 = {
  id: string;
  version: 2;
  estado: EstadoNotaEvolucion;
  modoCaptura: ModoCaptura;
  /** Contador monotónico — aumenta en cada cambio lógico registrado por
   * `registrarCambio` (useAutoguardadoNota.ts). Es la fuente de verdad para
   * detectar conflictos entre dispositivos/sesiones (ver
   * borradorLocalNotaPuro.ts → detectarConflictoBorrador); NUNCA se usa
   * `actualizadoEn` (reloj de cliente) para esa decisión, solo para
   * UX/auditoría/desempate. Ver `normalizarRevision` para notas v2 creadas
   * antes de que este campo existiera. */
  revision: number;
  encabezado: EncabezadoNota;
  comoLlegaHoy: ComoLlegaHoy;
  queEncontraste: QueEncontraste;
  diagnostico: DiagnosticoNota;
  detalleProcedimiento?: DetalleProcedimiento;
  /** Solo si detalleProcedimiento está ausente — por qué no se realizó
   * ningún procedimiento en esta atención. */
  justificacionSinProcedimiento?: string;
  estadoFinal?: EstadoFinalNota;
  indicaciones?: IndicacionesSiguientePaso;
  narrativa: NarrativaNota;
  aclaraciones: AclaracionNota[];
  firmaPaciente?: FirmaPaciente;
  creadoPorUid: string;
  creadoEn: string;
  actualizadoEn: string;
  listaParaRevisionEn?: string;
  firmadoPorUid?: string;
  /** Timestamp de servidor real (Firestore serverTimestamp()) — único
   * campo de toda la app que lo usa, escrito una sola vez al firmar. */
  firmadoEn?: unknown;
};

export function idNota(prefijo: string): string {
  return `${prefijo}${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

export function notaEvolucionV2Inicial(
  encabezado: EncabezadoNota,
  modoCaptura: ModoCaptura,
  creadoPorUid: string
): NotaEvolucionV2 {
  const ahora = new Date().toISOString();
  return {
    id: idNota("nota"),
    version: 2,
    estado: "borrador",
    modoCaptura,
    revision: 1,
    encabezado,
    comoLlegaHoy: { chips: [] },
    queEncontraste: { organosDentales: [...encabezado.organosDentales], chips: [] },
    diagnostico: { diagnosticosIds: [] },
    aclaraciones: [],
    narrativa: { texto: "", editadaManualmente: false },
    creadoPorUid,
    creadoEn: ahora,
    actualizadoEn: ahora,
  };
}

/** Intenta prellenar `procedimientoId`/`procedimientoNombre` a partir del
 * catálogo existente (ej. lo agendado en la cita o el presupuesto) — nunca
 * asume que lo planificado es lo realizado; el profesional siempre puede
 * editarlo antes de firmar. */
export function sugerirProcedimientoDesdeCatalogo(
  nombreBuscado: string,
  catalogo: Procedimiento[]
): Procedimiento | undefined {
  const normalizado = nombreBuscado.trim().toLowerCase();
  if (!normalizado) return undefined;
  return catalogo.find((p) => p.nombre.trim().toLowerCase() === normalizado);
}

export type FaltanteNota = { seccion: SeccionNota; mensaje: string };
export type SeccionNota =
  | "como_llega"
  | "que_encontraste"
  | "diagnostico"
  | "procedimiento"
  | "estado_final"
  | "indicaciones";

/** Detector de faltantes en lenguaje natural — misma validación que
 * `validarNotaParaFirmar`, pero en mensajes específicos y accionables
 * (nunca "existen campos obligatorios faltantes"), cada uno con la sección
 * a la que la UI puede saltar directo. Depende del contexto clínico: no
 * exige lo mismo a una nota rutinaria que a una con incidente. */
export function obtenerFaltantesNota(nota: NotaEvolucionV2): FaltanteNota[] {
  const faltantes: FaltanteNota[] = [];

  const comoLlegaVacio = nota.comoLlegaHoy.chips.length === 0 && !nota.comoLlegaHoy.textoLibre?.trim();
  if (comoLlegaVacio) faltantes.push({ seccion: "como_llega", mensaje: "Confirma cómo llega el paciente hoy" });

  const queEncontrasteVacio =
    nota.queEncontraste.chips.length === 0 &&
    !nota.queEncontraste.exploracionClinica?.trim() &&
    !nota.queEncontraste.estudiosRevisados?.trim();
  if (queEncontrasteVacio) {
    faltantes.push({
      seccion: "que_encontraste",
      mensaje: 'Registra los hallazgos, o confirma "Sin hallazgos clínicos relevantes"',
    });
  }

  const sinDiagnostico =
    nota.diagnostico.diagnosticosIds.length === 0 && !nota.diagnostico.justificacionSinDiagnostico?.trim();
  if (sinDiagnostico) faltantes.push({ seccion: "diagnostico", mensaje: "Confirma un diagnóstico, o explica por qué no aplica" });

  const sinProcedimiento = !nota.detalleProcedimiento?.actividadRealizada?.trim();
  if (sinProcedimiento && !nota.justificacionSinProcedimiento?.trim()) {
    faltantes.push({ seccion: "procedimiento", mensaje: "Registra qué hiciste hoy, o explica por qué no se realizó procedimiento" });
  }

  const chipsFinal = nota.estadoFinal?.chips ?? [];
  if (chipsFinal.length === 0) {
    faltantes.push({ seccion: "estado_final", mensaje: "Confirma cómo terminó la atención" });
  } else if (chipsFinal.includes("incidente")) {
    const inc = nota.estadoFinal?.incidente;
    if (!inc?.queOcurrio?.trim() || !inc?.comoSeAtendio?.trim() || !inc?.estadoFinalPaciente?.trim() || !inc?.seguimientoRequerido?.trim()) {
      faltantes.push({ seccion: "estado_final", mensaje: "Completa el detalle del incidente reportado" });
    }
  }

  if (!nota.indicaciones?.pronostico) {
    faltantes.push({ seccion: "indicaciones", mensaje: "Registra el pronóstico" });
  }
  const sinIndicaciones = !nota.indicaciones?.indicacionesPosoperatorias?.trim() && !nota.indicaciones?.indicacionesNoNecesarias;
  if (sinIndicaciones) {
    faltantes.push({ seccion: "indicaciones", mensaje: 'Registra las indicaciones, o confirma que no fueron necesarias' });
  }
  for (const med of nota.indicaciones?.medicamentos ?? []) {
    if (!med.principioActivo?.trim() || !med.dosis?.trim() || !med.via?.trim() || !med.frecuencia?.trim()) {
      faltantes.push({ seccion: "indicaciones", mensaje: `Completa dosis, vía y frecuencia de ${med.principioActivo || "un medicamento"}` });
    }
  }

  return faltantes;
}

export type ResultadoValidacionNota = { valido: boolean; errores: string[] };

/** Signos vitales NUNCA se exigen aquí — solo se registra la decisión
 * tomada (ver DecisionSignosVitales); la firma del paciente tampoco se
 * exige de forma universal, solo cuando el flujo específico la requiera
 * (fuera del alcance de esta validación genérica). */
export function validarNotaParaFirmar(nota: NotaEvolucionV2): ResultadoValidacionNota {
  const faltantes = obtenerFaltantesNota(nota);
  return { valido: faltantes.length === 0, errores: faltantes.map((f) => f.mensaje) };
}

export type EstadoSeccion = "pendiente" | "completa" | "atencion";

/** Progreso por sección para el acordeón (○/✓/⚠) — pura, se recalcula en
 * cada render a partir del estado actual del formulario, nunca se persiste
 * aparte. "atencion" es para algo capturado pero incompleto (nunca todo en
 * rojo por default). */
export function estadoSeccion(nota: Partial<NotaEvolucionV2>, seccion: SeccionNota): EstadoSeccion {
  switch (seccion) {
    case "como_llega": {
      const c = nota.comoLlegaHoy;
      if (!c || (c.chips.length === 0 && !c.textoLibre?.trim())) return "pendiente";
      if (c.chips.includes("con_dolor") && c.intensidadDolor === undefined) return "atencion";
      return "completa";
    }
    case "que_encontraste": {
      const q = nota.queEncontraste;
      if (!q || (q.chips.length === 0 && !q.exploracionClinica?.trim() && !q.estudiosRevisados?.trim())) return "pendiente";
      return "completa";
    }
    case "diagnostico": {
      const d = nota.diagnostico;
      if (!d) return "pendiente";
      if (d.diagnosticosIds.length === 0 && !d.justificacionSinDiagnostico?.trim()) return "pendiente";
      return "completa";
    }
    case "procedimiento": {
      if (!nota.detalleProcedimiento && !nota.justificacionSinProcedimiento?.trim()) return "pendiente";
      if (nota.detalleProcedimiento && !nota.detalleProcedimiento.actividadRealizada?.trim()) return "atencion";
      return "completa";
    }
    case "estado_final": {
      const chips = nota.estadoFinal?.chips ?? [];
      if (chips.length === 0) return "pendiente";
      if (chips.includes("incidente")) {
        const inc = nota.estadoFinal?.incidente;
        const completo = !!inc?.queOcurrio?.trim() && !!inc?.comoSeAtendio?.trim() && !!inc?.estadoFinalPaciente?.trim() && !!inc?.seguimientoRequerido?.trim();
        return completo ? "completa" : "atencion";
      }
      return "completa";
    }
    case "indicaciones": {
      const ind = nota.indicaciones;
      if (!ind || !ind.pronostico) return "pendiente";
      const tieneIndicaciones = !!ind.indicacionesPosoperatorias?.trim() || !!ind.indicacionesNoNecesarias;
      if (!tieneIndicaciones) return "atencion";
      const medsIncompletos = (ind.medicamentos ?? []).some(
        (m) => !m.principioActivo?.trim() || !m.dosis?.trim() || !m.via?.trim() || !m.frecuencia?.trim()
      );
      return medsIncompletos ? "atencion" : "completa";
    }
    default:
      return "pendiente";
  }
}

/** Nota corta para una cita que no se atendió (Cancelada, Reagendada, No
 * Asistió) — tercer documento hermano en la misma subcolección
 * `notasEvolucion`, distinguido por `tipo: "administrativa"` (v1 no tiene
 * `version` ni `tipo`; v2 tiene `version: 2`). Deliberadamente NO reutiliza
 * `NotaEvolucionV2`: esa trae de fábrica secciones clínicas (hallazgos,
 * diagnóstico, procedimiento...) que no aplican a una cita que nunca
 * ocurrió — forzarlas ahí solo para dejarlas vacías sería más confuso que
 * un tipo propio y minúsculo. */
export const motivosNotaAdministrativa = ["no_asistio", "cancela_paciente", "reagenda_paciente", "otro"] as const;
export type MotivoNotaAdministrativa = (typeof motivosNotaAdministrativa)[number];
export const motivoNotaAdministrativaLabel: Record<MotivoNotaAdministrativa, string> = {
  no_asistio: "Paciente no se presenta a su consulta",
  cancela_paciente: "Paciente cancela su cita",
  reagenda_paciente: "Paciente reagenda su cita",
  otro: "Otro",
};

/** PSOAP libre y opcional — a diferencia del formulario guiado v2 (chips,
 * secciones obligatorias, checklist de firma), ningún campo aquí bloquea
 * el guardado. Le da al médico la opción de anotar algo clínico breve sin
 * salir de la nota rápida, para el caso en que sí hubo algo de contacto
 * antes de cancelar/reagendar/no presentarse. Mismas 5 etiquetas que el
 * formato v1 legado (`NotaEvolucion` en patientData.ts). */
export type PsoapOpcional = {
  presentacion?: string;
  subjetivo?: string;
  objetivo?: string;
  analisis?: string;
  pronostico?: string;
};

export type NotaEvolucionAdministrativa = {
  id: string;
  tipo: "administrativa";
  patientId: string;
  pacienteNombreSnapshot: string;
  citaId: string;
  motivo: MotivoNotaAdministrativa;
  notaLibre?: string;
  psoap?: PsoapOpcional;
  registradoPorUid: string;
  creadoEn: string;
};

export function notaAdministrativaInicial(args: {
  patientId: string;
  pacienteNombreSnapshot: string;
  citaId: string;
  motivo: MotivoNotaAdministrativa;
  notaLibre?: string;
  psoap?: PsoapOpcional;
  registradoPorUid: string;
}): NotaEvolucionAdministrativa {
  return {
    id: idNota("notaAdmin"),
    tipo: "administrativa",
    ...args,
    creadoEn: new Date().toISOString(),
  };
}

/** Una nota de evolución, v1 (PSOAP crudo, `patientData.ts`), v2, o
 * administrativa — conviven como documentos hermanos en la misma
 * subcolección `notasEvolucion`, nunca se migra una a otra. */
export type NotaEvolucionAny = NotaEvolucion | NotaEvolucionV2 | NotaEvolucionAdministrativa;

export function esNotaV2(nota: NotaEvolucionAny): nota is NotaEvolucionV2 {
  return (nota as NotaEvolucionV2).version === 2;
}

export function esNotaAdministrativa(nota: NotaEvolucionAny): nota is NotaEvolucionAdministrativa {
  return (nota as NotaEvolucionAdministrativa).tipo === "administrativa";
}

/** `citaId` asociado a cualquier tipo de nota — v1 nunca lo tiene, v2 lo
 * guarda en `encabezado.citaId`, administrativa lo trae en la raíz. */
export function citaIdDeNota(nota: NotaEvolucionAny): string | null {
  if (esNotaAdministrativa(nota)) return nota.citaId;
  if (esNotaV2(nota)) return nota.encabezado.citaId ?? null;
  return null;
}

/** Notas v2 creadas antes de que existiera `revision` (todas las que ya
 * están en producción al momento de esta corrección) no tienen ese campo.
 * Nunca se trata `undefined` como `0` — eso produciría falsos conflictos
 * (cualquier revisión remota real sería "mayor a 0") y un `NaN` en cuanto
 * se intente incrementar. Se normaliza a `1`, consistente con el valor con
 * el que nace toda nota nueva. */
export function normalizarRevision(nota: NotaEvolucionV2): NotaEvolucionV2 {
  return typeof nota.revision === "number" ? nota : { ...nota, revision: 1 };
}
