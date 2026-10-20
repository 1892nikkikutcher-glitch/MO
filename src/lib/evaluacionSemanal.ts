/** Evaluación semanal de los bloques de atención: ¿se están ocupando de manera consistente antes de abrir
 * más? Mide horas disponibles (lo que abren los bloques), horas atendidas, cancelaciones, puntualidad,
 * cobros por operador y costos directos. Todo puro, sin Firestore ni pantalla. */

import { aMinutos, bloquesDelDia, normalizarBloques, type BloqueAtencion, type Sede } from "./sedesBloques";
import { fechaPagoAIso } from "./metas";
import { naturalezaDeGasto, type Gasto, type GastoCategoria } from "./gastos";
import type { PagoRealizado } from "./pagosRealizados";

/** Un paciente que llega con hasta estos minutos de retraso cuenta como puntual (la tolerancia que ya
 * se les comunica en el recordatorio). */
export const TOLERANCIA_PUNTUALIDAD_MIN = 10;
/** Un bloque "se ocupa bien" si las horas atendidas llegan a este porcentaje de las disponibles… */
export const UMBRAL_OCUPACION = 0.7;
/** …en cada una de las últimas semanas completas. */
export const SEMANAS_PARA_CONSISTENCIA = 3;
/** Categorías que por defecto se consideran costo directo de atender (cada gasto puede marcarse distinto). */
export const CATEGORIAS_COSTO_DIRECTO: GastoCategoria[] = ["Insumos", "Laboratorio"];

type CitaEval = {
  id: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  estatus: string;
  medicoId?: string | null;
  recursoId?: string;
  horaLlegada?: string | null;
  canceladaTarde?: boolean;
  fueraDeBloque?: boolean;
};

type RecursoEval = { id: string; tipo: string; nombre: string; bloques?: BloqueAtencion[]; porcentajeComision?: number };

const ESTATUS_OCUPAN = new Set(["Agendada", "Confirmada", "En espera", "Atendida"]);

