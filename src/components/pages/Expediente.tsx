"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import NuevoPresupuesto from "./NuevoPresupuesto";
import PresupuestoImpreso from "./PresupuestoImpreso";
import PresupuestoTotalImpreso from "./PresupuestoTotalImpreso";
import NuevaComparativaRehabilitacion from "./NuevaComparativaRehabilitacion";
import ComparativaImpresa from "./ComparativaImpresa";
import DatosPaciente from "./DatosPaciente";
import HistoriaClinica from "./HistoriaClinica";
import ListadoCitas from "./ListadoCitas";
import Fotografias from "./Fotografias";
import Pagos from "./Pagos";
import ConsentimientoInformado from "./ConsentimientoInformado";
import Laboratorios from "./Laboratorios";
import NotasEvolucionTab from "@/components/notasEvolucion/NotasEvolucionTab";
import MembresiaTab from "./MembresiaTab";
import { usePatientData } from "@/context/PatientDataContext";
import { useMoConecta } from "@/context/MoConectaContext";
import { generarPresupuestoPdf } from "@/lib/generarPresupuestoPdf";
import { generarPresupuestoTotalPdf } from "@/lib/generarPresupuestoTotalPdf";
import { enviarPdfPorWhatsapp } from "@/lib/enviarPdfWhatsapp";
import AbrirWhatsAppPrompt from "@/components/AbrirWhatsAppPrompt";
import { slugify } from "@/lib/textoNombre";
import {
  computeTratamientosPendientes,
  formatCurrency,
  formatEdad,
  formatFechaCita,
  formatNombreConEdad,
  presupuestoEstadoOptions,
  type CitaAgenda,
  type EstadoPresupuesto,
  type Patient,
  type SavedBudget,
  type Pago,
} from "@/lib/patientData";
import {
  condicionesSistemicasPositivas,
  esNegacionAlergia,
  respuestasVacias,
  valorOdontogramaComoDiagnosticos,
  type PresupuestoPrefillItem,
  type RespuestaValor,
} from "@/lib/historiaClinica";
import { timeToMinutes, toISODate, getMonday, addDays } from "@/lib/agendaHelpers";
import { estaVencido, renovarVigencia } from "@/lib/presupuestoVigencia";
import { generarComparativaPdf } from "@/lib/generarComparativaPdf";
import type { ComparativaRehabilitacion } from "@/lib/comparativaRehabilitacion";

