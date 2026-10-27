/** MO ya se cobra: la pantalla de Planes está activa, con la prueba de 14 días y los planes de pago (Stripe).
 *
 * `MO_ES_GRATIS` solo existe para poder volver a dar MO gratis de un momento a otro: en `true`, nadie queda
 * bloqueado al terminar la prueba, la página Planes muestra un candado y el menú Planes lleva un candado. */
export const MO_ES_GRATIS = false;

/** Primer día en que MO empezó a cobrarse (AAAA-MM-DD). Las clínicas que ya estaban usando MO cuando era gratis
 * no amanecen bloqueadas: su prueba de 14 días cuenta desde este día. Una clínica nueva cuenta desde que se registra. */
export const INICIO_DEL_COBRO = "2026-10-27";
