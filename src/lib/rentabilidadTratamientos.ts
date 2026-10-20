/** Cuánto cuesta y cuánto deja cada tratamiento: precio, comisión del médico, insumos y laboratorio, y la parte
 * que le toca de lo que cuesta tener abierto el consultorio (renta, servicios, nómina…) según el tiempo que
 * ocupa. Lógica pura, sin Firestore ni pantalla. */

import { redondearDinero } from "./dinero";

type ProcedimientoRentab = {
  id: string;
  nombre: string;
  especialidad: string;
  costoPaciente: number;
  /** Comisión del odontólogo por este procedimiento. */
  costoOdontologo: number;
  duracionMinutos: number;
  /** Insumos y laboratorio por cada vez que se hace. */
  costoInterno?: number;
  activo?: boolean;
};

export type FilaTratamiento = {
  id: string;
  nombre: string;
  especialidad: string;
  precio: number;
  comision: number;
  insumos: number;
  duracionMin: number;
  /** Precio menos comisión e insumos: lo que deja antes de contar el costo de tener abierto. */
  utilidadDirecta: number;
  /** Lo que le toca al tratamiento de la estructura del consultorio por su duración; `null` si no hay horas con qué calcularlo. */
  costoEstructura: number | null;
  costoTotal: number | null;
  utilidad: number | null;
  /** Utilidad entre el precio; `null` si no hay precio o no se pudo calcular la utilidad. */
  margen: number | null;
  utilidadPorHora: number | null;
  /** Veces que se hizo en el mes (citas atendidas que lo traen). */
  veces: number;
  /** Utilidad por las veces que se hizo en el mes; `null` si no se puede calcular. */
  utilidadDelMes: number | null;
  /** No tiene precio capturado: sus números no dicen nada todavía. */
  sinPrecio: boolean;
};

const normalizar = (t: string) => t.trim().toLowerCase();

export function rentabilidadPorTratamiento(entrada: {
  procedimientos: ProcedimientoRentab[];
  /** Costo de la estructura del consultorio por hora trabajada; `null` si el mes no tuvo horas trabajadas. */
  estructuraPorHora: number | null;
  citas: { fecha: string; estatus: string; tratamientos?: string[] }[];
  primero: string;
  ultimo: string;
}): FilaTratamiento[] {
  const veces = new Map<string, number>();
  for (const c of entrada.citas) {
    if (c.estatus !== "Atendida" || c.fecha < entrada.primero || c.fecha > entrada.ultimo) continue;
    for (const t of c.tratamientos ?? []) {
      const k = normalizar(t);
      if (k) veces.set(k, (veces.get(k) ?? 0) + 1);
    }
  }

  const filas = entrada.procedimientos
    .filter((p) => p.activo !== false)
    .map((p): FilaTratamiento => {
      const precio = Number(p.costoPaciente) || 0;
      const comision = Number(p.costoOdontologo) || 0;
      const insumos = Number(p.costoInterno) || 0;
      const duracionMin = Math.max(0, Number(p.duracionMinutos) || 0);
      const utilidadDirecta = redondearDinero(precio - comision - insumos);
      const costoEstructura = entrada.estructuraPorHora !== null ? redondearDinero((entrada.estructuraPorHora * duracionMin) / 60) : null;
      const costoTotal = costoEstructura !== null ? redondearDinero(comision + insumos + costoEstructura) : null;
      const utilidad = costoEstructura !== null ? redondearDinero(utilidadDirecta - costoEstructura) : null;
      const sinPrecio = precio <= 0;
      const n = veces.get(normalizar(p.nombre)) ?? 0;
      return {
        id: p.id,
        nombre: p.nombre,
        especialidad: p.especialidad,
        precio,
        comision,
        insumos,
        duracionMin,
        utilidadDirecta,
        costoEstructura,
        costoTotal,
        utilidad,
        margen: utilidad !== null && precio > 0 ? utilidad / precio : null,
        utilidadPorHora: utilidad !== null && duracionMin > 0 ? redondearDinero((utilidad * 60) / duracionMin) : null,
        veces: n,
        utilidadDelMes: utilidad !== null ? redondearDinero(utilidad * n) : null,
        sinPrecio,
      };
    });

  // Los que más dejan por hora primero; los que no tienen precio o no se pueden calcular, al final.
  return filas.sort((a, b) => {
    if (a.sinPrecio !== b.sinPrecio) return a.sinPrecio ? 1 : -1;
    const ua = a.utilidadPorHora ?? a.utilidadDirecta;
    const ub = b.utilidadPorHora ?? b.utilidadDirecta;
    return ub - ua || a.nombre.localeCompare(b.nombre);
  });
}
