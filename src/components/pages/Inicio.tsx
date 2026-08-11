"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { calcularEdadDetallada, formatCurrency } from "@/lib/patientData";
import { calcularAvanceMetas } from "@/lib/metas";

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
  { label: "Ticket Promedio", value: "$820", color: "#f59e0b", financiero: true },
  { label: "Saldo Pendiente", value: "$6,500", color: "#dc2626", financiero: true },
  { label: "Nuevos Pacientes (Mes)", value: "12", color: "#ec4899", financiero: false },
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
  const { puedeVerFinanzas, patients, finanzas, metas } = usePatientData();
  const kpisVisibles = kpis.filter((kpi) => puedeVerFinanzas || !kpi.financiero);

  const hoy = new Date();
  const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(
    hoy.getDate()
  ).padStart(2, "0")}`;
  const avanceMetas = calcularAvanceMetas(finanzas.porFecha, metas.metaMensual);
  const corteDiario = finanzas.porFecha[hoyISO] ?? 0;
  const corteSemanal = avanceMetas.find((a) => a.label === "Semanal")?.actual ?? 0;
  const corteMensual = avanceMetas.find((a) => a.label === "Mensual")?.actual ?? 0;
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
      </div>

      {puedeVerFinanzas && (
        <CardShell title="Metas">
          {metas.metaMensual <= 0 ? (
            <p className="text-sm text-ink/40">
              Aún no configuras tu meta mensual. Ve a Administración → Metas para definirla.
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
                    <span className="font-medium text-ink">{patient.name}</span>
                    <span className="ml-2 text-ink/40">
                      {nacimiento.getDate()} de {MESES[nacimiento.getMonth()]}
                      {edadQueCumple !== null && ` · cumple ${edadQueCumple} años`}
                      {esHoy && " · ¡Hoy!"}
                    </span>
                  </div>
                  {patient.phone && (
                    <button
                      onClick={() => enviarSaludo(patient.name, patient.phone)}
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
