"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { calcularEdadDetallada, formatCurrency } from "@/lib/patientData";
import { capitalizarNombre } from "@/lib/textoNombre";
import { calcularAvanceMetas } from "@/lib/metas";
import PendientesConsultorio from "@/components/PendientesConsultorio";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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

const estatusColor: Record<string, string> = {
  Agendada: "#94a3b8",
  Confirmada: "#3b82f6",
  "En espera": "#f59e0b",
  Atendida: "#22c55e",
  Cancelada: "#dc2626",
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

function CardShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-6">
      <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-ink/60">{title}</h2>
      {children}
    </div>
  );
}

export default function Inicio() {
  const { puedeVerFinanzas, patients, citas, finanzas, metas, estadisticas, irAPagina, irAExpediente } =
    usePatientData();

  const hoy = new Date();
  const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(
    hoy.getDate()
  ).padStart(2, "0")}`;
  const mesActualKey = hoyISO.slice(0, 7); // "YYYY-MM"

  const avanceMetas = calcularAvanceMetas(finanzas.porFecha, metas.metaMensual);
  const corteDiario = finanzas.porFecha[hoyISO] ?? 0;
  const corteSemanal = avanceMetas.find((a) => a.label === "Semanal")?.actual ?? 0;
  const corteMensual = avanceMetas.find((a) => a.label === "Mensual")?.actual ?? 0;
  const totalPagadoHistorico = Object.values(finanzas.porFecha).reduce((sum, v) => sum + v, 0);

  const ticketPromedio =
    estadisticas.pagosCount > 0 ? Math.round(totalPagadoHistorico / estadisticas.pagosCount) : 0;
  const saldoPendiente = Math.max(0, estadisticas.totalPresupuestado - totalPagadoHistorico);
  const nuevosPacientesMes = patients.filter((p) => p.createdAt?.slice(0, 7) === mesActualKey).length;

  const citasDelMes = citas.filter((c) => c.fecha.slice(0, 7) === mesActualKey);
  const citasPorMes = citasDelMes.length;
  const citasAtendidas = citasDelMes.filter((c) => c.estatus === "Atendida").length;
  const citasCanceladas = citasDelMes.filter((c) => c.estatus === "Cancelada").length;
  // Math.max(0, ...): es un contador acumulado desde que existe el campo,
  // no un conteo real recalculado — crear y borrar presupuestos de prueba
  // en meses distintos puede dejarlo en negativo; nunca debe mostrarse así.
  const presupuestosDelMes = Math.max(0, estadisticas.presupuestosPorMes[mesActualKey] ?? 0);

  const kpisVisibles = [
    ...(puedeVerFinanzas
      ? [
          { label: "Ticket Promedio", value: formatCurrency(ticketPromedio), color: "#f59e0b" },
          { label: "Saldo Pendiente", value: formatCurrency(saldoPendiente), color: "#dc2626" },
        ]
      : []),
    { label: "Nuevos Pacientes (Mes)", value: String(nuevosPacientesMes), color: "#ec4899" },
    { label: "Citas por Mes", value: String(citasPorMes), color: "#3b82f6" },
    { label: "Citas Atendidas (Mes)", value: String(citasAtendidas), color: "#22c55e" },
    { label: "Laboratorios Pendientes", value: String(estadisticas.laboratoriosPendientesCount), color: "#f59e0b" },
    { label: "Presupuestos del Mes", value: String(presupuestosDelMes), color: "#a855f7" },
    { label: "Citas Canceladas (Mes)", value: String(citasCanceladas), color: "#dc2626" },
  ];

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

  const citasPorEstatusData = ["Agendada", "Confirmada", "En espera", "Atendida", "Cancelada"].map(
    (estatus) => ({
      label: estatus,
      value: citasDelMes.filter((c) => c.estatus === estatus).length,
      color: estatusColor[estatus],
    })
  );

  const cumpleanerosDelMes = patients
    .filter((p) => p.birthDate)
    .map((p) => {
      const nacimiento = new Date(`${p.birthDate}T00:00:00`);
      return { patient: p, nacimiento };
    })
    .filter(({ nacimiento }) => nacimiento.getMonth() === hoy.getMonth())
    .sort((a, b) => a.nacimiento.getDate() - b.nacimiento.getDate());

  const enviarSaludo = (nombre: string, telefono: string) => {
    const texto = encodeURIComponent(
      `¡Feliz cumpleaños, ${nombre.split(" ")[0]}! 🎉 De parte de todo el equipo te deseamos un excelente día. Tienes un regalo/promoción especial esperándote en tu próxima visita.`
    );
    const tel = telefono.replace(/\D/g, "");
    window.open(`https://wa.me/${tel}?text=${texto}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {puedeVerFinanzas && (
          <>
            <div
              className="rounded-xl border border-edge/10 bg-surface p-4"
              style={{ boxShadow: "inset 3px 0 0 0 #f59e0b" }}
            >
              <div className="text-xl font-bold text-ink">{formatCurrency(corteDiario)}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">Corte Diario</div>
            </div>
            <div
              className="rounded-xl border border-edge/10 bg-surface p-4"
              style={{ boxShadow: "inset 3px 0 0 0 #ec4899" }}
            >
              <div className="text-xl font-bold text-ink">{formatCurrency(corteSemanal)}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">Corte Semanal</div>
            </div>
            <div
              className="rounded-xl border border-edge/10 bg-surface p-4"
              style={{ boxShadow: "inset 3px 0 0 0 #22c55e" }}
            >
              <div className="text-xl font-bold text-ink">{formatCurrency(corteMensual)}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">Corte Mensual</div>
            </div>
          </>
        )}
        <div
          className="rounded-xl border border-edge/10 bg-surface p-4"
          style={{ boxShadow: "inset 3px 0 0 0 #3b82f6" }}
        >
          <div className="text-xl font-bold text-ink">{patients.length}</div>
          <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">Total de Expedientes</div>
        </div>
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
        <div
          className="rounded-xl border border-edge/10 bg-surface p-4"
          style={{ boxShadow: "inset 3px 0 0 0 #ec4899" }}
        >
          <div className="text-xl font-bold text-ink">{cumpleanerosDelMes.length}</div>
          <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">
            Cumpleaños Este Mes
          </div>
        </div>
        <div
          className="rounded-xl border border-edge/10 bg-surface p-4"
          style={{ boxShadow: "inset 3px 0 0 0 #a855f7" }}
        >
          <div className="text-xl font-bold text-ink">{edadPromedio ?? "—"}</div>
          <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">Edad Promedio</div>
        </div>
      </div>

      <PendientesConsultorio />

      {puedeVerFinanzas && (
        <CardShell title="Metas">
          {metas.metaMensual <= 0 ? (
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
                    <span className="text-ink/50">
                      {formatCurrency(Math.round(a.actual))} / {formatCurrency(Math.round(a.meta))}{" "}
                      <span className="font-semibold text-accent">· {a.porcentaje}%</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-inset">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-orange-500 transition-all"
                      style={{ width: `${a.porcentaje}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardShell>
      )}

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

      <CardShell title={`Cumpleaños de ${MESES[hoy.getMonth()]}`}>
        {cumpleanerosDelMes.length === 0 ? (
          <p className="text-sm text-ink/40">Ningún paciente cumple años este mes.</p>
        ) : (
          <div className="space-y-2">
            {cumpleanerosDelMes.map(({ patient, nacimiento }) => {
              const esHoy = nacimiento.getDate() === hoy.getDate();
              const yaPaso = nacimiento.getDate() <= hoy.getDate();
              const edad = calcularEdadDetallada(patient.birthDate);
              const edadQueCumple = edad ? (yaPaso ? edad.years : edad.years + 1) : null;
              return (
                <div
                  key={patient.id}
                  className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
                    esHoy ? "border-accent/40 bg-accent/10" : "border-edge/10"
                  }`}
                >
                  <div>
                    <button
                      onClick={() => irAExpediente(patient.id)}
                      title="Ver expediente"
                      className="font-medium text-ink underline decoration-ink/20 underline-offset-2 hover:text-accent hover:decoration-accent/50"
                    >
                      {capitalizarNombre(patient.name)}
                    </button>
                    <span className="ml-2 text-ink/40">
                      {nacimiento.getDate()} de {MESES[nacimiento.getMonth()]}
                      {edadQueCumple !== null && ` · cumple ${edadQueCumple} años`}
                      {esHoy && " · ¡Hoy!"}
                    </span>
                  </div>
                  {patient.phone && (
                    <button
                      onClick={() => enviarSaludo(capitalizarNombre(patient.name), patient.phone)}
                      title="Enviar felicitación por WhatsApp"
                      className="flex items-center gap-1.5 rounded-lg border border-success/40 px-2.5 py-1.5 text-xs font-semibold text-success transition-colors hover:bg-success/10"
                    >
                      <WhatsAppIcon />
                      Felicitar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardShell>
    </div>
  );
}
