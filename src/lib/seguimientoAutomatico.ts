/** "Programar próximo seguimiento automáticamente": al marcar una cita
 * "Atendida" con este mecanismo activo, se genera SOLO la siguiente cita de
 * la cadena, en el intervalo que el doctor eligió para ESA atención — nunca
 * MO decide el intervalo o el motivo clínico. Sin backend/cron: la cadena
 * avanza únicamente cuando AgendaCitaDialog llama a
 * crearSiguienteCitaSeguimiento() al guardar una cita "Atendida". */

import {
  detectarConflictos,
  estaDentroDeHorario,
  toISODate,
  addMonths,
} from "./agendaHelpers";
import type { CitaAgenda, HorarioAtencion, IntervaloSeguimiento, Recurso, UnidadSeguimiento } from "./patientData";

export const PRESETS_INTERVALO: { label: string; valor: IntervaloSeguimiento }[] = [
  { label: "7 días", valor: { cantidad: 7, unidad: "dias" } },
  { label: "14 días", valor: { cantidad: 14, unidad: "dias" } },
  { label: "1 mes", valor: { cantidad: 1, unidad: "meses" } },
  { label: "3 meses", valor: { cantidad: 3, unidad: "meses" } },
  { label: "6 meses", valor: { cantidad: 6, unidad: "meses" } },
  { label: "12 meses", valor: { cantidad: 12, unidad: "meses" } },
];

/** Al abrir una cita que ya trae un intervalo, la UI debe reconocer si
 * coincide con un preset (para mostrarlo activo) o si es una combinación
 * distinta (para abrir "Personalizado" con esos valores ya cargados) — sin
 * esto, reabrir una cita con { cantidad: 21, unidad: "dias" } perdería o
 * escondería silenciosamente su intervalo real. */
export function detectarPresetIntervalo(intervalo: IntervaloSeguimiento | undefined): string {
  if (!intervalo) return "Personalizado";
  const match = PRESETS_INTERVALO.find(
    (p) => p.valor.cantidad === intervalo.cantidad && p.valor.unidad === intervalo.unidad
  );
  return match?.label ?? "Personalizado";
}

export function intervaloValido(
  intervalo: IntervaloSeguimiento | undefined
): intervalo is IntervaloSeguimiento {
  if (!intervalo) return false;
  const { cantidad, unidad } = intervalo;
  // Number.isInteger ya excluye NaN, Infinity y decimales de una sola vez.
  if (!Number.isInteger(cantidad) || cantidad <= 0) return false;
  if (unidad !== "dias" && unidad !== "semanas" && unidad !== "meses") return false; // valida en runtime, no solo en el tipo
  const limites: Record<UnidadSeguimiento, number> = { dias: 365, semanas: 52, meses: 24 };
  return cantidad <= limites[unidad];
}

function agregarDias(fechaISO: string, dias: number): Date {
  const [y, m, d] = fechaISO.split("-").map(Number);
  return new Date(y, m - 1, d + dias); // JS ya resuelve el desborde de día correctamente (a diferencia de meses)
}

/** "YYYY-MM-DD" + intervalo → "YYYY-MM-DD". Días/semanas: suma de días
 * calendario. Meses: usa addMonths ya corregido (recorta al último día
 * válido, nunca convierte "6 meses" en "180 días" — son conceptos
 * distintos). Parseo siempre por componentes locales, nunca `new
 * Date(iso)` (evita el desfase UTC de un día detrás en México). */
export function calcularFechaSeguimiento(fechaBaseISO: string, intervalo: IntervaloSeguimiento): string {
  if (intervalo.unidad === "dias") return toISODate(agregarDias(fechaBaseISO, intervalo.cantidad));
  if (intervalo.unidad === "semanas") return toISODate(agregarDias(fechaBaseISO, intervalo.cantidad * 7));
  const [y, m, d] = fechaBaseISO.split("-").map(Number);
  return toISODate(addMonths(new Date(y, m - 1, d), intervalo.cantidad));
}

export type ResultadoSeguimiento =
  | { creada: true; cita: CitaAgenda }
  | {
      creada: false;
      motivo:
        | "ya_existe"
        | "conflicto"
        | "fuera_de_horario"
        | "no_aplica"
        | "intervalo_invalido"
        | "motivo_invalido";
    };

