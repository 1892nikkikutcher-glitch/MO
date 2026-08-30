/** Vigencia de un presupuesto — cuánto tiempo debería considerarse válido
 * antes de verificar que los precios sigan siendo los mismos (ver el plan
 * "Ligar diagnósticos del Odontograma a Presupuestos"). Lógica pura, sin
 * tocar Firestore ni el DOM — fácil de probar sin navegador.
 *
 * `fecha` en un presupuesto guardado (`BudgetData.fecha`) es un string de
 * despliegue "DD/MM/YYYY" (es-MX), no ISO — por eso se parsea explícitamente
 * en vez de pasarlo directo a `new Date()`. */

import type { EstadoPresupuesto } from "./patientData";

function parseFechaDDMMYYYY(fecha: string): Date | null {
  const partes = fecha.split("/");
  if (partes.length !== 3) return null;
  const [dia, mes, anio] = partes.map((p) => Number(p));
  if (!dia || !mes || !anio) return null;
  return new Date(anio, mes - 1, dia);
}

function formatISO(d: Date): string {
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

/** Fecha límite de validez (ISO YYYY-MM-DD) — `fecha` + `vigenciaDias`. Si
 * `fecha` no se puede interpretar (dato corrupto/legado), usa hoy como base
 * en vez de tronar. */
export function calcularFechaVigencia(fechaDDMMYYYY: string, vigenciaDias: number): string {
  const base = parseFechaDDMMYYYY(fechaDDMMYYYY) ?? new Date();
  const limite = new Date(base);
  limite.setDate(limite.getDate() + vigenciaDias);
  return formatISO(limite);
}

/** Nunca vencido si no hay `fechaVigenciaHasta` registrada (presupuestos de
 * antes de este cambio — nunca se les inventa una fecha retroactiva), ni si
 * el presupuesto ya tiene una decisión tomada (aceptado/rechazado/expirado)
 * — la vigencia solo importa mientras sigue "pendiente". `hoyISO` es
 * opcional (por defecto la fecha real) para poder probar de forma
 * determinística sin depender del reloj de la máquina. */
export function estaVencido(
  fechaVigenciaHasta: string | undefined,
  estado: EstadoPresupuesto | undefined,
  hoyISO?: string
): boolean {
  if (!fechaVigenciaHasta) return false;
  if ((estado ?? "pendiente") !== "pendiente") return false;
  const hoy = hoyISO ?? formatISO(new Date());
  return fechaVigenciaHasta < hoy;
}

/** Nueva fecha límite de validez, contada desde hoy (no desde la fecha
 * original del presupuesto) — para el botón "Renovar vigencia". */
export function renovarVigencia(vigenciaDias: number, hoyISO?: string): string {
  const hoy = hoyISO ? new Date(`${hoyISO}T00:00:00`) : new Date();
  const limite = new Date(hoy);
  limite.setDate(limite.getDate() + vigenciaDias);
  return formatISO(limite);
}
