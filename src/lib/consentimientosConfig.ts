/** Textos de los consentimientos informados, editables por clínica desde Administración → Consentimientos
 * Informados (mismo patrón que contratoOrtodoncia.ts). Los textos originales viven en el código como punto de
 * partida: la clínica solo guarda lo que cambia, y un campo vacío o ausente vuelve al original. */

import { renderPlantilla } from "./formatosWhatsapp";
import {
  consentimientosEspecialidad,
  type TipoConsentimientoEspecialidad,
} from "./consentimientosEspecialidad";

export const CLAVE_CONSENTIMIENTO_GENERAL = "consentimientoGeneral";

export type ClaveConsentimiento = typeof CLAVE_CONSENTIMIENTO_GENERAL | TipoConsentimientoEspecialidad;

export type TextosConsentimiento = {
  titulo?: string;
  declaracion?: string;
  aceptacion?: string;
};

export type ConsentimientosConfig = {
  textos: Partial<Record<ClaveConsentimiento, TextosConsentimiento>>;
};

export const consentimientosConfigInicial: ConsentimientosConfig = { textos: {} };

/** Contenido listo para editar o mostrar: `declaracion` y `aceptacion` son plantillas con `{{medico}}`,
 * `{{paciente}}` y `{{clinica}}`. */
export type ContenidoConsentimiento = {
  titulo: string;
  procedimientoLabel: string;
  procedimientoPlaceholder: string;
  declaracion: string;
  aceptacion: string;
};

const MEDICO_POR_DEFECTO = "el profesional que me atiende";
const MEDICO_POR_DEFECTO_USO_IMAGEN = "el consultorio";

const declaracionGeneral = `Declaro que he sido informado(a) de manera clara, suficiente y comprensible sobre la naturaleza y propósito del procedimiento clínico bucal que se me realizará. Se me han explicado verbalmente los riesgos y posibles complicaciones inherentes al procedimiento, así como la existencia de otras alternativas de tratamiento disponibles.
Comprendo los posibles riesgos y complicaciones involucradas en los tratamientos médico, estéticos y quirúrgicos, y que en mi caso la duración de estos fenómenos no está determinada, pudiendo ser irreversible. Comprendo que la odontología no es una ciencia exacta.
Así mismo, que existen riesgos imprevistos que pueden alterar el buen resultado del tratamiento.
Sabiendo que siempre se buscará el bienestar, seguridad y calidad de los procedimientos clínicos realizados. Me han explicado de otros problemas y complicaciones poco frecuentes, derivadas del tratamiento bucal que consiste en:`;

const aceptacionGeneral = `Acepto que después de explicar procedimientos, elijo el procedimiento clínico que se detalla a realizar. Acepto y me comprometo a seguir responsablemente las recomendaciones e indicaciones recibidas, antes, durante y después del tratamiento, así como, acudir a las citas para las revisiones durante el tiempo pertinente. Acepto y reconozco que no se me pueden dar garantías o seguridad absoluta respecto a que el resultado del procedimiento clínico sea el más satisfactorio, por lo que acepto la posibilidad de necesitar cualquier posterior intervención para mejorar el resultado final. Comprendo que la medicina no es una ciencia exacta. Si surgiese cualquier situación inesperada o sobrevenida durante la intervención o tratamiento, autorizo al profesional a realizar cualquier procedimiento o maniobra distinta de las proyectadas o usuales que a su juicio estimase oportuna para la resolución, en su caso, de la complicación surgida. Acepto no obligar al cirujano dentista a realizar un procedimiento cuando ello implique mayor riesgo que beneficio. Acepto firmar este consentimiento informado y manifiesto que {{medico}} y/o su equipo de ayudantes me han informado del procedimiento clínico al que deseo ser sometida/o.
Si tiene alguna duda sobre el procedimiento, no dude en preguntar. Estamos aquí para ayudarle a obtener la asistencia que quiere y necesita.`;

