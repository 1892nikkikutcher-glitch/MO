/** Sección 4 ("¿Qué hiciste hoy?") de "Registrar atención de hoy" — una
 * plantilla estructurada por tipo de procedimiento, con revelado
 * progresivo: agregar una plantilla nueva de verdad es (a) un tipo
 * `Detalle*` nuevo en la unión `DetalleProcedimiento`, (b) opcionalmente una
 * entrada en `plantillaCamposPorTipo` si usa el patrón genérico de campos,
 * (c) un `case` en el switch de SeccionProcedimiento.tsx — el contenedor de
 * revelado progresivo nunca cambia. */

export const tiposProcedimientoNota = [
  "valoracion",
  "limpieza",
  "resina",
  "endodoncia",
  "extraccion",
  "control_ortodoncia",
  "protesis",
  "cirugia",
  "odontopediatria",
  "urgencia",
  "otro",
] as const;
export type TipoProcedimientoNota = (typeof tiposProcedimientoNota)[number];

export const tipoProcedimientoNotaLabel: Record<TipoProcedimientoNota, string> = {
  valoracion: "Valoración",
  limpieza: "Limpieza dental",
  resina: "Resina / Restauración",
  endodoncia: "Endodoncia",
  extraccion: "Extracción",
  control_ortodoncia: "Control de ortodoncia",
  protesis: "Prótesis",
  cirugia: "Cirugía",
  odontopediatria: "Odontopediatría",
  urgencia: "Urgencia",
  otro: "Otro",
};

export type DetalleProcedimientoBase = {
  tipo: TipoProcedimientoNota;
  /** Procedimiento.id del catálogo, si se pudo enlazar (ver
   * sugerirProcedimientoDesdeCatalogo en notasEvolucion.ts). */
  procedimientoId?: string;
  /** Reutiliza cita.tratamientos/presupuesto cuando exista, siempre editable. */
  procedimientoNombre: string;
  /** Qué se hizo, en una frase — se autogenera al elegir el procedimiento
   * (ej. a partir de `procedimientoNombre` + `etapaRealizada` en
   * endodoncia) pero siempre editable antes de firmar. Es el campo que
   * responde inequívocamente "¿qué hiciste hoy?", independiente del detalle
   * técnico de cada plantilla. */
  actividadRealizada: string;
  organosDentales: number[];
  tecnica?: string;
  anestesico?: { nombre: string; concentracion: string; cantidad: string; via: string };
  aislamiento?: string;
  materiales?: string;
  observaciones?: string;
  incidentes?: string;
};

export const etapasEndodoncia = [
  "acceso",
  "localizacion_conductos",
  "conductometria",
  "instrumentacion",
  "irrigacion",
  "medicacion_intraconducto",
  "obturacion",
  "restauracion_provisional",
  "restauracion_definitiva",
] as const;
export type EtapaEndodoncia = (typeof etapasEndodoncia)[number];
export const etapaEndodonciaLabel: Record<EtapaEndodoncia, string> = {
  acceso: "Acceso",
  localizacion_conductos: "Localización de conductos",
  conductometria: "Conductometría",
  instrumentacion: "Instrumentación",
  irrigacion: "Irrigación",
  medicacion_intraconducto: "Medicación intraconducto",
  obturacion: "Obturación",
  restauracion_provisional: "Restauración provisional",
  restauracion_definitiva: "Restauración definitiva",
};

export type DetalleEndodoncia = DetalleProcedimientoBase & {
  tipo: "endodoncia";
  /** Opcional a propósito: abrir esta plantilla NO significa que la etapa ya
   * ocurrió — es un hecho clínico que el profesional debe confirmar. Nunca
   * se autoselecciona un valor por defecto (ver validación de firma en
   * notasEvolucion.ts, que sí exige confirmarla antes de firmar). */
  etapaRealizada?: EtapaEndodoncia;
  conductosLocalizados?: string;
  longitudesTrabajo?: string;
  tecnicaInstrumentacion?: string;
  irrigantes?: string;
  medicacionIntraconducto?: string;
  tecnicaObturacion?: string;
  materialObturacion?: string;
  restauracionTemporalODefinitiva?: "temporal" | "definitiva";
  controlRadiografico?: string;
};

export type DetalleExtraccion = DetalleProcedimientoBase & {
  tipo: "extraccion";
  /** Ambos opcionales a propósito — hechos clínicos que el profesional debe
   * confirmar, nunca un default al abrir la plantilla. */
  indicacion?: string;
  tipoExtraccion?: "simple" | "quirurgica";
  tecnicaExtraccion?: string;
  integridadOrganoExtraido?: string;
  revisionAlveolo?: string;
  hemostasia?: string;
  sutura?: { requerida: boolean; material?: string };
};

