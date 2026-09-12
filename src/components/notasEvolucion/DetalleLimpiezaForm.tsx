"use client";

import { Chip, inputClass, labelClass } from "./NotaUI";
import CamposComunesProcedimiento from "./CamposComunesProcedimiento";
import type { NotaEvolucionV2 } from "@/lib/notasEvolucion";
import type { DetalleLimpieza } from "@/lib/procedimientoNotaPlantillas";

const metodosDisponibles: { valor: "ultrasonido" | "manual"; label: string }[] = [
  { valor: "ultrasonido", label: "Ultrasonido" },
  { valor: "manual", label: "Instrumentación manual" },
];

export default function DetalleLimpiezaForm({
  detalle,
  onChange,
  onBlurTexto,
}: {
  detalle: DetalleLimpieza;
  onChange: (updater: (prev: NotaEvolucionV2) => NotaEvolucionV2, opts?: { inmediato?: boolean }) => void;
  onBlurTexto?: () => void;
}) {
  function set<K extends keyof DetalleLimpieza>(key: K, value: DetalleLimpieza[K]) {
    onChange((prev) => ({ ...prev, detalleProcedimiento: { ...detalle, [key]: value } }));
  }

  function toggleMetodo(valor: "ultrasonido" | "manual") {
    const actuales = detalle.metodoUsado ?? [];
    set("metodoUsado", actuales.includes(valor) ? actuales.filter((m) => m !== valor) : [...actuales, valor]);
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Estado de higiene (opcional)</label>
          <input className={inputClass} value={detalle.estadoHigiene ?? ""} onChange={(e) => set("estadoHigiene", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>% Placa (opcional)</label>
          <input className={inputClass} value={detalle.porcentajePlaca ?? ""} onChange={(e) => set("porcentajePlaca", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>% Cálculo (opcional)</label>
          <input className={inputClass} value={detalle.porcentajeCalculo ?? ""} onChange={(e) => set("porcentajeCalculo", e.target.value)} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Sangrado (opcional)</label>
        <input className={inputClass} value={detalle.sangrado ?? ""} onChange={(e) => set("sangrado", e.target.value)} />
      </div>

      <CamposComunesProcedimiento detalle={detalle} set={set} onBlurTexto={onBlurTexto} />

      <div>
        <label className={labelClass}>Método usado (opcional)</label>
        <div className="flex flex-wrap gap-2">
          {metodosDisponibles.map((m) => (
            <Chip key={m.valor} seleccionado={(detalle.metodoUsado ?? []).includes(m.valor)} onClick={() => toggleMetodo(m.valor)}>
              {m.label}
            </Chip>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={detalle.pulido ?? false} onChange={(e) => set("pulido", e.target.checked)} />
        Se realizó pulido
      </label>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={detalle.fluorAplicado ?? false} onChange={(e) => set("fluorAplicado", e.target.checked)} />
        Se aplicó flúor
      </label>
      <div>
        <label className={labelClass}>Educación en higiene (opcional)</label>
        <textarea className={inputClass} rows={2} value={detalle.educacionHigiene ?? ""} onChange={(e) => set("educacionHigiene", e.target.value)} onBlur={onBlurTexto} />
      </div>
      <div>
        <label className={labelClass}>Recomendaciones (opcional)</label>
        <textarea className={inputClass} rows={2} value={detalle.recomendaciones ?? ""} onChange={(e) => set("recomendaciones", e.target.value)} onBlur={onBlurTexto} />
      </div>
    </div>
  );
}
