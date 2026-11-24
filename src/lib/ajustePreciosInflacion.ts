/** Ajuste porcentual de los precios del catálogo (por ejemplo, por la inflación anual): se calcula todo aquí, sin tocar
 * nada, para poder mostrar la vista previa antes de guardar. */

import type { Procedimiento } from "./procedimientos";

export const pasosDeRedondeo = [
  { valor: 1, texto: "Al peso" },
  { valor: 5, texto: "A $5" },
  { valor: 10, texto: "A $10" },
  { valor: 50, texto: "A $50" },
] as const;

export const PORCENTAJE_MAXIMO = 100;

/** Redondea al múltiplo más cercano del paso (los .5 suben). */
export function redondearPrecio(valor: number, paso: number): number {
  if (!(paso > 0)) return Math.round(valor * 100) / 100;
  return Math.round(Math.round((valor / paso) * 1e6) / 1e6) * paso;
}

export function aplicarPorcentaje(valor: number, porcentaje: number, paso: number): number {
  return redondearPrecio(valor * (1 + porcentaje / 100), paso);
}

export type OpcionesAjuste = {
  porcentaje: number;
  paso: number;
  /** También sube el costo al odontólogo y el costo interno (solo los que ya están capturados). */
  incluirCostos: boolean;
  /** Solo esta especialidad; ausente = todas. */
  especialidad?: string;
};

export type CambioPrecio = {
  id: string;
  nombre: string;
  especialidad: string;
  costoPaciente: number;
  nuevoCostoPaciente: number;
  /** Valores que se guardan además del precio (solo los que cambian). */
  campos: Partial<Pick<Procedimiento, "costoPaciente" | "precioPromocional" | "costoOdontologo" | "costoInterno">>;
  /** Los valores de antes de esos mismos campos, para poder deshacer. */
  anteriores: Partial<Pick<Procedimiento, "costoPaciente" | "precioPromocional" | "costoOdontologo" | "costoInterno">>;
};

export function porcentajeValido(porcentaje: number): boolean {
  return Number.isFinite(porcentaje) && porcentaje > 0 && porcentaje <= PORCENTAJE_MAXIMO;
}

/** Los tratamientos que cambian y con qué valores. Los que están en $0 (aún sin precio) no se tocan. */
export function calcularAjustePrecios(procedimientos: Procedimiento[], opciones: OpcionesAjuste): CambioPrecio[] {
  if (!porcentajeValido(opciones.porcentaje)) return [];
  const { porcentaje, paso, incluirCostos, especialidad } = opciones;
  const cambios: CambioPrecio[] = [];
  for (const p of procedimientos) {
    if (especialidad && p.especialidad !== especialidad) continue;
    if (!(p.costoPaciente > 0)) continue;
    const campos: CambioPrecio["campos"] = {};
    const anteriores: CambioPrecio["anteriores"] = {};
    const nuevoPrecio = aplicarPorcentaje(p.costoPaciente, porcentaje, paso);
    if (nuevoPrecio !== p.costoPaciente) {
      campos.costoPaciente = nuevoPrecio;
      anteriores.costoPaciente = p.costoPaciente;
    }
    if (p.precioPromocional && p.precioPromocional > 0) {
      const nuevo = aplicarPorcentaje(p.precioPromocional, porcentaje, paso);
      if (nuevo !== p.precioPromocional) {
        campos.precioPromocional = nuevo;
        anteriores.precioPromocional = p.precioPromocional;
      }
    }
    if (incluirCostos) {
      if (!p.costoSinConfigurar && p.costoOdontologo > 0) {
        const nuevo = aplicarPorcentaje(p.costoOdontologo, porcentaje, paso);
        if (nuevo !== p.costoOdontologo) {
          campos.costoOdontologo = nuevo;
          anteriores.costoOdontologo = p.costoOdontologo;
        }
      }
      if (p.costoInterno && p.costoInterno > 0) {
        const nuevo = aplicarPorcentaje(p.costoInterno, porcentaje, paso);
        if (nuevo !== p.costoInterno) {
          campos.costoInterno = nuevo;
          anteriores.costoInterno = p.costoInterno;
        }
      }
    }
    if (Object.keys(campos).length === 0) continue;
    cambios.push({
      id: p.id,
      nombre: p.nombre,
      especialidad: p.especialidad,
      costoPaciente: p.costoPaciente,
      nuevoCostoPaciente: nuevoPrecio,
      campos,
      anteriores,
    });
  }
  return cambios;
}