export type DetalleRestauracion = DetalleProcedimientoBase & {
  tipo: "resina";
  /** Opcional a propósito — sin confirmar hasta que el profesional las
   * elija, nunca un arreglo vacío implicando "confirmado, cero superficies". */
  superficiesTratadas?: string[];
  diagnosticoAsociado?: string;
  aislamientoTipo?: string;
  eliminacionTejidoCariado?: boolean;
  proteccionPulpar?: string;
  sistemaAdhesivo?: string;
  materialRestaurador?: string;
  color?: string;
  verificacionContactoOclusion?: boolean;
  acabadoPulido?: boolean;
};

export type DetalleLimpieza = DetalleProcedimientoBase & {
  tipo: "limpieza";
  estadoHigiene?: string;
  porcentajePlaca?: string;
  porcentajeCalculo?: string;
  sangrado?: string;
  /** Opcional a propósito — sin confirmar hasta que el profesional lo
   * elija. */
  metodoUsado?: ("ultrasonido" | "manual")[];
  pulido?: boolean;
  fluorAplicado?: boolean;
  educacionHigiene?: string;
  recomendaciones?: string;
};

export type DetalleControlOrtodoncia = DetalleProcedimientoBase & {
  tipo: "control_ortodoncia";
  aparatologiaPresente?: string;
  higiene?: string;
  bracketsDespegados?: string;
  arco?: { retirado: boolean; colocado: boolean; detalle?: string };
  ligadurasElasticosAccesorios?: string;
  activaciones?: string;
  cooperacion?: string;
  indicaciones?: string;
};

export const nivelesManejoConducta = ["basico", "avanzado"] as const;
export type NivelManejoConducta = (typeof nivelesManejoConducta)[number];
export const nivelManejoConductaLabel: Record<NivelManejoConducta, string> = {
  basico: "Básico",
  avanzado: "Avanzado",
};

/** "¿Qué hiciste hoy?" en odontopediatría — deliberadamente NO duplica
 * hallazgos/contexto que ya viven en "¿Qué encontraste?" (dentición,
 * piezas en erupción se dejan opcionales y de baja prioridad, no son el
 * centro de esta sección). Se enfoca en lo que sí es "qué hiciste":
 * manejo de conducta, acompañante/consentimiento, terapia pulpar y corona
 * si se realizaron. La anestesia usa el bloque común de
 * DetalleProcedimientoBase.anestesico — no se duplica aquí un campo
 * pediátrico aparte; una sedación estructurada es un flujo clínico propio
 * a considerar en otra fase, no un textarea genérico en esta. */
export type DetalleOdontopediatria = DetalleProcedimientoBase & {
  tipo: "odontopediatria";
  /** Clasificación general — nunca se autoselecciona, el profesional debe
   * confirmarla (ver validación de firma en notasEvolucion.ts). */
  manejoConducta?: NivelManejoConducta;
  /** Qué técnica concreta se usó (decir-mostrar-hacer, distracción, control
   * de voz, etc.) — "básico/avanzado" por sí solo no documenta QUÉ se hizo. */
  tecnicaManejoConducta?: string;
  acompanante?: string;
  indicacionesConsentimiento?: string;
  terapiaPulpar?: { requerida: boolean; tipo?: string };
  coronaNiquelCromo?: { colocada: boolean; numero?: string; ajustes?: string };
  denticion?: "temporal" | "mixta" | "permanente";
  piezasEnErupcion?: string;
};

/** Patrón extensible para el resto (prótesis/cirugía/valoración/urgencia/
 * otro): una lista de campos por tipo que la UI recorre para renderizar. */
export type CampoPlantilla = {
  key: string;
  label: string;
  tipo: "texto" | "textarea" | "chips" | "select" | "bool";
  opciones?: string[];
  requerido?: boolean;
};

export const plantillaCamposPorTipo: Partial<Record<TipoProcedimientoNota, CampoPlantilla[]>> = {
  protesis: [
    { key: "tipoProtesis", label: "Tipo de prótesis", tipo: "texto" },
    { key: "ajusteOclusion", label: "Ajuste oclusal", tipo: "textarea" },
    { key: "retencion", label: "Retención/estabilidad", tipo: "texto" },
    { key: "indicaciones", label: "Indicaciones al paciente", tipo: "textarea" },
  ],
  cirugia: [
    { key: "tipoCirugia", label: "Tipo de cirugía", tipo: "texto", requerido: true },
    { key: "hallazgosTransoperatorios", label: "Hallazgos transoperatorios", tipo: "textarea" },
    { key: "hemostasia", label: "Hemostasia", tipo: "texto" },
    { key: "sutura", label: "Sutura", tipo: "texto" },
  ],
  valoracion: [
    { key: "motivo", label: "Motivo de la valoración", tipo: "textarea" },
    { key: "hallazgosGenerales", label: "Hallazgos generales", tipo: "textarea" },
    { key: "planSugerido", label: "Plan sugerido", tipo: "textarea" },
  ],
  urgencia: [
    { key: "tipoUrgencia", label: "Tipo de urgencia", tipo: "texto", requerido: true },
    { key: "manejoInmediato", label: "Manejo inmediato", tipo: "textarea" },
    { key: "referencia", label: "Referencia (si aplica)", tipo: "texto" },
  ],
};

