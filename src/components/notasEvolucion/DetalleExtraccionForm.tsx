"use client";

import { inputClass, labelClass } from "./NotaUI";
import CamposComunesProcedimiento from "./CamposComunesProcedimiento";
import type { NotaEvolucionV2 } from "@/lib/notasEvolucion";
import type { DetalleExtraccion } from "@/lib/procedimientoNotaPlantillas";

export default function DetalleExtraccionForm({
  detalle,
  onChange,
  onBlurTexto,
}: {
  detalle: DetalleExtraccion;
  onChange: (updater: (prev: NotaEvolucionV2) => NotaEvolucionV2, opts?: { inmediato?: boolean }) => void;
  onBlurTexto?: () => void;
}) {
  function set<K extends keyof DetalleExtraccion>(key: K, value: DetalleExtraccion[K]) {
    onChange((prev) => ({ ...prev, detalleProcedimiento: { ...detalle, [key]: value } }));
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Tipo de extracción</label>
        <select className={inputClass} value={detalle.tipoExtraccion ?? ""} onChange={(e) => set("tipoExtraccion", (e.target.value || undefined) as DetalleExtraccion["tipoExtraccion"])}>
          <option value="">Sin confirmar</option>
          <option value="simple">Simple</option>
          <option value="quirurgica">Quirúrgica</option>
        </select>
        {!detalle.tipoExtraccion && <p className="mt-1 text-xs text-warning">Confirma el tipo antes de firmar.</p>}
      </div>
      <div>
        <label className={labelClass}>Indicación (opcional)</label>
        <input className={inputClass} value={detalle.indicacion ?? ""} onChange={(e) => set("indicacion", e.target.value)} />
      </div>

      <CamposComunesProcedimiento detalle={detalle} set={set} onBlurTexto={onBlurTexto} />

      <div>
        <label className={labelClass}>Técnica de extracción (opcional)</label>
        <input className={inputClass} value={detalle.tecnicaExtraccion ?? ""} onChange={(e) => set("tecnicaExtraccion", e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Integridad del órgano extraído (opcional)</label>
          <input className={inputClass} value={detalle.integridadOrganoExtraido ?? ""} onChange={(e) => set("integridadOrganoExtraido", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Revisión del alveolo (opcional)</label>
          <input className={inputClass} value={detalle.revisionAlveolo ?? ""} onChange={(e) => set("revisionAlveolo", e.target.value)} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Hemostasia (opcional)</label>
        <input className={inputClass} value={detalle.hemostasia ?? ""} onChange={(e) => set("hemostasia", e.target.value)} />
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={detalle.sutura?.requerida ?? false}
            onChange={(e) => set("sutura", { requerida: e.target.checked, material: detalle.sutura?.material })}
          />
          Se requirió sutura
        </label>
        {detalle.sutura?.requerida && (
          <input
            className={`${inputClass} mt-2`}
            placeholder="Material de sutura"
            value={detalle.sutura?.material ?? ""}
            onChange={(e) => set("sutura", { requerida: true, material: e.target.value })}
          />
        )}
      </div>
    </div>
  );
}
