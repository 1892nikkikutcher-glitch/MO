"use client";

import { useMemo, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { calcularPorcentajes, PERIODOS_PORCENTAJES, rangoDePeriodo, type FilaPorcentaje, type PeriodoPorcentajes } from "@/lib/porcentajesMedicos";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function fechaCorta(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}

function Fila({ fila, periodo }: { fila: FilaPorcentaje; periodo: PeriodoPorcentajes }) {
  const sinNada = fila.porcentaje === null && fila.meta === null;
  const tonoMeta = fila.alcanzada ? "bg-success" : (fila.avance ?? 0) >= 60 ? "bg-accent" : "bg-warning";
  return (
    <div className="overflow-hidden rounded-2xl border border-edge/10 bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge/10 px-5 py-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: fila.color }} aria-hidden />
          {fila.nombre}
        </p>
        {fila.meta !== null && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              fila.alcanzada ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
            }`}
          >
            {fila.alcanzada ? "Meta alcanzada" : `Falta ${formatCurrency(fila.falta ?? 0)}`}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ink/40">Cobró</p>
          <p className="mt-0.5 text-lg font-bold tabular-nums text-ink">{formatCurrency(fila.cobrado)}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ink/40">
            Le toca {fila.porcentaje !== null ? `(${fila.porcentaje}%)` : ""}
          </p>
          {fila.comision !== null ? (
            <p className="mt-0.5 text-lg font-bold tabular-nums text-accent">{formatCurrency(fila.comision)}</p>
          ) : (
            <p className="mt-0.5 text-xs text-ink/40">Sin % de comisión. Defínelo en Agenda → Recursos.</p>
          )}
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ink/40">Meta del periodo</p>
          {fila.meta !== null ? (
            <p className="mt-0.5 text-lg font-bold tabular-nums text-ink">{formatCurrency(fila.meta)}</p>
          ) : (
            <p className="mt-0.5 text-xs text-ink/40">Sin meta. Defínela en Agenda → Recursos.</p>
          )}
        </div>
      </div>

      {fila.meta !== null && fila.avance !== null && (
        <div className="px-5 pb-4">
          <div className="mb-1 flex justify-between text-[11px] text-ink/50">
            <span>Avance</span>
            <span className="tabular-nums">{fila.avance}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-inset"
            role="progressbar"
            aria-valuenow={Math.min(100, fila.avance)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Avance de la meta de ${fila.nombre}`}
          >
            <div className={`h-full rounded-full ${tonoMeta}`} style={{ width: `${Math.min(100, fila.avance)}%` }} />
          </div>
          {periodo === "mes" && fila.proyeccion !== null && (
            <p className="mt-2 text-[11px] text-ink/50">
              Al ritmo que lleva, cerraría el mes con <span className="font-semibold text-ink/80">{formatCurrency(fila.proyeccion)}</span>
              {fila.meta > 0 && ` (${Math.round((fila.proyeccion / fila.meta) * 100)}% de su meta)`}.
            </p>
          )}
        </div>
      )}
      {sinNada && fila.cobrado === 0 && <p className="px-5 pb-4 text-xs text-ink/40">Sin cobros en este periodo.</p>}
    </div>
  );
}

export default function ReportePorcentajes() {
  const { recursos, finanzas, metas, puedeVerFinanzas } = usePatientData();
  const [periodo, setPeriodo] = useState<PeriodoPorcentajes>("mes");

  const hoy = new Date();
  const { desde, hasta } = rangoDePeriodo(periodo, hoy);
  const resultado = useMemo(
    () => calcularPorcentajes({ medicos: recursos, porFechaYMedico: finanzas.porFechaYMedico, periodo, hoy: new Date(), diasAtencion: metas.diasAtencion }),
    [recursos, finanzas.porFechaYMedico, periodo, metas.diasAtencion]
  );

  if (!puedeVerFinanzas) {
    return (
      <div className="rounded-2xl border border-edge/10 bg-surface p-10 text-center text-sm text-ink/50">
        No tienes permiso para ver información financiera.
      </div>
    );
  }

  const conMeta = resultado.filas.filter((f) => f.meta !== null);
  const alcanzaron = conMeta.filter((f) => f.alcanzada).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-edge/10 bg-surface p-4 text-xs text-ink/40">
        Lo que cobró cada médico en el periodo (el mismo dato del Corte de Caja → Desglose por médico), cuánto le toca según su % de
        comisión y si va alcanzando su meta. El % y la meta mensual se definen en Agenda → Recursos; la meta se lleva sola a la
        semana, la quincena o el día. Las devoluciones no se restan por médico.
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PERIODOS_PORCENTAJES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPeriodo(p.id)}
            aria-pressed={periodo === p.id}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              periodo === p.id ? "border-accent/60 bg-accent/15 text-accent" : "border-edge/15 text-ink/70 hover:bg-surface"
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
        <span className="text-xs text-ink/40">
          {desde === hasta ? fechaCorta(desde) : `${fechaCorta(desde)} – ${fechaCorta(hasta)}`}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-edge/10 bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-ink/40">Total cobrado</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{formatCurrency(resultado.totalCobrado)}</p>
        </div>
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
          <p className="text-xs uppercase tracking-wide text-ink/40">Total a pagar en comisiones</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-accent">{formatCurrency(resultado.totalComision)}</p>
        </div>
        <div className="rounded-2xl border border-edge/10 bg-surface p-5">
          <p className="text-xs uppercase tracking-wide text-ink/40">Metas alcanzadas</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink">
            {conMeta.length === 0 ? "—" : `${alcanzaron} de ${conMeta.length}`}
          </p>
        </div>
      </div>

      {resultado.filas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          No hay médicos registrados. Agrégalos en Agenda → Recursos.
        </div>
      ) : (
        <div className="space-y-4">
          {resultado.filas.map((fila) => (
            <Fila key={fila.recursoId} fila={fila} periodo={periodo} />
          ))}
        </div>
      )}

      {resultado.sinMedico.length > 0 && (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 text-xs text-ink/70">
          <p className="font-semibold text-warning">Cobros a nombre de alguien que no es un médico registrado</p>
          <p className="mt-1 text-ink/50">Estos montos están en el total, pero a nadie se le calcula comisión por ellos. Revisa que el nombre del médico esté bien escrito en el pago.</p>
          <ul className="mt-2 space-y-0.5">
            {resultado.sinMedico.map((x) => (
              <li key={x.nombre} className="flex justify-between gap-3">
                <span>{x.nombre}</span>
                <span className="tabular-nums">{formatCurrency(x.monto)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
