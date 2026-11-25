/** Checklist de referencia para verificar que el consultorio cumple con la
 * normativa sanitaria aplicable en México (COFEPRIS a nivel federal,
 * COPRISEM/ISEM en el Estado de México). La lista de puntos es fija — no la
 * edita el usuario — porque es un catálogo de cumplimiento legal, no un
 * catálogo de negocio como Procedimientos o Medicamentos. Lo que sí guarda
 * cada clínica es el estado de cada punto (calificación, fecha de
 * verificación y notas).
 *
 * Los 43 reactivos de la guía salen de la «Guía para Establecimientos de
 * Atención Estomatológica» (COPRISEM/ISEM, versión agosto 2024); se transcribieron en
 * docs/coprisem-guia-establecimientos-estomatologicos-2024.md. El documento oficial pide
 * Sí/No; aquí se califica de 0 a 2 (0 no cumple, 1 cumple parcialmente, 2 cumple
 * totalmente), como en la visita de verificación. Sí = 2 y No = 0. */

export type CategoriaRegulacion = string;

export type Calificacion = 0 | 1 | 2;

export const ESCALA_CALIFICACION: { valor: Calificacion; etiqueta: string; descripcion: string }[] = [
  { valor: 0, etiqueta: "No cumple", descripcion: "No lo tienes o no se hace" },
  { valor: 1, etiqueta: "Parcial", descripcion: "Cumples solo una parte del punto" },
  { valor: 2, etiqueta: "Cumple", descripcion: "Lo cumples por completo" },
];

export type PuntoRegulacion = {
  id: string;
  categoria: CategoriaRegulacion;
  /** Número del reactivo en la guía COPRISEM (los complementarios no lo tienen). */
  numero?: number;
  texto: string;
  /** Lo que el reactivo enumera con detalle (instrumental, contenido del expediente…). */
  detalle?: string;
  /** Norma/referencia legal aplicable, para orientar al usuario — texto libre. */
  referencia?: string;
  /** Solo cuenta en la calificación si el consultorio lo evalúa (por ejemplo, el instrumental de una especialidad que sí ofrece). */
  soloSiAplica?: boolean;
  /** Punto que existía antes de la guía y que este reemplaza: lo ya marcado se conserva. */
  migraDesde?: string;
  /** No viene en la guía COPRISEM: se muestra aparte y no entra en su calificación. */
  complementario?: boolean;
};

const CAT = {
  doc: "Documentación",
  personal: "Personal y archivo clínico",
  manos: "Lavado de manos",
  insumos: "Medicamentos e insumos",
  control: "Control y mantenimiento",
  servicios: "Prestación de servicios odontológicos",
  equipo: "Equipamiento",
  infra: "Infraestructura",
  residuos: "Residuos (RPBI y mercurio)",
  agua: "Agua potable",
  especialidad: "Instrumental por especialidad",
  info: "Información complementaria",
  extra: "Complementarios (no vienen en la guía COPRISEM)",
} as const;

