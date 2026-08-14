"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";

const MESES_CORTOS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function CardShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">{title}</h3>
      {subtitle && <p className="mt-1 text-xs text-ink/40">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function BarChart({
  data,
  formatValue = (v: number) => String(v),
}: {
  data: { label: string; value: number }[];
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.every((d) => d.value === 0)) {
    return <p className="text-sm text-ink/40">Aún no hay datos suficientes.</p>;
  }
  return (
    <div className="flex items-end gap-2 overflow-x-auto pb-2" style={{ minHeight: 180 }}>
      {data.map((d) => (
        <div key={d.label} className="flex min-w-[36px] flex-1 flex-col items-center gap-1.5">
          <span className="text-[10px] font-medium text-ink/50">{formatValue(d.value)}</span>
          <div
            className="w-full rounded-t-md bg-gradient-to-t from-accent/40 to-accent"
            style={{ height: `${Math.max(4, (d.value / max) * 140)}px` }}
            title={`${d.label}: ${formatValue(d.value)}`}
          />
          <span className="text-[10px] uppercase tracking-wide text-ink/40">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReporteGraficas() {
  const { finanzas, patients, citas, estadisticas } = usePatientData();

  const hoy = new Date();
  const ultimos30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - (29 - i));
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { label: String(d.getDate()), iso, value: finanzas.porFecha[iso] ?? 0 };
  });

  const ultimos6Meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - (5 - i), 1);
    const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { label: MESES_CORTOS[d.getMonth()], clave };
  });

  const presupuestosPorMes = ultimos6Meses.map((m) => ({
    label: m.label,
    value: estadisticas.presupuestosPorMes[m.clave] ?? 0,
  }));

  const pacientesPorMes = ultimos6Meses.map((m) => {
    const total = patients.filter((p) => (p.createdAt ?? "").startsWith(m.clave)).length;
    return { label: m.label, value: total };
  });

  const totalIngresos30Dias = ultimos30.reduce((s, d) => s + d.value, 0);

  const estatusCitas = ["Agendada", "Confirmada", "En espera", "Atendida", "Cancelada"].map((estatus) => ({
    label: estatus,
    value: citas.filter((c) => c.estatus === estatus).length,
  }));

  return (
    <div className="space-y-6">
      <CardShell
        title="Ingresos — últimos 30 días"
        subtitle={`Total del periodo: ${formatCurrency(totalIngresos30Dias)}`}
      >
        <BarChart data={ultimos30} formatValue={(v) => (v > 0 ? formatCurrency(v) : "")} />
      </CardShell>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CardShell title="Nuevos pacientes por mes" subtitle="Últimos 6 meses">
          <BarChart data={pacientesPorMes} />
        </CardShell>

        <CardShell title="Presupuestos creados por mes" subtitle="Últimos 6 meses">
          <BarChart data={presupuestosPorMes} />
        </CardShell>
      </div>

      <CardShell title="Citas por estatus" subtitle="Histórico completo de la agenda">
        <BarChart data={estatusCitas} />
      </CardShell>
    </div>
  );
}
