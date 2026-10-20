/** Reporte de cierre del día: al terminar la jornada, lo que hay que tener listo para el siguiente día de
 * atención — las citas, cuáles están confirmadas, los espacios libres y lo que falta (material, autorizaciones,
 * datos). Todo puro, sin Firestore ni pantalla. */

import { fechaPagoAIso } from "./metas";
import { sumarDias } from "./evaluacionSemanal";
import {
  aMinutos,
  bloquesDelDia,
  deMinutos,
  diaDeLaSemana,
  evaluarCitaContraBloques,
  huecosLibresDelBloque,
  nombreDiaLargo,
  normalizarBloques,
  type BloqueAtencion,
  type Sede,
} from "./sedesBloques";

type CitaCierreEntrada = {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estatus: string;
  medicoId?: string | null;
  recursoId?: string;
  patientId?: string | null;
  paciente?: string;
  tratamientos?: string[];
  sedeId?: string | null;
  fueraDeBloque?: boolean;
};

type RecursoCierre = { id: string; tipo: string; nombre: string; bloques?: BloqueAtencion[] };
type PacienteCierre = { id: string; name: string; phone?: string };
type LaboratorioPendiente = { patientId: string; laboratorio: string; trabajo: string; fechaEntrega: string; estatus: string };
type SaldoPendiente = { patientId: string; totalPresupuestado: number; totalPagado: number };

/** Citas que de verdad esperan al paciente ese día (las canceladas, reagendadas y las inasistencias no). */
const ESTATUS_VIGENTES = new Set(["Agendada", "Confirmada", "En espera", "Atendida"]);
/** Un hueco menor a esto no se ofrece como espacio disponible. */
export const MINUTOS_MINIMOS_ESPACIO = 30;
const DIAS_A_BUSCAR = 14;

export function esVigente(estatus: string): boolean {
  return ESTATUS_VIGENTES.has(estatus);
}

/** Primer día después de `desdeISO` en que se atiende: algún médico tiene bloque ese día de la semana o ya hay
 * citas. Si en dos semanas no hay ninguno (sin bloques ni citas), mañana. */
export function siguienteDiaDeAtencion(
  desdeISO: string,
  recursos: RecursoCierre[],
  citas: Pick<CitaCierreEntrada, "fecha" | "estatus">[]
): string {
  const conCitas = new Set(citas.filter((c) => ESTATUS_VIGENTES.has(c.estatus)).map((c) => c.fecha));
  for (let i = 1; i <= DIAS_A_BUSCAR; i++) {
    const fecha = sumarDias(desdeISO, i);
    const hayBloque = recursos.some((r) => r.tipo === "medico" && bloquesDelDia(normalizarBloques(r.bloques), fecha).length > 0);
    if (hayBloque || conCitas.has(fecha)) return fecha;
  }
  return sumarDias(desdeISO, 1);
}

export type CitaDelCierre = {
  id: string;
  patientId: string | null;
  paciente: string;
  telefono: string;
  horaInicio: string;
  horaFin: string;
  duracionMin: number;
  motivo: string;
  estatus: string;
  confirmada: boolean;
  medicoNombre: string;
  sedeId: string;
  sedeNombre: string;
  fueraDeBloque: boolean;
};

export type EspacioLibre = { medicoNombre: string; sedeId: string; sedeNombre: string; inicio: string; fin: string; minutos: number };

export type TipoPendiente = "laboratorio" | "fuera_de_bloque" | "sin_telefono" | "sin_medico" | "saldo" | "inasistencias" | "empalme";
export type PendienteDelCierre = { tipo: TipoPendiente; citaId: string; paciente: string; texto: string };

export type CierreDelDia = {
  fecha: string;
  diaNombre: string;
  citas: CitaDelCierre[];
  confirmadas: number;
  porConfirmar: number;
  espacios: EspacioLibre[];
  minutosLibres: number;
  pendientes: PendienteDelCierre[];
};

const SIN_SEDE = "";