function fechaLargaHoy() {
  const texto = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const estadoPresupuestoLabel: Record<EstadoPresupuesto, string> = {
  pendiente: "Pendiente",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
  expirado: "Expirado",
};

const estadoPresupuestoColor: Record<EstadoPresupuesto, string> = {
  pendiente: "bg-ink/10 text-ink/60",
  aceptado: "bg-success/10 text-success",
  rechazado: "bg-danger/10 text-danger",
  expirado: "bg-warning/10 text-warning",
};

const expedienteTabs = [
  "Datos del Paciente",
  "Historia Clínica",
  "Presupuestos",
  "Pagos",
  "Membresía",
  "Consentimientos Informados",
  "Fotografías",
  "Laboratorios",
  "Listado de Citas",
  "Notas de Evolución y Seguimiento",
] as const;

type ExpedienteTab = (typeof expedienteTabs)[number];


function buildResumenExpediente(
  patient: Patient,
  edad: number | null,
  formatDate: (date: string) => string,
  presupuestos: SavedBudget[],
  pagos: Pago[],
  citasFuturas: CitaAgenda[],
  puedeVerFinanzas: boolean
) {
  const tratamientosPendientes = computeTratamientosPendientes(presupuestos, pagos);
  const lineas = [
    `Resumen de expediente — ${patient.name}`,
    edad !== null ? `Edad: ${edad} años` : "",
    patient.birthDate ? `Fecha de nacimiento: ${formatDate(patient.birthDate)}` : "",
    "",
  ];

  if (citasFuturas.length > 0) {
    lineas.push("Próximas citas:");
    citasFuturas.forEach((c) =>
      lineas.push(
        `- ${formatFechaCita(c.fecha)} ${c.horaInicio}${c.tratamientos?.length ? ` · ${c.tratamientos.join(", ")}` : ""}`
      )
    );
    lineas.push("");
  }

  if (puedeVerFinanzas) {
    if (tratamientosPendientes.length > 0) {
      lineas.push("Tratamientos pendientes de pago:");
      tratamientosPendientes.forEach((t) => lineas.push(`- ${t.label}: ${formatCurrency(t.pendiente)}`));
      lineas.push("");
    }
    if (presupuestos.length > 0) {
      lineas.push(`Presupuestos registrados: ${presupuestos.length}`);
    }
    if (pagos.length > 0) {
      const totalPagado = pagos.reduce((sum, p) => sum + p.total, 0);
      lineas.push(`Total pagado a la fecha: ${formatCurrency(totalPagado)}`);
    }
  }
  lineas.push("", "Este resumen es informativo. Para dudas, contáctanos.");

  return lineas.filter((l, i) => l !== "" || lineas[i - 1] !== "").join("\n");
}

function PrinterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M6 14h12v7H6v-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 21l1.4-4.2A8.5 8.5 0 1 1 8.3 20.5L3 21ZM8.5 8.3c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .5.3.2.4.6 1.4.7 1.5.1.1.1.3 0 .4-.1.2-.2.3-.3.4-.2.2-.3.3-.1.6.7 1.1 1.4 1.7 2.5 2.3.2.1.3.1.4-.1.2-.2.5-.6.7-.8.1-.2.3-.2.5-.1.5.2 1.3.6 1.5.7.2.1.3.1.4.3.1.2.1.9-.2 1.4-.3.5-1.1.9-1.6 1-.5 0-1.1.1-3.4-.9-2.4-1.1-3.9-3.5-4.1-3.7-.1-.2-1-1.3-1-2.5s.6-1.7.8-2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6h14ZM10 11v6M14 11v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PresupuestosTab({
  patient,
  presupuestos,
  setPresupuestos,
  planTratamientoSugerido,
  prefillPresupuesto,
  onConsumirPrefillPresupuesto,
}: {
  patient: Patient;
  presupuestos: SavedBudget[];
  setPresupuestos: Dispatch<SetStateAction<SavedBudget[]>>;
  planTratamientoSugerido: string;
  prefillPresupuesto: PresupuestoPrefillItem[] | null;
  onConsumirPrefillPresupuesto: () => void;
}) {
  const {
    perfilDoctor,
    historiaClinicaPorPaciente,
    setRespuestasHistoriaClinica,
    comparativasPorPaciente,
    setComparativasPaciente,
  } = usePatientData();
  const [view, setView] = useState<"list" | "form" | "comparativa">("list");
  const [editingBudget, setEditingBudget] = useState<SavedBudget | null>(null);
  const [editingComparativa, setEditingComparativa] = useState<ComparativaRehabilitacion | null>(null);
  const [printComparativa, setPrintComparativa] = useState<ComparativaRehabilitacion | null>(null);
  const [enviandoComparativaId, setEnviandoComparativaId] = useState<string | null>(null);
  const [comparativaAEliminar, setComparativaAEliminar] = useState<ComparativaRehabilitacion | null>(null);
  /** Cuando enviar por WhatsApp (presupuesto, presupuesto completo o
   * comparativa) descarga el PDF pero no puede abrir WhatsApp solo — ver
   * ResultadoEnvioWhatsapp en enviarPdfWhatsapp.ts. */
  const [waUrlPendiente, setWaUrlPendiente] = useState<string | null>(null);
  const comparativas = comparativasPorPaciente[patient.id] ?? [];

  useEffect(() => {
    if (printComparativa) window.print();
  }, [printComparativa]);

  const enviarComparativaGuardada = async (comparativa: ComparativaRehabilitacion) => {
    if (enviandoComparativaId) return;
    const ventanaWhatsApp = window.open("", "_blank");
    const nombreArchivo = `Comparativa_${slugify(patient.name)}_${slugify(fechaLargaHoy())}.pdf`;
    const caption = `Comparativa de rehabilitación — ${patient.name} · ${comparativa.titulo}`;

    setEnviandoComparativaId(comparativa.id);
    try {
      const blob = await generarComparativaPdf({
        comparativa,
        presupuestos,
        fechaLarga: fechaLargaHoy(),
        pacienteNombre: patient.name,
        perfilDoctor,
      });
      const resultado = await enviarPdfPorWhatsapp({ blob, nombreArchivo, telefono: patient.phone, caption, ventanaPrevia: ventanaWhatsApp });
      if (resultado.requiereAbrirManualmente) setWaUrlPendiente(resultado.waUrl);
    } catch (err) {
      console.error("No se pudo generar el PDF de la comparativa", err);
      ventanaWhatsApp?.close();
      alert("No se pudo generar el PDF de la comparativa. Intenta de nuevo.");
    } finally {
      setEnviandoComparativaId(null);
    }
  };

  // Un prefill (viene de "Agregar a presupuesto" en Historia Clínica) abre
  // el formulario de Nuevo Presupuesto de inmediato, ya con esos renglones.
  useEffect(() => {
    if (prefillPresupuesto && prefillPresupuesto.length > 0) {
      setEditingBudget(null);
      setView("form");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillPresupuesto]);
  const [printTarget, setPrintTarget] = useState<SavedBudget | null>(null);
  const [printAll, setPrintAll] = useState(false);
  const [vistaPreviaCompleto, setVistaPreviaCompleto] = useState(false);
  const [enviandoWhatsAppId, setEnviandoWhatsAppId] = useState<string | null>(null);
  const [enviandoCompleto, setEnviandoCompleto] = useState(false);
  const [presupuestoAEliminar, setPresupuestoAEliminar] = useState<SavedBudget | null>(null);
  /** Vacío = incluir TODOS los folios en "presupuesto completo" (imprimir o
   * enviar) — al marcar uno o más folios puntuales, el completo se arma
   * solo con esos, para poder entregar/enviar nada más lo que aplica (ej.
   * solo los de una fase o los ya aceptados). */
  const [foliosSeleccionados, setFoliosSeleccionados] = useState<Set<string>>(new Set());
  const toggleFolioSeleccionado = (id: string) => {
    setFoliosSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const presupuestosParaCompleto =
    foliosSeleccionados.size > 0 ? presupuestos.filter((p) => foliosSeleccionados.has(p.id)) : presupuestos;

  useEffect(() => {
    if (printTarget) {
      window.print();
    }
  }, [printTarget]);

  useEffect(() => {
    if (printAll) {
      window.print();
    }
  }, [printAll]);

  const enviarPresupuestoGuardado = async (budget: SavedBudget) => {
    if (enviandoWhatsAppId) return;
    const ventanaWhatsApp = window.open("", "_blank");
    const nombreArchivo = `Presupuesto_${slugify(patient.name)}_${slugify(budget.fecha)}.pdf`;
    const caption = `Plan de tratamiento — ${patient.name} · Folio ${budget.folio} · Total ${formatCurrency(budget.total)}`;

    setEnviandoWhatsAppId(budget.id);
    try {
      const blob = await generarPresupuestoPdf({
        folio: budget.folio,
        fechaLarga: fechaLargaHoy(),
        medico: budget.medico,
        pacienteNombre: patient.name,
        pacienteCorreo: patient.email ?? "",
        pacienteTelefono: patient.phone,
        diagnostico: budget.diagnostico,
        items: budget.items,
        total: budget.total,
        perfilDoctor,
      });
      const resultado = await enviarPdfPorWhatsapp({
        blob,
        nombreArchivo,
        telefono: patient.phone,
        caption,
        ventanaPrevia: ventanaWhatsApp,
      });
      if (resultado.requiereAbrirManualmente) setWaUrlPendiente(resultado.waUrl);
    } catch (err) {
      console.error("No se pudo generar el PDF del presupuesto", err);
      ventanaWhatsApp?.close();
      alert("No se pudo generar el PDF del presupuesto. Intenta de nuevo.");
    } finally {
      setEnviandoWhatsAppId(null);
    }
  };

  const enviarPresupuestoCompleto = async () => {
    if (enviandoCompleto || presupuestosParaCompleto.length === 0) return;
    const ventanaWhatsApp = window.open("", "_blank");
    const nombreArchivo = `Presupuesto_completo_${slugify(patient.name)}_${slugify(fechaLargaHoy())}.pdf`;
    const granTotal = presupuestosParaCompleto.reduce((sum, p) => sum + p.total, 0);
    const caption = `Plan de tratamiento completo — ${patient.name} · ${presupuestosParaCompleto.length} folio(s) · Total ${formatCurrency(granTotal)}`;

    setEnviandoCompleto(true);
    try {
      const blob = await generarPresupuestoTotalPdf({
        presupuestos: presupuestosParaCompleto,
        fechaLarga: fechaLargaHoy(),
        pacienteNombre: patient.name,
        pacienteCorreo: patient.email ?? "",
        pacienteTelefono: patient.phone,
        perfilDoctor,
      });
      const resultado = await enviarPdfPorWhatsapp({
        blob,
        nombreArchivo,
        telefono: patient.phone,
        caption,
        ventanaPrevia: ventanaWhatsApp,
      });
      if (resultado.requiereAbrirManualmente) setWaUrlPendiente(resultado.waUrl);
    } catch (err) {
      console.error("No se pudo generar el PDF del presupuesto completo", err);
      ventanaWhatsApp?.close();
      alert("No se pudo generar el PDF del presupuesto completo. Intenta de nuevo.");
    } finally {
      setEnviandoCompleto(false);
    }
  };

  if (view === "form") {
    // Marca en Historia Clínica los diagnósticos de origen con el folio del
    // presupuesto recién creado — "Ya en presupuesto #XXXX" en vez de la
    // casilla de selección la próxima vez que se abra esa pestaña. Nunca
    // reescribe el diagnóstico/tratamiento en sí, solo el vínculo.
    const estamparDiagnosticosLigados = (nuevoId: string) => {
      if (!prefillPresupuesto || prefillPresupuesto.length === 0) return;
      const actuales = historiaClinicaPorPaciente[patient.id] ?? respuestasVacias;
      const porPreguntaActualizado = { ...actuales.porPregunta };
      const hoyISO = new Date().toISOString().slice(0, 10);
      const idsPorPregunta = new Map<string, Set<string>>();
      for (const item of prefillPresupuesto) {
        if (!idsPorPregunta.has(item.preguntaId)) idsPorPregunta.set(item.preguntaId, new Set());
        idsPorPregunta.get(item.preguntaId)!.add(item.diagnosticoId);
      }
      for (const [preguntaId, diagnosticoIds] of idsPorPregunta) {
        const entradas = valorOdontogramaComoDiagnosticos(porPreguntaActualizado[preguntaId]);
        porPreguntaActualizado[preguntaId] = entradas.map((e) =>
          diagnosticoIds.has(e.id) ? { ...e, presupuestoId: nuevoId, fechaPresupuesto: hoyISO } : e
        ) as unknown as RespuestaValor;
      }
      setRespuestasHistoriaClinica(patient.id, {
        ...actuales,
        porPregunta: porPreguntaActualizado,
        actualizadoEn: new Date().toISOString(),
      });
    };

    return (
      <NuevoPresupuesto
        patient={patient}
        initialBudget={editingBudget ?? undefined}
        planTratamientoSugerido={planTratamientoSugerido}
        prefillItems={editingBudget ? undefined : prefillPresupuesto ?? undefined}
        onCancel={() => {
          onConsumirPrefillPresupuesto();
          setView("list");
        }}
        onSave={(budget) => {
          const nuevoId = editingBudget ? editingBudget.id : `${Date.now()}`;
          setPresupuestos((prev) => {
            if (editingBudget) {
              return prev.map((p) =>
                p.id === editingBudget.id
                  ? { ...budget, id: p.id, estado: p.estado, editadoManualmente: true }
                  : p
              );
            }
            return [{ ...budget, id: nuevoId, estado: "pendiente", editadoManualmente: true }, ...prev];
          });
          if (!editingBudget) estamparDiagnosticosLigados(nuevoId);
          onConsumirPrefillPresupuesto();
          setEditingBudget(null);
          setView("list");
        }}
      />
    );
  }

  if (view === "comparativa") {
    return (
      <NuevaComparativaRehabilitacion
        patientId={patient.id}
        presupuestos={presupuestos}
        initial={editingComparativa ?? undefined}
        onCancel={() => {
          setEditingComparativa(null);
          setView("list");
        }}
        onSave={(comparativa) => {
          setComparativasPaciente(patient.id, (prev) => {
            if (editingComparativa) return prev.map((c) => (c.id === comparativa.id ? comparativa : c));
            return [comparativa, ...prev];
          });
          setEditingComparativa(null);
          setView("list");
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Presupuestos
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {presupuestos.length > 0 && (
            <>
              <span className="text-xs text-ink/40">
                {foliosSeleccionados.size > 0
                  ? `${presupuestosParaCompleto.length} de ${presupuestos.length} folio(s) marcados`
                  : "Marca folios abajo para elegir cuáles incluir (si no, va todo)"}
              </span>
              <button
                onClick={() => setVistaPreviaCompleto(true)}
                title="Ver el presupuesto completo antes de imprimirlo o enviarlo, por si necesita alguna corrección"
                className="rounded-lg border border-edge/15 px-4 py-2 text-xs font-semibold text-ink/70 transition-colors hover:bg-surface"
              >
                Vista previa
              </button>
              <button
                onClick={() => setPrintAll(true)}
                title="Imprime los folios marcados (o todos, si no marcaste ninguno) juntos, con el total general"
                className="rounded-lg border border-edge/15 px-4 py-2 text-xs font-semibold text-ink/70 transition-colors hover:bg-surface"
              >
                Imprimir presupuesto completo
              </button>
              <button
                onClick={enviarPresupuestoCompleto}
                disabled={enviandoCompleto}
                title="Envía por WhatsApp los folios marcados (o todos, si no marcaste ninguno) juntos, con el total general"
                className="rounded-lg border border-success/40 px-4 py-2 text-xs font-semibold text-success transition-colors hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {enviandoCompleto ? "Generando PDF…" : "Enviar presupuesto completo"}
              </button>
            </>
          )}
          <button
            onClick={() => {
              setEditingComparativa(null);
              setView("comparativa");
            }}
            disabled={presupuestos.length < 2}
            title={presupuestos.length < 2 ? "Se necesitan al menos 2 presupuestos para compararlos" : undefined}
            className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-xs font-semibold text-warning transition-colors hover:bg-warning/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Comparativa de Rehabilitación
          </button>
          <button
            onClick={() => {
              setEditingBudget(null);
              setView("form");
            }}
            className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
            style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
          >
            + Nuevo Presupuesto
          </button>
        </div>
      </div>

      {presupuestos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          No hay presupuestos registrados
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-edge/10 bg-surface print:hidden">
          <div className="grid grid-cols-[24px_64px_1fr_auto] gap-3 border-b border-edge/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink/40">
            <span />
            <span>Folio</span>
            <span>Tratamiento</span>
            <span className="text-right">Acción</span>
          </div>
          <div className="divide-y divide-edge/5">
            {presupuestos.map((p) => (
              <div key={p.id} className="grid grid-cols-[24px_64px_1fr_auto] items-start gap-3 px-4 py-4">
                <input
                  type="checkbox"
                  checked={foliosSeleccionados.has(p.id)}
                  onChange={() => toggleFolioSeleccionado(p.id)}
                  title="Incluir este folio en el presupuesto completo (imprimir/enviar)"
                  className="mt-1.5 accent-[color:var(--accent)]"
                />
                <div className="pt-1 text-sm font-medium text-ink/70">{p.folio}</div>

                <div>
                  <div className="space-y-1">
                    {p.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-ink/80">
                          {item.procedure}
                          {item.teeth.length > 0 && (
                            <span className="ml-2 rounded bg-accent/10 px-1.5 py-0.5 text-xs font-semibold text-accent/80">
                              OD {[...item.teeth].sort((a, b) => a - b).join(", ")}
                            </span>
                          )}
                          {/* Característica del renglón (ej. "arcada superior" en una
                              prótesis) — en su propia píldora para no confundirse con
                              el nombre del procedimiento o con el diente marcado. */}
                          {item.note && (
                            <span className="ml-2 rounded bg-ink/10 px-1.5 py-0.5 text-xs text-ink/50">
                              {item.note}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 rounded bg-inset px-2 py-0.5 text-xs text-ink/60">
                          {formatCurrency(item.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-accent">{formatCurrency(p.total)}</span>
                    <span className="text-xs text-ink/40">{p.fecha}</span>
                    <select
                      value={p.estado ?? "pendiente"}
                      onChange={(e) => {
                        const nuevoEstado = e.target.value as EstadoPresupuesto;
                        setPresupuestos((prev) =>
                          prev.map((b) => (b.id === p.id ? { ...b, estado: nuevoEstado } : b))
                        );
                      }}
                      title="Estado del presupuesto"
                      className={`rounded-full border-0 py-0.5 pl-2 pr-1 text-[10px] font-semibold uppercase tracking-wide outline-none ${estadoPresupuestoColor[p.estado ?? "pendiente"]}`}
                    >
                      {presupuestoEstadoOptions.map((estado) => (
                        <option key={estado} value={estado}>
                          {estadoPresupuestoLabel[estado]}
                        </option>
                      ))}
                    </select>
                    {estaVencido(p.fechaVigenciaHasta, p.estado) && (
                      <span className="flex items-center gap-1.5 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
                        Vencido — verifica que los precios sigan vigentes
                        <button
                          onClick={() =>
                            setPresupuestos((prev) =>
                              prev.map((b) =>
                                b.id === p.id
                                  ? { ...b, fechaVigenciaHasta: renovarVigencia(b.vigenciaDias ?? 30) }
                                  : b
                              )
                            )
                          }
                          className="underline decoration-warning/50 underline-offset-2 hover:decoration-warning"
                        >
                          Renovar vigencia
                        </button>
                      </span>
                    )}
                    <button
                      onClick={() => setPrintTarget(p)}
                      title="Imprimir"
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-edge/15 text-ink/50 transition-colors hover:border-accent/50 hover:text-accent"
                    >
                      <PrinterIcon />
                    </button>
                    <button
                      onClick={() => enviarPresupuestoGuardado(p)}
                      disabled={enviandoWhatsAppId === p.id}
                      title="Enviar por WhatsApp"
                      className="flex h-6 w-6 items-center justify-center rounded-full border border-success/30 text-success/70 transition-colors hover:border-success hover:text-success disabled:opacity-40"
                    >
                      <WhatsAppIcon />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingBudget(p);
                      setView("form");
                    }}
                    title="Editar"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-edge/15 text-ink/50 transition-colors hover:border-accent/50 hover:text-accent"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    onClick={() => setPresupuestoAEliminar(p)}
                    title="Eliminar"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-danger/20 text-danger/50 transition-colors hover:border-danger/60 hover:text-danger"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {comparativas.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Comparativas de Rehabilitación</h3>
          <div
            className="overflow-hidden rounded-2xl border border-warning/40 bg-surface print:hidden"
            style={{ boxShadow: "0 0 16px -2px rgb(var(--warning-rgb) / 0.5)" }}
          >
            <div className="divide-y divide-edge/5">
              {comparativas.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                  <div>
                    <p className="text-sm font-medium text-ink">{c.titulo}</p>
                    <p className="text-xs text-ink/40">
                      Compara {c.opciones.length} opciones · {new Date(c.fecha).toLocaleDateString("es-MX")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingComparativa(c);
                        setView("comparativa");
                      }}
                      className="rounded-lg border border-edge/15 px-3 py-1.5 text-xs font-semibold text-ink/70 transition-colors hover:bg-surface"
                    >
                      Ver / Editar
                    </button>
                    <button
                      onClick={() => setPrintComparativa(c)}
                      title="Imprimir"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-edge/15 text-ink/50 transition-colors hover:border-accent/50 hover:text-accent"
                    >
                      <PrinterIcon />
                    </button>
                    <button
                      onClick={() => enviarComparativaGuardada(c)}
                      disabled={enviandoComparativaId === c.id}
                      title="Enviar por WhatsApp"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-success/30 text-success/70 transition-colors hover:border-success hover:text-success disabled:opacity-40"
                    >
                      <WhatsAppIcon />
                    </button>
                    <button
                      onClick={() => setComparativaAEliminar(c)}
                      title="Eliminar"
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-danger/20 text-danger/50 transition-colors hover:border-danger/60 hover:text-danger"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {comparativaAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
            <h3 className="text-base font-semibold text-ink">Eliminar comparativa</h3>
            <p className="mt-2 text-sm text-ink/70">
              Vas a eliminar la comparativa <span className="font-semibold text-ink">&quot;{comparativaAEliminar.titulo}&quot;</span>.
              Los presupuestos que compara no se ven afectados. Esta acción no se puede deshacer.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setComparativaAEliminar(null)}
                className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setComparativasPaciente(patient.id, (prev) => prev.filter((c) => c.id !== comparativaAEliminar.id));
                  setComparativaAEliminar(null);
                }}
                className="flex-1 rounded-lg bg-danger py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {presupuestoAEliminar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
            <h3 className="text-base font-semibold text-ink">Eliminar presupuesto</h3>
            <p className="mt-2 text-sm text-ink/70">
              Vas a eliminar el presupuesto <span className="font-semibold text-ink">#{presupuestoAEliminar.folio}</span>{" "}
              por <span className="font-semibold text-ink">{formatCurrency(presupuestoAEliminar.total)}</span>. Esta
              acción no se puede deshacer.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setPresupuestoAEliminar(null)}
                className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setPresupuestos((prev) => prev.filter((b) => b.id !== presupuestoAEliminar.id));
                  setPresupuestoAEliminar(null);
                }}
                className="flex-1 rounded-lg bg-danger py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {printTarget && (
        <PresupuestoImpreso
          folio={printTarget.folio}
          fechaLarga={fechaLargaHoy()}
          medico={printTarget.medico}
          pacienteNombre={patient.name}
          pacienteCorreo={patient.email ?? ""}
          pacienteTelefono={patient.phone}
          diagnostico={printTarget.diagnostico}
          items={printTarget.items}
          total={printTarget.total}
        />
      )}

      {printAll && (
        <PresupuestoTotalImpreso
          presupuestos={presupuestosParaCompleto}
          fechaLarga={fechaLargaHoy()}
          pacienteNombre={patient.name}
          pacienteCorreo={patient.email ?? ""}
          pacienteTelefono={patient.phone}
        />
      )}

      {vistaPreviaCompleto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-edge/10 bg-modal-solid">
            <div className="flex items-center justify-between gap-3 border-b border-edge/10 p-4">
              <h3 className="text-sm font-semibold text-ink">Vista previa — presupuesto completo</h3>
              <button
                onClick={() => setVistaPreviaCompleto(false)}
                className="rounded-lg border border-edge/15 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-surface"
              >
                Cerrar
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              <PresupuestoTotalImpreso
                presupuestos={presupuestosParaCompleto}
                fechaLarga={fechaLargaHoy()}
                pacienteNombre={patient.name}
                pacienteCorreo={patient.email ?? ""}
                pacienteTelefono={patient.phone}
                modoVistaPrevia
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-edge/10 p-4">
              <button
                onClick={() => {
                  setVistaPreviaCompleto(false);
                  setPrintAll(true);
                }}
                className="rounded-lg border border-edge/15 px-4 py-2 text-xs font-semibold text-ink/70 transition-colors hover:bg-surface"
              >
                Imprimir
              </button>
              <button
                onClick={() => {
                  setVistaPreviaCompleto(false);
                  enviarPresupuestoCompleto();
                }}
                disabled={enviandoCompleto}
                className="rounded-lg border border-success/40 px-4 py-2 text-xs font-semibold text-success transition-colors hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Enviar por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {printComparativa && (
        <ComparativaImpresa
          comparativa={printComparativa}
          presupuestos={presupuestos}
          pacienteNombre={patient.name}
          fechaLarga={fechaLargaHoy()}
        />
      )}

      {waUrlPendiente && (
        <AbrirWhatsAppPrompt waUrl={waUrlPendiente} onCerrar={() => setWaUrlPendiente(null)} />
      )}
    </div>
  );
}

const estadoColorResumen: Record<string, string> = {
  Agendada: "bg-ink/10 text-ink/60",
  Confirmada: "bg-info/10 text-info",
  "En espera": "bg-accent/10 text-accent",
  Atendida: "bg-success/10 text-success",
  Reagendada: "bg-warning/10 text-warning",
  Cancelada: "bg-danger/10 text-danger",
  "No Asistió": "bg-danger/20 text-danger",
};

/** Suma meses a una fecha ISO ("YYYY-MM-DD") respetando el desbordamiento
 * de mes de JS Date (ej. 31 de enero + 1 mes = 3 de marzo, no 31 de
 * febrero) — aceptable para una sugerencia, no para un cálculo exacto. */
function addMonthsISO(fechaISO: string, months: number): string {
  const d = new Date(`${fechaISO}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** Meses calendario completos entre dos fechas ISO (no solo días/30) — un
 * paciente visto el 15 de enero sigue "en el mes 0" hasta el 15 de febrero,
 * no antes. */
function mesesEntreFechasISO(desdeISO: string, hastaISO: string): number {
  const desde = new Date(`${desdeISO}T00:00:00`);
  const hasta = new Date(`${hastaISO}T00:00:00`);
  let meses = (hasta.getFullYear() - desde.getFullYear()) * 12 + (hasta.getMonth() - desde.getMonth());
  if (hasta.getDate() < desde.getDate()) meses -= 1;
  return Math.max(0, meses);
}

/** Color según qué tan reciente fue la última consulta — verde: menos de 6
 * meses, amarillo: de 6 a 12 meses, rojo: más de un año. */
function colorUltimaCita(fechaISO: string, hoyISO: string): string {
  const meses = mesesEntreFechasISO(fechaISO, hoyISO);
  if (meses < 6) return "text-success";
  if (meses < 12) return "text-warning";
  return "text-danger";
}

function ExpedienteSidePanel({
  citasFuturas,
  ultimaCita,
  sugerirPrevencion,
  formatDate,
}: {
  citasFuturas: CitaAgenda[];
  ultimaCita: CitaAgenda | undefined;
  sugerirPrevencion: boolean;
  formatDate: (date: string) => string;
}) {
  const hoyISO = toISODate(new Date());
  const fechaSugerida = ultimaCita ? addMonthsISO(ultimaCita.fecha, 6) : null;
  const mostrarSugerencia = sugerirPrevencion && citasFuturas.length === 0 && fechaSugerida;
  const sugerenciaVencida = mostrarSugerencia && fechaSugerida! <= hoyISO;

  return (
    <div className="space-y-6 print:hidden">
      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink/50">
          Resumen de Citas
        </h3>

        {ultimaCita && (
          <p className="mb-3 text-xs text-ink/50">
            Última cita:{" "}
            <span className={`font-medium ${colorUltimaCita(ultimaCita.fecha, hoyISO)}`}>
              {formatDate(ultimaCita.fecha)}
            </span>
          </p>
        )}

        {mostrarSugerencia && (
          <div
            className={`mb-3 rounded-lg border p-3 text-xs ${
              sugerenciaVencida
                ? "border-accent/30 bg-accent/10 text-accent"
                : "border-edge/10 bg-inset text-ink/50"
            }`}
          >
            {sugerenciaVencida ? "Prevención sugerida desde el " : "Prevención sugerida: "}
            <span className="font-medium">{formatDate(fechaSugerida!)}</span>
          </div>
        )}

        {citasFuturas.length === 0 ? (
          <p className="text-xs text-ink/40">Sin próximas citas agendadas</p>
        ) : (
          <div className="space-y-3">
            {citasFuturas.map((cita) => (
              <div key={cita.id} className="rounded-lg border border-edge/10 bg-inset p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">
                    {formatFechaCita(cita.fecha)} · {cita.horaInicio}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${estadoColorResumen[cita.estatus]}`}
                  >
                    {cita.estatus}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink/50">{cita.tratamientos.join(", ") || "—"}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Expediente({
  patient,
  avatarColor,
  initials,
  formatDate,
  calculateAge,
  initialTab,
  initialCitaId,
  onTabApplied,
  onBack,
}: {
  patient: Patient;
  avatarColor: string;
  initials: string;
  formatDate: (date: string) => string;
  calculateAge: (date: string) => number | null;
  initialTab?: string;
  initialCitaId?: string;
  onTabApplied?: () => void;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ExpedienteTab>(expedienteTabs[0]);
  // Puente entre Historia Clínica y Presupuestos: al elegir diagnósticos del
  // odontograma y darle "Agregar a presupuesto", esto se llena y se cambia
  // de pestaña — PresupuestosTab lo consume para abrir Nuevo Presupuesto ya
  // prellenado, y lo limpia (onConsumirPrefillPresupuesto) al guardar.
  const [prefillPresupuesto, setPrefillPresupuesto] = useState<PresupuestoPrefillItem[] | null>(null);
  const {
    presupuestosPorPaciente,
    setPresupuestosPaciente,
    pagosPorPaciente,
    setPagosPaciente,
    cargarDatosPaciente,
    citas,
    recursos,
    puedeVerFinanzas,
    historiaClinicaTemplate,
    historiaClinicaPorPaciente,
    cambiosSinGuardar,
    setCambiosSinGuardar,
    irAExpediente,
    irAPagina,
    setAyudaContexto,
  } = usePatientData();
  const { prepararInterconsulta } = useMoConecta();

  // Publica la pestaña activa para que el Asistente flotante muestre ayuda
  // específica (ej. "cómo hacer un pago") en vez de solo "Pacientes" —
  // vuelve a null al salir del expediente para no dejar un contexto viejo.
  useEffect(() => {
    setAyudaContexto(`pacientes-${activeTab}`);
    return () => setAyudaContexto(null);
  }, [activeTab, setAyudaContexto]);

  // Historia Clínica y Datos del Paciente avisan aquí (vía contexto) cuando
  // tienen ediciones sin guardar — antes se perdían silenciosamente al
  // cambiar de pestaña dentro del expediente o volver al listado.
  const cambiarTab = (tab: ExpedienteTab) => {
    if (cambiosSinGuardar && !window.confirm(`${cambiosSinGuardar} ¿Salir sin guardar?`)) return;
    setCambiosSinGuardar(null);
    setActiveTab(tab);
  };

  const volverAPacientes = () => {
    if (cambiosSinGuardar && !window.confirm(`${cambiosSinGuardar} ¿Salir sin guardar?`)) return;
    setCambiosSinGuardar(null);
    onBack();
  };

  useEffect(() => {
    cargarDatosPaciente(patient.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id]);

  useEffect(() => {
    if (initialTab && (expedienteTabs as readonly string[]).includes(initialTab)) {
      setActiveTab(initialTab as ExpedienteTab);
      onTabApplied?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTab]);

  useEffect(() => {
    if (activeTab === "Pagos" && !puedeVerFinanzas) setActiveTab(expedienteTabs[0]);
  }, [activeTab, puedeVerFinanzas]);

  const presupuestos = presupuestosPorPaciente[patient.id] ?? [];
  const setPresupuestos: Dispatch<SetStateAction<SavedBudget[]>> = (updater) =>
    setPresupuestosPaciente(patient.id, updater);
  const pagos = pagosPorPaciente[patient.id] ?? [];
  const setPagos: Dispatch<SetStateAction<Pago[]>> = (updater) =>
    setPagosPaciente(patient.id, updater);
  const patientAlergias = historiaClinicaPorPaciente[patient.id]?.alergias?.trim() || "";
  const condicionesSistemicas = condicionesSistemicasPositivas(
    historiaClinicaTemplate,
    historiaClinicaPorPaciente[patient.id] ?? { porPregunta: {} }
  );

  const preguntaPlanTratamiento = historiaClinicaTemplate.secciones
    .flatMap((s) => s.preguntas)
    .find((p) => p.tipo === "listaPrioridad");
  const faseTituloResumen: Record<string, string> = {
    I: "Fase I — Remoción de procesos infecciosos",
    II: "Fase II — Rehabilitación",
    III: "Fase III — Mantenimiento",
    Ortodoncia: "Etapa de Ortodoncia",
  };
  const planTratamientoSugerido = preguntaPlanTratamiento
    ? (() => {
        const puntos = ((historiaClinicaPorPaciente[patient.id]?.porPregunta[preguntaPlanTratamiento.id] as unknown as {
          id: string;
          texto: string;
          fase?: string;
        }[]) ?? []) as { id: string; texto: string; fase?: string }[];
        return ["I", "II", "III", "Ortodoncia"]
          .map((fase) => {
            const delFase = puntos.filter((p) => (p.fase ?? "I") === fase);
            if (delFase.length === 0) return "";
            const lineas = delFase.map((punto, i) => `${i + 1}. ${punto.texto}`).join("\n");
            return `${faseTituloResumen[fase]}:\n${lineas}`;
          })
          .filter(Boolean)
          .join("\n\n");
      })()
    : "";

  const hoyISO = toISODate(new Date());
  const citasPaciente = citas
    .filter((c) => c.patientId === patient.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.horaInicio.localeCompare(a.horaInicio));
  const citasFuturas = citasPaciente
    .filter((c) => c.fecha >= hoyISO)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio));
  const ultimaCita = citasPaciente.find((c) => c.fecha < hoyISO && c.estatus !== "Cancelada");

  // Flechas del encabezado: navegan al expediente del paciente anterior/
  // siguiente en el orden cronológico de las citas de TODA LA SEMANA en
  // curso (lunes a domingo) — no solo el día de hoy — para poder ir
  // completando notas/pagos de días que se quedaron pendientes sin volver a
  // Pacientes en cada uno; al llegar al final de un día, sigue con el
  // primero del día siguiente de la misma semana. Se queda en la misma
  // pestaña activa.
  const inicioSemana = toISODate(getMonday(new Date()));
  const finSemana = toISODate(addDays(getMonday(new Date()), 6));
  const citasSemanaConPaciente = citas
    .filter((c) => c.fecha >= inicioSemana && c.fecha <= finSemana && c.patientId)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || timeToMinutes(a.horaInicio) - timeToMinutes(b.horaInicio));
  const indiceHoy = citasSemanaConPaciente.findIndex((c) => c.patientId === patient.id);
  const pacienteAnteriorHoy = indiceHoy > 0 ? citasSemanaConPaciente[indiceHoy - 1] : null;
  const pacienteSiguienteHoy =
    indiceHoy >= 0 && indiceHoy < citasSemanaConPaciente.length - 1
      ? citasSemanaConPaciente[indiceHoy + 1]
      : null;

  const enviarResumen = () => {
    const edad = calculateAge(patient.birthDate);
    const texto = buildResumenExpediente(
      patient,
      edad,
      formatDate,
      presupuestos,
      pagos,
      citasFuturas,
      puedeVerFinanzas
    );
    const telefono = patient.phone.replace(/\D/g, "");
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <button
        onClick={volverAPacientes}
        className="flex items-center gap-2 text-sm font-medium text-accent hover:text-accent print:hidden"
      >
        ← Volver a pacientes
      </button>

      {/* Orden pedido: flecha — información del paciente — enviar resumen —
          flecha. Las flechas quedan fijas en los extremos (justify-between)
          sin ocupar más que su propio botón, para no exprimir el nombre del
          paciente — la leyenda de a quién llevan va en una línea aparte,
          debajo, a todo lo ancho. Naranja neón = activa (hay paciente),
          rosa neón = inactiva (no hay) — leyenda siempre visible (no solo
          tooltip) para que quede claro en ambos casos, incluso en celular. */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <button
          onClick={() => pacienteAnteriorHoy && irAExpediente(pacienteAnteriorHoy.patientId!, activeTab)}
          disabled={!pacienteAnteriorHoy}
          title={
            pacienteAnteriorHoy
              ? `Expediente anterior en la agenda de esta semana: ${pacienteAnteriorHoy.paciente} (${formatFechaCita(pacienteAnteriorHoy.fecha)} ${pacienteAnteriorHoy.horaInicio})`
              : "No hay un paciente anterior en la agenda de esta semana"
          }
          style={{
            boxShadow: pacienteAnteriorHoy
              ? "0 0 12px -2px rgb(var(--accent-rgb) / 0.6)"
              : "0 0 12px -2px rgb(244 114 182 / 0.6)",
          }}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg transition-colors disabled:cursor-not-allowed ${
            pacienteAnteriorHoy
              ? "border-accent/40 text-accent hover:bg-accent/15"
              : "border-pink-400/50 text-pink-400"
          }`}
        >
          ←
        </button>

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-4">
          <div className="flex w-full items-center gap-4 lg:w-auto lg:min-w-0 lg:flex-1">
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-bold text-black"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-semibold text-ink">{formatNombreConEdad(patient.name, patient.birthDate)}</h2>
              <p className="mt-1 text-sm text-ink/50">
                {patient.phone} · {formatDate(patient.birthDate)}
                {patient.birthDate && ` · ${formatEdad(patient.birthDate)}`}
              </p>
            </div>
          </div>

          <button
            onClick={enviarResumen}
            title="Enviar resumen del expediente al paciente por WhatsApp"
            style={{ boxShadow: "0 0 14px -2px rgb(var(--success-rgb) / 0.7)" }}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-success/40 px-3 py-2 text-xs font-semibold text-success transition-colors hover:bg-success/10"
          >
            <WhatsAppIcon />
            Enviar resumen al paciente
          </button>

          <button
            onClick={() => {
              prepararInterconsulta(patient.id, patient.name);
              irAPagina("mo-conecta");
            }}
            title="Enviar este caso a un colega para interconsulta por MO Conecta"
            style={{ boxShadow: "0 0 14px -2px rgb(var(--accent-rgb) / 0.7)" }}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-accent/40 px-3 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
          >
            Solicitar interconsulta
          </button>
        </div>

        <button
          onClick={() => pacienteSiguienteHoy && irAExpediente(pacienteSiguienteHoy.patientId!, activeTab)}
          disabled={!pacienteSiguienteHoy}
          title={
            pacienteSiguienteHoy
              ? `Expediente siguiente en la agenda de esta semana: ${pacienteSiguienteHoy.paciente} (${formatFechaCita(pacienteSiguienteHoy.fecha)} ${pacienteSiguienteHoy.horaInicio})`
              : "No hay un paciente siguiente en la agenda de esta semana"
          }
          style={{
            boxShadow: pacienteSiguienteHoy
              ? "0 0 12px -2px rgb(var(--accent-rgb) / 0.6)"
              : "0 0 12px -2px rgb(244 114 182 / 0.6)",
          }}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-lg transition-colors disabled:cursor-not-allowed ${
            pacienteSiguienteHoy
              ? "border-accent/40 text-accent hover:bg-accent/15"
              : "border-pink-400/50 text-pink-400"
          }`}
        >
          →
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] leading-tight print:hidden">
        <span className={pacienteAnteriorHoy ? "text-accent/80" : "text-pink-400/80"}>
          ← {pacienteAnteriorHoy
            ? `Anterior: ${pacienteAnteriorHoy.paciente} · ${formatFechaCita(pacienteAnteriorHoy.fecha)} ${pacienteAnteriorHoy.horaInicio}`
            : "Sin paciente anterior en la agenda de esta semana"}
        </span>
        <span className={pacienteSiguienteHoy ? "text-accent/80" : "text-pink-400/80"}>
          {pacienteSiguienteHoy
            ? `Siguiente: ${pacienteSiguienteHoy.paciente} · ${formatFechaCita(pacienteSiguienteHoy.fecha)} ${pacienteSiguienteHoy.horaInicio}`
            : "Sin paciente siguiente en la agenda de esta semana"} →
        </span>
      </div>

      {patientAlergias && !esNegacionAlergia(patientAlergias) && (
        <div className="flex items-start gap-3 rounded-2xl border border-danger bg-danger/15 p-4 text-sm text-danger print:hidden">
          <span className="mt-0.5 text-lg">⚠️</span>
          <p>
            <span className="font-bold uppercase tracking-wide">Alergias: </span>
            {patientAlergias}
          </p>
        </div>
      )}

      {condicionesSistemicas.length > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-accent bg-accent/15 p-4 text-sm text-accent print:hidden">
          <span className="mt-0.5 text-lg">⚕️</span>
          <div>
            <span className="font-bold uppercase tracking-wide">
              Diagnóstico sistémico / antecedentes relevantes:{" "}
            </span>
            {condicionesSistemicas
              .map((c) => (c.detalle === "Sí" ? c.etiqueta : `${c.etiqueta}: ${c.detalle}`))
              .join(" · ")}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-edge/10 pb-4 print:hidden">
        {expedienteTabs
          .filter((tab) => tab !== "Pagos" || puedeVerFinanzas)
          .map((tab) => (
          <button
            key={tab}
            onClick={() => cambiarTab(tab)}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
              activeTab === tab
                ? "border-accent/70 bg-accent/15 text-accent"
                : "border-accent/25 text-ink/40 hover:border-accent/50 hover:bg-surface hover:text-ink/70"
            }`}
            style={
              activeTab === tab
                ? {
                    textShadow: "0 0 8px rgba(251,146,60,0.4)",
                    boxShadow: "0 0 10px -2px rgb(var(--accent-rgb) / 0.55)",
                  }
                : { boxShadow: "0 0 6px -2px rgb(var(--accent-rgb) / 0.3)" }
            }
          >
            {tab}
          </button>
        ))}
      </div>

      <div
        className={`grid grid-cols-1 items-start gap-6 ${
          activeTab === "Pagos" ? "" : "lg:grid-cols-[1fr_300px]"
        }`}
      >
        <div className="min-w-0">
          {activeTab === "Presupuestos" && (
            <PresupuestosTab
              patient={patient}
              presupuestos={presupuestos}
              setPresupuestos={setPresupuestos}
              planTratamientoSugerido={planTratamientoSugerido}
              prefillPresupuesto={prefillPresupuesto}
              onConsumirPrefillPresupuesto={() => setPrefillPresupuesto(null)}
            />
          )}
          {activeTab === "Datos del Paciente" && (
            <DatosPaciente patient={patient} formatDate={formatDate} />
          )}
          {activeTab === "Historia Clínica" && (
            <HistoriaClinica
              patientId={patient.id}
              onAgregarAPresupuesto={(items) => {
                setPrefillPresupuesto(items);
                setActiveTab("Presupuestos");
              }}
              onVerPresupuestos={() => setActiveTab("Presupuestos")}
            />
          )}
          {activeTab === "Listado de Citas" && <ListadoCitas citas={citasPaciente} recursos={recursos} />}
          {activeTab === "Fotografías" && <Fotografias patientId={patient.id} />}
          {activeTab === "Pagos" && (
            <Pagos
              patientId={patient.id}
              patientName={patient.name}
              presupuestos={presupuestos}
              pagos={pagos}
              setPagos={setPagos}
            />
          )}
          {activeTab === "Consentimientos Informados" && (
            <ConsentimientoInformado patient={patient} />
          )}
          {activeTab === "Laboratorios" && <Laboratorios patientId={patient.id} />}
          {activeTab === "Notas de Evolución y Seguimiento" && (
            <NotasEvolucionTab patientId={patient.id} citaId={initialCitaId} />
          )}
          {activeTab === "Membresía" && (
            <MembresiaTab patientId={patient.id} patientName={patient.name} />
          )}
          {activeTab !== "Presupuestos" &&
            activeTab !== "Datos del Paciente" &&
            activeTab !== "Historia Clínica" &&
            activeTab !== "Listado de Citas" &&
            activeTab !== "Fotografías" &&
            activeTab !== "Pagos" &&
            activeTab !== "Membresía" &&
            activeTab !== "Consentimientos Informados" &&
            activeTab !== "Laboratorios" &&
            activeTab !== "Notas de Evolución y Seguimiento" && (
              <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
                {activeTab} — próximamente
              </div>
            )}
        </div>

        <ExpedienteSidePanel
          citasFuturas={citasFuturas}
          ultimaCita={ultimaCita}
          sugerirPrevencion={patient.recordatorioPrevencion !== false}
          formatDate={formatDate}
        />
      </div>
    </div>
  );
}