export const checklistRegulacionSanitaria: PuntoRegulacion[] = [
  // I. Documentación
  { id: "g01", numero: 1, categoria: CAT.doc, texto: "Se cuenta con Aviso de Funcionamiento", referencia: "Ley General de Salud, Art. 200 bis", migraDesde: "aviso-funcionamiento" },
  { id: "g02", numero: 2, categoria: CAT.doc, texto: "Se cuenta con Aviso de Responsable Sanitario", referencia: "Reglamento de Insumos para la Salud", migraDesde: "aviso-responsable-sanitario" },
  {
    id: "g03",
    numero: 3,
    categoria: CAT.doc,
    texto: "Título profesional y cédula(s) profesional(es) del odontólogo(s) y/o especialista(s), a la vista del público",
    migraDesde: "cedula-visible",
  },
  { id: "g04", numero: 4, categoria: CAT.doc, texto: "Registro diario de pacientes" },

  // II. Documentación del personal de la salud y archivo clínico
  { id: "g05", numero: 5, categoria: CAT.personal, texto: "La documentación del personal de salud (odontólogos, especialistas, técnicos y auxiliares) está completa, acorde a los servicios que se ofrecen" },
  {
    id: "g06",
    numero: 6,
    categoria: CAT.personal,
    texto: "Recetario médico impreso con los datos completos del médico",
    detalle:
      "Nombre del médico, institución que expide el título, número de cédula profesional, domicilio del establecimiento, fecha de expedición y, en su caso, número de cédula de especialidad.",
  },
  {
    id: "g07",
    numero: 7,
    categoria: CAT.personal,
    texto: "Expedientes clínicos completos y ordenados, conservados por un mínimo de cinco años",
    detalle:
      "Identificación del consultorio; nombre del estomatólogo; ficha de identificación del paciente (nombre, sexo, edad, domicilio y lugar de residencia); fecha (día, mes y año); interrogatorio (padecimiento actual, motivo de la consulta, antecedentes heredofamiliares, personales patológicos y no patológicos, padecimientos sistémicos y bucales previos, aparatos y sistemas); exploración física (cavidad oral, cabeza y cuello, signos vitales); odontograma inicial y final; estudios de gabinete y laboratorio en su caso; diagnóstico; fecha de la primera consulta y de las subsecuentes; nombre y firma del odontólogo y del paciente o su representante legal; notas de evolución; nota de interconsulta y de referencia en su caso; carta de consentimiento bajo información; hoja de egreso voluntario o alta en su caso.",
    referencia: "NOM-004-SSA3-2012",
    migraDesde: "expediente-nom004",
  },

  // III. Lavado de manos
  { id: "g08", numero: 8, categoria: CAT.manos, texto: "Jabón antiséptico líquido, agua potable y toallas desechables para el lavado de manos" },
  { id: "g09", numero: 9, categoria: CAT.manos, texto: "El personal se lava las manos antes y después de revisar a cada paciente y/o en cada procedimiento" },

  // IV. Medicamentos e insumos
  {
    id: "g10",
    numero: 10,
    categoria: CAT.insumos,
    texto: "Medicamentos e insumos con caducidad vigente, registro sanitario y almacenamiento según el fabricante",
    detalle:
      "En un establecimiento privado no debe haber medicamentos del Sector Salud público, y debe existir una política para el manejo de soluciones de uso pediátrico.",
  },
  { id: "g11", numero: 11, categoria: CAT.insumos, texto: "Se utilizan solo amalgamas en presentación de cápsulas predosificadas" },

  // V. Control y mantenimiento
  { id: "g12", numero: 12, categoria: CAT.control, texto: "Comprobante de control y erradicación de fauna nociva con menos de 365 días naturales" },
  { id: "g13", numero: 13, categoria: CAT.control, texto: "Registro o bitácora de esterilización del instrumental empleado en la atención del paciente", migraDesde: "esterilizacion-bitacora" },
  { id: "g14", numero: 14, categoria: CAT.control, texto: "Establecimiento limpio y aseado, sin residuos de alimentos, bebidas o cigarro" },

  // VI. Prestación de servicios odontológicos
  { id: "g15", numero: 15, categoria: CAT.servicios, texto: "El estomatólogo tiene capacitación en maniobras básicas de reanimación cardiopulmonar (RCP)" },
  {
    id: "g16",
    numero: 16,
    categoria: CAT.servicios,
    texto: "Botiquín de primeros auxilios con insumos acordes a las urgencias que puedan presentarse",
    detalle:
      "Algodón; gasas; guantes; cubrebocas; jeringas desechables; tiras reactivas para glucosa; cloruro de sodio 0.9 %; alcohol al 70°; agua bidestilada; adrenalina (epinefrina) solución inyectable 1 mg/ml; ketorolaco solución inyectable 30 mg; ketorolaco tabletas de 10 mg.",
    migraDesde: "botiquin-urgencias",
  },
  { id: "g17", numero: 17, categoria: CAT.servicios, texto: "Insumos de protección para el estomatólogo", detalle: "Bata o filipina limpia, anteojos o careta, guantes y cubrebocas desechables." },
  {
    id: "g18",
    numero: 18,
    categoria: CAT.servicios,
    texto: "Insumos desechables de protección para el paciente",
    detalle: "Baberos y/o campos quirúrgicos, eyectores de saliva, vasos desechables y lentes protectores.",
  },
  { id: "g19", numero: 19, categoria: CAT.servicios, texto: "Cartucho de anestesia y aguja exclusivos por paciente y con fecha de caducidad vigente" },

  // VII. Equipamiento
  { id: "g20", numero: 20, categoria: CAT.equipo, texto: "Mobiliario, materiales, equipo e insumos necesarios y acordes al servicio que se presta" },
  {
    id: "g21",
    numero: 21,
    categoria: CAT.equipo,
    texto: "Equipo y mobiliario del consultorio dental",
    detalle:
      "Sala de espera; mueble para escribir con asientos para el paciente y acompañante(s); sanitario; mesa con tarja; autoclave o esterilizador eléctrico; compresora de aire libre de aceite; mueble para guarda de material, instrumental y equipos; mueble para guarda de expedientes clínicos; asiento para el odontólogo; sillón dental con plataforma y respaldo reclinable; charola porta instrumentos; lámpara; sistema flush abastecedor de agua para la pieza de mano y la jeringa triple.",
  },
  {
    id: "g22",
    numero: 22,
    categoria: CAT.equipo,
    texto: "Instrumental del apéndice normativo B de la NOM-005-SSA3-2018, en óptimas condiciones de limpieza, funcionamiento y mantenimiento",
    referencia: "NOM-005-SSA3-2018",
  },
  { id: "g23", numero: 23, categoria: CAT.equipo, texto: "Mandil protector para la toma radiográfica del paciente" },

  // VIII. Infraestructura
  { id: "g24", numero: 24, categoria: CAT.infra, texto: "Instalaciones hidráulica y eléctrica adecuadas para la prestación del servicio" },
  { id: "g25", numero: 25, categoria: CAT.infra, texto: "Área de lavado, desinfección, preparación y esterilización de material e instrumental" },
  {
    id: "g26",
    numero: 26,
    categoria: CAT.infra,
    texto: "Constancia del correcto funcionamiento del equipo de esterilización y evidencia de testigos biológicos cada dos meses",
    detalle: "Los testigos biológicos son el control de calidad de los ciclos de esterilización.",
  },
  {
    id: "g27",
    numero: 27,
    categoria: CAT.infra,
    texto: "Cubiertas desechables o desinfección entre cada paciente de las áreas de contacto",
    detalle: "Lámpara de la unidad dental, lámpara de fotocurado, escupidera, aparato de rayos X, cabezal y bracera de la unidad dental.",
  },
  {
    id: "g28",
    numero: 28,
    categoria: CAT.infra,
    texto: "Esterilización de piezas de mano y contra-ángulos; esterilización o desecho de puntas y fresas",
    detalle:
      "Se esterilizan las piezas de mano de alta y baja velocidad y los contra-ángulos; se esterilizan o desechan las puntas de la jeringa triple, la cureta ultrasónica, las fresas y las piedras rotatorias.",
  },

  // IX. RPBI y X. Mercurio
  {
    id: "g29",
    numero: 29,
    categoria: CAT.residuos,
    texto: "Los RPBI se separan y envasan según sus características físicas y biológico-infecciosas, sin mezclarse con otros residuos",
    referencia: "NOM-087-SEMARNAT-SSA1-2002",
  },
  {
    id: "g30",
    numero: 30,
    categoria: CAT.residuos,
    texto: "Contrato vigente con empresa recolectora de RPBI y manifiestos de recolección (o constancia de incorporación a uno existente)",
    referencia: "NOM-087-SEMARNAT-SSA1-2002",
    migraDesde: "rpbi-contrato",
  },
  { id: "g31", numero: 31, categoria: CAT.residuos, texto: "El mercurio residual se guarda en frascos de plástico con agua, cerrados herméticamente" },

  // XI. Agua potable
  { id: "g32", numero: 32, categoria: CAT.agua, texto: "Sistema de abastecimiento de agua potable" },
  { id: "g33", numero: 33, categoria: CAT.agua, texto: "Procedimiento, programa y registros de monitoreo de cloro residual en las diferentes áreas" },
  { id: "g34", numero: 34, categoria: CAT.agua, texto: "Limpieza y mantenimiento de las cisternas por lo menos una vez al año" },

  // XII–XVIII. Instrumental por especialidad: solo cuenta si se evalúa.
  {
    id: "g35",
    numero: 35,
    categoria: CAT.especialidad,
    texto: "Endodoncia: instrumental mínimo en condiciones de higiene y mantenimiento",
    detalle: "Espaciador de conductos, explorador endodóntico, lámpara de fotocurado, limas de diferentes tipos y medidas, pinzas de corte distal, recortador de gutapercha, regla de anillo metálica para conductometría.",
    soloSiAplica: true,
  },
  {
    id: "g36",
    numero: 36,
    categoria: CAT.especialidad,
    texto: "Periodoncia: instrumental mínimo en condiciones de higiene y mantenimiento",
    detalle: "Sonda periodontal Goldman Fox, mango de bisturís, excavador E2.",
    soloSiAplica: true,
  },
  {
    id: "g37",
    numero: 37,
    categoria: CAT.especialidad,
    texto: "Ortodoncia: instrumental mínimo en condiciones de higiene y mantenimiento",
    detalle:
      "Arcos de nitinol, empujador de bandas metálicas, estrella posicionadora de bandas, lápiz ligador, lima para bandas, pinza How curva y recta, pinza de la rosa, pinza para abombar, pinza para hacer banda derecha e izquierda, pinza pico de pájaro corta y larga, pinza de tres picos, pinza de corte de alambre ligero y pesado, pinzas mosco, pucher, soplete dental para soldar.",
    soloSiAplica: true,
  },
  {
    id: "g38",
    numero: 38,
    categoria: CAT.especialidad,
    texto: "Odontopediatría: instrumental mínimo en condiciones de higiene y mantenimiento",
    detalle: "Abrebocas, pinzas para abombar coronas.",
    soloSiAplica: true,
  },
  {
    id: "g39",
    numero: 39,
    categoria: CAT.especialidad,
    texto: "Cirugía maxilofacial: instrumental mínimo en condiciones de higiene y mantenimiento",
    detalle: "Lápiz ligador, porta agujas, mango para bisturí, retractor gingival.",
    soloSiAplica: true,
  },
  {
    id: "g40",
    numero: 40,
    categoria: CAT.especialidad,
    texto: "Ortopedia maxilofacial: instrumental mínimo en condiciones de higiene y mantenimiento",
    detalle: "Arcos de nitinol, lápiz ligador, pinza para hacer banda derecha e izquierda.",
    soloSiAplica: true,
  },
  {
    id: "g41",
    numero: 41,
    categoria: CAT.especialidad,
    texto: "Implantología dental: instrumental y equipo mínimo en condiciones de higiene y mantenimiento",
    detalle: "Equipo de rayos X, negatoscopio, sistema de revelado.",
    soloSiAplica: true,
  },

  // XIX. Información complementaria
  {
    id: "g42",
    numero: 42,
    categoria: CAT.info,
    texto: "Determinación de cloro residual en al menos tres puntos",
    detalle: "Incluye la cisterna o depósito, la salida de la misma y otros puntos de la red de distribución interna. Se anota el número de muestra, la localización del punto de muestreo y el resultado.",
  },
  { id: "g43", numero: 43, categoria: CAT.info, texto: "Procedimiento descrito para la desinfección del instrumental, las instalaciones y el equipo" },

  // Puntos de la versión anterior que la guía no trae: se conservan aparte.
  { id: "licencia-sanitaria", categoria: CAT.extra, complementario: true, texto: "Licencia Sanitaria vigente (si el establecimiento la requiere)" },
  { id: "registro-coprisem", categoria: CAT.extra, complementario: true, texto: "Registro ante COPRISEM (o la comisión estatal correspondiente) al día" },
  { id: "capacitacion-rpbi", categoria: CAT.extra, complementario: true, texto: "Personal capacitado en manejo de RPBI y bioseguridad" },
  { id: "consentimientos-firmados", categoria: CAT.extra, complementario: true, texto: "Consentimientos informados firmados y archivados por paciente" },
  { id: "aviso-privacidad", categoria: CAT.extra, complementario: true, texto: "Aviso de privacidad de datos personales entregado a los pacientes", referencia: "LFPDPPP" },
  { id: "rpbi-bitacora", categoria: CAT.extra, complementario: true, texto: "Bitácora de generación y entrega de RPBI actualizada", referencia: "NOM-087-SEMARNAT-SSA1-2002" },
  { id: "recetario-especial", categoria: CAT.extra, complementario: true, texto: "Recetario especial vigente para medicamentos controlados (si aplica)" },
  { id: "senalizacion", categoria: CAT.extra, complementario: true, texto: "Señalización de seguridad e higiene y salidas de emergencia visibles" },
  { id: "extintor-vigente", categoria: CAT.extra, complementario: true, texto: "Extintor(es) con carga vigente" },
];