export function armarCierre(entrada: {
  fecha: string;
  recursos: RecursoCierre[];
  sedes: Sede[];
  citas: CitaCierreEntrada[];
  pacientes: PacienteCierre[];
  laboratorios?: LaboratorioPendiente[];
  saldos?: SaldoPendiente[];
}): CierreDelDia {
  const { fecha, recursos, sedes, pacientes } = entrada;
  const nombreSede = (id: string) => (id ? sedes.find((s) => s.id === id)?.nombre ?? "" : "");
  const medicos = recursos.filter((r) => r.tipo === "medico");
  const delDia = entrada.citas.filter((c) => c.fecha === fecha && ESTATUS_VIGENTES.has(c.estatus));

  const citas: CitaDelCierre[] = delDia
    .map((c) => {
      const medico = medicos.find((m) => m.id === (c.medicoId || c.recursoId));
      const ev = evaluarCitaContraBloques(normalizarBloques(medico?.bloques), c.fecha, c.horaInicio, c.horaFin);
      const sedeId = c.sedeId || (ev.estado === "dentro" ? ev.bloque.sedeId : SIN_SEDE);
      const paciente = pacientes.find((p) => p.id === c.patientId);
      return {
        id: c.id,
        patientId: c.patientId ?? null,
        paciente: paciente?.name ?? c.paciente ?? "Paciente",
        telefono: (paciente?.phone ?? "").trim(),
        horaInicio: c.horaInicio,
        horaFin: c.horaFin,
        duracionMin: Math.max(0, aMinutos(c.horaFin) - aMinutos(c.horaInicio)),
        motivo: (c.tratamientos ?? []).join(", "),
        estatus: c.estatus,
        confirmada: c.estatus === "Confirmada" || c.estatus === "En espera" || c.estatus === "Atendida",
        medicoNombre: medico?.nombre ?? "",
        sedeId,
        sedeNombre: nombreSede(sedeId),
        fueraDeBloque: c.fueraDeBloque === true || ev.estado === "fuera",
      };
    })
    .sort((a, b) => aMinutos(a.horaInicio) - aMinutos(b.horaInicio) || a.paciente.localeCompare(b.paciente));

  // Espacios libres: lo que los bloques de ese día dejan sin cita.
  const espacios: EspacioLibre[] = [];
  for (const m of medicos) {
    const citasDelMedico = delDia.filter((c) => (c.medicoId || c.recursoId) === m.id);
    for (const b of bloquesDelDia(normalizarBloques(m.bloques), fecha)) {
      for (const h of huecosLibresDelBloque(b, citasDelMedico)) {
        if (h.fin - h.ini < MINUTOS_MINIMOS_ESPACIO) continue;
        espacios.push({
          medicoNombre: m.nombre,
          sedeId: b.sedeId,
          sedeNombre: nombreSede(b.sedeId),
          inicio: deMinutos(h.ini),
          fin: deMinutos(h.fin),
          minutos: h.fin - h.ini,
        });
      }
    }
  }
  espacios.sort((a, b) => a.sedeNombre.localeCompare(b.sedeNombre) || a.medicoNombre.localeCompare(b.medicoNombre) || aMinutos(a.inicio) - aMinutos(b.inicio));

  // Pendientes: lo que conviene resolver antes de que lleguen.
  const pendientes: PendienteDelCierre[] = [];
  // Dos citas del mismo médico que se pisan (la más temprana primero; se avisa en la que empieza después).
  for (const c of citas) {
    const previa = citas.find(
      (o) => o.id !== c.id && o.medicoNombre && o.medicoNombre === c.medicoNombre && aMinutos(o.horaInicio) < aMinutos(c.horaFin) && aMinutos(c.horaInicio) < aMinutos(o.horaFin) &&
        (aMinutos(o.horaInicio) < aMinutos(c.horaInicio) || (aMinutos(o.horaInicio) === aMinutos(c.horaInicio) && o.id < c.id))
    );
    if (previa) {
      pendientes.push({ tipo: "empalme", citaId: c.id, paciente: c.paciente, texto: `Se empalma con la cita de ${previa.paciente} (${previa.horaInicio}–${previa.horaFin}) del mismo médico.` });
    }
  }
  for (const c of citas) {
    if (!c.medicoNombre) pendientes.push({ tipo: "sin_medico", citaId: c.id, paciente: c.paciente, texto: "La cita no tiene médico asignado." });
    if (c.fueraDeBloque && c.medicoNombre) {
      pendientes.push({ tipo: "fuera_de_bloque", citaId: c.id, paciente: c.paciente, texto: `Está fuera del bloque de ${c.medicoNombre}: confirma que esté autorizada.` });
    }
    if (!c.telefono && !c.confirmada) {
      pendientes.push({ tipo: "sin_telefono", citaId: c.id, paciente: c.paciente, texto: "No tiene teléfono capturado; no se le puede pedir confirmación." });
    }
    if (c.patientId) {
      for (const l of (entrada.laboratorios ?? []).filter((x) => x.patientId === c.patientId && x.estatus !== "Recibido")) {
        const entrega = fechaPagoAIso(l.fechaEntrega ?? "");
        const cuando = !entrega ? "sin fecha de entrega" : entrega > fecha ? `se entrega el ${l.fechaEntrega}, después de la cita` : `debía entregarse el ${l.fechaEntrega}`;
        pendientes.push({ tipo: "laboratorio", citaId: c.id, paciente: c.paciente, texto: `Falta recibir ${l.trabajo || "el trabajo"} de ${l.laboratorio || "laboratorio"} (${cuando}).` });
      }
      const saldo = (entrada.saldos ?? []).find((s) => s.patientId === c.patientId);
      const debe = saldo ? Math.round((saldo.totalPresupuestado - saldo.totalPagado) * 100) / 100 : 0;
      if (debe > 0) pendientes.push({ tipo: "saldo", citaId: c.id, paciente: c.paciente, texto: `Tiene un saldo pendiente de $${debe.toLocaleString("es-MX")}.` });
      const faltas = entrada.citas.filter((x) => x.patientId === c.patientId && x.estatus === "No Asistió" && x.fecha < fecha).length;
      if (faltas > 0) {
        pendientes.push({
          tipo: "inasistencias",
          citaId: c.id,
          paciente: c.paciente,
          texto: `No asistió a ${faltas === 1 ? "una cita anterior" : `${faltas} citas anteriores`}: confirma con tiempo y considera pedir pago anticipado.`,
        });
      }
    }
  }

  return {
    fecha,
    diaNombre: nombreDiaLargo(diaDeLaSemana(fecha)),
    citas,
    confirmadas: citas.filter((c) => c.confirmada).length,
    porConfirmar: citas.filter((c) => !c.confirmada).length,
    espacios,
    minutosLibres: espacios.reduce((acc, e) => acc + e.minutos, 0),
    pendientes,
  };
}

