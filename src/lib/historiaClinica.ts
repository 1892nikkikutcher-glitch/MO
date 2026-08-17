/** Plantilla configurable de la Historia Clínica: el dueño de la clínica
 * puede agregar, quitar, reordenar y editar secciones/preguntas desde
 * Administración > Historial Clínico, y ese mismo cambio se refleja de
 * inmediato en la pestaña "Historia Clínica" de cada paciente. */

export type TipoPregunta = "sino" | "texto" | "textarea" | "chips" | "odontograma" | "listaPrioridad";

export const tipoPreguntaLabel: Record<TipoPregunta, string> = {
  sino: "Sí / No",
  texto: "Texto corto",
  textarea: "Texto largo",
  chips: "Opciones múltiples",
  odontograma: "Odontograma",
  listaPrioridad: "Lista numerada (plan de tratamiento)",
};

export type PreguntaTemplate = {
  id: string;
  tipo: TipoPregunta;
  etiqueta: string;
  /** Solo para tipo "chips". */
  opciones?: string[];
  /** Solo para tipo "texto": ej. "Ej. 120/80". */
  placeholder?: string;
};

export type SeccionTemplate = {
  id: string;
  titulo: string;
  preguntas: PreguntaTemplate[];
};

export type HistoriaClinicaTemplate = {
  secciones: SeccionTemplate[];
};

function id(prefijo: string) {
  return `${prefijo}${Math.random().toString(36).slice(2, 9)}`;
}

/** La historia clínica proporcionada por el usuario, precargada tal cual
 * como plantilla inicial editable. */
