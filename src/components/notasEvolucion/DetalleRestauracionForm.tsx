"use client";

import { Chip, inputClass, labelClass } from "./NotaUI";
import CamposComunesProcedimiento from "./CamposComunesProcedimiento";
import type { NotaEvolucionV2 } from "@/lib/notasEvolucion";
import type { DetalleRestauracion } from "@/lib/procedimientoNotaPlantillas";

const superficiesDisponibles = ["Mesial", "Distal", "Oclusal", "Vestibular", "Lingual/Palatina", "Incisal"];

export default function DetalleRestauracionForm({
  detalle,
  onChange,
  onBlurTexto,
}: {
  detalle: DetalleRestauracion;
  onChange: (updater: (prev: NotaEvolucionV2) => NotaEvolucionV2, opts?: { inmediato?: boolean }) => void;
  onBlurTexto?: () => void;
}) {
  function set<K extends keyof DetalleRestauracion>(key: K, value: DetalleRestauracion[K]) {
    onChange((prev) => ({ ...prev, detalleProcedimiento: { ...detalle, [key]: value } }));
  }

  function toggleSuperficie(superficie: string) {
    const actuales = detalle.superficiesTratadas ?? [];
    set(
      "superficiesTratadas",
      actuales.includes(superficie) ? actuales.filter((s) => s !== superficie) : [...actuales, superficie]
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Superficies tratadas (opcional)</label>
        <div className="flex flex-wrap gap-2">
          {superficiesDisponibles.map((s) => (
            <Chip key={s} seleccionado={(detalle.superficiesTratadas ?? []).includes(s)} onClick={() => toggleSuperficie(s)}>
              {s}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <label className={labelClass}>Diagnóstico asociado (opcional)</label>
        <input className={inputClass} value={detalle.diagnosticoAsociado ?? ""} onChange={(e) => set("diagnosticoAsociado", e.target.value)} />
      </div>

      <CamposComunesProcedimiento detalle={detalle} set={set} onBlurTexto={onBlurTexto} />

      <div>
        <label className={labelClass}>Tipo de aislamiento (opcional)</label>
        <input className={inputClass} value={detalle.aislamientoTipo ?? ""} onChange={(e) => set("aislamientoTipo", e.target.value)} placeholder="Ej. Dique de hule" />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={detalle.eliminacionTejidoCariado ?? false} onChange={(e) => set("eliminacionTejidoCariado", e.target.checked)} />
        Se eliminó tejido cariado
      </label>
      <div>
        <label className={labelClass}>Protección pulpar (opcional)</label>
        <input className={inputClass} value={detalle.proteccionPulpar ?? ""} onChange={(e) => set("proteccionPulpar", e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Sistema adhesivo (opcional)</label>
          <input className={inputClass} value={detalle.sistemaAdhesivo ?? ""} onChange={(e) => set("sistemaAdhesivo", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Material restaurador (opcional)</label>
          <div className="flex gap-2">
            <input className={inputClass} value={detalle.materialRestaurador ?? ""} onChange={(e) => set("materialRestaurador", e.target.value)} />
            <input className={inputClass} placeholder="Color" value={detalle.color ?? ""} onChange={(e) => set("color", e.target.value)} />
          </div>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={detalle.verificacionContactoOclusion ?? false} onChange={(e) => set("verificacionContactoOclusion", e.target.checked)} />
        Se verificó contacto y oclusión
      </label>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={detalle.acabadoPulido ?? false} onChange={(e) => set("acabadoPulido", e.target.checked)} />
        Se realizó acabado y pulido
      </label>
    </div>
  );
}
