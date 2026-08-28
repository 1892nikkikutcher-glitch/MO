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
  etapaRealizada: EtapaEndodoncia;
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
  indicacion: string;
  tipoExtraccion: "simple" | "quirurgica";
  tecnicaExtraccion?: string;
  integridadOrganoExtraido?: string;
  revisionAlveolo?: string;
  hemostasia?: string;
  sutura?: { requerida: boolean; material?: string };
};

export type DetalleRestauracion = DetalleProcedimientoBase & {
  tipo: "resina";
  superficiesTratadas: string[];
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
  metodoUsado: ("ultrasonido" | "manual")[];
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
  | DetalleGenerico;

/** Autogenera `actividadRealizada` a partir del tipo y sus campos más
 * distintivos — siempre editable después por el profesional. Nunca inventa
 * datos que no estén ya en el detalle. */
export function actividadRealizadaSugerida(detalle: DetalleProcedimiento): string {
  const organos = detalle.organosDentales.length > 0 ? ` OD ${detalle.organosDentales.join(", ")}` : "";
  switch (detalle.tipo) {
    case "endodoncia":
      return `Endodoncia — ${etapaEndodonciaLabel[detalle.etapaRealizada]}${organos}`;
    case "extraccion":
      return `Extracción ${detalle.tipoExtraccion === "quirurgica" ? "quirúrgica" : "simple"}${organos}`;
    case "resina":
      return `Restauración con resina${organos}`;
    case "limpieza":
      return "Limpieza dental";
    case "control_ortodoncia":
      return "Control de ortodoncia";
    default:
      return detalle.procedimientoNombre ? `${tipoProcedimientoNotaLabel[detalle.tipo]} — ${detalle.procedimientoNombre}` : tipoProcedimientoNotaLabel[detalle.tipo];
  }
}