export const categoriasRegulacion: CategoriaRegulacion[] = [
  CAT.doc,
  CAT.personal,
  CAT.manos,
  CAT.insumos,
  CAT.control,
  CAT.servicios,
  CAT.equipo,
  CAT.infra,
  CAT.residuos,
  CAT.agua,
  CAT.especialidad,
  CAT.info,
  CAT.extra,
];

export type EstadoPuntoRegulacion = {
  /** Se conserva por compatibilidad con lo guardado antes de la escala 0–2: equivale a calificación 2. */
  cumple: boolean;
  /** 0 no cumple, 1 parcial, 2 cumple; null/ausente = todavía sin evaluar. */
  calificacion?: Calificacion | null;
  /** No corresponde a este consultorio: no cuenta en la calificación. */
  noAplica?: boolean;
  fecha?: string;
  notas?: string;
};

export type EstadoRegulacionSanitaria = Record<string, EstadoPuntoRegulacion>;

export const estadoRegulacionInicial: EstadoRegulacionSanitaria = {};

/** El estado de un punto; si es de la guía y todavía no tiene registro propio, hereda el del punto anterior que reemplaza. */
export function estadoDePunto(punto: PuntoRegulacion, estados: EstadoRegulacionSanitaria): EstadoPuntoRegulacion {
  return estados[punto.id] ?? (punto.migraDesde ? estados[punto.migraDesde] : undefined) ?? { cumple: false };
}

