/** Las seis vistas de la serie fotográfica intraoral que se toma a cada paciente. Cada foto lleva su `vista`
 * (ver FotoPaciente); las que se subieron antes de que existieran las vistas quedan "sin clasificar" y se
 * pueden asignar a una vista sin perder nada. */

import type { FotoPaciente } from "./patientData";

export const VISTAS_INTRAORALES = [
  { id: "superior", etiqueta: "Superior", ayuda: "Arcada superior vista desde abajo, con espejo oclusal." },
  { id: "inferior", etiqueta: "Inferior", ayuda: "Arcada inferior vista desde arriba, con espejo oclusal." },
  { id: "derecha", etiqueta: "Derecha", ayuda: "Lateral derecha, en oclusión, con separador y espejo bucal." },
  { id: "izquierda", etiqueta: "Izquierda", ayuda: "Lateral izquierda, en oclusión, con separador y espejo bucal." },
  { id: "anterior", etiqueta: "Anterior", ayuda: "Frente, en oclusión, de canino a canino." },
  { id: "acercamiento", etiqueta: "Acercamiento", ayuda: "Detalle de un diente o una zona en particular." },
] as const;

export type VistaIntraoral = (typeof VISTAS_INTRAORALES)[number]["id"];

export function esVistaIntraoral(valor: unknown): valor is VistaIntraoral {
  return VISTAS_INTRAORALES.some((v) => v.id === valor);
}

/** Las fotos de una vista, de la más reciente a la más antigua (la primera es la que se muestra). */
export function fotosDeVista(fotos: FotoPaciente[], vista: VistaIntraoral): FotoPaciente[] {
  return fotos.filter((f) => f.vista === vista).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/** Fotos intraorales subidas antes de las vistas (o con una vista que ya no existe). */
export function fotosSinClasificar(fotos: FotoPaciente[]): FotoPaciente[] {
  return fotos.filter((f) => !esVistaIntraoral(f.vista)).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/** Cuántas de las seis vistas ya tienen al menos una foto. */
export function vistasCompletadas(fotos: FotoPaciente[]): number {
  return VISTAS_INTRAORALES.filter((v) => fotos.some((f) => f.vista === v.id)).length;
}

/** Devuelve la foto con la vista asignada (o sin ella si `vista` es null). */
export function conVista(foto: FotoPaciente, vista: VistaIntraoral | null): FotoPaciente {
  const { vista: _anterior, ...resto } = foto;
  void _anterior;
  return vista ? { ...resto, vista } : resto;
}