export const plantillaInicial: HistoriaClinicaTemplate = {
  secciones: [
    {
      id: id("sec"),
      titulo: "Motivo de Consulta",
      preguntas: [
        { id: id("p"), tipo: "textarea", etiqueta: "Motivo de consulta", placeholder: "Describe el motivo de la consulta..." },
      ],
    },
    {
      id: id("sec"),
      titulo: "Antecedentes Patológicos. Usted presenta:",
      preguntas: [
        "Enfermedades del corazón",
        "Presión alta o baja",
        "Hepatitis, otras enfermedades del hígado",
        "Problemas del estómago, úlceras, gastritis",
        "Alergias: drogas, alimentos, medicamentos, anestesia",
        "SIDA",
        "Tumores, cáncer",
        "Anemia u otra enfermedad de la sangre, especificar",
        "Enfermedades venéreas (sífilis, gonorrea, etc.)",
        "Herpes",
        "Diabetes",
      ].map((etiqueta) => ({ id: id("p"), tipo: "sino" as const, etiqueta })),
    },
    {
      id: id("sec"),
      titulo: "Antecedentes No Patológicos",
      preguntas: [{ id: id("p"), tipo: "textarea", etiqueta: "Antecedentes no patológicos" }],
    },
    {
      id: id("sec"),
      titulo: "Medicación: ¿Está usted tomando…?",
      preguntas: [
        { id: id("p"), tipo: "texto", etiqueta: "Medicamentos" },
        { id: id("p"), tipo: "sino", etiqueta: "Alcohol" },
        { id: id("p"), tipo: "sino", etiqueta: "Tabaco" },
        { id: id("p"), tipo: "sino", etiqueta: "Drogas" },
      ],
    },
    {
      id: id("sec"),
      titulo: "Antecedentes Gineco – Obstétricos",
      preguntas: [
        { id: id("p"), tipo: "sino", etiqueta: "¿Se controla con anticonceptivos?" },
        { id: id("p"), tipo: "sino", etiqueta: "¿Toma hormonas?" },
        { id: id("p"), tipo: "sino", etiqueta: "¿Está usted embarazada?" },
        { id: id("p"), tipo: "texto", etiqueta: "¿De cuántos meses?" },
      ],
    },
    {
      id: id("sec"),
      titulo: "Signos Vitales",
      preguntas: [
        { id: id("p"), tipo: "texto", etiqueta: "Tensión arterial", placeholder: "Ej. 120/80" },
        { id: id("p"), tipo: "texto", etiqueta: "Temperatura", placeholder: "°C" },
        { id: id("p"), tipo: "texto", etiqueta: "Frecuencia cardiaca", placeholder: "lpm" },
        { id: id("p"), tipo: "texto", etiqueta: "Frecuencia respiratoria", placeholder: "rpm" },
      ],
    },
    {
      id: id("sec"),
      titulo: "Exploración Física",
      preguntas: [
        { id: id("p"), tipo: "texto", etiqueta: "Piel de la cara" },
        { id: id("p"), tipo: "texto", etiqueta: "Peso", placeholder: "kg" },
        { id: id("p"), tipo: "texto", etiqueta: "Talla", placeholder: "cm" },
      ],
    },
    {
      id: id("sec"),
      titulo: "Examen Clínico Estomatológico — Articulación temporomandibular",
      preguntas: [
        "Ruidos al abrir o cerrar la boca",
        "Dolor a la apertura",
        "Dolor al cierre",
        "Dificultad para abrir la boca",
      ].map((etiqueta) => ({ id: id("p"), tipo: "sino" as const, etiqueta })),
    },
    {
      id: id("sec"),
      titulo: "Examen Clínico Estomatológico — Ganglios",
      preguntas: [
        { id: id("p"), tipo: "chips", etiqueta: "Ganglios (grupo 1)", opciones: ["Palpables", "Único", "Adherido", "Múltiple", "Móvil"] },
        { id: id("p"), tipo: "chips", etiqueta: "Ganglios (grupo 2)", opciones: ["Supuración", "Unilateral", "Duro", "Bilateral", "Blando"] },
      ],
    },
    {
      id: id("sec"),
      titulo: "Examen Clínico Estomatológico — Tejidos",
      preguntas: [
        { id: id("p"), tipo: "texto", etiqueta: "Labios" },
        { id: id("p"), tipo: "texto", etiqueta: "Lengua" },
        { id: id("p"), tipo: "texto", etiqueta: "Región vestibular" },
        { id: id("p"), tipo: "texto", etiqueta: "Tejidos blandos" },
        { id: id("p"), tipo: "texto", etiqueta: "Tejidos duros" },
      ],
    },
    {
      id: id("sec"),
      titulo: "Examen de Oclusión",
      preguntas: [
        { id: id("p"), tipo: "texto", etiqueta: "Clase molar", placeholder: "Ej. Clase I bilateral" },
        { id: id("p"), tipo: "texto", etiqueta: "Clase canina", placeholder: "Ej. Clase I bilateral" },
        { id: id("p"), tipo: "texto", etiqueta: "Overjet (sobremordida horizontal)", placeholder: "Ej. 2 mm" },
        { id: id("p"), tipo: "texto", etiqueta: "Overbite (sobremordida vertical)", placeholder: "Ej. 3 mm / 30%" },
        { id: id("p"), tipo: "texto", etiqueta: "Apiñamiento", placeholder: "Ej. Leve en incisivos inferiores" },
        { id: id("p"), tipo: "texto", etiqueta: "Giroversiones", placeholder: "Ej. OD 12 rotado 20°" },
        { id: id("p"), tipo: "texto", etiqueta: "Tipo de dentición", placeholder: "Ej. Permanente / Mixta / Temporal" },
        { id: id("p"), tipo: "textarea", etiqueta: "Otras observaciones de oclusión" },
      ],
    },
    {
      id: id("sec"),
      titulo: "Odontograma Diagnóstico",
      preguntas: [{ id: id("p"), tipo: "odontograma", etiqueta: "Odontograma" }],
    },
    {
      id: id("sec"),
      titulo: "Higiene Bucal",
      preguntas: [
        { id: id("p"), tipo: "sino", etiqueta: "¿Se cepilla usted los dientes?" },
        { id: id("p"), tipo: "texto", etiqueta: "Frecuencia diaria del cepillado", placeholder: "Ej. 3 veces al día" },
        { id: id("p"), tipo: "chips", etiqueta: "Usted utiliza", opciones: ["Hilo dental", "Cepillos interproximales", "Palillos dentales", "Dentífrico", "Enjuague"] },
        { id: id("p"), tipo: "texto", etiqueta: "Porcentaje de placa", placeholder: "%" },
        { id: id("p"), tipo: "texto", etiqueta: "Porcentaje de sarro", placeholder: "%" },
      ],
    },
    {
      id: id("sec"),
      titulo: "Si usted padece otra enfermedad que no se mencione en la historia clínica o tiene algún otro padecimiento, especifique:",
      preguntas: [{ id: id("p"), tipo: "textarea", etiqueta: "Otra enfermedad o padecimiento" }],
    },
    {
      id: id("sec"),
      titulo: "Diagnóstico Sistémico",
      preguntas: [{ id: id("p"), tipo: "textarea", etiqueta: "Diagnóstico sistémico" }],
    },
    {
      id: id("sec"),
      titulo: "Diagnóstico Bucal",
      preguntas: [{ id: id("p"), tipo: "textarea", etiqueta: "Diagnóstico bucal" }],
    },
    {
      id: id("sec"),
      titulo: "Plan de Tratamiento por Prioridad",
      preguntas: [{ id: id("p"), tipo: "listaPrioridad", etiqueta: "Plan de tratamiento" }],
    },
  ],
};

