"use client";

import { inputClass, labelClass } from "./NotaUI";
import CamposComunesProcedimiento from "./CamposComunesProcedimiento";
import type { NotaEvolucionV2 } from "@/lib/notasEvolucion";
import {
  etapaEndodonciaLabel,
  etapasEndodoncia,
  type DetalleEndodoncia,
} from "@/lib/procedimientoNotaPlantillas";

export default function DetalleEndodonciaForm({
  detalle,
  onChange,
  onBlurTexto,
}: {
  detalle: DetalleEndodoncia;
  onChange: (updater: (prev: NotaEvolucionV2) => NotaEvolucionV2, opts?: { inmediato?: boolean }) => void;
  onBlurTexto?: () => void;
}) {
  function set<K extends keyof DetalleEndodoncia>(key: K, value: DetalleEndodoncia[K]) {
    onChange((prev) => ({ ...prev, detalleProcedimiento: { ...detalle, [key]: value } }));
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Etapa realizada</label>
        <select className={inputClass} value={detalle.etapaRealizada ?? ""} onChange={(e) => set("etapaRealizada", (e.target.value || undefined) as DetalleEndodoncia["etapaRealizada"])}>
          <option value="">Sin confirmar</option>
          {etapasEndodoncia.map((et) => (
            <option key={et} value={et}>
              {etapaEndodonciaLabel[et]}
            </option>
          ))}
        </select>
        {!detalle.etapaRealizada && <p className="mt-1 text-xs text-warning">Confirma la etapa antes de firmar.</p>}
      </div>

      <CamposComunesProcedimiento detalle={detalle} set={set} onBlurTexto={onBlurTexto} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Conductos localizados (opcional)</label>
          <input className={inputClass} value={detalle.conductosLocalizados ?? ""} onChange={(e) => set("conductosLocalizados", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Longitudes de trabajo (opcional)</label>
          <input className={inputClass} value={detalle.longitudesTrabajo ?? ""} onChange={(e) => set("longitudesTrabajo", e.target.value)} placeholder="Ej. MV 21mm, ML 20mm, D 20.5mm" />
        </div>
      </div>
      <div>
        <label className={labelClass}>Técnica de instrumentación (opcional)</label>
        <input className={inputClass} value={detalle.tecnicaInstrumentacion ?? ""} onChange={(e) => set("tecnicaInstrumentacion", e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Irrigantes (opcional)</label>
          <input className={inputClass} value={detalle.irrigantes ?? ""} onChange={(e) => set("irrigantes", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Medicación intraconducto (opcional)</label>
          <input className={inputClass} value={detalle.medicacionIntraconducto ?? ""} onChange={(e) => set("medicacionIntraconducto", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Técnica/material de obturación (opcional)</label>
          <div className="flex gap-2">
            <input className={inputClass} placeholder="Técnica" value={detalle.tecnicaObturacion ?? ""} onChange={(e) => set("tecnicaObturacion", e.target.value)} />
            <input className={inputClass} placeholder="Material" value={detalle.materialObturacion ?? ""} onChange={(e) => set("materialObturacion", e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Restauración (opcional)</label>
          <select className={inputClass} value={detalle.restauracionTemporalODefinitiva ?? ""} onChange={(e) => set("restauracionTemporalODefinitiva", (e.target.value || undefined) as DetalleEndodoncia["restauracionTemporalODefinitiva"])}>
            <option value="">Sin especificar</option>
            <option value="temporal">Temporal</option>
            <option value="definitiva">Definitiva</option>
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Control radiográfico (opcional)</label>
        <input className={inputClass} value={detalle.controlRadiografico ?? ""} onChange={(e) => set("controlRadiografico", e.target.value)} />
      </div>
    </div>
  );
}