export type EvaluacionPunto = {
  /** null = sin evaluar. */
  calificacion: Calificacion | null;
  /** false = no cuenta (No aplica, o instrumental de una especialidad que no se ha evaluado). */
  aplica: boolean;
};

export function evaluarPunto(punto: PuntoRegulacion, estados: EstadoRegulacionSanitaria): EvaluacionPunto {
  const estado = estadoDePunto(punto, estados);
  const calificacion: Calificacion | null = estado.calificacion ?? (estado.cumple ? 2 : null);
  if (estado.noAplica) return { calificacion: null, aplica: false };
  if (punto.soloSiAplica && calificacion === null) return { calificacion: null, aplica: false };
  return { calificacion, aplica: true };
}

export type Cumplimiento = {
  obtenidos: number;
  maximo: number;
  /** 0–100, redondeado. */
  porcentaje: number;
  /** Puntos que cuentan (aplican). */
  total: number;
  evaluados: number;
  pendientes: number;
  noAplican: number;
};

export function calcularCumplimiento(puntos: PuntoRegulacion[], estados: EstadoRegulacionSanitaria): Cumplimiento {
  let obtenidos = 0;
  let total = 0;
  let evaluados = 0;
  let noAplican = 0;
  for (const p of puntos) {
    const e = evaluarPunto(p, estados);
    if (!e.aplica) {
      noAplican += 1;
      continue;
    }
    total += 1;
    if (e.calificacion !== null) {
      evaluados += 1;
      obtenidos += e.calificacion;
    }
  }
  const maximo = total * 2;
  return {
    obtenidos,
    maximo,
    porcentaje: maximo > 0 ? Math.round((obtenidos / maximo) * 100) : 0,
    total,
    evaluados,
    pendientes: total - evaluados,
    noAplican,
  };
}

/** Los puntos de la guía COPRISEM (los que cuentan en su calificación). */
export const puntosDeLaGuia = checklistRegulacionSanitaria.filter((p) => !p.complementario);
export const puntosComplementarios = checklistRegulacionSanitaria.filter((p) => p.complementario);