export type RespuestaValor = string | string[] | number[];

/** Un diagnóstico anotado sobre uno o varios dientes del odontograma (ej.
 * "Caries de segundo grado clase I" marcado en 3 piezas a la vez). Se
 * guarda en la respuesta de la pregunta tipo "odontograma" como
 * `DiagnosticoOdontograma[]` — igual que "listaPrioridad" ya guarda su
 * propio tipo por dentro de `RespuestaValor` vía un cast, en vez de
 * ampliar la unión para cada tipo de pregunta nuevo. `tratamientoSugerido`
 * es el criterio del médico para prellenar el presupuesto (ej. una caries
 * clase I sugiere "Resina clase I"), no un cálculo automático. */
export type DiagnosticoOdontograma = {
  id: string;
  dientes: number[];
  diagnostico: string;
  tratamientoSugerido?: string;
  /** ISO date — cuándo se anotó el diagnóstico. */
  fecha: string;
  /** ISO date — se llena solo cuando este diagnóstico se usa para
   * prellenar un renglón de presupuesto (ver NuevoPresupuesto), como
   * registro de que ya se presupuestó y cuándo. */
  fechaPresupuesto?: string;
};

/** Antes de este cambio, la respuesta de una pregunta "odontograma" era
 * simplemente `number[]` (dientes marcados, sin diagnóstico). Para no
 * perder selecciones ya guardadas, se migran a una sola entrada con
 * diagnóstico vacío — se sigue viendo el mismo grupo de dientes marcado,
 * y basta con editarla para ponerle el diagnóstico. Nunca se escribe sola
 * — solo se usa al leer, hasta que el usuario la edite y guarde. */
export function valorOdontogramaComoDiagnosticos(valor: RespuestaValor | undefined): DiagnosticoOdontograma[] {
  if (!valor || !Array.isArray(valor)) return [];
  if (valor.length === 0) return [];
  if (typeof valor[0] === "number") {
    return [
      {
        id: "migrado",
        dientes: valor as number[],
        diagnostico: "",
        fecha: "",
      },
    ];
  }
  return (valor as unknown as DiagnosticoOdontograma[]) ?? [];
}

/** Junta los diagnósticos de odontograma de TODAS las preguntas tipo
 * "odontograma" de la plantilla (normalmente solo hay una) en una sola
 * lista, cada uno con el id de su pregunta de origen — para poder
 * encontrarlos y actualizarlos (ej. al presupuestarlos) sin que quien los
 * usa necesite saber en qué pregunta viven. */
