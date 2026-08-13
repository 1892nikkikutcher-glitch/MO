/** Checklist de referencia para verificar que el consultorio cumple con la
 * normativa sanitaria aplicable en México (COFEPRIS a nivel federal,
 * COPRISEM/COEPRIS a nivel estatal). La lista de puntos es fija — no la
 * edita el usuario — porque es un catálogo de cumplimiento legal, no un
 * catálogo de negocio como Procedimientos o Medicamentos. Lo que sí guarda
 * cada clínica es el estado de cada punto (cumple/no cumple, fecha de
 * verificación y notas). */

export type CategoriaRegulacion =
  | "Avisos y Licencias"
  | "Expediente y Documentación"
  | "Bioseguridad y RPBI"
  | "Personal"
  | "Seguridad del Consultorio";

export type PuntoRegulacion = {
  id: string;
  categoria: CategoriaRegulacion;
  texto: string;
  /** Norma/referencia legal aplicable, para orientar al usuario — texto libre. */
  referencia?: string;
};

export const checklistRegulacionSanitaria: PuntoRegulacion[] = [
  {
    id: "aviso-funcionamiento",
    categoria: "Avisos y Licencias",
    texto: "Aviso de Funcionamiento presentado ante COFEPRIS",
    referencia: "Ley General de Salud, Art. 200 bis",
  },
  {
    id: "aviso-responsable-sanitario",
    categoria: "Avisos y Licencias",
    texto: "Aviso de Responsable Sanitario registrado",
    referencia: "Reglamento de Insumos para la Salud",
  },
  {
    id: "licencia-sanitaria",
    categoria: "Avisos y Licencias",
    texto: "Licencia Sanitaria vigente (si el establecimiento la requiere)",
  },
  {
    id: "registro-coprisem",
    categoria: "Avisos y Licencias",
    texto: "Registro ante COPRISEM (o la comisión estatal correspondiente) al día",
  },
  {
    id: "cedula-visible",
    categoria: "Personal",
    texto: "Cédula profesional del odontólogo(a) responsable, visible en el consultorio",
  },
  {
    id: "capacitacion-rpbi",
    categoria: "Personal",
    texto: "Personal capacitado en manejo de RPBI y bioseguridad",
  },
  {
    id: "expediente-nom004",
    categoria: "Expediente y Documentación",
    texto: "Expediente clínico conforme a la NOM-004-SSA3-2012, conservado mínimo 5 años",
    referencia: "NOM-004-SSA3-2012",
  },
  {
    id: "consentimientos-firmados",
    categoria: "Expediente y Documentación",
    texto: "Consentimientos informados firmados y archivados por paciente",
  },
  {
    id: "aviso-privacidad",
    categoria: "Expediente y Documentación",
    texto: "Aviso de privacidad de datos personales entregado a los pacientes",
    referencia: "LFPDPPP",
  },
  {
    id: "rpbi-contrato",
    categoria: "Bioseguridad y RPBI",
    texto: "Contrato vigente con empresa autorizada para recolección de RPBI",
    referencia: "NOM-087-ECOL-SSA1-2002",
  },
  {
    id: "rpbi-bitacora",
    categoria: "Bioseguridad y RPBI",
    texto: "Bitácora de generación y entrega de RPBI actualizada",
    referencia: "NOM-087-ECOL-SSA1-2002",
  },
  {
    id: "esterilizacion-bitacora",
    categoria: "Bioseguridad y RPBI",
    texto: "Bitácora de esterilización con controles biológicos periódicos del autoclave",
    referencia: "NOM-013-SSA2-2015",
  },
  {
    id: "recetario-especial",
    categoria: "Bioseguridad y RPBI",
    texto: "Recetario especial vigente para medicamentos controlados (si aplica)",
  },
  {
    id: "botiquin-urgencias",
    categoria: "Seguridad del Consultorio",
    texto: "Botiquín / carro de urgencias con medicamentos dentro de su fecha de caducidad",
  },
  {
    id: "senalizacion",
    categoria: "Seguridad del Consultorio",
    texto: "Señalización de seguridad e higiene y salidas de emergencia visibles",
  },
  {
    id: "extintor-vigente",
    categoria: "Seguridad del Consultorio",
    texto: "Extintor(es) con carga vigente",
  },
];

export const categoriasRegulacion: CategoriaRegulacion[] = [
  "Avisos y Licencias",
  "Personal",
  "Expediente y Documentación",
  "Bioseguridad y RPBI",
  "Seguridad del Consultorio",
];

export type EstadoPuntoRegulacion = {
  cumple: boolean;
  fecha?: string;
  notas?: string;
};

export type EstadoRegulacionSanitaria = Record<string, EstadoPuntoRegulacion>;

export const estadoRegulacionInicial: EstadoRegulacionSanitaria = {};
