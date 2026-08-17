"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import {
  citaEstatusOptions,
  type CitaAgenda,
  type CitaEstatus,
  type Recurso,
} from "@/lib/patientData";
import { descargarICS } from "@/lib/exportCalendario";
import { horasDisponiblesEnRango } from "@/lib/dashboardMetrics";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  PX_PER_MIN,
  DIAS_SEMANA,
  MESES,
  estatusColor,
  CITA_ESTATUS_HEX,
  CITA_BORDE_NEUTRO,
  hexToRgba,
  emojiParaColor,
  getMonday,
  addDays,
  toISODate,
  isSameDay,
  timeToMinutes,
  minutesToTime,
  resolverMedico,
  resolverUnidad,
  detectarConflictos,
  formatRangeLabel,
  assignLanes,
} from "@/lib/agendaHelpers";
import AppointmentStatusBadge from "@/components/agenda/AppointmentStatusBadge";
import AgendaCitaDialog from "@/components/agenda/AgendaCitaDialog";
import AgendaRecursoDialog from "@/components/agenda/AgendaRecursoDialog";


/** Primera fase de optimización de lecturas: además del listener completo
 * de `citas` en PatientDataContext (que sigue existiendo tal cual, porque
 * Dashboard, Expediente y la revisión de inasistencias previas dependen de
 * tener el historial completo disponible), la Agenda abre una suscripción
 * PROPIA y adicional acotada por rango de fechas — usada solo para dibujar
 * la grilla del calendario. Mientras el listener completo del contexto
 * siga activo, esto no reduce las lecturas globales de Firestore (de
 * hecho suma una suscripción más); es un paso preparatorio para el día en
 * que la Agenda pueda dejar de depender de ese listener completo. */
function useCitasEnRango(clinicUid: string | null, desdeISO: string, hastaISO: string) {
  const [citasEnRango, setCitasEnRango] = useState<CitaAgenda[]>([]);
  useEffect(() => {
    if (!clinicUid) {
      setCitasEnRango([]);
      return;
    }
    const q = query(
      collection(db, `users/${clinicUid}/citas`),
      where("fecha", ">=", desdeISO),
      where("fecha", "<=", hastaISO)
    );
    const unsub = onSnapshot(q, (snap) => {
      setCitasEnRango(snap.docs.map((d) => ({ ...(d.data() as CitaAgenda), id: d.id })));
    });
    return unsub;
  }, [clinicUid, desdeISO, hastaISO]);
  return citasEnRango;
}

