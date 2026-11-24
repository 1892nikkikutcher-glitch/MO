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
