"use client";

import { inputClass, labelClass } from "./NotaUI";
import CamposComunesProcedimiento from "./CamposComunesProcedimiento";
import type { NotaEvolucionV2 } from "@/lib/notasEvolucion";
import {
  nivelManejoConductaLabel,
  nivelesManejoConducta,
  type DetalleOdontopediatria,
} from "@/lib/procedimientoNotaPlantillas";

export default function DetalleOdontopediatriaForm({
  detalle,
  onChange,
  onBlurTexto,
}: {
  detalle: DetalleOdontopediatria;
  onChange: (updater: (prev: NotaEvolucionV2) => NotaEvolucionV2, opts?: { inmediato?: boolean }) => void;
  onBlurTexto?: () => void;
}) {
  function set<K extends keyof DetalleOdontopediatria>(key: K, value: DetalleOdontopediatria[K]) {
    onChange((prev) => ({ ...prev, detalleProcedimiento: { ...detalle, [key]: value } }));
  }

  function setTerapiaPulpar<K extends keyof NonNullable<DetalleOdontopediatria["terapiaPulpar"]>>(
    campo: K,
    valor: NonNullable<DetalleOdontopediatria["terapiaPulpar"]>[K]
  ) {
    const actual = detalle.terapiaPulpar ?? { requerida: false };
    set("terapiaPulpar", { ...actual, [campo]: valor });
  }

  function setCorona<K extends keyof NonNullable<DetalleOdontopediatria["coronaNiquelCromo"]>>(
    campo: K,
    valor: NonNullable<DetalleOdontopediatria["coronaNiquelCromo"]>[K]
  ) {
    const actual = detalle.coronaNiquelCromo ?? { colocada: false };
    set("coronaNiquelCromo", { ...actual, [campo]: valor });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Manejo de conducta</label>
        <select
          className={inputClass}
          value={detalle.manejoConducta ?? ""}
          onChange={(e) => set("manejoConducta", (e.target.value || undefined) as DetalleOdontopediatria["manejoConducta"])}
        >
          <option value="">Sin confirmar</option>
          {nivelesManejoConducta.map((n) => (
            <option key={n} value={n}>
              {nivelManejoConductaLabel[n]}
            </option>
          ))}
        </select>
        {!detalle.manejoConducta && <p className="mt-1 text-xs text-warning">Confirma el manejo de conducta antes de firmar.</p>}
      </div>
      <div>
        <label className={labelClass}>Técnica de manejo de conducta (opcional)</label>
        <input
          className={inputClass}
          value={detalle.tecnicaManejoConducta ?? ""}
          onChange={(e) => set("tecnicaManejoConducta", e.target.value)}
          placeholder="Ej. Decir-mostrar-hacer, distracción, control de voz"
        />
      </div>

      <CamposComunesProcedimiento detalle={detalle} set={set} onBlurTexto={onBlurTexto} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Acompañante (opcional)</label>
          <input className={inputClass} value={detalle.acompanante ?? ""} onChange={(e) => set("acompanante", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Dentición (opcional)</label>
          <select className={inputClass} value={detalle.denticion ?? ""} onChange={(e) => set("denticion", (e.target.value || undefined) as DetalleOdontopediatria["denticion"])}>
            <option value="">Sin especificar</option>
            <option value="temporal">Temporal</option>
            <option value="mixta">Mixta</option>
            <option value="permanente">Permanente</option>
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass}>Indicaciones / consentimiento (opcional)</label>
        <textarea className={inputClass} rows={2} value={detalle.indicacionesConsentimiento ?? ""} onChange={(e) => set("indicacionesConsentimiento", e.target.value)} onBlur={onBlurTexto} />
      </div>
      <div>
        <label className={labelClass}>Piezas en erupción (opcional)</label>
        <input className={inputClass} value={detalle.piezasEnErupcion ?? ""} onChange={(e) => set("piezasEnErupcion", e.target.value)} />
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={detalle.terapiaPulpar?.requerida ?? false} onChange={(e) => setTerapiaPulpar("requerida", e.target.checked)} />
          Se requirió terapia pulpar
        </label>
        {detalle.terapiaPulpar?.requerida && (
          <input
            className={`${inputClass} mt-2`}
            placeholder="Tipo (ej. pulpotomía, pulpectomía)"
            value={detalle.terapiaPulpar?.tipo ?? ""}
            onChange={(e) => setTerapiaPulpar("tipo", e.target.value)}
          />
        )}
      </div>
      <div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={detalle.coronaNiquelCromo?.colocada ?? false} onChange={(e) => setCorona("colocada", e.target.checked)} />
          Se colocó corona de acero (níquel-cromo)
        </label>
        {detalle.coronaNiquelCromo?.colocada && (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input className={inputClass} placeholder="Órgano dental" value={detalle.coronaNiquelCromo?.numero ?? ""} onChange={(e) => setCorona("numero", e.target.value)} />
            <input className={inputClass} placeholder="Ajustes (opcional)" value={detalle.coronaNiquelCromo?.ajustes ?? ""} onChange={(e) => setCorona("ajustes", e.target.value)} />
          </div>
        )}
      </div>
    </div>
  );
}
