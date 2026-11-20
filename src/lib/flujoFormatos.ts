/** Flujo de formatos del expediente clínico odontológico: los 24 formatos del
 * consultorio, en el orden de su hoja en papel ("Flujo de formatos para expediente
 * clínico odontológico"), con el estado de cada uno para un paciente.
 *
 * Tres modos:
 *  - "auto": MO ya guarda esa información (datos del paciente, historia clínica,
 *    presupuestos, notas…); el estado sale de lo capturado, sin que nadie marque nada.
 *  - "manual": es un papel que se imprime y se firma (consentimientos, aviso de
 *    privacidad…); MO no se entera de la firma, así que se marca a mano, como la
 *    columna "Realización SÍ/NO" de la hoja.
 *  - "proximamente": todavía no existe dentro de MO. No cuenta en el avance.
 *
 * Las marcas a mano se guardan en `patient.flujoFormatos` ({ clave: "AAAA-MM-DD" | "na" }). */

export type EtapaFlujo =
  | "Admisión"
  | "Historia clínica y diagnóstico"
  | "Consentimientos específicos"
  | "Ejecución clínica y seguimiento"
  | "Finalización del tratamiento";

export const ETAPAS_FLUJO: EtapaFlujo[] = [
  "Admisión",
  "Historia clínica y diagnóstico",
  "Consentimientos específicos",
  "Ejecución clínica y seguimiento",
  "Finalización del tratamiento",
];

export type ModoFormato = "auto" | "manual" | "proximamente";

export type FormatoFlujo = {
  numero: number;
  clave: string;
  titulo: string;
  etapa: EtapaFlujo;
  modo: ModoFormato;
  /** "Si aplica": se puede marcar como "No aplica" para ese paciente. */
  siAplica?: boolean;
  /** Pestaña del expediente donde se llena (modo auto). */
  pestana?: string;
  /** Página de MO donde se llena cuando no es una pestaña del expediente. */
  pagina?: string;
  /** Documento de la página Documentos que se imprime (modo manual). */
  documento?: string;
};

