"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { usePrivacidad } from "@/context/PrivacidadContext";
import { formatCurrency } from "@/lib/patientData";
import {
  GRUPOS_EFECTIVO,
  GRUPOS_ELECTRONICO,
  calcularAsignacionFondos,
  navegarVistaFondos,
  rangoVistaFondos,
  sumarRangoPorFormaPago,
  type GrupoConMonto,
  type VistaFondos,
} from "@/lib/fondosFinancieros";

const OPCIONES_VISTA: { id: VistaFondos; label: string }[] = [
  { id: "dia", label: "Día" },
  { id: "semana", label: "Semana" },
  { id: "quincena1", label: "Quincena 1–15" },
  { id: "quincena2", label: "Quincena 16–fin" },
  { id: "mes", label: "Mes" },
];

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
 * canal entre fondos fijos, en pesos reales de la vista elegida (Quincena
 * 1/2 o Mes) — siempre relativo al mes actual, independiente del selector
 * de periodo general de Inicio.tsx (que no tiene noción de quincena). Los
 * porcentajes son fijos (definidos por el usuario), no editables desde
 * aquí todavía. */
export default function FondosFinancieros() {
  const { puedeVerFinanzas, finanzas } = usePatientData();
  const { oculto } = usePrivacidad();
  const [vista, setVista] = useState<VistaFondos>("mes");
  // Ancla independiente de "hoy": las flechas la mueven, pero
  // rangoVistaFondos sigue recibiendo la hora real por separado para saber
  // qué tanto de un periodo ya "pasó" (ver su comentario). Cambiar de tipo
  // de vista (Día/Semana/...) siempre vuelve al periodo actual de ese tipo
  // — mismo criterio que el selector de periodo del Dashboard Principal.
  const [ancla, setAncla] = useState<Date>(() => new Date());

  if (!puedeVerFinanzas) return null;

  const rangoActivo = rangoVistaFondos(vista, ancla);
  const ingresos = sumarRangoPorFormaPago(finanzas.porFechaYFormaPago, rangoActivo.desde, rangoActivo.hasta);

  const gruposElectronico = calcularAsignacionFondos(GRUPOS_ELECTRONICO, ingresos.electronico);
  const gruposEfectivo = calcularAsignacionFondos(GRUPOS_EFECTIVO, ingresos.efectivo);

  return (
    <div className="rounded-2xl bg-surface p-6" style={MARCO_FOSFORESCENTE}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: "#ff8c00", boxShadow: "0 0 8px #ff8c00" }}
          />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink">Fondos · Regla de Sobres</h2>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {OPCIONES_VISTA.map((op) => (
            <button
              key={op.id}
              onClick={() => {
                setVista(op.id);
                setAncla(new Date());
              }}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                vista === op.id
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-edge/10 bg-surface text-ink/50 hover:text-ink/80"
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-5 flex items-center gap-2">
        <button
          onClick={() => setAncla(new Date())}
          title="Volver a hoy"
          className="shrink-0 rounded-lg border border-edge/15 px-2.5 py-1 text-[11px] font-semibold text-ink/60 transition-colors hover:bg-surface hover:text-ink"
        >
          Hoy
        </button>
        <button
          onClick={() => setAncla((prev) => navegarVistaFondos(vista, prev, -1))}
          title="Periodo anterior"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-success/40 text-sm text-success transition-colors hover:bg-success/10"
          style={{ boxShadow: "0 0 12px -2px rgb(var(--success-rgb) / 0.5)" }}
        >
          ‹
        </button>
        <span className="min-w-0 flex-1 text-xs text-ink/40">
          Reparto fijo de {rangoActivo.label} entre fondos, según cómo pagó el paciente.
        </span>
        <button
          onClick={() => setAncla((prev) => navegarVistaFondos(vista, prev, 1))}
          title="Periodo siguiente"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-success/40 text-sm text-success transition-colors hover:bg-success/10"
          style={{ boxShadow: "0 0 12px -2px rgb(var(--success-rgb) / 0.5)" }}
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CanalFondos
          nombre="Electrónico"
          ingresoCanal={ingresos.electronico}
          grupos={gruposElectronico}
          oculto={oculto}
          rangoLabel={rangoActivo.label}
        />
        <CanalFondos
          nombre="Efectivo"
          ingresoCanal={ingresos.efectivo}
          grupos={gruposEfectivo}
          oculto={oculto}
          rangoLabel={rangoActivo.label}
        />
      </div>
    </div>
  );
}
