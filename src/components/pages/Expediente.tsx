"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import NuevoPresupuesto from "./NuevoPresupuesto";
import PresupuestoImpreso from "./PresupuestoImpreso";
import DatosPaciente from "./DatosPaciente";
import HistoriaClinica from "./HistoriaClinica";
import ListadoCitas from "./ListadoCitas";
import Fotografias from "./Fotografias";
import Pagos from "./Pagos";
import ConsentimientoInformado from "./ConsentimientoInformado";
import Laboratorios from "./Laboratorios";
import NotasEvolucion from "./NotasEvolucion";
import MembresiaTab from "./MembresiaTab";
import { usePatientData } from "@/context/PatientDataContext";
import { generarPresupuestoPdf } from "@/lib/generarPresupuestoPdf";
import { enviarPdfPorWhatsapp } from "@/lib/enviarPdfWhatsapp";
import { slugify } from "@/lib/textoNombre";
import {
  computeTratamientosPendientes,
  formatCurrency,
  formatEdad,
  formatFechaCita,
  formatNombreConEdad,
  type CitaAgenda,
  type Patient,
  type SavedBudget,
  type Pago,
} from "@/lib/patientData";
import { condicionesSistemicasPositivas, esNegacionAlergia } from "@/lib/historiaClinica";

function fechaLargaHoy() {
  const texto = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const expedienteTabs = [
  "Presupuestos",
  "Datos del Paciente",
  "Historia Clínica",
  "Notas de Evolución y Seguimiento",
  "Listado de Citas",
  "Fotografías",
  "Pagos",
  "Membresía",
  "Consentimientos Informados y Recetas",
  "Laboratorios",
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
}: {
  patient: Patient;
  presupuestos: SavedBudget[];
  setPresupuestos: Dispatch<SetStateAction<SavedBudget[]>>;
  planTratamientoSugerido: string;
}) {
  const { perfilDoctor } = usePatientData();
  const [view, setView] = useState<"list" | "form">("list");
  const [editingBudget, setEditingBudget] = useState<SavedBudget | null>(null);
  const [printTarget, setPrintTarget] = useState<SavedBudget | null>(null);
  const [enviandoWhatsAppId, setEnviandoWhatsAppId] = useState<string | null>(null);

  useEffect(() => {
    if (printTarget) {
      window.print();
    }
  }, [printTarget]);

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
      await enviarPdfPorWhatsapp({
        blob,
        nombreArchivo,
        telefono: patient.phone,
        caption,
        ventanaPrevia: ventanaWhatsApp,
      });
    } catch (err) {
      console.error("No se pudo generar el PDF del presupuesto", err);
      ventanaWhatsApp?.close();
      alert("No se pudo generar el PDF del presupuesto. Intenta de nuevo.");
    } finally {
      setEnviandoWhatsAppId(null);
    }
  };

  if (view === "form") {
    return (
      <NuevoPresupuesto
        patient={patient}
        initialBudget={editingBudget ?? undefined}
        planTratamientoSugerido={planTratamientoSugerido}
        onCancel={() => setView("list")}
        onSave={(budget) => {
          setPresupuestos((prev) => {
            if (editingBudget) {
              return prev.map((p) => (p.id === editingBudget.id ? { ...budget, id: p.id } : p));
            }
            return [{ ...budget, id: `${Date.now()}` }, ...prev];
          });
          setEditingBudget(null);
          setView("list");
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Presupuestos
        </h3>
        <button
          onClick={() => {
            setEditingBudget(null);
            setView("form");
          }}
          className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
        >
          + Nuevo Presupuesto
        </button>
      </div>

      {presupuestos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          No hay presupuestos registrados
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-edge/10 bg-surface print:hidden">
          <div className="grid grid-cols-[64px_1fr_auto] gap-3 border-b border-edge/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink/40">
            <span>Folio</span>
            <span>Tratamiento</span>
            <span className="text-right">Acción</span>
          </div>
          <div className="divide-y divide-edge/5">
            {presupuestos.map((p) => (
              <div key={p.id} className="grid grid-cols-[64px_1fr_auto] items-start gap-3 px-4 py-4">
                <div className="pt-1 text-sm font-medium text-ink/70">{p.folio}</div>

                <div>
                  <div className="space-y-1">
                    {p.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-ink/80">{item.note || item.procedure}</span>
                        <span className="shrink-0 rounded bg-inset px-2 py-0.5 text-xs text-ink/60">
                          {formatCurrency(item.price)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="font-semibold text-accent">{formatCurrency(p.total)}</span>
                    <span className="text-xs text-ink/40">{p.fecha}</span>
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
                    onClick={() => setPresupuestos((prev) => prev.filter((b) => b.id !== p.id))}
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
    </div>
  );
}

const estadoColorResumen: Record<string, string> = {
  Agendada: "bg-ink/10 text-ink/60",
  Confirmada: "bg-info/10 text-info",
  "En espera": "bg-accent/10 text-accent",
  Atendida: "bg-success/10 text-success",
  Cancelada: "bg-danger/10 text-danger",
};

function ExpedienteSidePanel({ citasFuturas }: { citasFuturas: CitaAgenda[] }) {
  return (
    <div className="space-y-6 print:hidden">
      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink/50">
          Resumen de Citas
        </h3>
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
  onTabApplied,
  onBack,
}: {
  patient: Patient;
  avatarColor: string;
  initials: string;
  formatDate: (date: string) => string;
  calculateAge: (date: string) => number | null;
  initialTab?: string;
  onTabApplied?: () => void;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<ExpedienteTab>(expedienteTabs[0]);
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
  } = usePatientData();

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

  const hoyISO = new Date().toISOString().slice(0, 10);
  const citasPaciente = citas
    .filter((c) => c.patientId === patient.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.horaInicio.localeCompare(a.horaInicio));
  const citasFuturas = citasPaciente
    .filter((c) => c.fecha >= hoyISO)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.horaInicio.localeCompare(b.horaInicio));

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
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-accent hover:text-accent print:hidden"
      >
        ← Volver a pacientes
      </button>

      <div className="flex items-center gap-4 print:hidden">
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-bold text-black"
          style={{ backgroundColor: avatarColor }}
        >
          {initials}
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-ink">{formatNombreConEdad(patient.name, patient.birthDate)}</h2>
          <p className="mt-1 text-sm text-ink/50">
            {patient.phone} · {formatDate(patient.birthDate)}
            {patient.birthDate && ` · ${formatEdad(patient.birthDate)}`}
          </p>
        </div>
        <button
          onClick={enviarResumen}
          title="Enviar resumen del expediente al paciente por WhatsApp"
          className="flex items-center gap-2 rounded-lg border border-success/40 px-3 py-2 text-xs font-semibold text-success transition-colors hover:bg-success/10"
        >
          <WhatsAppIcon />
          Enviar resumen al paciente
        </button>
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
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
              activeTab === tab
                ? "bg-accent/15 text-accent"
                : "text-ink/40 hover:bg-surface hover:text-ink/70"
            }`}
            style={
              activeTab === tab
                ? { textShadow: "0 0 8px rgba(251,146,60,0.4)" }
                : undefined
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
            />
          )}
          {activeTab === "Datos del Paciente" && (
            <DatosPaciente patient={patient} formatDate={formatDate} />
          )}
          {activeTab === "Historia Clínica" && <HistoriaClinica patientId={patient.id} />}
          {activeTab === "Listado de Citas" && <ListadoCitas citas={citasPaciente} recursos={recursos} />}
          {activeTab === "Fotografías" && <Fotografias />}
          {activeTab === "Pagos" && (
            <Pagos
              patientId={patient.id}
              patientName={patient.name}
              presupuestos={presupuestos}
              pagos={pagos}
              setPagos={setPagos}
            />
          )}
          {activeTab === "Consentimientos Informados y Recetas" && (
            <ConsentimientoInformado patient={patient} />
          )}
          {activeTab === "Laboratorios" && <Laboratorios patientId={patient.id} />}
          {activeTab === "Notas de Evolución y Seguimiento" && <NotasEvolucion patientId={patient.id} />}
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
            activeTab !== "Consentimientos Informados y Recetas" &&
            activeTab !== "Laboratorios" &&
            activeTab !== "Notas de Evolución y Seguimiento" && (
              <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
                {activeTab} — próximamente
              </div>
            )}
        </div>

        <ExpedienteSidePanel citasFuturas={citasFuturas} />
      </div>
    </div>
  );
}