export const FORMATOS_FLUJO: FormatoFlujo[] = [
  { numero: 1, clave: "datosGenerales", titulo: "Datos generales del paciente (copia de INE)", etapa: "Admisión", modo: "auto", pestana: "Datos del Paciente" },
  { numero: 2, clave: "estudioSocioeconomico", titulo: "Estudio socioeconómico", etapa: "Admisión", modo: "auto", pestana: "Datos del Paciente" },
  { numero: 3, clave: "avisoPrivacidad", titulo: "Aviso de privacidad", etapa: "Admisión", modo: "manual", documento: "avisoPrivacidad" },
  { numero: 4, clave: "consentimientoUsoImagen", titulo: "Consentimiento informado para uso de imagen en plataformas digitales", etapa: "Admisión", modo: "manual", documento: "consentimientoUsoImagen" },

  { numero: 5, clave: "historiaClinica", titulo: "Historia clínica", etapa: "Historia clínica y diagnóstico", modo: "auto", pestana: "Historia Clínica" },
  { numero: 6, clave: "consentimiento", titulo: "Carta de consentimiento informado general", etapa: "Historia clínica y diagnóstico", modo: "manual", documento: "consentimiento" },
  { numero: 7, clave: "diagnosticoTratamiento", titulo: "Diagnóstico y tratamiento", etapa: "Historia clínica y diagnóstico", modo: "auto", pestana: "Plan de Tratamiento y Presupuesto" },
  { numero: 8, clave: "presupuesto", titulo: "Presupuesto odontológico", etapa: "Historia clínica y diagnóstico", modo: "auto", pestana: "Plan de Tratamiento y Presupuesto" },
  { numero: 9, clave: "acuerdoPago", titulo: "Acuerdo de pago (montos menores)", etapa: "Historia clínica y diagnóstico", modo: "manual", siAplica: true, documento: "acuerdoPago" },
  { numero: 10, clave: "contratoServicios", titulo: "Contrato de prestación de servicios odontológicos (montos mayores)", etapa: "Historia clínica y diagnóstico", modo: "manual", siAplica: true, documento: "contratoServicios" },

  { numero: 11, clave: "consentimientoOrtodoncia", titulo: "Consentimiento informado de ortodoncia", etapa: "Consentimientos específicos", modo: "manual", siAplica: true, documento: "consentimientoOrtodoncia" },
  { numero: 12, clave: "consentimientoCirugiaBucal", titulo: "Consentimiento informado de cirugía bucal", etapa: "Consentimientos específicos", modo: "manual", siAplica: true, documento: "consentimientoCirugiaBucal" },
  { numero: 13, clave: "consentimientoEndodoncia", titulo: "Consentimiento informado de endodoncia", etapa: "Consentimientos específicos", modo: "manual", siAplica: true, documento: "consentimientoEndodoncia" },
  { numero: 14, clave: "consentimientoProtesisDental", titulo: "Consentimiento informado de prótesis dental", etapa: "Consentimientos específicos", modo: "manual", siAplica: true, documento: "consentimientoProtesisDental" },

  { numero: 15, clave: "carnetPaciente", titulo: "Carnet", etapa: "Ejecución clínica y seguimiento", modo: "manual", documento: "carnetPaciente" },
  { numero: 16, clave: "calendarioCitas", titulo: "Calendario de citas", etapa: "Ejecución clínica y seguimiento", modo: "proximamente" },
  { numero: 17, clave: "seguimientoCita", titulo: "Formato de seguimiento de cita (asistencia, evolución y reprogramaciones)", etapa: "Ejecución clínica y seguimiento", modo: "proximamente" },
  { numero: 18, clave: "notasEvolucion", titulo: "Notas de evolución", etapa: "Ejecución clínica y seguimiento", modo: "auto", pestana: "Notas de Evolución y Seguimiento" },
  { numero: 19, clave: "receta", titulo: "Receta médico odontológica", etapa: "Ejecución clínica y seguimiento", modo: "auto", siAplica: true, pagina: "recetas" },
  { numero: 20, clave: "historialPagos", titulo: "Historial de pagos", etapa: "Ejecución clínica y seguimiento", modo: "auto", pestana: "Pagos" },
  { numero: 21, clave: "formatoLaboratorio", titulo: "Formato para laboratorio dental", etapa: "Ejecución clínica y seguimiento", modo: "auto", siAplica: true, pestana: "Laboratorios" },

  { numero: 22, clave: "consentimientoConclusionOrtodoncia", titulo: "Consentimiento para la conclusión del tratamiento de ortodoncia", etapa: "Finalización del tratamiento", modo: "manual", siAplica: true, documento: "consentimientoConclusionOrtodoncia" },
  { numero: 23, clave: "consentimientoConformidadProtesis", titulo: "Acuerdo de conformidad de prótesis dental", etapa: "Finalización del tratamiento", modo: "manual", siAplica: true, documento: "consentimientoConformidadProtesis" },
  { numero: 24, clave: "encuestaSatisfaccion", titulo: "Encuesta de satisfacción", etapa: "Finalización del tratamiento", modo: "auto", pagina: "reportes-encuestas" },
];

export type EstadoFormato = "hecho" | "parcial" | "pendiente" | "noAplica" | "proximamente";

/** Lo que MO ya tiene capturado del paciente. Todo son conteos o banderas: este módulo no lee
 * ni muestra datos clínicos, solo si existen. */
export type DatosFlujoFormatos = {
  paciente: {
    name?: string;
    phone?: string;
    birthDate?: string;
    nivelSocioeconomico?: string;
    ingresoFamiliar?: string;
    dependientes?: string;
    tipoVivienda?: string;
    responsablePago?: string;
    /** Marcas a mano: clave → "AAAA-MM-DD" (realizado ese día) o "na" (no aplica). */
    flujoFormatos?: Record<string, string>;
  };
  tieneIne: boolean;
  historiaClinicaCapturada: boolean;
  diagnosticos: number;
  planTratamiento: number;
  presupuestos: number;
  notasEvolucion: number;
  recetas: number;
  pagos: number;
  laboratorios: number;
  encuestasEnviadas: number;
  encuestasRespondidas: number;
};

export type FilaFlujo = {
  formato: FormatoFlujo;
  estado: EstadoFormato;
  /** Texto corto con lo que se encontró, o lo que falta. */
  detalle?: string;
  /** Fecha ISO de la marca a mano, si la hay. */
  marcadoEl?: string;
};