export const ETIQUETAS_CONSENTIMIENTO: Record<ClaveConsentimiento, string> = {
  consentimientoGeneral: "Consentimiento Informado General",
  consentimientoOrtodoncia: "Ortodoncia",
  consentimientoCirugiaBucal: "Cirugía Bucal",
  consentimientoEndodoncia: "Endodoncia",
  consentimientoOdontopediatria: "Odontopediatría",
  consentimientoProtesisDental: "Prótesis Dental",
  consentimientoConclusionOrtodoncia: "Conclusión de Ortodoncia",
  consentimientoConformidadProtesis: "Conformidad de Entrega de Prótesis",
  consentimientoUsoImagen: "Uso de Imagen",
};

export const CLAVES_CONSENTIMIENTO = Object.keys(ETIQUETAS_CONSENTIMIENTO) as ClaveConsentimiento[];

/** Texto con el que se sustituye `{{medico}}` cuando todavía no hay médico elegido. */
export function medicoPorDefecto(clave: ClaveConsentimiento): string {
  return clave === "consentimientoUsoImagen" ? MEDICO_POR_DEFECTO_USO_IMAGEN : MEDICO_POR_DEFECTO;
}

/** El texto original, sin las ediciones de la clínica. */
export function contenidoOriginal(clave: ClaveConsentimiento): ContenidoConsentimiento {
  if (clave === CLAVE_CONSENTIMIENTO_GENERAL) {
    return {
      titulo: "Carta de Consentimiento Informado General",
      procedimientoLabel: "Procedimiento clínico a realizar",
      procedimientoPlaceholder: "Ej. Extracción de OD 18, colocación de resina en OD 16...",
      declaracion: declaracionGeneral,
      aceptacion: aceptacionGeneral,
    };
  }
  const base = consentimientosEspecialidad[clave];
  return {
    titulo: base.titulo,
    procedimientoLabel: base.procedimientoLabel,
    procedimientoPlaceholder: base.procedimientoPlaceholder,
    declaracion: base.declaracion,
    // Las aceptaciones originales son funciones del nombre del médico: se pasa la variable para volverlas plantilla.
    aceptacion: base.aceptacion("{{medico}}"),
  };
}

const conTexto = (valor: string | undefined) => (valor && valor.trim() ? valor : undefined);

/** El texto vigente: lo que la clínica editó, o el original donde no hay edición. */
export function contenidoConsentimiento(
  clave: ClaveConsentimiento,
  config: ConsentimientosConfig | undefined
): ContenidoConsentimiento {
  const original = contenidoOriginal(clave);
  const editado = config?.textos?.[clave];
  return {
    ...original,
    titulo: conTexto(editado?.titulo) ?? original.titulo,
    declaracion: conTexto(editado?.declaracion) ?? original.declaracion,
    aceptacion: conTexto(editado?.aceptacion) ?? original.aceptacion,
  };
}

export function renderConsentimiento(
  plantilla: string,
  clave: ClaveConsentimiento,
  datos: { medico?: string; paciente?: string; clinica?: string }
): string {
  return renderPlantilla(plantilla, {
    medico: datos.medico?.trim() || medicoPorDefecto(clave),
    paciente: datos.paciente ?? "",
    clinica: datos.clinica?.trim() || "el consultorio",
  });
}

/** ¿La clínica cambió algo respecto al original en esta carta? */
export function estaEditado(clave: ClaveConsentimiento, config: ConsentimientosConfig | undefined): boolean {
  const editado = config?.textos?.[clave];
  if (!editado) return false;
  const original = contenidoOriginal(clave);
  return (
    (!!conTexto(editado.titulo) && editado.titulo !== original.titulo) ||
    (!!conTexto(editado.declaracion) && editado.declaracion !== original.declaracion) ||
    (!!conTexto(editado.aceptacion) && editado.aceptacion !== original.aceptacion)
  );
}
