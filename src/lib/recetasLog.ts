/** Bitácora de recetas expedidas, para poder consultarlas después sin tener
 * que abrir paciente por paciente — se registra cada vez que se guarda una
 * receta nueva, mismo patrón que `presupuestosLog` y `otsLog`. */

export type RecetaLogEntry = {
  id: string;
  patientId: string;
  patientName: string;
  folio: string;
  fecha: string;
  medico: string;
  medicamentos: string[];
  creadoEn: string;
};