export type DetalleGenerico = DetalleProcedimientoBase & {
  tipo: "valoracion" | "protesis" | "cirugia" | "urgencia" | "otro";
  camposAdicionales?: Record<string, string>;
};

export type DetalleProcedimiento =
  | DetalleEndodoncia
  | DetalleExtraccion
  | DetalleRestauracion
  | DetalleLimpieza
  | DetalleControlOrtodoncia
  | DetalleOdontopediatria
  | DetalleGenerico;

/** Autogenera `actividadRealizada` a partir del tipo y sus campos más
 * distintivos — siempre editable después por el profesional. Nunca inventa
 * datos que no estén ya en el detalle: si el campo distintivo del tipo
 * (etapa/tipoExtraccion/manejoConducta) todavía no se confirmó, la
 * sugerencia se queda en el nombre genérico del tipo, nunca asume un valor. */
export function actividadRealizadaSugerida(detalle: DetalleProcedimiento): string {
  const organos = detalle.organosDentales.length > 0 ? ` OD ${detalle.organosDentales.join(", ")}` : "";
  switch (detalle.tipo) {
    case "endodoncia":
      return detalle.etapaRealizada
        ? `Endodoncia — ${etapaEndodonciaLabel[detalle.etapaRealizada]}${organos}`
        : `Endodoncia${organos}`;
    case "extraccion":
      return detalle.tipoExtraccion
        ? `Extracción ${detalle.tipoExtraccion === "quirurgica" ? "quirúrgica" : "simple"}${organos}`
        : `Extracción${organos}`;
    case "resina":
      return `Restauración con resina${organos}`;
    case "limpieza":
      return "Limpieza dental";
    case "control_ortodoncia":
      return "Control de ortodoncia";
    case "odontopediatria":
      return detalle.manejoConducta
        ? `Odontopediatría — manejo de conducta ${nivelManejoConductaLabel[detalle.manejoConducta].toLowerCase()}${organos}`
        : `Odontopediatría${organos}`;
    default:
      return detalle.procedimientoNombre ? `${tipoProcedimientoNotaLabel[detalle.tipo]} — ${detalle.procedimientoNombre}` : tipoProcedimientoNotaLabel[detalle.tipo];
  }
}

/** Sugiere el tipo de plantilla a partir del nombre de un tratamiento
 * agendado, cruzándolo contra el catálogo — mismo patrón que
 * `especialidadDeCita` en Agenda.tsx: coincidencia EXACTA de nombre,
 * insensible a mayúsculas, nunca una adivinanza cuando no hay match ni
 * cuando la especialidad del catálogo no tiene un tipo de plantilla
 * asociado. Lo ideal sería resolver por un `procedimientoId` estable en
 * vez de comparar texto, pero `CitaAgenda.tratamientos` hoy es `string[]`
 * sin esa referencia — se documenta como limitación conocida, no se amplía
 * esa arquitectura aquí. Es SOLO una sugerencia: quien la use en la UI debe
 * mostrarla como tal (ej. una insignia "Sugerido") y dejar que el
 * profesional la acepte, la cambie, o elija "Otro" — nunca se autoconfirma
 * por sí sola ni se trata como un hecho clínico ya ocurrido. */
const especialidadATipoProcedimientoNota: Record<string, TipoProcedimientoNota> = {
  "ortodoncia": "control_ortodoncia",
  "endodoncia": "endodoncia",
  "cirugía oral y maxilofacial": "cirugia",
  "odontopediatría": "odontopediatria",
  "prótesis": "protesis",
};

export function tipoProcedimientoNotaSugerido(
  nombreTratamiento: string,
  catalogo: { nombre: string; especialidad: string }[]
): TipoProcedimientoNota | undefined {
  const normalizado = nombreTratamiento.trim().toLowerCase();
  if (!normalizado) return undefined;
  const procedimiento = catalogo.find((p) => p.nombre.trim().toLowerCase() === normalizado);
  if (!procedimiento) return undefined;
  return especialidadATipoProcedimientoNota[procedimiento.especialidad.trim().toLowerCase()];
}

/** Narra los campos de la plantilla declarativa (prótesis/cirugía/
 * valoración/urgencia) — sin esto, todo lo capturado ahí quedaba fuera de
 * la narrativa firmada. Solo incluye los campos que el profesional llenó,
 * en el mismo orden que se capturan; nunca inventa un valor para un campo
 * vacío. */
export function narrarCamposPlantilla(detalle: DetalleGenerico): string[] {
  const campos = plantillaCamposPorTipo[detalle.tipo];
  if (!campos) return [];
  return campos
    .filter((c) => detalle.camposAdicionales?.[c.key]?.trim())
    .map((c) => `${c.label}: ${detalle.camposAdicionales![c.key].trim()}`);
}
