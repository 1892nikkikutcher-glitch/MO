/** Depósito Dental: proveedores de instrumental/material/equipo con los que
 * surte el consultorio, la lista de lo que falta surtir, y el control de
 * caducidad de cementos y medicamentos. */

export type Deposito = {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
};

export const tipoFaltanteOptions = ["Instrumental", "Material", "Equipo"] as const;
export type TipoFaltante = (typeof tipoFaltanteOptions)[number];

export type ArticuloFaltante = {
  id: string;
  nombre: string;
  tipo: TipoFaltante;
  cantidad: string;
  depositoId: string;
  surtido: boolean;
  creadoEn: string;
};

export type ArticuloCaducidad = {
  id: string;
  nombre: string;
  lote: string;
  fechaCaducidad: string;
  creadoEn: string;
};

export type EstadoCaducidad = "vigente" | "por-vencer" | "caducado";

/** Vigente si faltan más de 30 días, "por vencer" dentro de 30 días, y
 * caducado si la fecha ya pasó — para poder cambiarlo antes de que se venza. */
export function estadoCaducidad(fechaCaducidad: string): EstadoCaducidad {
  if (!fechaCaducidad) return "vigente";
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(`${fechaCaducidad}T00:00:00`);
  const diasRestantes = Math.round((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  if (diasRestantes < 0) return "caducado";
  if (diasRestantes <= 30) return "por-vencer";
  return "vigente";
}

export function limpiarTelefono(telefono: string): string {
  return telefono.replace(/\D/g, "");
}

/** Mensaje de WhatsApp para pedir cotización o surtido de lo pendiente a un
 * depósito, listando los artículos faltantes que aún no se han surtido. */
export function buildMensajeDeposito(
  clinicaNombre: string,
  pendientes: ArticuloFaltante[]
): string {
  const encabezado = `Hola, te escribo desde ${clinicaNombre || "el consultorio"} para solicitar cotización / surtido de lo pendiente:`;
  if (pendientes.length === 0) {
    return `${encabezado}\n\n(Aún no hay artículos pendientes registrados — te comparto la lista en cuanto la tenga.)`;
  }
  const lista = pendientes
    .map((a) => `• ${a.nombre} (${a.tipo}) — ${a.cantidad || "cantidad por confirmar"}`)
    .join("\n");
  return `${encabezado}\n\n${lista}`;
}
