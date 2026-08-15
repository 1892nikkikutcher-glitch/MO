"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { produccionPorTratamiento } from "@/lib/reportes";
import { ingresosPorMes, ocupacionPorSemana, pacientesNuevosPorMes } from "@/lib/dashboardMetrics";
import BarChart from "./charts/BarChart";
import HorizontalBarList from "./charts/HorizontalBarList";

function ChartCard({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">{title}</h3>
      {caption && <p className="mt-1 text-xs text-ink/40">{caption}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

/** Gráficas del Dashboard Principal — solo las que ayudan a administrar la
 * clínica, nada decorativo. Ingresos y Producción son financieras (mismo
 * gate que el resto de la app); Pacientes Nuevos y Ocupación son
 * operativas y quedan visibles para todos los roles. */
export default function DashboardCharts() {
  const { puedeVerFinanzas, finanzas, patients, citas, horario, procedimientos } = usePatientData();

  const hoy = new Date();

  const datosIngresos = ingresosPorMes(finanzas.porFecha, hoy).map((p) => ({ label: p.label, valor: p.valor }));
  const datosPacientesNuevos = pacientesNuevosPorMes(patients, hoy).map((p) => ({
    label: p.label,
    valor: p.valor,
  }));
  const datosOcupacion = ocupacionPorSemana(citas, horario, hoy);

  const { porTratamiento, sinCatalogoCount } = produccionPorTratamiento(citas, procedimientos);
  const topTratamientos = porTratamiento.slice(0, 8).map((t) => ({
    label: t.nombre,
    valor: t.valor,
    subtitulo: `${t.veces} vez(es)`,
  }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {puedeVerFinanzas && (
        <ChartCard title="Ingresos" caption="Últimos 12 meses, cobrado real por mes.">
          <BarChart data={datosIngresos} color="#ffb020" formatValue={(v) => formatCurrency(v)} />
        </ChartCard>
      )}

      <ChartCard title="Pacientes Nuevos" caption="Altas por mes, últimos 12 meses.">
        <BarChart data={datosPacientesNuevos} color="#ff3d9a" />
      </ChartCard>

      <ChartCard title="Ocupación" caption="% de horas clínicas ocupadas, últimas 8 semanas.">
        <BarChart data={datosOcupacion} color="#3aa8ff" suffix="%" />
      </ChartCard>

      {puedeVerFinanzas && (
        <ChartCard
          title="Producción por Tratamiento"
          caption={
            topTratamientos.length === 0
              ? "Aún no hay citas Atendidas con tratamientos del catálogo para calcularlo."
              : sinCatalogoCount > 0
                ? `Solo cuenta tratamientos que coinciden con el catálogo de Procedimientos — ${sinCatalogoCount} entrada(s) de citas atendidas no matchearon y se excluyeron.`
                : "Valor al paciente (catálogo de Procedimientos) de las citas Atendidas, histórico."
          }
        >
          {topTratamientos.length === 0 ? (
            <p className="text-sm text-ink/40">Sin datos suficientes todavía.</p>
          ) : (
            <HorizontalBarList data={topTratamientos} color="#b84dff" formatValue={(v) => formatCurrency(v)} />
          )}
        </ChartCard>
      )}
    </div>
  );
}
