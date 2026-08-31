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

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

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
}: {
  data: { label: string; value: number; color: string }[];
  center?: React.ReactNode;
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
          segments.map((s) => (
            <div key={s.label} className="flex items-center gap-3">
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
            </div>
          ))
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
  const { puedeVerFinanzas, patients, citas, finanzas, metas, estadisticas, irAPagina } = usePatientData();

  const hoy = new Date();
  const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(
    hoy.getDate()
  ).padStart(2, "0")}`;
  const mesActualKey = hoyISO.slice(0, 7); // "YYYY-MM"

  const [periodoId, setPeriodoId] = useState<PeriodoId>("mes");
  const [personalizado, setPersonalizado] = useState(() => ({
    desdeISO: `${hoyISO.slice(0, 7)}-01`,
    hastaISO: hoyISO,
  }));
  // Fila 1 (Finanzas), Fila 2 (Operación) y Fila 4 (Agenda) del dashboard
  // reaccionan a este periodo — Presupuestos/Laboratorios (Fila 3) y las
  // gráficas de evolución mensual se quedan históricas/de tendencia, no
  // tiene sentido "filtrarlas" por periodo.
  const rango = useMemo(
    () => calcularRangoPeriodo(periodoId, hoy, personalizado),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [periodoId, personalizado, hoyISO]
  );

  const avanceMetas = calcularAvanceMetas(finanzas.porFecha, metas.metaMensual);

  const citasDelMes = citas.filter((c) => c.fecha.slice(0, 7) === mesActualKey);
  const citasPorMes = citasDelMes.length;
  // Math.max(0, ...): es un contador acumulado desde que existe el campo,
  // no un conteo real recalculado — crear y borrar presupuestos de prueba
  // en meses distintos puede dejarlo en negativo; nunca debe mostrarse así.
  const presupuestosDelMes = Math.max(0, estadisticas.presupuestosPorMes[mesActualKey] ?? 0);

  const kpisVisibles = [{ label: "Presupuestos del Mes", value: String(presupuestosDelMes), color: "#b84dff" }];

  const edades = patients
    .map((p) => calcularEdadDetallada(p.birthDate)?.years)
    .filter((y): y is number => typeof y === "number");
  const edadPromedio = edades.length > 0 ? Math.round(edades.reduce((s, y) => s + y, 0) / edades.length) : null;

  const citasPorPaciente = new Map<string, number>();
  citas.forEach((c) => {
    if (!c.patientId) return;
    citasPorPaciente.set(c.patientId, (citasPorPaciente.get(c.patientId) ?? 0) + 1);
  });
  let primeraVez = 0;
  let subsecuentes = 0;
  let sinCitas = 0;
  patients.forEach((p) => {
    const n = citasPorPaciente.get(p.id) ?? 0;
    if (n === 0) sinCitas++;
    else if (n === 1) primeraVez++;
    else subsecuentes++;
  });
  const patientTypeData = [
    { label: "Sin citas aún", value: sinCitas, color: "#64748b" },
    { label: "Primera vez", value: primeraVez, color: "#3b82f6" },
    { label: "Subsecuentes", value: subsecuentes, color: "#f59e0b" },
  ];

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
    value: citasDelMes.filter((c) => c.estatus === estatus).length,
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
        <BudgetMetrics />
        {puedeVerFinanzas && (
          <MetasCard metaMensual={metas.metaMensual} avanceMetas={avanceMetas} irAPagina={irAPagina} />
        )}
        {kpisVisibles.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {kpisVisibles.map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl border border-edge/10 bg-surface p-4"
                style={{ boxShadow: neonShadow(kpi.color) }}
              >
                <div className="text-xl font-bold text-ink">{kpi.value}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">{kpi.label}</div>
              </div>
            ))}
          </div>
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
          <div
            className="rounded-xl border border-edge/10 bg-surface p-4"
            style={{ boxShadow: neonShadow("#ff3d9a") }}
          >
            <div className="text-xl font-bold text-ink">{cumpleanerosDelMes.length}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">
              Cumpleaños Este Mes
            </div>
          </div>
          <div
            className="rounded-xl border border-edge/10 bg-surface p-4"
            style={{ boxShadow: neonShadow("#b84dff") }}
          >
            <div className="text-xl font-bold text-ink">{edadPromedio ?? "—"}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">Edad Promedio</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <CardShell title="Tipos de Paciente">
            <DonutChart data={patientTypeData} />
          </CardShell>

          <CardShell title={`Citas por Estatus de ${MESES[hoy.getMonth()]}`}>
            <DonutChart
              data={citasPorEstatusData}
              center={
                <>
                  <span className="text-4xl font-bold text-ink">{citasPorMes}</span>
                  <span className="mt-1 text-[10px] uppercase tracking-wide text-ink/40">
                    citas este mes
                  </span>
                </>
              }
            />
          </CardShell>
        </div>
      </SeccionDashboard>
    </div>
  );
}