export function todosLosDiagnosticosOdontograma(
  template: HistoriaClinicaTemplate,
  respuestas: RespuestasHistoriaClinica
): { preguntaId: string; diagnostico: DiagnosticoOdontograma }[] {
  const resultado: { preguntaId: string; diagnostico: DiagnosticoOdontograma }[] = [];
  for (const seccion of template.secciones) {
    for (const pregunta of seccion.preguntas) {
      if (pregunta.tipo !== "odontograma") continue;
      const entradas = valorOdontogramaComoDiagnosticos(respuestas.porPregunta[pregunta.id]);
      for (const diagnostico of entradas) {
        resultado.push({ preguntaId: pregunta.id, diagnostico });
      }
    }
  }
  return resultado;
}

export type RespuestasHistoriaClinica = {
  porPregunta: Record<string, RespuestaValor>;
  /** Campo fijo, siempre presente sin importar cómo se configure la
   * plantilla — texto libre con las sustancias a las que el paciente es
   * alérgico (ej. "Penicilina, Aspirina"). Se usa para mostrar una alerta
   * de seguridad en el expediente y al recetar. */
  alergias?: string;
  /** ISO datetime de la última vez que se guardó/actualizó este historial —
   * el expediente debe conservarse mínimo 5 años por ley, así que queda
   * registro de cuándo se capturó o modificó cada vez. */
  actualizadoEn?: string;
};

export const respuestasVacias: RespuestasHistoriaClinica = { porPregunta: {}, alergias: "" };

/** Secciones de la historia clínica que representan antecedentes o
 * diagnóstico sistémico (enfermedades crónico-degenerativas, alergias,
 * etc.) — se usan para armar la alerta del expediente. Se detectan por
 * título en vez de por id fijo porque la plantilla es editable por el
 * doctor, así que también atrapa secciones renombradas o agregadas que
 * seguían el mismo patrón ("Antecedentes Patológicos...", "Diagnóstico
 * Sistémico"). */
export function esSeccionAntecedentesPatologicos(titulo: string): boolean {
  const t = titulo.toLowerCase();
  return t.includes("antecedente") && t.includes("patol");
}

export function esSeccionDiagnosticoSistemico(titulo: string): boolean {
  const t = titulo.toLowerCase();
  return t.includes("diagnóstico sistémico") || t.includes("diagnostico sistemico");
}

function esSeccionSistemica(titulo: string): boolean {
  return esSeccionAntecedentesPatologicos(titulo) || esSeccionDiagnosticoSistemico(titulo);
}

/** Convención de guardado para el detalle opcional de una pregunta "sino"
 * (ej. "desde cuándo, si está controlada, con qué se controla") — se
 * guarda como una respuesta más en porPregunta, bajo una clave derivada,
 * en vez de ampliar RespuestaValor para no tocar el resto de tipos de
 * pregunta que no lo necesitan. */
export function claveDetalleSiNo(preguntaId: string): string {
  return `${preguntaId}__detalle`;
}

/** Junta los antecedentes patológicos marcados "Sí" (con su detalle, si se
 * capturó) en líneas de texto — se usa para rellenar en automático el
 * campo de Diagnóstico Sistémico mientras el doctor no lo haya editado a
 * mano (ver HistoriaClinica.tsx). Deliberadamente NO incluye el propio
 * Diagnóstico Sistémico (a diferencia de condicionesSistemicasPositivas),
 * porque ese es justo el campo que se va a rellenar con este resultado. */
export function resumenAntecedentesPatologicos(
  template: HistoriaClinicaTemplate,
  respuestas: RespuestasHistoriaClinica
): string {
  const lineas: string[] = [];
  for (const seccion of template.secciones) {
    if (!esSeccionAntecedentesPatologicos(seccion.titulo)) continue;
    for (const pregunta of seccion.preguntas) {
      if (pregunta.tipo !== "sino") continue;
      if (respuestas.porPregunta[pregunta.id] !== "si") continue;
      const detalle = respuestas.porPregunta[claveDetalleSiNo(pregunta.id)];
      const detalleTexto = typeof detalle === "string" ? detalle.trim() : "";
      lineas.push(detalleTexto ? `${pregunta.etiqueta}: ${detalleTexto}` : pregunta.etiqueta);
    }
  }
  return lineas.join("\n");
}

