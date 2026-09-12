"use client";

import { inputClass, labelClass } from "./NotaUI";
import type { DetalleProcedimientoBase } from "@/lib/procedimientoNotaPlantillas";

/** Campos compartidos por TODAS las plantillas de "¿Qué hiciste hoy?"
 * (`DetalleProcedimientoBase`) — única fuente de estos campos, para que
 * ningún formulario de especialidad los vuelva a definir por su cuenta. */
export default function CamposComunesProcedimiento<T extends DetalleProcedimientoBase>({
  detalle,
  set,
  onBlurTexto,
}: {
  detalle: T;
  set: <K extends keyof T>(key: K, value: T[K]) => void;
  onBlurTexto?: () => void;
}) {
  function setAnestesico(campo: "nombre" | "concentracion" | "cantidad" | "via", valor: string) {
    const actual = detalle.anestesico ?? { nombre: "", concentracion: "", cantidad: "", via: "" };
    set("anestesico", { ...actual, [campo]: valor });
  }

  return (
    <>
      <div>
        <label className={labelClass}>Procedimiento</label>
        <input className={inputClass} value={detalle.procedimientoNombre} onChange={(e) => set("procedimientoNombre", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Qué hiciste hoy (actividad realizada)</label>
        <input className={inputClass} value={detalle.actividadRealizada} onChange={(e) => set("actividadRealizada", e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Técnica (opcional)</label>
          <input className={inputClass} value={detalle.tecnica ?? ""} onChange={(e) => set("tecnica", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Aislamiento (opcional)</label>
          <input className={inputClass} value={detalle.aislamiento ?? ""} onChange={(e) => set("aislamiento", e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Anestésico (opcional)</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input className={inputClass} placeholder="Nombre" value={detalle.anestesico?.nombre ?? ""} onChange={(e) => setAnestesico("nombre", e.target.value)} />
          <input className={inputClass} placeholder="Concentración" value={detalle.anestesico?.concentracion ?? ""} onChange={(e) => setAnestesico("concentracion", e.target.value)} />
          <input className={inputClass} placeholder="Cantidad" value={detalle.anestesico?.cantidad ?? ""} onChange={(e) => setAnestesico("cantidad", e.target.value)} />
          <input className={inputClass} placeholder="Vía" value={detalle.anestesico?.via ?? ""} onChange={(e) => setAnestesico("via", e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Materiales (opcional)</label>
        <input className={inputClass} value={detalle.materiales ?? ""} onChange={(e) => set("materiales", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Observaciones (opcional)</label>
        <textarea className={inputClass} rows={2} value={detalle.observaciones ?? ""} onChange={(e) => set("observaciones", e.target.value)} onBlur={onBlurTexto} />
      </div>
      <div>
        <label className={labelClass}>Incidentes durante el procedimiento (opcional)</label>
        <input className={inputClass} value={detalle.incidentes ?? ""} onChange={(e) => set("incidentes", e.target.value)} />
      </div>
    </>
  );
}
