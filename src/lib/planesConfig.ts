/** MO es gratis por ahora: se está dando a conocer. Mientras esta bandera esté en
 * `true`:
 *  - nadie queda bloqueado cuando termina la prueba de 14 días (Dashboard);
 *  - la página Planes muestra un candado y "MO es gratis por ahora", sin
 *    botones de pago;
 *  - el menú Planes lleva un candado.
 * Todo el cobro (Stripe, planes, pantalla de prueba vencida) sigue en el código:
 * para empezar a cobrar, ponla en `false` (y, si se quiere, avisar antes). */
export const MO_ES_GRATIS = true;