/** Igual que `esSeccionSistemica`: detecta por título (no por id fijo) para
 * seguir funcionando aunque la sección se haya renombrado, ya que la
 * plantilla es editable. Se usa para ocultar la sección en pacientes con
 * sexo masculino, donde no aplica. */
export function esSeccionGinecoObstetrica(titulo: string): boolean {
  return titulo.toLowerCase().includes("gineco");
}

export type CondicionSistemica = { etiqueta: string; detalle: string };

/** Antecedentes patológicos marcados "Sí" y el texto del Diagnóstico
 * Sistémico (si tiene contenido) — para alertar de enfermedades
 * crónico-degenerativas u otros diagnósticos sistémicos relevantes antes
 * de tratar o recetar a un paciente. No incluye alergias específicas: esas
 * ya tienen su propia alerta dedicada (`alergias`). */
export function condicionesSistemicasPositivas(
  template: HistoriaClinicaTemplate,
  respuestas: RespuestasHistoriaClinica
): CondicionSistemica[] {
  const resultado: CondicionSistemica[] = [];
  for (const seccion of template.secciones) {
    if (!esSeccionSistemica(seccion.titulo)) continue;
    for (const pregunta of seccion.preguntas) {
      const valor = respuestas.porPregunta[pregunta.id];
      if (pregunta.tipo === "sino" && valor === "si") {
        const detalle = respuestas.porPregunta[claveDetalleSiNo(pregunta.id)];
        const detalleTexto = typeof detalle === "string" ? detalle.trim() : "";
        resultado.push({ etiqueta: pregunta.etiqueta, detalle: detalleTexto || "Sí" });
      } else if (
        (pregunta.tipo === "texto" || pregunta.tipo === "textarea") &&
        typeof valor === "string" &&
        valor.trim().length > 0
      ) {
        resultado.push({ etiqueta: pregunta.etiqueta, detalle: valor.trim() });
      }
    }
  }
  return resultado;
}

/** Compara sin acentos/mayúsculas si `texto` menciona alguna de las
 * sustancias listadas en `alergias` (separadas por coma) — para advertir
 * antes de recetar un medicamento al que el paciente es alérgico. */
export function coincideAlergia(alergias: string, texto: string): string[] {
  const normalizar = (s: string) =>
    Array.from(s.normalize("NFD"))
      .filter((c) => {
        const code = c.codePointAt(0) ?? 0;
        return code < 0x300 || code > 0x36f;
      })
      .join("")
      .toLowerCase()
      .trim();

  const textoNorm = normalizar(texto);
  if (!textoNorm) return [];
  return alergias
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean)
    .filter((a) => textoNorm.includes(normalizar(a)));
}

const NEGACIONES_ALERGIA = [
  "negado",
  "niega",
  "ninguna",
  "ninguno",
  "ninguna conocida",
  "ninguna referida",
  "no refiere",
  "no presenta",
  "sin alergias",
  "sin alergias conocidas",
  "no",
  "n/a",
  "na",
];

function normalizarAlergiaTexto(alergias: string | undefined): string {
  return (alergias ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** true si el campo de alergias dice explícitamente que el paciente no
 * tiene ninguna (ej. "Negado", "Ninguna") — distinto de estar vacío, que
 * significa que todavía no se ha preguntado. */
export function esNegacionExplicita(alergias: string | undefined): boolean {
  const t = normalizarAlergiaTexto(alergias);
  if (!t) return false;
  return NEGACIONES_ALERGIA.some((p) => t === p);
}

/** true si el campo de alergias está vacío o solo dice que el paciente no
 * tiene ninguna — en esos casos no hay nada que alertar en rojo; el color
 * de alerta se reserva para cuando sí hay una sustancia registrada. */
export function esNegacionAlergia(alergias: string | undefined): boolean {
  const t = normalizarAlergiaTexto(alergias);
  if (!t) return true;
  return NEGACIONES_ALERGIA.some((p) => t === p);
}
