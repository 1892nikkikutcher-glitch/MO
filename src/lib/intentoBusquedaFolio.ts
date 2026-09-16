/** Bitácora de seguridad de intentos de búsqueda por folio (arquitectura MO
 * Conecta v3, §16/§17) — separada de `expedientesClinicos/{id}/eventos`
 * porque un intento fallido no tiene ningún expediente al que atribuirse.
 * NUNCA guarda el folio crudo ni su hash — v3 §17 exige que el folio no
 * aparezca en ningún log; aquí ni siquiera se necesita un hash para el
 * propósito de esta bitácora (detectar patrones de abuso por solicitante),
 * así que no hay razón para guardar ninguna forma derivada del folio. */

import type { Timestamp } from "firebase-admin/firestore";

export type IntentoBusquedaFolio = {
  id: string;
  solicitanteUid: string;
  resultado: "encontrado" | "no_encontrado";
  /** Presente solo si `resultado === "encontrado"`. */
  expedienteId?: string;
  fecha: Timestamp;
};