export default function Agenda() {
  const {
    recursos,
    setRecursos,
    citas,
    setCitas,
    clinicUid,
    horario,
    patients,
    navegacionNuevaCita,
    consumirNavegacionNuevaCita,
    solicitudNuevaCitaBlanco,
    consumirSolicitudNuevaCitaBlanco,
    colaboradoresActivos,
    irAPagina,
    procedimientos,
  } = usePatientData();
  /** La agenda siempre se ve/agenda de 7am a 22h como base (para casos
   * extemporáneos), pero si el horario de atención configurado es más
   * amplio, se extiende para que ese horario quede disponible también. */
  const HOUR_START = Math.min(7, Math.floor(timeToMinutes(horario.apertura || "07:00") / 60));
  const HOUR_END = Math.max(22, Math.ceil(timeToMinutes(horario.cierre || "22:00") / 60));
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [vista, setVista] = useState<"semana" | "3dias" | "dia" | "mes">("semana");
  /** Qué recurso determina el color principal de cada tarjeta — ver
   * colorPrincipalCita. El selector "Ver por" (Etapa 3) controla esto. */
  const [vistaRecurso, setVistaRecurso] = useState<"todos" | "medicos" | "unidades">("todos");
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => new Date());
  const [mesActual, setMesActual] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [recursosOcultos, setRecursosOcultos] = useState<Set<string>>(new Set());
  const [estatusOcultos, setEstatusOcultos] = useState<Set<CitaEstatus>>(new Set());
  const [recursoDialog, setRecursoDialog] = useState<"nuevo" | Recurso | null>(null);
  const [recursoParaEliminar, setRecursoParaEliminar] = useState<{ id: string; nombre: string } | null>(null);
  const [dialogState, setDialogState] = useState<{
    initial: Partial<CitaAgenda> & { fecha: string; horaInicio: string };
    isEditing: boolean;
  } | null>(null);
  const [menuEnviarAgenda, setMenuEnviarAgenda] = useState<string | null>(null);
  /** Aviso no bloqueante de conflicto de horario (médico y/o unidad) tras
   * arrastrar una cita — se muestra unos segundos, no impide el cambio. */
  const [avisoConflicto, setAvisoConflicto] = useState<string[] | null>(null);
  const mostrarAvisoConflicto = (avisos: string[]) => {
    if (avisos.length === 0) return;
    setAvisoConflicto(avisos);
    setTimeout(() => setAvisoConflicto((prev) => (prev === avisos ? null : prev)), 7000);
  };

  /** Fuerza un re-render cada 60s para que la línea de hora actual (más
   * abajo) se mantenga alineada sin depender de otra interacción. */
  const [, forzarTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forzarTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  const dias = useMemo(() => {
    if (vista === "dia") return [diaSeleccionado];
    if (vista === "3dias") return Array.from({ length: 3 }, (_, i) => addDays(diaSeleccionado, i));
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [vista, weekStart, diaSeleccionado]);

  /** Rango de fechas exacto del mes/periodo — usado por el resumen por
   * vista (no debe incluir los días de relleno de meses vecinos que sí
   * aparecen en la grilla). */
  const rangoResumen = useMemo(() => {
    if (vista === "mes") {
      const inicio = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
      const fin = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);
      return { desde: toISODate(inicio), hasta: toISODate(fin) };
    }
    return { desde: toISODate(dias[0]), hasta: toISODate(dias[dias.length - 1]) };
  }, [vista, mesActual, dias]);

  /** Rango que realmente se dibuja en la grilla — en vista Mes es más
   * ancho que rangoResumen porque la cuadrícula (diasMes, 42 días) incluye
   * días de relleno de la semana del mes anterior/siguiente. */
  const rangoConsulta = useMemo(() => {
    if (vista !== "mes") return rangoResumen;
    const inicioGrid = getMonday(new Date(mesActual.getFullYear(), mesActual.getMonth(), 1));
    return { desde: toISODate(inicioGrid), hasta: toISODate(addDays(inicioGrid, 41)) };
  }, [vista, mesActual, rangoResumen]);

  /** Ver comentario en useCitasEnRango — primera fase de optimización,
   * usada únicamente para dibujar la grilla (citasVisibles más abajo). */
  const citasEnRango = useCitasEnRango(clinicUid, rangoConsulta.desde, rangoConsulta.hasta);

  const minGridWidth = vista === "dia" ? 300 : vista === "3dias" ? 400 : 640;

  const diasMes = useMemo(() => {
    const inicio = getMonday(new Date(mesActual.getFullYear(), mesActual.getMonth(), 1));
    return Array.from({ length: 42 }, (_, i) => addDays(inicio, i));
  }, [mesActual]);

  const hoy = new Date();

  const slots = useMemo(() => {
    const arr: number[] = [];
    for (let m = HOUR_START * 60; m < HOUR_END * 60; m += 30) arr.push(m);
    return arr;
  }, []);

  const totalHeight = (HOUR_END - HOUR_START) * 60 * PX_PER_MIN;

  const recursoPorId = (id: string) => recursos.find((r) => r.id === id);
  const recursoMedico = (cita: CitaAgenda) => resolverMedico(recursos, cita);
  const recursoUnidad = (cita: CitaAgenda) => resolverUnidad(recursos, cita);

  /** Color principal de la tarjeta de una cita — identifica al médico o a
   * la unidad, nunca al estatus. Con vistaRecurso "todos": médico si la
   * cita tiene uno asignado, si no la unidad. Con "medicos"/"unidades":
   * siempre ese recurso (gris neutro si la cita no lo tiene asignado). */
  const colorPrincipalCita = (cita: CitaAgenda) => {
    if (vistaRecurso === "medicos") return recursoMedico(cita)?.color ?? CITA_BORDE_NEUTRO;
    if (vistaRecurso === "unidades") return recursoUnidad(cita)?.color ?? CITA_BORDE_NEUTRO;
    return recursoMedico(cita)?.color ?? recursoUnidad(cita)?.color ?? CITA_BORDE_NEUTRO;
  };

  /** Especialidad del primer tratamiento de la cita, resuelta contra el
   * catálogo de procedimientos por coincidencia de nombre — no se inventa
   * una categoría si no hay match en el catálogo. */
  const especialidadDeCita = (cita: CitaAgenda): string | undefined => {
    const primero = cita.tratamientos?.[0]?.trim().toLowerCase();
    if (!primero) return undefined;
    return procedimientos.find((p) => p.nombre.trim().toLowerCase() === primero)?.especialidad;
  };

  /** Fuente para todo lo que se dibuja en la grilla (día/3días/semana/mes)
   * y para el resumen por vista — citasEnRango ya viene acotada al rango
   * visible (ver useCitasEnRango). Los conteos globales de arriba
   * (conteoEstatus) siguen usando `citas` completo a propósito. */
  const citasVisibles = citasEnRango.filter((c) => {
    const idsRecurso = [c.medicoId, c.unidadId, c.recursoId].filter(Boolean) as string[];
    const ocultaPorRecurso = idsRecurso.some((id) => recursosOcultos.has(id));
    return !ocultaPorRecurso && !estatusOcultos.has(c.estatus);
  });

  const conteoEstatus = citaEstatusOptions.map((e) => ({
    estatus: e,
    total: citas.filter((c) => c.estatus === e).length,
  }));

  const toggleRecurso = (id: string) => {
    setRecursosOcultos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const eliminarRecurso = (id: string, nombre: string) => {
    setRecursoParaEliminar({ id, nombre });
  };

  const confirmarEliminarRecurso = () => {
    if (!recursoParaEliminar) return;
    setRecursos((prev) => prev.filter((r) => r.id !== recursoParaEliminar.id));
    setRecursoParaEliminar(null);
  };

  const toggleEstatus = (e: CitaEstatus) => {
    setEstatusOcultos((prev) => {
      const next = new Set(prev);
      if (next.has(e)) next.delete(e);
      else next.add(e);
      return next;
    });
  };

  const abrirNuevaCita = (fecha: Date, minutos: number) => {
    const inicio = Math.min(Math.max(Math.round(minutos / 30) * 30, HOUR_START * 60), HOUR_END * 60 - 30);
    setDialogState({
      initial: {
        fecha: toISODate(fecha),
        horaInicio: minutesToTime(inicio),
        horaFin: minutesToTime(inicio + 30),
        recursoId: recursos.find((r) => !recursosOcultos.has(r.id))?.id ?? recursos[0]?.id,
      },
      isEditing: false,
    });
  };

  const abrirEditarCita = (cita: CitaAgenda) => {
    setDialogState({ initial: cita, isEditing: true });
  };

  /** Al registrar un paciente nuevo desde el botón rápido del encabezado,
   * se sugiere de inmediato agendar su primera cita (consulta de
   * valoración) — se abre el diálogo de nueva cita ya con el paciente y el
   * tratamiento precargados, solo falta confirmar fecha/hora. */
  useEffect(() => {
    if (!navegacionNuevaCita) return;
    const paciente = patients.find((p) => p.id === navegacionNuevaCita.patientId);
    consumirNavegacionNuevaCita();
    if (!paciente) return;
    const ahora = new Date();
    const inicio = Math.min(
      Math.max(Math.round((ahora.getHours() * 60 + ahora.getMinutes()) / 30) * 30, HOUR_START * 60),
      HOUR_END * 60 - 30
    );
    setDialogState({
      initial: {
        patientId: paciente.id,
        paciente: paciente.name,
        tratamientos: [navegacionNuevaCita.tratamiento],
        fecha: toISODate(ahora),
        horaInicio: minutesToTime(inicio),
        horaFin: minutesToTime(inicio + 30),
        recursoId: recursos.find((r) => !recursosOcultos.has(r.id))?.id ?? recursos[0]?.id,
      },
      isEditing: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navegacionNuevaCita]);

  /** El botón "Nueva Cita" del encabezado no sabe a qué paciente ni hora —
   * solo pide abrir el diálogo en blanco, igual que si se hiciera clic en un
   * espacio vacío de la agenda ahora mismo. */
  useEffect(() => {
    if (!solicitudNuevaCitaBlanco) return;
    consumirSolicitudNuevaCitaBlanco();
    const ahora = new Date();
    abrirNuevaCita(ahora, ahora.getHours() * 60 + ahora.getMinutes());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudNuevaCitaBlanco]);

  useEffect(() => {
    if (!menuEnviarAgenda) return;
    const cerrar = () => setMenuEnviarAgenda(null);
    document.addEventListener("click", cerrar);
    return () => document.removeEventListener("click", cerrar);
  }, [menuEnviarAgenda]);

  /** Arma la agenda del día en texto (respeta los médicos/unidades ocultos
   * en el filtro de Recursos, para poder mandar la agenda de uno solo) y
   * abre WhatsApp para elegir a quién enviarla — el grupo de la clínica o
   * el médico correspondiente. */
  const enviarAgendaDelDia = (dia: Date, telefono?: string) => {
    const fechaISO = toISODate(dia);
    const citasDelDia = citasVisibles
      .filter((c) => c.fecha === fechaISO && c.estatus !== "Cancelada")
      .sort((a, b) => timeToMinutes(a.horaInicio) - timeToMinutes(b.horaInicio));

    const tituloDia = `${DIAS_SEMANA[(dia.getDay() + 6) % 7].replace(".", "").toUpperCase()} ${dia.getDate()} DE ${MESES[dia.getMonth()].toUpperCase()}`;
    const lineas = [`AGENDA ${tituloDia}.`, ""];

    if (citasDelDia.length === 0) {
      lineas.push("Sin citas agendadas.");
    } else {
      const medicosDelDia = recursos.filter(
        (r) => r.tipo === "medico" && citasDelDia.some((c) => c.recursoId === r.id)
      );
      if (medicosDelDia.length > 0) {
        lineas.push(medicosDelDia.map((r) => `${emojiParaColor(r.color)} ${r.nombre}`).join(" · "));
        lineas.push("🔴 No confirmada");
        lineas.push("");
      }
      citasDelDia.forEach((c) => {
        const confirmada = c.estatus === "Confirmada" || c.estatus === "Atendida";
        const colorRecurso = recursoPorId(c.recursoId)?.color;
        const emoji = confirmada && colorRecurso ? emojiParaColor(colorRecurso) : confirmada ? "🟢" : "🔴";
        lineas.push(`${emoji} ${c.horaInicio}-${c.horaFin} ${c.paciente}`);
        if (c.tratamientos?.length) lineas.push(c.tratamientos.join(", "));
        lineas.push("");
      });
    }

    const telefonoLimpio = telefono?.replace(/\D/g, "");
    const destino = telefonoLimpio ? `/${telefonoLimpio}` : "/";
    window.open(`https://wa.me${destino}?text=${encodeURIComponent(lineas.join("\n").trimEnd())}`, "_blank");
  };

  /** Descarga un .ics con las citas de lo que se está viendo ahora mismo
   * (día, 3 días, semana o mes) para importarlo en Google Calendar u otro
   * calendario — sin necesitar conectar una cuenta ni credenciales de API. */
  const exportarAGoogleCalendar = () => {
    let citasAExportar: CitaAgenda[];
    let etiqueta: string;

    if (vista === "mes") {
      citasAExportar = citasVisibles.filter((c) => {
        const [anio, mes] = c.fecha.split("-").map(Number);
        return anio === mesActual.getFullYear() && mes === mesActual.getMonth() + 1;
      });
      etiqueta = `${MESES[mesActual.getMonth()]}_${mesActual.getFullYear()}`;
    } else {
      const fechasSet = new Set(dias.map((d) => toISODate(d)));
      citasAExportar = citasVisibles.filter((c) => fechasSet.has(c.fecha));
      etiqueta =
        vista === "dia" ? toISODate(diaSeleccionado) : `${toISODate(dias[0])}_a_${toISODate(dias[dias.length - 1])}`;
    }

    // Se distingue en el nombre del calendario (lo que Google Calendar muestra al
    // importar) si es la agenda diaria o la agenda general de la clínica, para uso
    // interno del personal — evita confusión sobre qué tanto abarca el archivo.
    const nombreCalendario = vista === "dia" ? "Agenda Diaria MO" : "Agenda General MO";
    descargarICS(citasAExportar, nombreCalendario, `agenda_${etiqueta}.ics`);
  };

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const dragGrabOffsetRef = useRef(0);

  const moverCita = (citaId: string, nuevaFecha: string, minutosSoltado: number) => {
    let citaMovida: CitaAgenda | null = null;
    setCitas((prev) =>
      prev.map((c) => {
        if (c.id !== citaId) return c;
        const duracion = timeToMinutes(c.horaFin) - timeToMinutes(c.horaInicio);
        const nuevoInicio = Math.min(
          Math.max(Math.round(minutosSoltado / 30) * 30, HOUR_START * 60),
          HOUR_END * 60 - duracion
        );
        citaMovida = {
          ...c,
          fecha: nuevaFecha,
          horaInicio: minutesToTime(nuevoInicio),
          horaFin: minutesToTime(nuevoInicio + duracion),
        };
        return citaMovida;
      })
    );
    if (citaMovida) {
      const avisos = detectarConflictos(recursos, citas, citaMovida);
      mostrarAvisoConflicto(avisos);
    }
    setDraggingId(null);
    setDragOverDay(null);
  };

  const guardarCita = (nuevasCitas: CitaAgenda[]) => {
    setCitas((prev) => {
      let next = prev;
      nuevasCitas.forEach((cita) => {
        const existe = next.some((c) => c.id === cita.id);
        next = existe ? next.map((c) => (c.id === cita.id ? cita : c)) : [...next, cita];
      });
      return next;
    });
    setDialogState(null);
  };

  const eliminarCita = () => {
    if (dialogState?.initial.id) {
      setCitas((prev) => prev.filter((c) => c.id !== dialogState.initial.id));
    }
    setDialogState(null);
  };

  /** Métricas del periodo visible en la vista activa. La ocupación solo se
   * calcula en "Ver por: Todos" contra el horario configurado del
   * consultorio (única disponibilidad real que existe hoy) — al filtrar
   * por médico o unidad específicos no hay disponibilidad configurada por
   * recurso todavía, así que se muestra "—" en vez de inventar un
   * porcentaje (queda lista la arquitectura para cuando exista). */
  const resumenVista = useMemo(() => {
    const citasDelRango = citasVisibles.filter(
      (c) => c.fecha >= rangoResumen.desde && c.fecha <= rangoResumen.hasta
    );
    const contar = (estatus: CitaEstatus) => citasDelRango.filter((c) => c.estatus === estatus).length;
    const horasClinicas =
      Math.round(
        citasDelRango
          .filter((c) => c.estatus === "Atendida")
          .reduce((sum, c) => sum + (timeToMinutes(c.horaFin) - timeToMinutes(c.horaInicio)), 0) / 6
      ) / 10;
    let ocupacion: number | null = null;
    if (vistaRecurso === "todos") {
      const disponibles = horasDisponiblesEnRango(horario, rangoResumen.desde, rangoResumen.hasta);
      ocupacion = disponibles > 0 ? Math.round((horasClinicas / disponibles) * 1000) / 10 : null;
    }
    return {
      programadas: citasDelRango.length,
      atendidas: contar("Atendida"),
      confirmadas: contar("Confirmada"),
      enEspera: contar("En espera"),
      canceladas: contar("Cancelada"),
      noAsistieron: contar("No Asistió"),
      pendientes: citasDelRango.filter((c) => !["Atendida", "Cancelada", "No Asistió"].includes(c.estatus)).length,
      horasClinicas,
      ocupacion,
    };
  }, [citasVisibles, rangoResumen, horario, vistaRecurso]);

  return (
    <div className="flex flex-col gap-6">
      <div className="min-w-0 flex-1 space-y-4">
        {avisoConflicto && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            <div className="space-y-0.5">
              {avisoConflicto.map((a, i) => (
                <p key={i}>⚠️ {a}</p>
              ))}
            </div>
            <button
              onClick={() => setAvisoConflicto(null)}
              className="shrink-0 text-warning/70 hover:text-warning"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {conteoEstatus.map(({ estatus, total }) => {
              const oculto = estatusOcultos.has(estatus);
              const c = estatusColor[estatus];
              const hex = CITA_ESTATUS_HEX[estatus];
              return (
                <button
                  key={estatus}
                  onClick={() => toggleEstatus(estatus)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-opacity ${c.bg} ${c.text} ${
                    oculto ? "opacity-30" : ""
                  }`}
                  style={hex ? { color: hex, backgroundColor: hexToRgba(hex, 0.12) } : undefined}
                >
                  <span className={`h-2 w-2 rounded-full ${c.dot}`} style={hex ? { backgroundColor: hex } : undefined} />
                  {total} {estatus}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={toISODate(
                vista === "dia" || vista === "3dias" ? diaSeleccionado : vista === "mes" ? mesActual : weekStart
              )}
              onChange={(e) => {
                const d = new Date(`${e.target.value}T00:00:00`);
                setWeekStart(getMonday(d));
                setDiaSeleccionado(d);
                setMesActual(new Date(d.getFullYear(), d.getMonth(), 1));
              }}
              title="Ir a fecha"
              className="rounded-lg border border-edge/10 bg-field px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent/60"
            />
            <button
              onClick={() => {
                const hoy = new Date();
                setWeekStart(getMonday(hoy));
                setDiaSeleccionado(hoy);
                setMesActual(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
              }}
              className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
            >
              Hoy
            </button>

            <div className="flex items-center gap-1.5 rounded-lg border border-edge/10 p-0.5">
              <span className="pl-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink/40">Ver por</span>
              {(
                [
                  { id: "todos", label: "Todos" },
                  { id: "medicos", label: "Médicos" },
                  { id: "unidades", label: "Unidades" },
                ] as const
              ).map((op) => (
                <button
                  key={op.id}
                  onClick={() => setVistaRecurso(op.id)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                    vistaRecurso === op.id ? "bg-accent/15 text-accent" : "text-ink/50"
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>

            <div className="flex rounded-lg border border-edge/10 p-0.5">
              <button
                onClick={() => setVista("semana")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  vista === "semana" ? "bg-accent/15 text-accent" : "text-ink/50"
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setVista("3dias")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  vista === "3dias" ? "bg-accent/15 text-accent" : "text-ink/50"
                }`}
              >
                3 días
              </button>
              <button
                onClick={() => setVista("dia")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  vista === "dia" ? "bg-accent/15 text-accent" : "text-ink/50"
                }`}
              >
                Día
              </button>
              <button
                onClick={() => setVista("mes")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  vista === "mes" ? "bg-accent/15 text-accent" : "text-ink/50"
                }`}
              >
                Mes
              </button>
            </div>
            <button
              onClick={() =>
                vista === "dia"
                  ? setDiaSeleccionado((d) => addDays(d, -1))
                  : vista === "3dias"
                    ? setDiaSeleccionado((d) => addDays(d, -3))
                    : vista === "mes"
                      ? setMesActual((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                      : setWeekStart((w) => addDays(w, -7))
              }
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-edge/10 text-ink/60 hover:bg-surface"
            >
              ‹
            </button>
            <button
              onClick={() =>
                vista === "dia"
                  ? setDiaSeleccionado((d) => addDays(d, 1))
                  : vista === "3dias"
                    ? setDiaSeleccionado((d) => addDays(d, 3))
                    : vista === "mes"
                      ? setMesActual((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                      : setWeekStart((w) => addDays(w, 7))
              }
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-edge/10 text-ink/60 hover:bg-surface"
            >
              ›
            </button>
            <button
              onClick={exportarAGoogleCalendar}
              title={
                vista === "dia"
                  ? "Descarga la agenda diaria (.ics) para importar en Google Calendar u otro calendario — uso interno de la clínica"
                  : "Descarga la agenda general de la clínica (.ics) para importar en Google Calendar u otro calendario — uso interno"
              }
              className="flex items-center gap-1.5 rounded-lg border border-edge/10 px-3 py-1.5 text-xs font-semibold text-ink/70 transition-colors hover:bg-surface hover:text-ink"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path
                  d="M12 15V3m0 12-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Exportar a Google Calendar
            </button>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-ink">
          {vista === "dia"
            ? `${DIAS_SEMANA[(diaSeleccionado.getDay() + 6) % 7]} ${diaSeleccionado.getDate()} de ${MESES[diaSeleccionado.getMonth()]} de ${diaSeleccionado.getFullYear()}`
            : vista === "3dias"
              ? formatRangeLabel(diaSeleccionado, addDays(diaSeleccionado, 2))
              : vista === "mes"
                ? `${MESES[mesActual.getMonth()].charAt(0).toUpperCase()}${MESES[mesActual.getMonth()].slice(1)} de ${mesActual.getFullYear()}`
                : formatRangeLabel(weekStart, addDays(weekStart, 6))}
        </h2>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {(() => {
            const ocupacionChip = {
              label: vista === "dia" ? "Ocupación" : "Ocupación prom.",
              value: resumenVista.ocupacion !== null ? `${resumenVista.ocupacion}%` : "—",
            };
            const horasChip = { label: "Horas clínicas", value: `${resumenVista.horasClinicas} h` };
            const chips =
              vista === "dia"
                ? [
                    { label: "Programadas", value: resumenVista.programadas },
                    { label: "Atendidas", value: resumenVista.atendidas },
                    { label: "Pendientes", value: resumenVista.pendientes },
                    horasChip,
                    ocupacionChip,
                  ]
                : vista === "mes"
                  ? [
                      { label: "Programadas", value: resumenVista.programadas },
                      { label: "Atendidas", value: resumenVista.atendidas },
                      { label: "Canceladas", value: resumenVista.canceladas },
                      { label: "No asistieron", value: resumenVista.noAsistieron },
                      horasChip,
                      ocupacionChip,
                    ]
                  : [
                      { label: "Programadas", value: resumenVista.programadas },
                      horasChip,
                      ocupacionChip,
                      { label: "Confirmadas", value: resumenVista.confirmadas },
                      { label: "En espera", value: resumenVista.enEspera },
                      { label: "Canceladas", value: resumenVista.canceladas },
                      { label: "No asistieron", value: resumenVista.noAsistieron },
                    ];
            return chips.map((chip) => (
              <div key={chip.label} className="rounded-xl border border-edge/10 bg-surface px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-ink/40">{chip.label}</p>
                <p className="text-base font-semibold text-ink">{chip.value}</p>
              </div>
            ));
          })()}
        </div>

        {vista === "mes" && (
          <div className="overflow-hidden rounded-2xl border border-edge/10 bg-surface">
            <div className="grid grid-cols-7 border-b border-edge/10">
              {DIAS_SEMANA.map((d) => (
                <div
                  key={d}
                  className="border-r border-edge/10 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-ink/50 last:border-r-0"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {diasMes.map((dia) => {
                const enMes = dia.getMonth() === mesActual.getMonth();
                const esHoy = isSameDay(dia, hoy);
                const citasDelDia = citasVisibles
                  .filter((c) => c.fecha === toISODate(dia))
                  .sort((a, b) => timeToMinutes(a.horaInicio) - timeToMinutes(b.horaInicio));
                const horasDelDia = citasDelDia.reduce(
                  (sum, c) => sum + (timeToMinutes(c.horaFin) - timeToMinutes(c.horaInicio)) / 60,
                  0
                );
                const coloresPresentes = Array.from(new Set(citasDelDia.map((c) => colorPrincipalCita(c))));
                const resumenTooltip =
                  citasDelDia.length > 0
                    ? citasDelDia
                        .slice(0, 6)
                        .map((c) => `${c.horaInicio} ${c.paciente}`)
                        .join("\n") + (citasDelDia.length > 6 ? `\n+${citasDelDia.length - 6} más` : "")
                    : undefined;
                return (
                  <div
                    key={toISODate(dia)}
                    onClick={() => {
                      setDiaSeleccionado(dia);
                      setWeekStart(getMonday(dia));
                      setVista("dia");
                    }}
                    title={resumenTooltip}
                    className={`flex min-h-[104px] cursor-pointer flex-col gap-1.5 border-b border-r border-edge/10 p-1.5 transition-colors last:border-r-0 hover:bg-app ${
                      enMes ? "" : "opacity-40"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                        esHoy ? "bg-accent text-black" : "text-ink/60"
                      }`}
                    >
                      {dia.getDate()}
                    </span>
                    {citasDelDia.length > 0 && (
                      <div className="flex flex-1 flex-col justify-end gap-1">
                        <div className="flex flex-wrap gap-1">
                          {coloresPresentes.slice(0, 8).map((c, i) => (
                            <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <p className="text-[11px] font-semibold text-ink">
                          {citasDelDia.length} {citasDelDia.length === 1 ? "cita" : "citas"}
                        </p>
                        <p className="text-[10px] text-ink/40">{horasDelDia.toFixed(1)} h</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {vista !== "mes" && (
        <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
          <div className="flex" style={{ minWidth: minGridWidth }}>
            <div className="w-14 shrink-0 border-r border-edge/10">
              <div className="h-12 border-b border-edge/10" />
              {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i).map((h) => (
                <div
                  key={h}
                  style={{ height: 60 * PX_PER_MIN }}
                  className="border-b border-edge/5 px-1 text-[10px] text-ink/30"
                >
                  {h}:00
                </div>
              ))}
            </div>

            {dias.map((dia) => {
              const citasDelDia = citasVisibles.filter((c) => c.fecha === toISODate(dia));
              const withLane = assignLanes(citasDelDia);
              const esHoy = isSameDay(dia, hoy);
              return (
                <div key={toISODate(dia)} className="min-w-[130px] flex-1 border-r border-edge/10 last:border-r-0">
                  <div
                    className={`relative flex h-12 flex-col items-center justify-center border-b border-edge/10 text-xs ${
                      esHoy ? "bg-accent/10 text-accent" : "text-ink/60"
                    }`}
                  >
                    <span className="uppercase">{DIAS_SEMANA[(dia.getDay() + 6) % 7]}</span>
                    <span className="font-semibold">{dia.getDate()}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuEnviarAgenda((prev) => (prev === toISODate(dia) ? null : toISODate(dia)));
                      }}
                      title="Enviar agenda del día por WhatsApp"
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-success/70 transition-colors hover:bg-success/15 hover:text-success"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="shrink-0">
                        <path
                          d="M3 21l1.4-4.2A8.5 8.5 0 1 1 8.3 20.5L3 21ZM8.5 8.3c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .5.3.2.4.6 1.4.7 1.5.1.1.1.3 0 .4-.1.2-.2.3-.3.4-.2.2-.3.3-.1.6.7 1.1 1.4 1.7 2.5 2.3.2.1.3.1.4-.1.2-.2.5-.6.7-.8.1-.2.3-.2.5-.1.5.2 1.3.6 1.5.7.2.1.3.1.4.3.1.2.1.9-.2 1.4-.3.5-1.1.9-1.6 1-.5 0-1.1.1-3.4-.9-2.4-1.1-3.9-3.5-4.1-3.7-.1-.2-1-1.3-1-2.5s.6-1.7.8-2Z"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    {menuEnviarAgenda === toISODate(dia) && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-1 top-7 z-20 w-44 rounded-lg border border-edge/10 bg-modal py-1 text-left shadow-card"
                      >
                        {colaboradoresActivos
                          .filter((c) => c.whatsapp)
                          .map((c) => (
                            <button
                              key={`${c.clinicId}_${c.uid}`}
                              onClick={() => {
                                enviarAgendaDelDia(dia, c.whatsapp);
                                setMenuEnviarAgenda(null);
                              }}
                              className="block w-full truncate px-3 py-1.5 text-left text-xs text-ink/80 hover:bg-surface"
                            >
                              {c.nombre || c.correo}
                            </button>
                          ))}
                        {colaboradoresActivos.some((c) => c.whatsapp) && (
                          <div className="my-1 border-t border-edge/10" />
                        )}
                        <button
                          onClick={() => {
                            enviarAgendaDelDia(dia);
                            setMenuEnviarAgenda(null);
                          }}
                          className="block w-full px-3 py-1.5 text-left text-xs text-ink/60 hover:bg-surface"
                        >
                          Elegir en WhatsApp…
                        </button>
                      </div>
                    )}
                  </div>
                  <div
                    className={`relative cursor-pointer transition-colors ${
                      dragOverDay === toISODate(dia) ? "bg-accent/5" : ""
                    }`}
                    style={{ height: totalHeight }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const offsetY = e.clientY - rect.top;
                      const minutos = HOUR_START * 60 + offsetY / PX_PER_MIN;
                      abrirNuevaCita(dia, minutos);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverDay(toISODate(dia));
                    }}
                    onDragLeave={() => setDragOverDay((prev) => (prev === toISODate(dia) ? null : prev))}
                    onDrop={(e) => {
                      e.preventDefault();
                      const citaId = e.dataTransfer.getData("text/plain");
                      if (!citaId) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const offsetY = e.clientY - rect.top - dragGrabOffsetRef.current;
                      const minutos = HOUR_START * 60 + offsetY / PX_PER_MIN;
                      moverCita(citaId, toISODate(dia), minutos);
                    }}
                  >
                    {horario.comidaInicio && horario.comidaFin && (
                      <div
                        className="pointer-events-none absolute left-0 right-0 bg-ink/[0.03]"
                        style={{
                          top: (timeToMinutes(horario.comidaInicio) - HOUR_START * 60) * PX_PER_MIN,
                          height:
                            (timeToMinutes(horario.comidaFin) - timeToMinutes(horario.comidaInicio)) *
                            PX_PER_MIN,
                        }}
                        title="Horario de comida"
                      />
                    )}
                    {esHoy && (
                      <div
                        className="pointer-events-none absolute left-0 right-0 z-10 flex items-center"
                        style={{
                          top: (hoy.getHours() * 60 + hoy.getMinutes() - HOUR_START * 60) * PX_PER_MIN,
                        }}
                      >
                        <span className="-ml-[3px] h-[7px] w-[7px] shrink-0 rounded-full bg-accent" />
                        <span className="h-px flex-1 bg-accent/70" />
                      </div>
                    )}
                    {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                      <div
                        key={i}
                        className="absolute left-0 right-0 border-b border-edge/5"
                        style={{ top: i * 60 * PX_PER_MIN }}
                      />
                    ))}

                    {withLane.map(({ cita, lane, lanesInGroup }) => {
                      const medico = recursoMedico(cita);
                      const unidad = recursoUnidad(cita);
                      const stripe = colorPrincipalCita(cita);
                      const especialidad = especialidadDeCita(cita);
                      const top = (timeToMinutes(cita.horaInicio) - HOUR_START * 60) * PX_PER_MIN;
                      const height = Math.max(
                        (timeToMinutes(cita.horaFin) - timeToMinutes(cita.horaInicio)) * PX_PER_MIN,
                        18
                      );
                      const widthPct = 100 / lanesInGroup;
                      const arrastrando = draggingId === cita.id;
                      return (
                        <button
                          key={cita.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", cita.id);
                            e.dataTransfer.effectAllowed = "move";
                            const rect = e.currentTarget.getBoundingClientRect();
                            dragGrabOffsetRef.current = e.clientY - rect.top;
                            setDraggingId(cita.id);
                          }}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setDragOverDay(null);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirEditarCita(cita);
                          }}
                          className={`absolute overflow-hidden rounded-md border border-edge/10 bg-cita-card text-left text-[10px] leading-tight text-ink transition-transform hover:z-10 hover:scale-[1.02] hover:shadow-[0_0_10px_var(--stripe)] ${
                            arrastrando ? "cursor-grabbing opacity-40" : "cursor-grab"
                          }`}
                          style={{
                            top,
                            height,
                            left: `${lane * widthPct}%`,
                            width: `calc(${widthPct}% - 2px)`,
                            borderLeftWidth: 5,
                            borderLeftColor: stripe,
                            borderLeftStyle: "solid",
                            ["--stripe" as string]: stripe,
                            ...(arrastrando ? { boxShadow: `0 0 10px ${hexToRgba(stripe, 0.85)}` } : {}),
                          }}
                          title={`${cita.horaInicio}–${cita.horaFin} · ${cita.paciente} · ${medico?.nombre ?? unidad?.nombre ?? "Sin asignar"} — arrastra para cambiar el horario`}
                        >
                          <div
                            className="pointer-events-none absolute inset-0"
                            style={{ backgroundColor: hexToRgba(stripe, 0.07) }}
                          />
                          <div className="relative px-1.5 py-1">
                            <div className="truncate font-semibold">
                              {cita.horaInicio} {cita.paciente}
                            </div>
                            {(cita.tratamientos ?? []).length > 0 && (
                              <div className="truncate text-ink/60">
                                {cita.tratamientos.join(", ")}
                                {especialidad && (
                                  <span className="ml-1 text-[8px] font-semibold uppercase tracking-wide text-ink/35">
                                    · {especialidad}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="mt-0.5 flex flex-wrap items-center gap-1">
                              <AppointmentStatusBadge estatus={cita.estatus} />
                              {(medico || unidad) && (
                                <span className="truncate text-[9px] text-ink/40">
                                  {medico?.nombre}
                                  {medico && unidad ? " · " : ""}
                                  {unidad?.nombre}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 print:hidden sm:grid-cols-2">
        <div className="rounded-2xl border border-edge/10 bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50">Recursos</h3>
              <span
                title="El color identifica al médico o unidad. El badge dentro de la tarjeta indica el estado de la cita — son cosas distintas."
                className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-edge/20 text-[10px] text-ink/40"
              >
                ?
              </span>
            </div>
            <button
              onClick={() => setRecursoDialog("nuevo")}
              title="Agregar recurso"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-accent/40 text-accent transition-colors hover:bg-accent/10"
            >
              +
            </button>
          </div>
          <div className="space-y-1.5">
            {recursos.map((r) => {
              const oculto = recursosOcultos.has(r.id);
              return (
                <div
                  key={r.id}
                  className={`group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-opacity ${
                    oculto ? "opacity-30" : ""
                  } hover:bg-surface`}
                >
                  <button onClick={() => toggleRecurso(r.id)} className="flex min-w-0 flex-1 items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: r.color, boxShadow: `0 0 6px ${r.color}` }}
                    />
                    <span className="truncate text-ink/80">{r.nombre}</span>
                  </button>
                  <span className="shrink-0 text-[10px] uppercase text-ink/30">
                    {r.tipo === "medico" ? "Médico" : "Unidad"}
                  </span>
                  <button
                    onClick={() => setRecursoDialog(r)}
                    title="Editar recurso"
                    className="shrink-0 px-1 text-ink/40 transition-colors hover:text-accent"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => eliminarRecurso(r.id, r.nombre)}
                    title="Eliminar recurso"
                    className="shrink-0 px-1 text-ink/40 transition-colors hover:text-danger"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-edge/10 bg-surface p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">
            Horario de Atención
          </h3>
          <p className="text-sm text-ink">
            {horario.apertura} – {horario.cierre}
          </p>
          <p className="text-xs text-ink/40">
            Comida: {horario.comidaInicio} – {horario.comidaFin}
          </p>
          <button
            onClick={() => irAPagina("administracion-consultorio")}
            className="mt-2 text-xs font-semibold text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
          >
            Cambiar en Administración → Consultorio
          </button>
        </div>
      </div>

      {dialogState && (
        <AgendaCitaDialog
          recursos={recursos}
          initial={dialogState.initial}
          isEditing={dialogState.isEditing}
          onClose={() => setDialogState(null)}
          onSave={guardarCita}
          onDelete={dialogState.isEditing ? eliminarCita : undefined}
        />
      )}

      {recursoDialog && (
        <AgendaRecursoDialog
          inicial={recursoDialog === "nuevo" ? undefined : recursoDialog}
          coloresEnUso={recursos.map((r) => r.color)}
          onClose={() => setRecursoDialog(null)}
          onSave={(datos) => {
            if (recursoDialog === "nuevo") {
              const recurso = { id: `r${Date.now()}`, ...datos };
              setRecursos((prev) => [...prev, recurso]);
            } else {
              setRecursos((prev) =>
                prev.map((r) => (r.id === recursoDialog.id ? { ...r, ...datos } : r))
              );
            }
            setRecursoDialog(null);
          }}
        />
      )}

      {recursoParaEliminar && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
            <h3 className="text-base font-semibold text-ink">Eliminar recurso</h3>
            <p className="mt-2 text-sm text-ink/70">
              ¿Eliminar <span className="font-semibold text-ink">&quot;{recursoParaEliminar.nombre}&quot;</span> de
              los recursos? Las citas ya agendadas con este recurso no se borran.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setRecursoParaEliminar(null)}
                className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminarRecurso}
                className="flex-1 rounded-lg bg-danger py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
