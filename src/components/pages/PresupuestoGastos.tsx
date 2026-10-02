"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import {
  clasificacionGastoOptions,
  gastoCategoriaOptions,
  modoPresupuestoOptions,
  type ClasificacionGasto,
  type GastoCategoria,
  type ModoPresupuesto,
  type PresupuestoCategoria,
} from "@/lib/gastos";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

export default function PresupuestoGastos() {
  const { miRol, presupuestoGastos, setPresupuestoGastos } = usePatientData();
  const [filas, setFilas] = useState<Record<GastoCategoria, PresupuestoCategoria>>(presupuestoGastos.porCategoria);
  const [guardado, setGuardado] = useState(false);

  if (miRol !== "admin") {
    return (
      <div className="rounded-2xl border border-edge/10 bg-surface p-10 text-center text-sm text-ink/50">
        Solo el dueño de la clínica puede configurar el presupuesto de gastos.
      </div>
    );
  }

  function actualizarFila(categoria: GastoCategoria, cambios: Partial<PresupuestoCategoria>) {
    setFilas((prev) => ({ ...prev, [categoria]: { ...prev[categoria], ...cambios } }));
    setGuardado(false);
  }

  const guardar = () => {
    setPresupuestoGastos({ porCategoria: filas });
    setGuardado(true);
  };

  return (
    <div className="max-w-3xl space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Presupuesto de Gastos</h3>
      <p className="text-xs text-ink/40">
        Para cada categoría, define si es un gasto fijo o variable, y cuánto se puede gastar al mes — como
        porcentaje de tus ingresos (ej. Renta) o como un monto fijo en pesos (ej. Insumos). En Gastos verás cuánto
        llevas de cada sobre.
      </p>

      <div className="space-y-3">
        {gastoCategoriaOptions.map((categoria) => {
          const fila = filas[categoria];
          return (
            <div
              key={categoria}
              className="grid grid-cols-1 items-center gap-2 rounded-lg border border-edge/10 bg-inset p-3 sm:grid-cols-[1fr_auto_auto_auto]"
            >
              <span className="text-sm font-medium text-ink">{categoria}</span>
              <select
                value={fila.clasificacion}
                onChange={(e) => actualizarFila(categoria, { clasificacion: e.target.value as ClasificacionGasto })}
                className={inputClass}
              >
                {clasificacionGastoOptions.map((c) => (
                  <option key={c} value={c}>
                    {c === "fijo" ? "Fijo" : "Variable"}
                  </option>
                ))}
              </select>
              <select
                value={fila.modo}
                onChange={(e) => actualizarFila(categoria, { modo: e.target.value as ModoPresupuesto })}
                className={inputClass}
              >
                {modoPresupuestoOptions.map((m) => (
                  <option key={m} value={m}>
                    {m === "porcentaje" ? "% del ingreso" : "Monto fijo ($)"}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                value={fila.valor || ""}
                onChange={(e) => actualizarFila(categoria, { valor: Number(e.target.value) })}
                placeholder={fila.modo === "porcentaje" ? "Ej. 5" : "Ej. 3000"}
                className={inputClass}
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={guardar}
          className="rounded-lg border border-accent/60 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25"
        >
          Guardar Presupuesto
        </button>
        {guardado && <span className="text-sm text-success">Presupuesto guardado</span>}
      </div>
    </div>
  );
}
