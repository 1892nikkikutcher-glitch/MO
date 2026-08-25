/** Límite de tasa simple respaldado en Firestore (sin Redis/WAF — el
 * proyecto no tiene esa infraestructura hoy). Esta función es la decisión
 * PURA; la ruta de servidor la envuelve en una transacción de Firestore que
 * lee el documento contador, llama esto, y escribe `nuevaVentana`. Se aplica
 * a creación/reclamo de invitaciones, por token hasheado + IP + uid — ver
 * §6 del plan. Documentado explícitamente como límite de aplicación básico,
 * no un sustituto de rate limiting de borde/red. */

export type VentanaRateLimit = {
  inicioVentana: string; // ISO
  conteo: number;
};

export function evaluarRateLimit(
  ventanaActual: VentanaRateLimit | undefined,
  ahora: Date,
  limite: number,
  ventanaMinutos: number
): { permitido: boolean; nuevaVentana: VentanaRateLimit } {
  const ahoraIso = ahora.toISOString();

  if (!ventanaActual) {
    return { permitido: true, nuevaVentana: { inicioVentana: ahoraIso, conteo: 1 } };
  }

  const inicioMs = new Date(ventanaActual.inicioVentana).getTime();
  const dentroDeVentana = ahora.getTime() - inicioMs < ventanaMinutos * 60 * 1000;

  if (!dentroDeVentana) {
    // Ventana expirada — arranca una nueva.
    return { permitido: true, nuevaVentana: { inicioVentana: ahoraIso, conteo: 1 } };
  }

  if (ventanaActual.conteo >= limite) {
    return { permitido: false, nuevaVentana: ventanaActual };
  }

  return { permitido: true, nuevaVentana: { ...ventanaActual, conteo: ventanaActual.conteo + 1 } };
}
