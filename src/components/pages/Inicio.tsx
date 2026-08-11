"use client";

import { usePatientData } from "@/context/PatientDataContext";

const patientTypeData = [
  { label: "Primera vez", value: 24, color: "#3b82f6" },
  { label: "Subsecuentes", value: 58, color: "#f59e0b" },
  { label: "Emergencias", value: 10, color: "#dc2626" },
];

const genderData = [
  { label: "Femenino", value: 55, color: "#ec4899" },
  { label: "Masculino", value: 45, color: "#3b82f6" },
];

const averageAge = 34;

const kpis = [
  { label: "Corte Diario", value: "$3,200", color: "#f59e0b", financiero: true },
  { label: "Corte Semanal", value: "$16,850", color: "#ec4899", financiero: true },
  { label: "Corte Mensual", value: "$48,900", color: "#22c55e", financiero: true },
  { label: "Ticket Promedio", value: "$820", color: "#f59e0b", financiero: true },
  { label: "Saldo Pendiente", value: "$6,500", color: "#dc2626", financiero: true },
  { label: "Nuevos Pacientes (Mes)", value: "12", color: "#ec4899", financiero: false },
  { label: "Total de Expedientes", value: "348", color: "#3b82f6", financiero: false },
  { label: "Citas por Mes", value: "96", color: "#3b82f6", financiero: false },
  { label: "Citas Atendidas", value: "81", color: "#22c55e", financiero: false },
  { label: "Laboratorios Pendientes", value: "7", color: "#f59e0b", financiero: false },
  { label: "Presupuestos Activos", value: "15", color: "#dc2626", financiero: false },
  { label: "Promedio Citas Reagendadas", value: "4", color: "#dc2626", financiero: false },
];

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
    <div className="flex items-center gap-8">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <svg width="180" height="180" viewBox="0 0 180 180" className="-rotate-90">
          <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="24" />
          {segments.map((s) => (
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
        {segments.map((s) => (
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
        ))}
      </div>
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

export default function Inicio() {
  const { puedeVerFinanzas } = usePatientData();
  const kpisVisibles = kpis.filter((kpi) => puedeVerFinanzas || !kpi.financiero);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {kpisVisibles.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-edge/10 bg-surface p-4"
            style={{ boxShadow: `inset 3px 0 0 0 ${kpi.color}` }}
          >
            <div className="text-xl font-bold text-ink">{kpi.value}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">{kpi.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CardShell title="Tipos de Paciente">
          <DonutChart data={patientTypeData} />
        </CardShell>

        <CardShell title="Edad Promedio y Género">
          <DonutChart
            data={genderData}
            center={
              <>
                <span className="text-4xl font-bold text-ink">{averageAge}</span>
                <span className="mt-1 text-[10px] uppercase tracking-wide text-ink/40">
                  años promedio
                </span>
              </>
            }
          />
        </CardShell>
      </div>
    </div>
  );
}
