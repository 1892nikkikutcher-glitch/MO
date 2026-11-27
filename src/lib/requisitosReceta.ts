import type { MedicamentoRecetado } from "./patientData";

/**
 * Lo que la ley mexicana pide que lleve una receta y que MO puede comprobar antes de expedirla.
 * Fuente: Reglamento de Insumos para la Salud (texto vigente, reforma DOF 24-04-2026):
 *  - art. 29: nombre y domicilio completos y cédula profesional de quien prescribe (impresos), fecha y firma autógrafa.
 *  - art. 30: dosis, presentación, vía de administración, frecuencia y tiempo de duración del tratamiento.
 * El teléfono NO lo exige la ley: se avisa como recomendación.
 */
export type RequisitosFaltantes = {
  /** Lo que exige el Reglamento y falta en esta receta. */
  obligatorios: string[];
  /** Lo que no exige la ley pero conviene que lleve. */
  recomendados: string[];
};

export function requisitosFaltantesReceta(datos: {
  cedulaProfesional?: string | null;
  domicilioConsultorio?: string | null;
  telefono?: string | null;
  medicamentos: Pick<MedicamentoRecetado, "nombre" | "instrucciones">[];
}): RequisitosFaltantes {
  const obligatorios: string[] = [];
  const recomendados: string[] = [];

  if (!datos.cedulaProfesional?.trim()) obligatorios.push("la cédula profesional del médico (Administración → Médicos y Recetas)");
  if (!datos.domicilioConsultorio?.trim()) obligatorios.push("el domicilio del consultorio (Administración → Médicos y Recetas → Dirección de la clínica)");

  const sinIndicaciones = datos.medicamentos.filter((m) => !m.instrucciones?.trim());
  if (sinIndicaciones.length > 0) {
    obligatorios.push(
      `la dosis, vía, frecuencia y duración de ${sinIndicaciones.map((m) => m.nombre.trim() || "un medicamento").join(", ")}`
    );
  }

  if (!datos.telefono?.trim()) recomendados.push("el teléfono del consultorio (Administración → Médicos y Recetas → Teléfono del consultorio)");

  return { obligatorios, recomendados };
}
