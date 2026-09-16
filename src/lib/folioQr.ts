/** Payload que se codifica en el QR de un folio (arquitectura MO Conecta
 * v3, Fase 5) — el QR nunca cambia las reglas de autorización, solo evita
 * tener que teclear el folio a mano (v3 §18: "nunca cambia reglas de
 * autorización"; §15.11 histórico: "el folio y el QR nunca contienen
 * información clínica").
 *
 * Hoy codifica el folio normalizado tal cual — NUNCA una URL: no existe
 * todavía ninguna pantalla real de "buscar por folio" a la que apuntar
 * (Fase 3 construyó la búsqueda como backend puro, sin ruta ni UI
 * conectada) — encaminar a una URL que no existe sería peor que no tener
 * QR. Cuando esa pantalla exista, envolver este mismo payload en una URL
 * es un cambio aislado que no rompe nada que ya lo use. */

import { formatoFolioValido, normalizarFolio } from "./folioPaciente";

export function construirPayloadFolioQr(folioCrudo: string): string {
  const normalizado = normalizarFolio(folioCrudo);
  if (!formatoFolioValido(normalizado)) {
    throw new Error("No se puede generar un QR de un folio con formato inválido.");
  }
  return normalizado;
}