export type ResumenFlujo = {
  /** Formatos que aplican y ya están hechos. */
  hechos: number;
  /** Formatos que aplican (sin "No aplica" ni "Próximamente"). */
  aplicables: number;
  porcentaje: number;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function lleno(valor: string | undefined): boolean {
  return !!valor && valor.trim().length > 0;
}

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

type Evaluacion = { estado: Exclude<EstadoFormato, "noAplica" | "proximamente">; detalle?: string };

function evaluarAuto(clave: string, d: DatosFlujoFormatos): Evaluacion {
  const p = d.paciente;
  switch (clave) {
    case "datosGenerales": {
      const basicos = lleno(p.name) && lleno(p.phone) && lleno(p.birthDate);
      if (!basicos) return { estado: "pendiente", detalle: "Faltan nombre, teléfono o fecha de nacimiento." };
      if (!d.tieneIne) return { estado: "parcial", detalle: "Falta la copia de la INE (Fotografías)." };
      return { estado: "hecho", detalle: "Datos capturados y INE cargada." };
    }
    case "estudioSocioeconomico": {
      if (lleno(p.nivelSocioeconomico)) return { estado: "hecho", detalle: `Nivel ${p.nivelSocioeconomico}.` };
      if ([p.ingresoFamiliar, p.dependientes, p.tipoVivienda, p.responsablePago].some(lleno)) {
        return { estado: "parcial", detalle: "Falta el nivel socioeconómico." };
      }
      return { estado: "pendiente" };
    }
    case "historiaClinica":
      return d.historiaClinicaCapturada ? { estado: "hecho", detalle: "Historia clínica capturada." } : { estado: "pendiente" };
    case "diagnosticoTratamiento": {
      const n = d.diagnosticos + d.planTratamiento;
      return n > 0
        ? { estado: "hecho", detalle: `${plural(d.diagnosticos, "diagnóstico", "diagnósticos")}, ${plural(d.planTratamiento, "renglón de plan", "renglones de plan")}.` }
        : { estado: "pendiente" };
    }
    case "presupuesto":
      return d.presupuestos > 0 ? { estado: "hecho", detalle: plural(d.presupuestos, "presupuesto", "presupuestos") + "." } : { estado: "pendiente" };
    case "notasEvolucion":
      return d.notasEvolucion > 0 ? { estado: "hecho", detalle: plural(d.notasEvolucion, "nota", "notas") + "." } : { estado: "pendiente" };
    case "receta":
      return d.recetas > 0 ? { estado: "hecho", detalle: plural(d.recetas, "receta", "recetas") + "." } : { estado: "pendiente" };
    case "historialPagos":
      return d.pagos > 0 ? { estado: "hecho", detalle: plural(d.pagos, "pago registrado", "pagos registrados") + "." } : { estado: "pendiente" };
    case "formatoLaboratorio":
      return d.laboratorios > 0 ? { estado: "hecho", detalle: plural(d.laboratorios, "orden", "órdenes") + "." } : { estado: "pendiente" };
    case "encuestaSatisfaccion": {
      if (d.encuestasRespondidas > 0) return { estado: "hecho", detalle: "Respondida." };
      if (d.encuestasEnviadas > 0) return { estado: "parcial", detalle: "Enviada; falta registrar la respuesta." };
      return { estado: "pendiente" };
    }
    default:
      return { estado: "pendiente" };
  }
}

export function calcularFlujoFormatos(datos: DatosFlujoFormatos): { filas: FilaFlujo[]; resumen: ResumenFlujo } {
  const marcas = datos.paciente.flujoFormatos ?? {};

  const filas = FORMATOS_FLUJO.map((formato): FilaFlujo => {
    if (formato.modo === "proximamente") return { formato, estado: "proximamente" };

    const marca = marcas[formato.clave];
    if (marca === "na" && formato.siAplica) return { formato, estado: "noAplica" };
    if (marca && ISO.test(marca)) return { formato, estado: "hecho", marcadoEl: marca };

    if (formato.modo === "auto") {
      const { estado, detalle } = evaluarAuto(formato.clave, datos);
      return { formato, estado, detalle };
    }
    return { formato, estado: "pendiente" };
  });

  const aplicables = filas.filter((f) => f.estado !== "noAplica" && f.estado !== "proximamente");
  const hechos = aplicables.filter((f) => f.estado === "hecho").length;
  return {
    filas,
    resumen: {
      hechos,
      aplicables: aplicables.length,
      porcentaje: aplicables.length === 0 ? 0 : Math.round((hechos / aplicables.length) * 100),
    },
  };
}

/** Devuelve el mapa de marcas a mano con el cambio aplicado. `valor` null la quita. */
export function conMarcaFormato(
  actuales: Record<string, string> | undefined,
  clave: string,
  valor: string | null
): Record<string, string> {
  const siguiente = { ...(actuales ?? {}) };
  if (valor === null) delete siguiente[clave];
  else siguiente[clave] = valor;
  return siguiente;
}
