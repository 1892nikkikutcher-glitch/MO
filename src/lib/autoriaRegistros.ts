/** Quién creó cada presupuesto o cita, y de dónde salió. Antes no se guardaba
 * ningún autor: ni los presupuestos ni las citas, así que cuando aparecían
 * registros de más (ej. varios "control de ortodoncia" convertidos en
 * presupuestos) no había forma de saber qué colaborador los capturó. Desde
 * ahora cada registro NUEVO lleva `creadoPorUid`, `creadoPorEmail` y
 * `creadoEl`; los anteriores solo pueden mostrar su origen (se deduce del id). */

export type AutorRegistro = { uid: string; email: string };

/** Marca con autor y fecha los registros que aparecen en `next` y no estaban
 * en `prev` (y que no traen ya un autor). Nunca toca los existentes. */
export function estamparNuevos<T extends { id: string; creadoPorUid?: string }>(
  prev: T[],
  next: T[],
  autor: AutorRegistro,
  ahoraISO: string
): (T & { creadoPorUid?: string; creadoPorEmail?: string; creadoEl?: string })[] {
  const previos = new Set(prev.map((p) => p.id));
  return next.map((item) =>
    previos.has(item.id) || item.creadoPorUid
      ? item
      : { ...item, creadoPorUid: autor.uid, creadoPorEmail: autor.email, creadoEl: ahoraISO }
  );
}

export type OrigenPresupuesto = "cita" | "pago" | "manual";

/** De dónde salió un presupuesto, según su id: los automáticos tienen
 * prefijo fijo (ver AgendaCitaDialog y generarPresupuestosDesdeExtras). */
export function origenDePresupuesto(id: string): OrigenPresupuesto {
  if (id.startsWith("pres-cita-")) return "cita";
  if (id.startsWith("pres-")) return "pago";
  return "manual";
}

const textoOrigen: Record<OrigenPresupuesto, string> = {
  cita: "creado automáticamente al agendar una cita con costo",
  pago: "creado automáticamente al registrar un pago como «extra»",
  manual: "creado a mano desde Presupuestos",
};

function fechaHora(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** "Creado por ana@clinica.mx · 02/10/2026 02:05 p.m. — automáticamente al
 * agendar una cita con costo". Para los registros anteriores a esta función:
 * solo el origen y la aclaración de que no hay autor registrado. */
export function textoAutoriaPresupuesto(p: { id: string; creadoPorEmail?: string; creadoEl?: string }): string {
  const origen = textoOrigen[origenDePresupuesto(p.id)];
  if (p.creadoPorEmail) {
    return `Creado por ${p.creadoPorEmail}${p.creadoEl ? ` · ${fechaHora(p.creadoEl)}` : ""} — ${origen}`;
  }
  return `${origen[0].toUpperCase()}${origen.slice(1)} · sin registro de quién lo capturó`;
}

/** Tratamientos que NO son un tratamiento nuevo sino una visita o cuota de
 * uno que ya existe (controles de ortodoncia, mensualidades...). Convertir
 * cada una en su propio presupuesto llena el expediente de "tratamientos"
 * falsos. */
export function pareceControlOMensualidad(tratamientos: string[]): boolean {
  return tratamientos.some((t) => /\b(control|controles|mensualidad(es)?|revisi[oó]n|seguimiento|ajuste)\b/i.test(t));
}
