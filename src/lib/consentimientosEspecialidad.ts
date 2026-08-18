/** Cartas de consentimiento informado por especialidad, usadas en el módulo
 * de Documentos. Complementan (no sustituyen) la carta de Consentimiento
 * Informado General — cada una detalla los riesgos propios de su
 * tratamiento. Los dos últimos tipos no son un consentimiento previo al
 * tratamiento sino documentos de cierre (conclusión de ortodoncia, entrega
 * de prótesis), por eso su texto tiene un tono distinto. */

export type TipoConsentimientoEspecialidad =
  | "consentimientoOrtodoncia"
  | "consentimientoCirugiaBucal"
  | "consentimientoEndodoncia"
  | "consentimientoOdontopediatria"
  | "consentimientoProtesisDental"
  | "consentimientoConclusionOrtodoncia"
  | "consentimientoConformidadProtesis";

export type ConsentimientoEspecialidad = {
  titulo: string;
  procedimientoLabel: string;
  procedimientoPlaceholder: string;
  declaracion: string;
  aceptacion: (nombreDoctor: string) => string;
};

const aceptacionEstandar = (nombreDoctor: string) =>
  `Acepto que después de explicar procedimientos, elijo el procedimiento clínico que se detalla a realizar. Acepto y me comprometo a seguir responsablemente las recomendaciones e indicaciones recibidas, antes, durante y después del tratamiento, así como, acudir a las citas para las revisiones durante el tiempo pertinente. Acepto y reconozco que no se me pueden dar garantías o seguridad absoluta respecto a que el resultado del procedimiento clínico sea el más satisfactorio, por lo que acepto la posibilidad de necesitar cualquier posterior intervención para mejorar el resultado final. Comprendo que la odontología no es una ciencia exacta. Si surgiese cualquier situación inesperada o sobrevenida durante la intervención o tratamiento, autorizo al profesional a realizar cualquier procedimiento o maniobra distinta de las proyectadas o usuales que a su juicio estimase oportuna para la resolución, en su caso, de la complicación surgida. Acepto firmar este consentimiento informado y manifiesto que ${nombreDoctor || "el profesional que me atiende"} y/o su equipo de ayudantes me han informado del procedimiento clínico al que deseo ser sometida/o.
Si tiene alguna duda sobre el procedimiento, no dude en preguntar. Estamos aquí para ayudarle a obtener la asistencia que quiere y necesita.`;

