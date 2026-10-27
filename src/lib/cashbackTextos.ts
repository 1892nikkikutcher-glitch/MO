/** Textos del programa de cashback para el paciente: los términos y condiciones (siempre iguales a lo configurado)
 * y el mensaje de saldo por WhatsApp. Lógica pura. */

import type { CashbackConfig, SaldoCashback } from "./cashback";

const pesos = (n: number) => `$${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })}`;
const num = (n: number) => (Number.isInteger(n) ? String(n) : String(n));

function fechaLarga(iso: string): string {
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const [a, m, d] = iso.split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

/** Los términos principales del programa, armados con lo que está configurado, para anunciarlos al paciente tal cual. */
export function terminosCashback(config: CashbackConfig): string[] {
  const t: string[] = [];
  t.push(`El paciente acumula ${num(config.porcentaje)}% del importe efectivamente pagado en servicios participantes a precio regular.`);
  t.push(config.liberarSiguienteDia ? "El saldo estará disponible a partir de la siguiente visita." : "El saldo está disponible desde que se aprueba.");
  const usa: string[] = [];
  if (config.porcentajeMaxCanje > 0) usa.push(`hasta ${num(config.porcentajeMaxCanje)}% del valor de una atención elegible`);
  if (config.topeCanjePorVisita > 0) usa.push(`con un máximo de ${pesos(config.topeCanjePorVisita)} por visita`);
  t.push(usa.length > 0 ? `Puede utilizarse ${usa.join(", ")}.` : "Puede utilizarse en atenciones elegibles.");
  if (config.saldoMaximo > 0) t.push(`El saldo máximo acumulable es de ${pesos(config.saldoMaximo)}.`);
  t.push(config.vigenciaMeses > 0 ? `El saldo tiene vigencia de ${config.vigenciaMeses} ${config.vigenciaMeses === 1 ? "mes" : "meses"} desde su generación.` : "El saldo no vence.");
  t.push(
    config.transferible
      ? "No puede cambiarse por efectivo ni utilizarse para pagar adeudos anteriores. Puede transferirse a otro paciente con autorización de la clínica."
      : "No puede cambiarse por efectivo, transferirse ni utilizarse para pagar adeudos anteriores."
  );
  t.push("No aplica conjuntamente con promociones, paquetes, membresías, cortesías o tarifas especiales.");
  t.push("El Cashback nuevo se calcula después de descontar el saldo utilizado.");
  t.push("En cancelaciones o devoluciones se reversará el saldo generado.");
  t.push("La clínica mostrará al paciente su saldo, movimientos y vencimientos.");
  return t;
}

/** Mensaje de WhatsApp con el saldo del paciente y lo que puede cubrir. Sin presión: el saldo mejora la experiencia, la cita la define lo clínico. */
export function mensajeSaldoWhatsApp(args: {
  paciente: string;
  clinica: string;
  saldo: Pick<SaldoCashback, "disponible" | "porLiberar" | "proximoAVencer">;
  config: CashbackConfig;
}): string {
  const { saldo, config } = args;
  const primerNombre = args.paciente.trim().split(/\s+/)[0] || "";
  const L: string[] = [`Hola, ${primerNombre}.`];
  const total = saldo.disponible + saldo.porLiberar;
  if (total <= 0) {
    L.push(`Por el momento no tienes Cashback en ${args.clinica || "tu clínica"}. Con ${num(config.porcentaje)}% de tus pagos elegibles puedes acumular saldo para tus próximas atenciones.`);
    return L.join(" ");
  }
  L.push(`Tienes ${pesos(total)} disponibles en tu Cashback de ${args.clinica || "tu clínica"}${saldo.porLiberar > 0 && saldo.disponible > 0 ? ` (${pesos(saldo.porLiberar)} se liberan mañana)` : saldo.porLiberar > 0 ? " (se libera a partir de mañana)" : ""}.`);
  const cubre: string[] = [];
  if (config.porcentajeMaxCanje > 0) cubre.push(`hasta ${num(config.porcentajeMaxCanje)}% de una atención elegible`);
  if (config.topeCanjePorVisita > 0) cubre.push(`con un máximo de ${pesos(config.topeCanjePorVisita)} por visita`);
  if (cubre.length > 0) L.push(`Tu saldo puede cubrir ${cubre.join(", ")}.`);
  if (saldo.proximoAVencer) L.push(`Vence el ${fechaLarga(saldo.proximoAVencer.fecha)}.`);
  L.push("Tu atención se programa según tu seguimiento clínico; el saldo solo te ayuda a aprovecharla mejor.");
  return L.join(" ");
}

/** La línea que se agrega al recordatorio de una cita: cuánto cashback tiene el paciente para esa atención (nada si no tiene).
 * Cuenta lo que se libera mañana, porque para la próxima visita ya estará disponible. */
export function lineaCashbackRecordatorio(saldo: Pick<SaldoCashback, "disponible" | "porLiberar" | "proximoAVencer">, config: CashbackConfig): string {
  const total = saldo.disponible + saldo.porLiberar;
  if (total <= 0) return "";
  const limite: string[] = [];
  if (config.porcentajeMaxCanje > 0) limite.push(`hasta ${num(config.porcentajeMaxCanje)}% de tu atención`);
  if (config.topeCanjePorVisita > 0) limite.push(`máximo ${pesos(config.topeCanjePorVisita)} por visita`);
  const cubre = limite.length > 0 ? ` Puedes usarlo en tu cita: ${limite.join(", ")}.` : " Puedes usarlo en tu cita.";
  const vence = saldo.proximoAVencer ? ` Vence el ${fechaLarga(saldo.proximoAVencer.fecha)}.` : "";
  return `\n\n💰 Tienes *${pesos(total)}* de cashback disponible.${cubre}${vence}`;
}
