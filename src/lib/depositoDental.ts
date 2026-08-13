/** Depósito Dental: proveedores de instrumental/material/equipo con los que
 * surte el consultorio, la lista de lo que falta surtir, y el control de
 * caducidad de cementos y medicamentos. */

export type Deposito = {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
};

export const tipoFaltanteOptions = ["Instrumental", "Material", "Equipo", "Otro"] as const;
export type TipoFaltante = (typeof tipoFaltanteOptions)[number];

export const urgenciaFaltanteOptions = ["Baja", "Media", "Alta"] as const;
export type UrgenciaFaltante = (typeof urgenciaFaltanteOptions)[number];

export type ArticuloFaltante = {
  id: string;
  nombre: string;
  tipo: TipoFaltante;
  cantidad: string;
  urgencia: UrgenciaFaltante;
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

function formatFechaCorta(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";
  return fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

/** Los artículos creados antes de que existiera este campo no tienen
 * urgencia guardada — se muestran como "Media" en vez de "undefined". */
export function urgenciaDe(a: ArticuloFaltante): UrgenciaFaltante {
  return a.urgencia ?? "Media";
}

function lineaFaltante(a: ArticuloFaltante): string {
  return `• ${a.nombre} (${a.tipo}) — ${a.cantidad || "cantidad por confirmar"} · Urgencia: ${urgenciaDe(a)} · Registrado: ${formatFechaCorta(a.creadoEn)}`;
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
  const lista = pendientes.map(lineaFaltante).join("\n");
  return `${encabezado}\n\n${lista}`;
}

/** Recordatorio general (no dirigido a un depósito en particular) con la
 * lista completa de pendientes, su urgencia y la fecha en que se
 * registraron, para no perder de vista qué falta comprar. */
export function buildMensajeRecordatorio(pendientes: ArticuloFaltante[]): string {
  const hoy = formatFechaCorta(new Date().toISOString());
  const encabezado = `Recordatorio de Depósito Dental — ${hoy}`;
  if (pendientes.length === 0) {
    return `${encabezado}\n\nNo hay artículos pendientes por surtir en este momento.`;
  }
  const orden: Record<UrgenciaFaltante, number> = { Alta: 0, Media: 1, Baja: 2 };
  const ordenados = [...pendientes].sort((a, b) => orden[urgenciaDe(a)] - orden[urgenciaDe(b)]);
  const lista = ordenados.map(lineaFaltante).join("\n");
  return `${encabezado}\n\n${lista}`;
}
