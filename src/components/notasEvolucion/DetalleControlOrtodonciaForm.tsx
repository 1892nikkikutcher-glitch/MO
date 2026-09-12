"use client";

import { inputClass, labelClass } from "./NotaUI";
import CamposComunesProcedimiento from "./CamposComunesProcedimiento";
import type { NotaEvolucionV2 } from "@/lib/notasEvolucion";
import type { DetalleControlOrtodoncia } from "@/lib/procedimientoNotaPlantillas";

export default function DetalleControlOrtodonciaForm({
  detalle,
  onChange,
  onBlurTexto,
}: {
  detalle: DetalleControlOrtodoncia;
  onChange: (updater: (prev: NotaEvolucionV2) => NotaEvolucionV2, opts?: { inmediato?: boolean }) => void;
  onBlurTexto?: () => void;
}) {
  function set<K extends keyof DetalleControlOrtodoncia>(key: K, value: DetalleControlOrtodoncia[K]) {
    onChange((prev) => ({ ...prev, detalleProcedimiento: { ...detalle, [key]: value } }));
  }

  function setArco<K extends keyof NonNullable<DetalleControlOrtodoncia["arco"]>>(
    campo: K,
    valor: NonNullable<DetalleControlOrtodoncia["arco"]>[K]
  ) {
    const actual = detalle.arco ?? { retirado: false, colocado: false };
    set("arco", { ...actual, [campo]: valor });
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Aparatología presente (opcional)</label>
          <input className={inputClass} value={detalle.aparatologiaPresente ?? ""} onChange={(e) => set("aparatologiaPresente", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Higiene (opcional)</label>
          <input className={inputClass} value={detalle.higiene ?? ""} onChange={(e) => set("higiene", e.target.value)} />
        </div>
      </div>
      <div>
        <label className={labelClass}>Brackets despegados (opcional)</label>
        <input className={inputClass} value={detalle.bracketsDespegados ?? ""} onChange={(e) => set("bracketsDespegados", e.target.value)} />
      </div>

      <CamposComunesProcedimiento detalle={detalle} set={set} onBlurTexto={onBlurTexto} />

      <div>
        <label className={labelClass}>Arco (opcional)</label>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={detalle.arco?.retirado ?? false} onChange={(e) => setArco("retirado", e.target.checked)} />
            Retirado
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" checked={detalle.arco?.colocado ?? false} onChange={(e) => setArco("colocado", e.target.checked)} />
            Colocado
          </label>
        </div>
        {(detalle.arco?.retirado || detalle.arco?.colocado) && (
          <input
            className={`${inputClass} mt-2`}
            placeholder="Detalle del arco (ej. calibre, material)"
            value={detalle.arco?.detalle ?? ""}
            onChange={(e) => setArco("detalle", e.target.value)}
          />
        )}
      </div>
      <div>
        <label className={labelClass}>Ligaduras/elásticos/accesorios (opcional)</label>
        <input className={inputClass} value={detalle.ligadurasElasticosAccesorios ?? ""} onChange={(e) => set("ligadurasElasticosAccesorios", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Activaciones (opcional)</label>
        <textarea className={inputClass} rows={2} value={detalle.activaciones ?? ""} onChange={(e) => set("activaciones", e.target.value)} onBlur={onBlurTexto} />
      </div>
      <div>
        <label className={labelClass}>Cooperación del paciente (opcional)</label>
        <input className={inputClass} value={detalle.cooperacion ?? ""} onChange={(e) => set("cooperacion", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Indicaciones (opcional)</label>
        <textarea className={inputClass} rows={2} value={detalle.indicaciones ?? ""} onChange={(e) => set("indicaciones", e.target.value)} onBlur={onBlurTexto} />
      </div>
    </div>
  );
}
