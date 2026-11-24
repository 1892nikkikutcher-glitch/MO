/** La forma de pago que un paciente normalmente usa: la que más veces ha usado entre sus pagos registrados.
 * Si hay empate, gana la más reciente. Solo cuenta las formas `permitidas` (por ejemplo, nunca Cashback), y si el
 * paciente no tiene historial devuelve `null` para que quien cobra la elija. */
export function formaPagoHabitual(
  pagos: { id: string; formaPago: string }[],
  permitidas: readonly string[]
): string | null {
  const cuentas = new Map<string, { veces: number; reciente: number; primero: number }>();
  pagos.forEach((p, i) => {
    if (!permitidas.includes(p.formaPago)) return;
    // Los pagos guardan como id la hora en que se registraron: sirve para saber cuál es más reciente.
    const marca = Number(p.id);
    const reciente = Number.isFinite(marca) ? marca : 0;
    const previo = cuentas.get(p.formaPago);
    if (previo) {
      previo.veces += 1;
      previo.reciente = Math.max(previo.reciente, reciente);
    } else {
      cuentas.set(p.formaPago, { veces: 1, reciente, primero: i });
    }
  });
  let mejor: string | null = null;
  let datos: { veces: number; reciente: number; primero: number } | null = null;
  for (const [forma, d] of cuentas) {
    if (
      !datos ||
      d.veces > datos.veces ||
      (d.veces === datos.veces && (d.reciente > datos.reciente || (d.reciente === datos.reciente && d.primero < datos.primero)))
    ) {
      mejor = forma;
      datos = d;
    }
  }
  return mejor;
}
