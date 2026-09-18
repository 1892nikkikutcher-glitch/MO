"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { usePrivacidad } from "@/context/PrivacidadContext";
import { formatCurrency } from "@/lib/patientData";
import type { RangoPeriodo } from "@/lib/dashboardMetrics";
import {
  GRUPOS_EFECTIVO,
  GRUPOS_ELECTRONICO,
  calcularAsignacionFondos,
  sumarRangoPorFormaPago,
  type GrupoConMonto,
} from "@/lib/fondosFinancieros";

/** Marco naranja fosforescente que separa la regla de sobres del resto de
 * Finanzas — mucho más marcado que el `neonShadow` de una sola franja que
 * ya usan las tarjetas KPI, a propósito: este bloque es una regla fija que
 * el usuario definió aparte, no un KPI más entre los demás. */
const MARCO_FOSFORESCENTE = {
  border: "1.5px solid rgba(255, 140, 0, 0.7)",
  boxShadow: "0 0 26px -4px rgba(255, 140, 0, 0.55), inset 0 0 30px -12px rgba(255, 140, 0, 0.25)",
};

function FilaFondo({ fondo, oculto }: { fondo: { label: string; porcentaje: number; monto: number }; oculto: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-ink/70">
        {fondo.label} <span className="text-ink/40">· {fondo.porcentaje}%</span>
      </span>
      <span className={`shrink-0 font-semibold text-ink ${oculto ? "blur-[6px] select-none" : ""}`}>
        {oculto ? "••••••" : formatCurrency(fondo.monto)}
      </span>
    </div>
  );
}

function GrupoFondosBlock({ grupo, oculto }: { grupo: GrupoConMonto; oculto: boolean }) {
  return (
    <div>
      {grupo.titulo && (
        <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-accent">
          <span>
            {grupo.titulo} · {grupo.porcentajeGrupo}%
          </span>
          <span className={oculto ? "blur-[6px] select-none" : ""}>
            {oculto ? "••••••" : formatCurrency(grupo.montoGrupo)}
          </span>
        </div>
      )}
      <div className="divide-y divide-edge/5">
        {grupo.fondos.map((f) => (
          <FilaFondo key={f.label} fondo={f} oculto={oculto} />
        ))}
      </div>
    </div>
  );
}

function CanalFondos({
  nombre,
  ingresoCanal,
  grupos,
  oculto,
  rangoLabel,
}: {
  nombre: string;
  ingresoCanal: number;
  grupos: GrupoConMonto[];
  oculto: boolean;
  rangoLabel: string;
}) {
  return (
    <div className="rounded-xl border border-edge/10 bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-edge/10 pb-3">
        <h3 className="text-sm font-semibold text-ink">{nombre}</h3>
        <div className="text-right">
          <div className={`text-base font-bold text-ink ${oculto ? "blur-[6px] select-none" : ""}`}>
            {oculto ? "••••••" : formatCurrency(ingresoCanal)}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-ink/40">{rangoLabel}</div>
        </div>
      </div>
      <div className="space-y-4">
        {grupos.map((g) => (
          <GrupoFondosBlock key={g.titulo ?? "unico"} grupo={g} oculto={oculto} />
        ))}
      </div>
    </div>
  );
}

/** Regla de sobres del consultorio: separa lo que entra por Efectivo de lo
 * que entra Electrónico (tarjeta/transferencia/cheque) y reparte cada
 * canal entre fondos fijos, en pesos reales del periodo activo — mismo
 * `rango` que el resto de Finanzas (Inicio.tsx). Los porcentajes son fijos
 * (definidos por el usuario), no editables desde aquí todavía. */
export default function FondosFinancieros({ rango }: { rango: RangoPeriodo }) {
  const { puedeVerFinanzas, finanzas } = usePatientData();
  const { oculto } = usePrivacidad();

  if (!puedeVerFinanzas) return null;

  const desdePeriodo = new Date(`${rango.desdeISO}T00:00:00`);
  const hastaPeriodo = new Date(`${rango.hastaISO}T00:00:00`);
  const ingresos = sumarRangoPorFormaPago(finanzas.porFechaYFormaPago, desdePeriodo, hastaPeriodo);

  const gruposElectronico = calcularAsignacionFondos(GRUPOS_ELECTRONICO, ingresos.electronico);
  const gruposEfectivo = calcularAsignacionFondos(GRUPOS_EFECTIVO, ingresos.efectivo);

  return (
    <div className="rounded-2xl bg-surface p-6" style={MARCO_FOSFORESCENTE}>
      <div className="mb-1 flex items-center gap-2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: "#ff8c00", boxShadow: "0 0 8px #ff8c00" }}
        />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink">Fondos · Regla de Sobres</h2>
      </div>
      <p className="mb-5 text-xs text-ink/40">
        Reparto fijo de {rango.label.toLowerCase()} entre fondos, según cómo pagó el paciente.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CanalFondos
          nombre="Electrónico"
          ingresoCanal={ingresos.electronico}
          grupos={gruposElectronico}
          oculto={oculto}
          rangoLabel={rango.label}
        />
        <CanalFondos
          nombre="Efectivo"
          ingresoCanal={ingresos.efectivo}
          grupos={gruposEfectivo}
          oculto={oculto}
          rangoLabel={rango.label}
        />
      </div>
    </div>
  );
}
