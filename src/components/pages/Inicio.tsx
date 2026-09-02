"use client";

import { useMemo, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { calcularEdadDetallada, formatCurrency } from "@/lib/patientData";
import { calcularAvanceMetas } from "@/lib/metas";
import { calcularRangoPeriodo, type PeriodoId } from "@/lib/dashboardMetrics";
import { usePrivacidad } from "@/context/PrivacidadContext";
import CandadoPrivacidad from "@/components/CandadoPrivacidad";
import PendientesConsultorio from "@/components/PendientesConsultorio";
import PeriodSelector from "@/components/dashboard/PeriodSelector";
import FinancialSummary from "@/components/dashboard/FinancialSummary";
import ProductivitySummary from "@/components/dashboard/ProductivitySummary";
import BudgetMetrics from "@/components/dashboard/BudgetMetrics";
import AppointmentMetrics from "@/components/dashboard/AppointmentMetrics";
import AttentionAlerts from "@/components/dashboard/AttentionAlerts";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import DashboardDetallePanel, { type DashboardDetalleItem } from "@/components/dashboard/DashboardDetallePanel";

/** Franja de acento + resplandor neón muy sutil para las tarjetas KPI del
 * dashboard — mismo mecanismo que el borde inset de antes, solo con un
 * halo del mismo color, difuminado y a baja opacidad, alrededor. */
function neonShadow(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `inset 3px 0 0 0 ${hex}, 0 0 14px -4px rgba(${r}, ${g}, ${b}, 0.55)`;
}

const estatusColor: Record<string, string> = {
  Agendada: "#94a3b8",
  Confirmada: "#3b82f6",
  "En espera": "#f59e0b",
  Atendida: "#22c55e",
  Reagendada: "#a855f7",
  Cancelada: "#dc2626",
  "No Asistió": "#7f1d1d",
};

function DonutChart({
  data,
  center,
  onSelectSegment,
}: {
  data: { label: string; value: number; color: string }[];
  center?: React.ReactNode;
  onSelectSegment?: (label: string) => void;
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  let cumulative = 0;
  const segments = data.map((d) => {
    const fraction = total > 0 ? d.value / total : 0;
    const dash = fraction * circumference;
    const offset = circumference - cumulative;
    cumulative += dash;
    return { ...d, dash, offset, fraction };
  });

  return (
    <div className="flex flex-wrap items-center gap-8">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <svg width="180" height="180" viewBox="0 0 180 180" className="-rotate-90">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="24" />
          {total > 0 &&
            segments.map((s) => (
              <circle
                key={s.label}
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth="24"
                strokeDasharray={`${s.dash} ${circumference - s.dash}`}
                strokeDashoffset={s.offset}
                strokeLinecap="butt"
              />
            ))}
        </svg>
        {center && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">{center}</div>
        )}
      </div>

      <div className="space-y-3">
        {total === 0 ? (
          <p className="text-sm text-ink/40">Aún no hay datos suficientes.</p>
        ) : (
          segments.map((s) => {
            const Wrapper = onSelectSegment && s.value > 0 ? "button" : "div";
            return (
              <Wrapper
                key={s.label}
                onClick={onSelectSegment && s.value > 0 ? () => onSelectSegment(s.label) : undefined}
                className={`flex w-full items-center gap-3 text-left ${
                  onSelectSegment && s.value > 0 ? "rounded-lg transition-colors hover:bg-surface2" : ""
                }`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: s.color, boxShadow: `0 0 8px ${s.color}` }}
                />
                <div>
                  <div className="text-sm font-medium text-ink">{s.label}</div>
                  <div className="text-xs text-ink/40">
                    {s.value} · {Math.round(s.fraction * 100)}%
                  </div>
                </div>
              </Wrapper>
            );
          })
        )}
      </div>
    </div>
  );
}

/** Agrupa varios bloques del Dashboard Principal bajo un encabezado de
 * categoría (Finanzas / Pacientes) — puramente visual, no cambia qué se
 * calcula ni quién lo puede ver; cada bloque interno conserva sus propios
 * candados de permisos (puedeVerFinanzas, etc.). */
function SeccionDashboard({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="border-b border-edge/10 pb-2 text-lg font-semibold text-ink">{titulo}</h2>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function CardShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-6">
      <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-ink/60">{title}</h2>
      {children}
    </div>
  );
}