// ---------- Texto para WhatsApp ----------
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function fechaLargaConDia(cierre: Pick<CierreDelDia, "fecha" | "diaNombre">): string {
  const [, m, d] = cierre.fecha.split("-").map(Number);
  return `${cierre.diaNombre} ${d} de ${MESES[m - 1]}`;
}

/** "30 min", "2 h", "1 h 15 min". */
export function duracionLegible(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}


/** El reporte como texto listo para mandar por WhatsApp (o copiar). */
export function textoDelCierre(cierre: CierreDelDia, clinica?: string): string {
  const L: string[] = [];
  L.push(`*CIERRE DEL DÍA — citas del ${fechaLargaConDia(cierre)}*`);
  if (clinica) L.push(clinica);
  L.push("");

  if (cierre.citas.length === 0) {
    L.push("Sin citas agendadas.");
  } else {
    // Agrupadas por sede y médico, en orden de hora.
    const grupos = new Map<string, CitaDelCierre[]>();
    for (const c of cierre.citas) {
      const clave = `${c.sedeNombre || "Sin sede"}|${c.medicoNombre || "Sin médico"}`;
      grupos.set(clave, [...(grupos.get(clave) ?? []), c]);
    }
    for (const [clave, lista] of [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const [sede, medico] = clave.split("|");
      L.push(`📍 *${sede}* — ${medico} (${lista.length} ${lista.length === 1 ? "cita" : "citas"})`);
      for (const c of lista) {
        const partes = [`${c.horaInicio}–${c.horaFin}`, c.paciente];
        if (c.motivo) partes.push(c.motivo);
        L.push(`${c.confirmada ? "✅" : "⏳"} ${partes.join(" · ")}${c.telefono ? ` · ${c.telefono}` : ""}`);
      }
      L.push("");
    }
    L.push(`✅ Confirmadas: ${cierre.confirmadas} de ${cierre.citas.length}${cierre.porConfirmar > 0 ? ` · ⏳ Por confirmar: ${cierre.porConfirmar}` : ""}`);
    L.push("");
  }

  if (cierre.espacios.length > 0) {
    L.push("🕒 *Espacios disponibles*");
    for (const e of cierre.espacios) L.push(`• ${e.sedeNombre ? `${e.sedeNombre} · ` : ""}${e.medicoNombre}: ${e.inicio}–${e.fin} (${duracionLegible(e.minutos)})`);
    L.push("");
  }

  if (cierre.pendientes.length > 0) {
    L.push("⚠️ *Pendientes*");
    for (const p of cierre.pendientes) L.push(`• ${p.paciente}: ${p.texto}`);
  } else if (cierre.citas.length > 0) {
    L.push("Sin pendientes de material ni autorizaciones.");
  }

  return L.join("\n").trimEnd();
}
