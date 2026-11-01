/** Mantenimiento de equipos: inventario del equipo del consultorio (sillón, autoclave, compresor, rayos X…), una
 * bitácora de mantenimientos y fallas por equipo, y el contacto del ingeniero biomédico a quien se le avisa.
 * Lógica pura: las pantallas solo guardan lo que aquí se calcula. */

import { toISODate } from "./agendaHelpers";

export const ESTADOS_EQUIPO = ["Operando", "Con falla", "En mantenimiento", "Fuera de servicio"] as const;
export type EstadoEquipo = (typeof ESTADOS_EQUIPO)[number];

export const TIPOS_REGISTRO_EQUIPO = [
  "Mantenimiento preventivo",
  "Mantenimiento correctivo",
  "Calibración",
  "Falla reportada",
  "Otro",
] as const;
export type TipoRegistroEquipo = (typeof TIPOS_REGISTRO_EQUIPO)[number];

/** Lo que cuenta como "se le dio servicio al equipo": reinicia el reloj del siguiente mantenimiento. */
const TIPOS_DE_SERVICIO: TipoRegistroEquipo[] = ["Mantenimiento preventivo", "Mantenimiento correctivo", "Calibración"];

export type Equipo = {
  id: string;
  nombre: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  /** Dónde está: "Sillón 1", "Esterilización"… */
  ubicacion: string;
  /** Fecha ISO (AAAA-MM-DD) o "". */
  fechaCompra: string;
  proveedor: string;
  /** Lo que costó, en texto libre ("$85,000"). */
  costo: string;
  /** Fecha ISO en que termina la garantía, o "". */
  garantiaHasta: string;
  estado: EstadoEquipo;
  /** Cada cuántos meses toca mantenimiento preventivo; 0 = sin programa. */
  periodicidadMeses: number;
  /** Id del ingeniero biomédico asignado, o "". */
  ingenieroId: string;
  notas: string;
  creadoEn: string;
};

export type RegistroEquipo = {
  id: string;
  equipoId: string;
  tipo: TipoRegistroEquipo;
  /** Fecha ISO del servicio o de la falla. */
  fecha: string;
  descripcion: string;
  /** Quién dio el servicio (ingeniero o empresa) o quién reportó la falla. */
  responsable: string;
  costo: string;
  /** Solo para fallas: ya quedó resuelta. */
  resuelta: boolean;
  /** Correo de quien lo capturó. */
  registradoPor: string;
  creadoEn: string;
};

export type IngenieroBiomedico = {
  id: string;
  nombre: string;
  empresa: string;
  telefono: string;
  correo: string;
  notas: string;
};

export const DIAS_AVISO_MANTENIMIENTO = 15;

export const OPCIONES_PERIODICIDAD: { meses: number; etiqueta: string }[] = [
  { meses: 0, etiqueta: "Sin programa" },
  { meses: 1, etiqueta: "Cada mes" },
  { meses: 3, etiqueta: "Cada 3 meses" },
  { meses: 6, etiqueta: "Cada 6 meses" },
  { meses: 12, etiqueta: "Cada año" },
];

export function esTipoDeServicio(tipo: TipoRegistroEquipo): boolean {
  return TIPOS_DE_SERVICIO.includes(tipo);
}

function aFecha(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(a, m - 1, d);
  return Number.isNaN(f.getTime()) ? null : f;
}

/** Suma meses a una fecha ISO sin pasarse de fin de mes (31 de enero + 1 mes = 28 de febrero). */
export function sumarMeses(iso: string, meses: number): string {
  const f = aFecha(iso);
  if (!f) return "";
  const destino = new Date(f.getFullYear(), f.getMonth() + meses, 1);
  const ultimoDia = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate();
  destino.setDate(Math.min(f.getDate(), ultimoDia));
  return toISODate(destino);
}

/** Días de `hoy` a la fecha (negativo si ya pasó); null si la fecha no es válida. */
export function diasHasta(iso: string, hoy: Date): number | null {
  const f = aFecha(iso);
  if (!f) return null;
  const base = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((f.getTime() - base.getTime()) / 86_400_000);
}

/** Fecha del servicio más reciente del equipo (preventivo, correctivo o calibración), o "". */
export function ultimoServicio(equipoId: string, registros: RegistroEquipo[]): string {
  let ultima = "";
  for (const r of registros) {
    if (r.equipoId !== equipoId || !esTipoDeServicio(r.tipo) || !aFecha(r.fecha)) continue;
    if (r.fecha > ultima) ultima = r.fecha;
  }
  return ultima;
}

/** Cuándo toca el siguiente mantenimiento: desde el último servicio (o, si nunca se le dio, desde que se compró). */
export function proximoMantenimiento(equipo: Equipo, registros: RegistroEquipo[]): string {
  const meses = Number(equipo.periodicidadMeses) || 0;
  if (meses <= 0) return "";
  const base = ultimoServicio(equipo.id, registros) || equipo.fechaCompra;
  return base ? sumarMeses(base, meses) : "";
}

export type SituacionMantenimiento = "sin-programa" | "al-dia" | "proximo" | "vencido";

export function situacionMantenimiento(equipo: Equipo, registros: RegistroEquipo[], hoy: Date): SituacionMantenimiento {
  const proximo = proximoMantenimiento(equipo, registros);
  if (!proximo) return "sin-programa";
  const dias = diasHasta(proximo, hoy);
  if (dias === null) return "sin-programa";
  if (dias < 0) return "vencido";
  if (dias <= DIAS_AVISO_MANTENIMIENTO) return "proximo";
  return "al-dia";
}