function MetasCard({
  metaMensual,
  avanceMetas,
  irAPagina,
}: {
  metaMensual: number;
  avanceMetas: ReturnType<typeof calcularAvanceMetas>;
  irAPagina: (id: string) => void;
}) {
  const { oculto } = usePrivacidad();
  return (
    <CardShell title="Metas">
      {metaMensual <= 0 ? (
        <p className="text-sm text-ink/40">
          Aún no configuras tu meta mensual. Ve a{" "}
          <button
            onClick={() => irAPagina("administracion-metas")}
            className="font-semibold text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
          >
            Administración → Metas
          </button>{" "}
          para definirla.
        </p>
      ) : (
        <div className="space-y-4">
          {avanceMetas.map((a) => (
            <div key={a.label}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium text-ink">Meta {a.label}</span>
                <span className={`text-ink/50 ${oculto ? "blur-[6px] select-none" : ""}`}>
                  {oculto
                    ? "••••• / •••••"
                    : `${formatCurrency(Math.round(a.actual))} / ${formatCurrency(Math.round(a.meta))}`}{" "}
                  <span className="font-semibold text-accent">· {a.porcentaje}%</span>
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-inset">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all"
                  style={{ width: `${a.porcentaje}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

export default function Inicio() {
  const { puedeVerFinanzas, patients, citas, finanzas, metas, estadisticas, irAPagina, irAExpediente } =
    usePatientData();

  const hoy = new Date();
  const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(
    hoy.getDate()
  ).padStart(2, "0")}`;

  const [periodoId, setPeriodoId] = useState<PeriodoId>("mes");
  const [personalizado, setPersonalizado] = useState(() => ({
    desdeISO: `${hoyISO.slice(0, 7)}-01`,
    hastaISO: hoyISO,
  }));
  const [detalle, setDetalle] = useState<{ title: string; items: DashboardDetalleItem[] } | null>(null);
  // Reaccionan a este periodo: Finanzas, Operación (Pacientes), Agenda, el
  // valor presupuestado de Ventas, y los donuts de esta pantalla. Se quedan
  // fijos (histórico/estado-actual/ventana propia, no un periodo de
  // reporte): Aceptados/Pendientes/Conversión/Laboratorios de Ventas, Saldo
  // Pendiente, Pacientes Activos, Próximas Citas, Requieren Atención,
  // Pendientes del Consultorio, Metas, y las gráficas de tendencia — cada
  // una documentada en su propio archivo con la razón.
  const rango = useMemo(
    () => calcularRangoPeriodo(periodoId, hoy, personalizado),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [periodoId, personalizado, hoyISO]
  );

  const avanceMetas = calcularAvanceMetas(finanzas.porFecha, metas.metaMensual);

  const citasDelPeriodo = citas.filter((c) => c.fecha >= rango.desdeISO && c.fecha <= rango.hastaISO);

  const edades = patients
    .map((p) => calcularEdadDetallada(p.birthDate)?.years)
    .filter((y): y is number => typeof y === "number");
  const edadPromedio = edades.length > 0 ? Math.round(edades.reduce((s, y) => s + y, 0) / edades.length) : null;

  // "Tipos de Paciente" del periodo: de los pacientes con AL MENOS una cita
  // dentro de `rango`, cuántos tuvieron ahí su primera cita de siempre
  // ("Nuevos") vs. cuántos ya tenían citas antes de rango.desdeISO
  // ("Recurrentes") — comparado contra el historial COMPLETO de citas de
  // cada paciente, no solo las del periodo. No incluye "Sin citas aún": esa
  // es una condición permanente del paciente, no algo que pase "durante"
  // un periodo — por definición no aplica a un paciente con cita en rango.
  const primeraCitaPorPaciente = new Map<string, string>();
  citas.forEach((c) => {
    if (!c.patientId) return;
    const actual = primeraCitaPorPaciente.get(c.patientId);
    if (!actual || c.fecha < actual) primeraCitaPorPaciente.set(c.patientId, c.fecha);
  });
  const pacientesConCitaEnPeriodo = new Set(
    citasDelPeriodo.filter((c): c is typeof c & { patientId: string } => !!c.patientId).map((c) => c.patientId)
  );
  const patientsPorId = new Map(patients.map((p) => [p.id, p]));
  const nuevosEnPeriodoIds: string[] = [];
  const recurrentesEnPeriodoIds: string[] = [];
  pacientesConCitaEnPeriodo.forEach((patientId) => {
    const primeraCita = primeraCitaPorPaciente.get(patientId);
    if (primeraCita && primeraCita >= rango.desdeISO) nuevosEnPeriodoIds.push(patientId);
    else recurrentesEnPeriodoIds.push(patientId);
  });
  const patientTypeData = [
    { label: "Nuevos", value: nuevosEnPeriodoIds.length, color: "#3b82f6" },
    { label: "Recurrentes", value: recurrentesEnPeriodoIds.length, color: "#f59e0b" },
  ];
  const patientIdsAItems = (ids: string[]): DashboardDetalleItem[] =>
    ids.map((id) => ({
      id,
      primary: patientsPorId.get(id)?.name || "Paciente",
      onSelect: () => {
        setDetalle(null);
        irAExpediente(id);
      },
    }));

  const citasPorEstatusData = [
    "Agendada",
    "Confirmada",
    "En espera",
    "Atendida",
    "Reagendada",
    "Cancelada",
    "No Asistió",
  ].map((estatus) => ({
    label: estatus,
    value: citasDelPeriodo.filter((c) => c.estatus === estatus).length,
    color: estatusColor[estatus],
  }));

  const cumpleanerosDelMes = patients
    .filter((p) => p.birthDate)
    .map((p) => {
      const nacimiento = new Date(`${p.birthDate}T00:00:00`);
      return { patient: p, nacimiento };
    })
    .filter(({ nacimiento }) => nacimiento.getMonth() === hoy.getMonth())
    .sort((a, b) => a.nacimiento.getDate() - b.nacimiento.getDate());

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodSelector
          periodoId={periodoId}
          onSelect={setPeriodoId}
          personalizado={personalizado}
          onPersonalizadoChange={setPersonalizado}
        />
        {puedeVerFinanzas && <CandadoPrivacidad />}
      </div>

      {/* Alertas y pendientes: listas accionables, no indicadores por
          categoría — se muestran antes de agrupar el resto por Finanzas y
          Pacientes. */}
      <AttentionAlerts />
      <PendientesConsultorio />

      <SeccionDashboard titulo="Finanzas">
        <FinancialSummary rango={rango} />
        <BudgetMetrics rango={rango} />
        {puedeVerFinanzas && (
          <MetasCard metaMensual={metas.metaMensual} avanceMetas={avanceMetas} irAPagina={irAPagina} />
        )}
      </SeccionDashboard>

      <SeccionDashboard titulo="Pacientes">
        <ProductivitySummary rango={rango} />
        <AppointmentMetrics rango={rango} />
        <DashboardCharts />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <div
            className="rounded-xl border border-edge/10 bg-surface p-4"
            style={{ boxShadow: neonShadow("#3aa8ff") }}
          >
            <div className="text-xl font-bold text-ink">{patients.length}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">Total de Expedientes</div>
          </div>
          <button
            className="rounded-xl border border-edge/10 bg-surface p-4 text-left transition-transform hover:-translate-y-0.5"
            style={{ boxShadow: neonShadow("#ff3d9a") }}
            onClick={() =>
              setDetalle({
                title: "Cumpleaños Este Mes",
                items: cumpleanerosDelMes.map(({ patient, nacimiento }) => ({
                  id: patient.id,
                  primary: patient.name || "Paciente",
                  secondary: `${nacimiento.getDate()}/${nacimiento.getMonth() + 1}`,
                  onSelect: () => {
                    setDetalle(null);
                    irAExpediente(patient.id);
                  },
                })),
              })
            }
          >
            <div className="text-xl font-bold text-ink">{cumpleanerosDelMes.length}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">
              Cumpleaños Este Mes
            </div>
          </button>
          <div
            className="rounded-xl border border-edge/10 bg-surface p-4"
            style={{ boxShadow: neonShadow("#b84dff") }}
          >
            <div className="text-xl font-bold text-ink">{edadPromedio ?? "—"}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">Edad Promedio</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CardShell title={`Tipos de Paciente (${rango.label})`}>
            <DonutChart
              data={patientTypeData}
              onSelectSegment={(label) =>
                setDetalle({
                  title: `${label} (${rango.label})`,
                  items: patientIdsAItems(label === "Nuevos" ? nuevosEnPeriodoIds : recurrentesEnPeriodoIds),
                })
              }
            />
          </CardShell>

          <CardShell title={`Citas por Estatus (${rango.label})`}>
            <DonutChart
              data={citasPorEstatusData}
              onSelectSegment={(label) =>
                setDetalle({
                  title: `${label} (${rango.label})`,
                  items: citasDelPeriodo
                    .filter((c) => c.estatus === label)
                    .map((c) => ({
                      id: c.id,
                      primary: c.paciente || "Paciente",
                      secondary: `${c.fecha} · ${c.horaInicio}-${c.horaFin}`,
                      onSelect: c.patientId
                        ? () => {
                            setDetalle(null);
                            irAExpediente(c.patientId as string, "Agenda");
                          }
                        : undefined,
                    })),
                })
              }
              center={
                <>
                  <span className="text-4xl font-bold text-ink">{citasDelPeriodo.length}</span>
                  <span className="mt-1 text-[10px] uppercase tracking-wide text-ink/40">
                    citas en el periodo
                  </span>
                </>
              }
            />
          </CardShell>
        </div>
      </SeccionDashboard>

      {detalle && (
        <DashboardDetallePanel
          title={detalle.title}
          items={detalle.items}
          emptyMessage="No hay elementos para mostrar."
          onClose={() => setDetalle(null)}
        />
      )}
    </div>
  );
}