/** Genera (de forma pura e idempotente) la siguiente cita de una cadena de
 * seguimiento a partir de una cita recién marcada "Atendida". Se puede
 * llamar más de una vez sobre la misma citaAtendida sin duplicar nada —
 * si ya existe una cita con seguimientoOrigenCitaId === citaAtendida.id,
 * devuelve "ya_existe" en vez de crear una segunda. */
export function crearSiguienteCitaSeguimiento({
  citaAtendida,
  citasExistentes,
  recursos,
  horario,
  ahora,
}: {
  citaAtendida: CitaAgenda;
  citasExistentes: CitaAgenda[]; // persistidas + las de la misma operación de guardado
  recursos: Recurso[];
  horario: HorarioAtencion;
  ahora: number; // Date.now() ya resuelto por quien llama — función pura/testeable
}): ResultadoSeguimiento {
  if (!citaAtendida.seguimientoAutomatico) return { creada: false, motivo: "no_aplica" };
  if (citasExistentes.some((c) => c.seguimientoOrigenCitaId === citaAtendida.id)) {
    return { creada: false, motivo: "ya_existe" }; // idempotencia — cambiar el intervalo después no genera una segunda
  }
  if (!intervaloValido(citaAtendida.seguimientoIntervalo)) return { creada: false, motivo: "intervalo_invalido" };
  // MO nunca inventa el motivo clínico — sin uno confirmado por el doctor,
  // no se genera nada (esto ya debería estar bloqueado desde el diálogo
  // antes de guardar; se revalida aquí también por robustez).
  const motivo = citaAtendida.seguimientoMotivo?.trim();
  if (!motivo) return { creada: false, motivo: "motivo_invalido" };
  if (!estaDentroDeHorario(horario, citaAtendida.horaInicio, citaAtendida.horaFin)) {
    return { creada: false, motivo: "fuera_de_horario" };
  }

  const cadenaId = citaAtendida.seguimientoCadenaId ?? `seg-${citaAtendida.id}`; // determinístico
  const secuencia = (citaAtendida.seguimientoSecuencia ?? 0) + 1;
  const siguienteFechaISO = calcularFechaSeguimiento(citaAtendida.fecha, citaAtendida.seguimientoIntervalo);

  // Construcción EXPLÍCITA — nunca `{...citaAtendida}`. El intervalo de la
  // cita generada HEREDA el de la atención actual como sugerencia inicial
  // (si el doctor no lo cambia, se repite la misma periodicidad), pero es
  // completamente editable cuando esa cita se abra/atienda después.
  const candidata: CitaAgenda = {
    id: `${cadenaId}-${secuencia}`, // ej. seg-C123-1, seg-C123-2 — nunca crece recursivamente
    folio: `F-${ahora.toString().slice(-6)}`, // mismo patrón que folioRef existente en AgendaCitaDialog.tsx
    recursoId: citaAtendida.recursoId,
    medicoId: citaAtendida.medicoId ?? null,
    unidadId: citaAtendida.unidadId ?? null,
    patientId: citaAtendida.patientId,
    paciente: citaAtendida.paciente,
    tratamientos: [motivo],
    costo: "",
    comentarios: "",
    fecha: siguienteFechaISO,
    horaInicio: citaAtendida.horaInicio,
    horaFin: citaAtendida.horaFin,
    estatus: "Agendada", // nunca "Confirmada" — generarse sola no confirma al paciente
    recurrenciaId: null,
    horaLlegada: null,
    seguimientoAutomatico: true,
    seguimientoCadenaId: cadenaId,
    seguimientoOrigenCitaId: citaAtendida.id,
    seguimientoIntervalo: citaAtendida.seguimientoIntervalo,
    seguimientoSecuencia: secuencia,
    seguimientoMotivo: motivo,
    origenCita: "seguimiento_automatico",
  };

  if (detectarConflictos(recursos, citasExistentes, candidata).length > 0) {
    return { creada: false, motivo: "conflicto" };
  }
  return { creada: true, cita: candidata };
}
