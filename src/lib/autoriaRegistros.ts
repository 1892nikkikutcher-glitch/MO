/** Quién creó cada presupuesto o cita, y de dónde salió. Antes no se guardaba
 * ningún autor: ni los presupuestos ni las citas, así que cuando aparecían
 * registros de más (ej. varios "control de ortodoncia" convertidos en
 * presupuestos) no había forma de saber qué colaborador los capturó. Desde
 * ahora cada registro NUEVO lleva `creadoPorUid`, `creadoPorEmail` y
 * `creadoEl`; los anteriores solo pueden mostrar su origen (se deduce del id). */

import type { NombresDeDispositivos } from "./dispositivo";

export type AutorRegistro = { uid: string; email: string; /** "iPhone", "Xiaomi"… ver dispositivo.ts */ dispositivo?: string };

/** Marca con autor y fecha los registros que aparecen en `next` y no estaban
 * en `prev` (y que no traen ya un autor). Nunca toca los existentes. */
export function estamparNuevos<T extends { id: string; creadoPorUid?: string }>(
  prev: T[],
  next: T[],
  autor: AutorRegistro,
  ahoraISO: string
): (T & { creadoPorUid?: string; creadoPorEmail?: string; creadoEl?: string; creadoDesde?: string })[] {
  const previos = new Set(prev.map((p) => p.id));
  return next.map((item) =>
    previos.has(item.id) || item.creadoPorUid
      ? item
      : {
          ...item,
          creadoPorUid: autor.uid,
          creadoPorEmail: autor.email,
          creadoEl: ahoraISO,
          ...(autor.dispositivo ? { creadoDesde: autor.dispositivo } : {}),
        }
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

/** El nombre de quien usa ese tipo de equipo, si la clínica lo configuró ("Tía Claudia (Xiaomi)"); si no, el
 * correo de la cuenta con el equipo desde el que se hizo ("ana@clinica.mx, desde Xiaomi"). */
export function quienCreo(email: string, dispositivo?: string, nombres?: NombresDeDispositivos): string {
  if (!dispositivo) return email;
  const nombre = nombres?.[dispositivo as keyof NombresDeDispositivos]?.trim();
  return nombre ? `${nombre} (${dispositivo})` : `${email}, desde ${dispositivo}`;
}

/** "Creado por ana@clinica.mx · 02/10/2026 02:05 p.m. — automáticamente al
 * agendar una cita con costo". Para los registros anteriores a esta función:
 * solo el origen y la aclaración de que no hay autor registrado. */
export function textoAutoriaPresupuesto(
  p: { id: string; creadoPorEmail?: string; creadoEl?: string; creadoDesde?: string },
  nombresDispositivos?: NombresDeDispositivos
): string {
  const origen = textoOrigen[origenDePresupuesto(p.id)];
  if (p.creadoPorEmail) {
    return `Creado por ${quienCreo(p.creadoPorEmail, p.creadoDesde, nombresDispositivos)}${p.creadoEl ? ` · ${fechaHora(p.creadoEl)}` : ""} — ${origen}`;
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