export function fallasAbiertas(equipoId: string, registros: RegistroEquipo[]): RegistroEquipo[] {
  return registros.filter((r) => r.equipoId === equipoId && r.tipo === "Falla reportada" && !r.resuelta);
}

export function garantiaVigente(equipo: Equipo, hoy: Date): boolean {
  if (!equipo.garantiaHasta) return false;
  const dias = diasHasta(equipo.garantiaHasta, hoy);
  return dias !== null && dias >= 0;
}

/** Registrar algo en la bitácora también mueve el estado del equipo:
 * - una falla nueva lo deja "Con falla";
 * - un mantenimiento correctivo (o preventivo) resuelve las fallas abiertas y, si estaba con falla o en mantenimiento,
 *   lo regresa a "Operando". */
export function aplicarRegistro(
  equipo: Equipo,
  registros: RegistroEquipo[],
  nuevo: RegistroEquipo
): { equipo: Equipo; registros: RegistroEquipo[] } {
  if (nuevo.tipo === "Falla reportada") {
    return { equipo: { ...equipo, estado: "Con falla" }, registros: [nuevo, ...registros] };
  }
  if (nuevo.tipo === "Mantenimiento correctivo" || nuevo.tipo === "Mantenimiento preventivo") {
    const actualizados = registros.map((r) =>
      r.equipoId === equipo.id && r.tipo === "Falla reportada" && !r.resuelta ? { ...r, resuelta: true } : r
    );
    const vuelve = equipo.estado === "Con falla" || equipo.estado === "En mantenimiento";
    return { equipo: vuelve ? { ...equipo, estado: "Operando" } : equipo, registros: [nuevo, ...actualizados] };
  }
  return { equipo, registros: [nuevo, ...registros] };
}

/** Marca una falla como resuelta; si era la última abierta y el equipo seguía "Con falla", vuelve a "Operando". */
export function resolverFalla(
  equipo: Equipo,
  registros: RegistroEquipo[],
  registroId: string
): { equipo: Equipo; registros: RegistroEquipo[] } {
  const actualizados = registros.map((r) => (r.id === registroId ? { ...r, resuelta: true } : r));
  const quedan = fallasAbiertas(equipo.id, actualizados).length;
  return { equipo: quedan === 0 && equipo.estado === "Con falla" ? { ...equipo, estado: "Operando" } : equipo, registros: actualizados };
}

export type ResumenMantenimiento = {
  conFalla: Equipo[];
  vencidos: Equipo[];
  proximos: Equipo[];
};

/** Lo que necesita atención hoy, para el aviso de Inicio. Un equipo fuera de servicio no se avisa como "vencido". */
export function resumenMantenimiento(equipos: Equipo[], registros: RegistroEquipo[], hoy: Date): ResumenMantenimiento {
  const conFalla = equipos.filter((e) => e.estado === "Con falla" || fallasAbiertas(e.id, registros).length > 0);
  const idsConFalla = new Set(conFalla.map((e) => e.id));
  const activos = equipos.filter((e) => e.estado !== "Fuera de servicio");
  return {
    conFalla,
    vencidos: activos.filter((e) => !idsConFalla.has(e.id) && situacionMantenimiento(e, registros, hoy) === "vencido"),
    proximos: activos.filter((e) => !idsConFalla.has(e.id) && situacionMantenimiento(e, registros, hoy) === "proximo"),
  };
}

export type MotivoAviso = "falla" | "mantenimiento";

function fechaLarga(iso: string): string {
  const f = aFecha(iso);
  return f ? f.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) : "";
}

/** Texto de WhatsApp para el ingeniero biomédico: qué equipo es, qué pasa y cómo ubicarlo. */
export function mensajeAvisoIngeniero(args: {
  clinica: string;
  equipo: Equipo;
  registros: RegistroEquipo[];
  motivo: MotivoAviso;
  ingeniero?: Pick<IngenieroBiomedico, "nombre"> | null;
}): string {
  const { clinica, equipo, registros, motivo, ingeniero } = args;
  const saludo = `Hola${ingeniero?.nombre ? ` ${ingeniero.nombre}` : ""}, te escribo desde ${clinica || "el consultorio"}.`;
  const datos = [
    `Equipo: ${equipo.nombre}`,
    [equipo.marca, equipo.modelo].filter(Boolean).length ? `Marca/modelo: ${[equipo.marca, equipo.modelo].filter(Boolean).join(" ")}` : "",
    equipo.numeroSerie ? `Serie: ${equipo.numeroSerie}` : "",
    equipo.ubicacion ? `Ubicación: ${equipo.ubicacion}` : "",
  ].filter(Boolean);

  if (motivo === "falla") {
    const abiertas = fallasAbiertas(equipo.id, registros).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const detalle = abiertas[0]
      ? `Falla reportada${abiertas[0].fecha ? ` el ${fechaLarga(abiertas[0].fecha)}` : ""}: ${abiertas[0].descripcion || "sin descripción"}`
      : "Presenta una falla.";
    return `${saludo}\n\nNecesitamos una revisión de este equipo:\n${datos.join("\n")}\n\n${detalle}\n\n¿Cuándo podrías venir a revisarlo?`;
  }

  const proximo = proximoMantenimiento(equipo, registros);
  const ultimo = ultimoServicio(equipo.id, registros);
  const lineas = [
    proximo ? `Le toca mantenimiento preventivo desde el ${fechaLarga(proximo)}.` : "Queremos programar su mantenimiento preventivo.",
    ultimo ? `Su último servicio fue el ${fechaLarga(ultimo)}.` : "",
  ].filter(Boolean);
  return `${saludo}\n\nQueremos agendar el mantenimiento de este equipo:\n${datos.join("\n")}\n\n${lineas.join(" ")}\n\n¿Qué día podrías venir?`;
}