export type RegistroAjustePrecios = { fecha: string; porcentaje: number; cantidad: number };

/** Meses completos desde el último ajuste; null si nunca se ha hecho uno. */
export function mesesDesdeAjuste(registro: RegistroAjustePrecios | null | undefined, ahora: Date): number | null {
  if (!registro?.fecha) return null;
  const f = new Date(registro.fecha);
  if (Number.isNaN(f.getTime())) return null;
  let meses = (ahora.getFullYear() - f.getFullYear()) * 12 + (ahora.getMonth() - f.getMonth());
  if (ahora.getDate() < f.getDate()) meses -= 1;
  return Math.max(0, meses);
}

/** Se recuerda el ajuste anual cuando ya pasó cerca de un año (11 meses o más). */
export function tocaAjusteAnual(registro: RegistroAjustePrecios | null | undefined, ahora: Date): boolean {
  const meses = mesesDesdeAjuste(registro, ahora);
  return meses !== null && meses >= 11;
}

/** Lo que el dueño decidió sobre su aumento anual. */
export type ConfigAjustePrecios = {
  /** El aumento que propone cada año (en %). */
  porcentajeAnual?: number;
  /** true = cada año se avisa y se propone el ajuste, para que el dueño lo apruebe (nunca se aplica sin su permiso). */
  automatico?: boolean;
  /** Día (AAAA-MM-DD) en que toca el siguiente ajuste. */
  proximoAjuste?: string;
  /** Si pidió que se lo recuerden después: hasta qué día (AAAA-MM-DD) no se vuelve a avisar. */
  posponerHasta?: string;
};

function aISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fechaLocal(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** El primer 1 de enero que aún no llega: la fecha que se propone al activar el ajuste anual. */
export function proximoPrimeroDeEnero(ahora: Date): string {
  return `${ahora.getFullYear() + 1}-01-01`;
}

/** Un año después de `fecha`; si el 29 de febrero no existe ese año, cae el 28. */
function masUnAño(fecha: string): string {
  const d = fechaLocal(fecha);
  if (!d) return fecha;
  const dia = d.getDate();
  const r = new Date(d.getFullYear() + 1, d.getMonth(), 1);
  r.setDate(Math.min(dia, new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()));
  return aISO(r);
}

/** Fecha del siguiente ajuste después de aprobar uno: un año después de la programada y, si aun así ya pasó, se recorre
 * año con año hasta que quede en el futuro. */
export function siguienteAjuste(programada: string, ahora: Date): string {
  const hoy = aISO(ahora);
  let p = masUnAño(programada);
  let vueltas = 0;
  while (p <= hoy && vueltas < 50) {
    p = masUnAño(p);
    vueltas += 1;
  }
  return p;
}

export function sumarDias(ahora: Date, dias: number): string {
  const d = new Date(ahora);
  d.setDate(d.getDate() + dias);
  return aISO(d);
}

export type AjustePendiente =
  /** Llegó la fecha que el dueño programó: hay que pedirle permiso. */
  | { tipo: "aprobacion"; programada: string; porcentaje: number | null }
  /** Sin ajuste programado, pero ya pasó cerca de un año del último. */
  | { tipo: "recordatorio" };

export function ajustePendiente(
  config: ConfigAjustePrecios | null | undefined,
  registro: RegistroAjustePrecios | null | undefined,
  ahora: Date
): AjustePendiente | null {
  const hoy = aISO(ahora);
  if (config?.automatico && config.proximoAjuste) {
    if (config.proximoAjuste > hoy) return null;
    if (config.posponerHasta && config.posponerHasta > hoy) return null;
    return { tipo: "aprobacion", programada: config.proximoAjuste, porcentaje: config.porcentajeAnual ?? null };
  }
  if (!config?.automatico && tocaAjusteAnual(registro, ahora)) return { tipo: "recordatorio" };
  return null;
}
