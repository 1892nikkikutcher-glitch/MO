import { esNotaV2, type NotaEvolucionAny, type NotaEvolucionV2 } from "./notasEvolucion";

export type EstadoCargaNotas = "cargando" | "cargado" | "error";
export type EstadoDocumentacion = "sin_nota" | "borrador" | "lista_revision" | "concluida";

/** MO supervisa automáticamente las atenciones de los últimos 60 días —
 * ésta es una ventana de rendimiento, NO una promesa de seguimiento
 * indefinido: una cita sin nota que supere los 60 días puede dejar de
 * aparecer en "Requieren Atención" aunque siga sin documentarse. DEUDA
 * TÉCNICA PRIORITARIA: la solución correcta es denormalizar en `CitaAgenda`
 * (`notaEvolucionId?: string`, `estadoDocumentacion?: "sin_nota" | "borrador"
 * | "lista_revision" | "firmada"`, actualizados al crear/editar/firmar una
 * nota, mismo patrón incremental que `saldosPendientes`) para poder
 * supervisar todo el historial sin pagar el costo de una suscripción
 * `onSnapshot` por paciente. No se implementa todavía. */
export const VENTANA_DOCUMENTACION_DIAS = 60;

/** Clasifica el estado documental de una cita atendida, cruzando contra las
 * notas de evolución (v2) de ese paciente ya cargadas. Precedencia explícita
 * cuando hay varias notas relacionadas con la misma cita (nunca se toma solo
 * la primera coincidencia): concluida > lista_revision > borrador > sin_nota.
 * Las notas v1 (`NotaEvolucion` en patientData.ts) nunca tienen `citaId` —
 * `esNotaV2` las excluye del cruce, nunca se les asocia especulativamente. */
export function estadoDocumentacionDeCita(
  citaId: string,
  notas: NotaEvolucionAny[] | undefined,
  estadoCarga: EstadoCargaNotas | undefined
): EstadoDocumentacion | null {
  if (estadoCarga !== "cargado" || notas === undefined) return null; // cargando, error o nunca solicitado — nunca "sin nota"
  const relacionadas = notas.filter((n): n is NotaEvolucionV2 => esNotaV2(n) && n.encabezado.citaId === citaId);
  if (relacionadas.length === 0) return "sin_nota";
  if (relacionadas.some((n) => n.estado === "firmada" || n.estado === "con_aclaracion")) return "concluida";
  if (relacionadas.some((n) => n.estado === "lista_revision")) return "lista_revision";
  if (relacionadas.some((n) => n.estado === "borrador")) return "borrador";
  return "borrador"; // estado de nota no reconocido — nunca se asume concluida, se trata como aún pendiente
}

export function prioridadPorAntiguedad(diasDesdeAtencion: number): "media" | "alta" {
  return diasDesdeAtencion === 0 ? "media" : "alta";
}

export function textoAntiguedad(diasDesdeAtencion: number): string {
  return diasDesdeAtencion === 0 ? "hoy" : `hace ${diasDesdeAtencion} día(s)`;
}

/** `cita.fecha` es "YYYY-MM-DD". NO usar `new Date("YYYY-MM-DD")` — el
 * parseo ISO-string de JS interpreta esa forma como medianoche UTC, lo que
 * corre un día hacia atrás en cualquier timezone detrás de UTC (México,
 * UTC-6). Tampoco basta con construir dos medianoches LOCALES y dividir
 * milisegundos entre 86400000 — un cambio de horario de verano entre esas
 * dos fechas puede volver el día de 23 o 25 horas, corrompiendo el conteo de
 * días calendario. En vez de eso, ambos extremos se anclan a medianoche UTC
 * (`Date.UTC`) a partir de sus componentes de calendario (año/mes/día) — UTC
 * no tiene DST, así que la resta siempre da un múltiplo exacto de 86400000
 * sin importar el timezone local del navegador. Recibe `hoy: Date` explícito
 * en vez de leer el reloj adentro (mismo patrón que `sumarRango`/
 * `ingresosPorMes` en dashboardMetrics.ts) para ser testeable. */
function medianocheUTC(anio: number, mes: number, dia: number): number {
  return Date.UTC(anio, mes, dia);
}

export function diasDesde(fechaISO: string, hoy: Date): number {
  const [y, m, d] = fechaISO.split("-").map(Number);
  const fechaUTC = medianocheUTC(y, m - 1, d);
  const hoyUTC = medianocheUTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((hoyUTC - fechaUTC) / 86400000);
}