// ---------- Fechas ----------
function aFecha(iso: string): Date {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, (m || 1) - 1, d || 1);
}
function aISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function sumarDias(iso: string, dias: number): string {
  const d = aFecha(iso);
  d.setDate(d.getDate() + dias);
  return aISO(d);
}
/** Lunes de la semana a la que pertenece la fecha. */
export function lunesDe(iso: string): string {
  const d = aFecha(iso);
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  d.setDate(d.getDate() + diff);
  return aISO(d);
}
export function diasDeLaSemana(lunes: string): string[] {
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

const horas = (minutos: number) => Math.round((minutos / 60) * 100) / 100;

// ---------- Resultado ----------
export type FilaBloque = {
  clave: string;
  medicoId: string;
  medicoNombre: string;
  sedeId: string;
  sedeNombre: string;
  horasDisponibles: number;
  /** Horas de citas que ocupan el bloque: atendidas + por atender (agendadas, confirmadas, en espera). */
  horasAgendadas: number;
  horasAtendidas: number;
  horasNoAsistio: number;
  horasCanceladas: number;
  citas: number;
  atendidas: number;
  noAsistio: number;
  canceladas: number;
  canceladasTarde: number;
  reagendadas: number;
};

export type ResumenSemana = {
  lunes: string;
  filas: FilaBloque[];
  totales: Omit<FilaBloque, "clave" | "medicoId" | "medicoNombre" | "sedeId" | "sedeNombre">;
  /** Atendidas / disponibles (0 si no hay bloques). */
  ocupacionEfectiva: number;
  /** (Atendidas + por atender) / disponibles. */
  ocupacionAgendada: number;
  fueraDeBloque: { citas: number; horas: number };
  /** Citas de la semana que no se pudieron ubicar en un bloque porque el médico no tiene bloques. */
  citasSinBloques: number;
  /** Porcentaje de citas (agendadas en la semana, sin contar reagendadas) que se cancelaron o no se atendieron. */
  tasaPerdida: number;
  puntualidad: {
    conLlegada: number;
    puntuales: number;
    tarde: number;
    minutosPromedioTarde: number;
    /** Citas atendidas sin hora de llegada capturada: sin ese dato no hay puntualidad que medir. */
    sinDato: number;
  };
};

function filaVacia(medicoId: string, medicoNombre: string, sedeId: string, sedeNombre: string): FilaBloque {
  return {
    clave: `${medicoId}|${sedeId}`,
    medicoId,
    medicoNombre,
    sedeId,
    sedeNombre,
    horasDisponibles: 0,
    horasAgendadas: 0,
    horasAtendidas: 0,
    horasNoAsistio: 0,
    horasCanceladas: 0,
    citas: 0,
    atendidas: 0,
    noAsistio: 0,
    canceladas: 0,
    canceladasTarde: 0,
    reagendadas: 0,
  };
}

function solape(aIni: number, aFin: number, bIni: number, bFin: number): number {
  return Math.max(0, Math.min(aFin, bFin) - Math.max(aIni, bIni));
}

export function resumenSemana(entrada: { lunes: string; recursos: RecursoEval[]; sedes: Sede[]; citas: CitaEval[] }): ResumenSemana {
  return resumenDeDias({ dias: diasDeLaSemana(entrada.lunes), recursos: entrada.recursos, sedes: entrada.sedes, citas: entrada.citas });
}

/** Mismo resumen para cualquier rango de días seguidos (una semana, un mes…); `lunes` trae el primer día. */
export function resumenDeDias(entrada: { dias: string[]; recursos: RecursoEval[]; sedes: Sede[]; citas: CitaEval[] }): ResumenSemana {
  const { dias, recursos, sedes, citas } = entrada;
  const lunes = dias[0];
  const medicos = recursos.filter((r) => r.tipo === "medico");
  const filas = new Map<string, FilaBloque>();
  const nombreSede = (id: string) => sedes.find((s) => s.id === id)?.nombre ?? "Sede sin nombre";
  const fila = (medico: RecursoEval, sedeId: string) => {
    const clave = `${medico.id}|${sedeId}`;
    let f = filas.get(clave);
    if (!f) {
      f = filaVacia(medico.id, medico.nombre, sedeId, nombreSede(sedeId));
      filas.set(clave, f);
    }
    return f;
  };

  // Horas disponibles: lo que abren los bloques cada día de la semana.
  for (const m of medicos) {
    for (const dia of dias) {
      for (const b of bloquesDelDia(normalizarBloques(m.bloques), dia)) {
        fila(m, b.sedeId).horasDisponibles += horas(aMinutos(b.fin) - aMinutos(b.inicio));
      }
    }
  }

  const fueraDeBloque = { citas: 0, horas: 0 };
  let citasSinBloques = 0;
  let citasDeLaSemana = 0;
  let perdidas = 0;
  let conLlegada = 0;
  let puntuales = 0;
  let minutosTardeTotal = 0;
  let tarde = 0;
  let sinDato = 0;

  const enSemana = citas.filter((c) => c.fecha >= dias[0] && c.fecha <= dias[dias.length - 1]);
  for (const c of enSemana) {
    const medico = medicos.find((m) => m.id === (c.medicoId || c.recursoId));
    const ini = aMinutos(c.horaInicio);
    const fin = aMinutos(c.horaFin);
    const duracion = Math.max(0, fin - ini);
    const bloques = medico ? bloquesDelDia(normalizarBloques(medico.bloques), c.fecha) : [];

    if (c.estatus !== "Reagendada") {
      citasDeLaSemana += 1;
      if (c.estatus === "Cancelada" || c.estatus === "No Asistió") perdidas += 1;
    }

    // Puntualidad del paciente: solo si llegó (o se le atendió).
    if (c.estatus === "Atendida" || c.estatus === "En espera") {
      if (c.horaLlegada) {
        conLlegada += 1;
        const retraso = aMinutos(c.horaLlegada) - ini;
        if (retraso <= TOLERANCIA_PUNTUALIDAD_MIN) puntuales += 1;
        else {
          tarde += 1;
          minutosTardeTotal += retraso;
        }
      } else if (c.estatus === "Atendida") {
        sinDato += 1;
      }
    }

    // ¿Dónde cae? Se reparte entre los bloques que toca; lo que queda fuera se cuenta aparte.
    let dentroMin = 0;
    const toques: { bloque: BloqueAtencion; minutos: number }[] = [];
    for (const b of bloques) {
      const m = solape(ini, fin, aMinutos(b.inicio), aMinutos(b.fin));
      if (m > 0) {
        toques.push({ bloque: b, minutos: m });
        dentroMin += m;
      }
    }
    const ocupa = ESTATUS_OCUPAN.has(c.estatus);
    const cuentaComoFuera = ocupa || c.estatus === "No Asistió";
    const tieneBloques = !!medico && normalizarBloques(medico.bloques).length > 0;
    if (tieneBloques && cuentaComoFuera && dentroMin < duracion) {
      fueraDeBloque.horas += horas(duracion - dentroMin);
      if (dentroMin === 0) fueraDeBloque.citas += 1;
    }
    if (cuentaComoFuera && !tieneBloques) citasSinBloques += 1;

    // Conteos por fila (médico + sede del bloque donde cae; si cae en varios, en el que más toca).
    const principal = toques.sort((a, b) => b.minutos - a.minutos)[0];
    if (medico && principal) {
      const f = fila(medico, principal.bloque.sedeId);
      f.citas += 1;
      if (c.estatus === "Atendida") f.atendidas += 1;
      if (c.estatus === "No Asistió") f.noAsistio += 1;
      if (c.estatus === "Cancelada") {
        f.canceladas += 1;
        if (c.canceladaTarde) f.canceladasTarde += 1;
      }
      if (c.estatus === "Reagendada") f.reagendadas += 1;
      for (const t of toques) {
        const ff = fila(medico, t.bloque.sedeId);
        const h = horas(t.minutos);
        if (ocupa) ff.horasAgendadas += h;
        if (c.estatus === "Atendida") ff.horasAtendidas += h;
        if (c.estatus === "No Asistió") ff.horasNoAsistio += h;
        if (c.estatus === "Cancelada") ff.horasCanceladas += h;
      }
    }
  }

  const lista = [...filas.values()]
    .map((f) => ({
      ...f,
      horasDisponibles: redondear(f.horasDisponibles),
      horasAgendadas: redondear(f.horasAgendadas),
      horasAtendidas: redondear(f.horasAtendidas),
      horasNoAsistio: redondear(f.horasNoAsistio),
      horasCanceladas: redondear(f.horasCanceladas),
    }))
    .sort((a, b) => a.medicoNombre.localeCompare(b.medicoNombre) || a.sedeNombre.localeCompare(b.sedeNombre));

  const suma = (campo: keyof Omit<FilaBloque, "clave" | "medicoId" | "medicoNombre" | "sedeId" | "sedeNombre">) =>
    redondear(lista.reduce((acc, f) => acc + f[campo], 0));
  const totales = {
    horasDisponibles: suma("horasDisponibles"),
    horasAgendadas: suma("horasAgendadas"),
    horasAtendidas: suma("horasAtendidas"),
    horasNoAsistio: suma("horasNoAsistio"),
    horasCanceladas: suma("horasCanceladas"),
    citas: suma("citas"),
    atendidas: suma("atendidas"),
    noAsistio: suma("noAsistio"),
    canceladas: suma("canceladas"),
    canceladasTarde: suma("canceladasTarde"),
    reagendadas: suma("reagendadas"),
  };

  return {
    lunes,
    filas: lista,
    totales,
    ocupacionEfectiva: totales.horasDisponibles > 0 ? totales.horasAtendidas / totales.horasDisponibles : 0,
    ocupacionAgendada: totales.horasDisponibles > 0 ? totales.horasAgendadas / totales.horasDisponibles : 0,
    fueraDeBloque: { citas: fueraDeBloque.citas, horas: redondear(fueraDeBloque.horas) },
    citasSinBloques,
    tasaPerdida: citasDeLaSemana > 0 ? perdidas / citasDeLaSemana : 0,
    puntualidad: {
      conLlegada,
      puntuales,
      tarde,
      minutosPromedioTarde: tarde > 0 ? Math.round(minutosTardeTotal / tarde) : 0,
      sinDato,
    },
  };
}

function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------- Cobros por operador ----------
export type CobroOperador = { operador: string; total: number; pagos: number };

export type CobrosSemana = {
  porOperador: CobroOperador[];
  /** Suma de lo que registró cada operador según la bitácora de pagos. */
  totalRegistrado: number;
};

/** Cobros de la semana por quien los registró. La bitácora de pagos empezó el día que se activó, así que lo
 * que no aparezca aquí no se puede atribuir a nadie (la pantalla lo muestra como "sin registro de operador"). */
export function cobrosPorOperador(pagos: PagoRealizado[], lunes: string): CobrosSemana {
  const desde = lunes;
  const hasta = sumarDias(lunes, 6);
  const mapa = new Map<string, CobroOperador>();
  let totalRegistrado = 0;
  for (const p of pagos) {
    const fecha = fechaPagoAIso(p.pago?.fecha ?? "") ?? (p.registradoEn ?? "").slice(0, 10);
    if (!fecha || fecha < desde || fecha > hasta) continue;
    const operador = (p.registradoPor || "").trim().toLowerCase() || "sin operador";
    const total = Number(p.pago?.total) || 0;
    const actual = mapa.get(operador) ?? { operador, total: 0, pagos: 0 };
    actual.total = Math.round((actual.total + total) * 100) / 100;
    actual.pagos += 1;
    mapa.set(operador, actual);
    totalRegistrado = Math.round((totalRegistrado + total) * 100) / 100;
  }
  return { porOperador: [...mapa.values()].sort((a, b) => b.total - a.total), totalRegistrado };
}

// ---------- Costos directos ----------
export type CostosSemana = {
  directos: { categoria: string; monto: number }[];
  totalDirectos: number;
  indirectos: { categoria: string; monto: number }[];
  totalIndirectos: number;
  /** Lo invertido en la semana (equipo, remodelación…): no es costo ni gasto, se muestra aparte. */
  inversion: number;
};

export function costosDeLaSemana(gastos: Gasto[], lunes: string): CostosSemana {
  const desde = lunes;
  const hasta = sumarDias(lunes, 6);
  const directos = new Map<string, number>();
  const indirectos = new Map<string, number>();
  let inversion = 0;
  for (const g of gastos) {
    if (!g.fecha || g.fecha < desde || g.fecha > hasta) continue;
    const naturaleza = naturalezaDeGasto(g);
    if (naturaleza === "financiero") continue; // impuestos e intereses: debajo de la utilidad operativa
    if (naturaleza === "inversion") {
      inversion = Math.round((inversion + (Number(g.monto) || 0)) * 100) / 100;
      continue;
    }
    const destino = naturaleza === "costo" ? directos : indirectos;
    destino.set(g.categoria, Math.round(((destino.get(g.categoria) ?? 0) + (Number(g.monto) || 0)) * 100) / 100);
  }
  const aLista = (m: Map<string, number>) => [...m.entries()].map(([categoria, monto]) => ({ categoria, monto })).sort((a, b) => b.monto - a.monto);
  const sumaLista = (l: { monto: number }[]) => Math.round(l.reduce((a, x) => a + x.monto, 0) * 100) / 100;
  const d = aLista(directos);
  const i = aLista(indirectos);
  return { directos: d, totalDirectos: sumaLista(d), indirectos: i, totalIndirectos: sumaLista(i), inversion };
}

/** Comisión estimada a los médicos: su % por lo que cobraron en la semana (los que no tienen % no suman). */
export function comisionesEstimadas(
  porFechaYMedico: Record<string, Record<string, number>> | undefined,
  recursos: RecursoEval[],
  lunes: string
): number {
  if (!porFechaYMedico) return 0;
  const dias = new Set(diasDeLaSemana(lunes));
  const porcentaje = new Map(recursos.filter((r) => r.tipo === "medico" && r.porcentajeComision).map((r) => [r.nombre, r.porcentajeComision as number]));
  let total = 0;
  for (const [fecha, medicos] of Object.entries(porFechaYMedico)) {
    if (!dias.has(fecha)) continue;
    for (const [nombre, monto] of Object.entries(medicos)) {
      const pct = porcentaje.get(nombre);
      if (pct) total += (monto * pct) / 100;
    }
  }
  return Math.round(total * 100) / 100;
}

// ---------- ¿Ya se pueden abrir más bloques? ----------
export type EstadoConsistencia = "consistente" | "todavia_no" | "sin_datos";

export type VeredictoFila = {
  clave: string;
  medicoNombre: string;
  sedeNombre: string;
  /** Ocupación efectiva de cada una de las últimas semanas, de la más antigua a la más reciente. */
  porSemana: { lunes: string; ocupacion: number }[];
  consistente: boolean;
};

export type Veredicto = {
  estado: EstadoConsistencia;
  umbral: number;
  semanas: number;
  filas: VeredictoFila[];
};

/** Mira las últimas `semanas` semanas COMPLETAS (que ya terminaron antes de `hoyISO`) y dice, por médico y sede,
 * si las horas atendidas llegaron al umbral en todas. Se calcula con los bloques actuales: si cambias un bloque,
 * las semanas pasadas se recalculan con el cambio. */
export function veredictoDeBloques(
  entrada: { hoyISO: string; recursos: RecursoEval[]; sedes: Sede[]; citas: CitaEval[] },
  umbral = UMBRAL_OCUPACION,
  semanas = SEMANAS_PARA_CONSISTENCIA
): Veredicto {
  const lunesActual = lunesDe(entrada.hoyISO);
  const lunes = Array.from({ length: semanas }, (_, i) => sumarDias(lunesActual, -7 * (semanas - i)));
  const resumenes = lunes.map((l) => resumenSemana({ lunes: l, recursos: entrada.recursos, sedes: entrada.sedes, citas: entrada.citas }));

  const claves = new Map<string, { medicoNombre: string; sedeNombre: string }>();
  for (const r of resumenes) for (const f of r.filas) if (f.horasDisponibles > 0) claves.set(f.clave, { medicoNombre: f.medicoNombre, sedeNombre: f.sedeNombre });

  const filas: VeredictoFila[] = [...claves.entries()].map(([clave, datos]) => {
    const porSemana = resumenes.map((r) => {
      const f = r.filas.find((x) => x.clave === clave);
      return { lunes: r.lunes, ocupacion: f && f.horasDisponibles > 0 ? f.horasAtendidas / f.horasDisponibles : 0 };
    });
    return { clave, ...datos, porSemana, consistente: porSemana.every((s) => s.ocupacion >= umbral) };
  });
  filas.sort((a, b) => a.medicoNombre.localeCompare(b.medicoNombre) || a.sedeNombre.localeCompare(b.sedeNombre));

  const estado: EstadoConsistencia = filas.length === 0 ? "sin_datos" : filas.every((f) => f.consistente) ? "consistente" : "todavia_no";
  return { estado, umbral, semanas, filas };
}