export const consentimientosEspecialidad: Record<TipoConsentimientoEspecialidad, ConsentimientoEspecialidad> = {
  consentimientoOrtodoncia: {
    titulo: "Carta de Consentimiento Informado — Tratamiento de Ortodoncia",
    procedimientoLabel: "Procedimiento clínico a realizar",
    procedimientoPlaceholder: "Ej. Colocación de brackets metálicos superiores e inferiores...",
    declaracion: `Declaro que he sido informado(a) de manera clara, suficiente y comprensible sobre la naturaleza, objetivos y duración aproximada del tratamiento de ortodoncia que se me realizará, incluyendo el uso de brackets, alambres, ligas, aparatología removible y/o alineadores, según corresponda.
Comprendo que el tratamiento de ortodoncia conlleva riesgos y molestias propias del movimiento dental, entre ellos: sensibilidad o dolor temporal después de cada ajuste, posible reabsorción radicular (acortamiento de la raíz de los dientes), recesión de encías, descalcificación o manchas blancas por higiene deficiente, molestias temporomandibulares, y en algunos casos la necesidad de extracciones dentales como parte del plan de tratamiento.
Entiendo que el resultado y la duración del tratamiento dependen en gran medida de mi constancia en el uso de los aparatos indicados, del cuidado de mi higiene bucal y de la asistencia puntual a mis citas de control, y que la falta de cualquiera de estos factores puede prolongar el tratamiento o comprometer el resultado final.`,
    aceptacion: aceptacionEstandar,
  },
  consentimientoCirugiaBucal: {
    titulo: "Carta de Consentimiento Informado — Cirugía Bucal",
    procedimientoLabel: "Procedimiento clínico a realizar",
    procedimientoPlaceholder: "Ej. Extracción quirúrgica de OD 38 (tercer molar retenido)...",
    declaracion: `Declaro que he sido informado(a) de manera clara, suficiente y comprensible sobre la naturaleza y propósito del procedimiento de cirugía bucal que se me realizará (extracción simple o quirúrgica, cirugía de terceros molares, u otro procedimiento quirúrgico bucal), así como de sus riesgos y posibles complicaciones.
Comprendo que entre los riesgos propios de la cirugía bucal se encuentran: dolor, inflamación y hematoma postoperatorio, sangrado, infección, alveolitis (dolor intenso por pérdida del coágulo), lesión temporal o, en casos poco frecuentes, permanente de nervios cercanos con adormecimiento o alteración de la sensibilidad en labio, mejilla o lengua, comunicación con el seno maxilar en cirugías de dientes superiores, limitación temporal para abrir la boca, y la posibilidad de requerir un procedimiento adicional si la cicatrización no evoluciona como se espera.
Entiendo la importancia de seguir estrictamente las indicaciones postoperatorias y de tomar los medicamentos recetados en el horario indicado para reducir el riesgo de complicaciones.`,
    aceptacion: aceptacionEstandar,
  },
  consentimientoEndodoncia: {
    titulo: "Carta de Consentimiento Informado — Endodoncia (Tratamiento de Conductos)",
    procedimientoLabel: "Procedimiento clínico a realizar",
    procedimientoPlaceholder: "Ej. Tratamiento de conductos en OD 16...",
    declaracion: `Declaro que he sido informado(a) de manera clara, suficiente y comprensible sobre la naturaleza y propósito del tratamiento de endodoncia (tratamiento de conductos) que se me realizará, así como de sus riesgos y posibles complicaciones.
Comprendo que, pese a realizarse con la técnica adecuada, el tratamiento de endodoncia puede presentar complicaciones tales como: fractura de algún instrumento dentro del conducto, perforación radicular, imposibilidad de limpiar o sellar completamente algún conducto por su anatomía, dolor o inflamación posterior al tratamiento, oscurecimiento del diente tratado, fractura del diente por debilitamiento de su estructura, y la posibilidad de que el tratamiento no tenga éxito, requiriendo retratamiento, cirugía apical o incluso la extracción del diente.
Entiendo que después de un tratamiento de conductos es recomendable, en la mayoría de los casos, la colocación de una corona u otra restauración protectora, y que la ausencia de dicha restauración puede aumentar el riesgo de fractura del diente.`,
    aceptacion: aceptacionEstandar,
  },
  consentimientoOdontopediatria: {
    titulo: "Carta de Consentimiento Informado — Odontopediatría",
    procedimientoLabel: "Procedimiento clínico a realizar",
    procedimientoPlaceholder: "Ej. Pulpotomía y corona de acero en OD 84...",
    declaracion: `Declaro, en mi calidad de madre, padre o tutor legal, que he sido informado(a) de manera clara, suficiente y comprensible sobre la naturaleza y propósito del tratamiento dental que se realizará a mi hijo(a) o representado(a), así como de sus riesgos y posibles complicaciones.
Comprendo que en el tratamiento dental infantil pueden presentarse molestias propias de la edad del paciente, tales como llanto, inquietud o dificultad para cooperar durante el procedimiento, y que en caso de requerirse anestesia local, existe el riesgo de que el niño(a) se muerda accidentalmente el labio, mejilla o lengua mientras dura el efecto anestésico.
Comprendo asimismo los riesgos propios del procedimiento específico a realizar (por ejemplo: pulpotomías, coronas de acero, extracciones, selladores u obturaciones), y autorizo al profesional a emplear las técnicas de manejo de conducta que considere adecuadas para la seguridad y bienestar de mi hijo(a) durante la atención.`,
    aceptacion: aceptacionEstandar,
  },
  consentimientoProtesisDental: {
    titulo: "Carta de Consentimiento Informado — Prótesis Dental",
    procedimientoLabel: "Procedimiento clínico a realizar",
    procedimientoPlaceholder: "Ej. Rehabilitación con prótesis parcial removible superior...",
    declaracion: `Declaro que he sido informado(a) de manera clara, suficiente y comprensible sobre la naturaleza y propósito del tratamiento de rehabilitación con prótesis dental (removible, fija o sobre implantes, según corresponda) que se me realizará, así como de sus riesgos y consideraciones.
Comprendo que la adaptación a una prótesis dental requiere un periodo de ajuste durante el cual es normal sentir molestias, exceso de saliva, dificultad temporal para hablar o masticar, y que es probable que se requieran varias citas de ajuste posteriores a la entrega.
Entiendo que la prótesis tiene una vida útil limitada y que los tejidos de la boca (encía y hueso) pueden cambiar con el tiempo, por lo que en el futuro podría requerirse un rebase, reparación o reemplazo de la misma. Comprendo la importancia del cuidado e higiene diaria de la prótesis según las indicaciones recibidas para prolongar su duración.`,
    aceptacion: aceptacionEstandar,
  },
  consentimientoConclusionOrtodoncia: {
    titulo: "Consentimiento Informado para la Conclusión del Tratamiento de Ortodoncia",
    procedimientoLabel: "Resultado obtenido / observaciones de la conclusión del tratamiento",
    procedimientoPlaceholder: "Ej. Se concluye tratamiento con alineación y oclusión funcional adecuadas...",
    declaracion: `Declaro que he sido informado(a) de que mi tratamiento de ortodoncia ha llegado a su etapa de conclusión, ya sea por haberse alcanzado los objetivos planteados al inicio del tratamiento, o bien por así solicitarlo yo de manera expresa, asumiendo en este último caso que el resultado obtenido puede no corresponder al plan de tratamiento originalmente propuesto.
Comprendo que, una vez retirada la aparatología fija (brackets) y/o concluido el uso de alineadores, es indispensable el uso constante y responsable de los retenedores indicados, en el horario y por el tiempo que se me señale, ya que los dientes tienen una tendencia natural a moverse de regreso hacia su posición original (recidiva).
Entiendo que el no usar los retenedores como se me indique, o el no acudir a mis citas de control de retención, puede ocasionar que los dientes se muevan nuevamente, y que corregir dicho movimiento en el futuro implicaría un tratamiento adicional con su respectivo costo, del cual seré responsable.`,
    aceptacion: (nombreDoctor: string) =>
      `Acepto que se dé por concluida mi fase activa de tratamiento de ortodoncia en los términos señalados, y me comprometo a usar mis retenedores según las indicaciones recibidas y a acudir a mis citas de control de retención. Entiendo que ${nombreDoctor || "el profesional que me atiende"} y/o su equipo me han explicado los cuidados necesarios para conservar el resultado obtenido, y libero de responsabilidad al profesional por cambios en la posición dental derivados del incumplimiento de estas indicaciones.`,
  },
  consentimientoConformidadProtesis: {
    titulo: "Acuerdo de Conformidad — Entrega de Prótesis Dental",
    procedimientoLabel: "Prótesis entregada (tipo y piezas)",
    procedimientoPlaceholder: "Ej. Prótesis parcial removible superior, OD 14 a 17...",
    declaracion: `Declaro que se me ha hecho entrega de la prótesis dental elaborada conforme al tratamiento acordado, y que he tenido la oportunidad de revisarla en cuanto a su ajuste, apariencia, color y funcionalidad antes de firmar el presente documento.
Manifiesto que se me han explicado las indicaciones de cuidado, limpieza y uso de la prótesis, así como que es normal requerir un periodo de adaptación y, en su caso, citas de ajuste posteriores a la entrega, mismas que no se consideran defectos de fabricación sino parte natural del proceso de adaptación.`,
    aceptacion: (nombreDoctor: string) =>
      `Manifiesto mi conformidad con la prótesis dental recibida y acepto haber sido informado(a) sobre su cuidado, mantenimiento y vida útil esperada. Me comprometo a acudir a mis citas de revisión y a informar oportunamente cualquier molestia o desajuste que presente. Doy por satisfactoriamente concluida esta etapa del tratamiento y libero a ${nombreDoctor || "el profesional que me atiende"} y a su equipo de responsabilidad por el desgaste normal derivado del uso de la prótesis.`,
  },
};
