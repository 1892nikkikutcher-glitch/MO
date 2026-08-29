"use client";

import { Chip, botonSecundario, inputClass, labelClass } from "./NotaUI";
import type { NotaEvolucionV2 } from "@/lib/notasEvolucion";
import type { DetalleGenerico, DetalleProcedimiento } from "@/lib/procedimientoNotaPlantillas";

/** Sección 4 — "¿Qué hiciste hoy?", en modo genérico (Fase 1): captura los
 * campos comunes a cualquier procedimiento. Las plantillas específicas por
 * tipo (endodoncia/extracción/resina/limpieza/ortodoncia) — con su propio
 * revelado progresivo — llegan en la Fase 3, sobre esta misma base. */
export default function SeccionProcedimiento({
  detalle,
  justificacionSinProcedimiento,
  tratamientosSugeridos,
  organosPorDefecto,
  onChange,
  onBlurTexto,
}: {
  detalle: DetalleProcedimiento | undefined;
  justificacionSinProcedimiento: string | undefined;
  tratamientosSugeridos: string[];
  organosPorDefecto: number[];
  onChange: (updater: (prev: NotaEvolucionV2) => NotaEvolucionV2, opts?: { inmediato?: boolean }) => void;
  onBlurTexto?: () => void;
}) {
  // Iniciar/quitar un procedimiento es una decisión estructural (§7.2.1) —
  // se persiste de inmediato.
  function iniciar(nombre?: string) {
    onChange((prev) => ({
      ...prev,
      justificacionSinProcedimiento: undefined,
      detalleProcedimiento: {
        tipo: "otro",
        procedimientoNombre: nombre ?? "",
        actividadRealizada: nombre ?? "",
        organosDentales: organosPorDefecto,
      } satisfies DetalleGenerico,
    }), { inmediato: true });
  }

  function set<K extends keyof DetalleGenerico>(key: K, value: DetalleGenerico[K]) {
    if (!detalle) return;
    onChange((prev) => ({ ...prev, detalleProcedimiento: { ...(detalle as DetalleGenerico), [key]: value } }));
  }

  function setAnestesico(campo: "nombre" | "concentracion" | "cantidad" | "via", valor: string) {
    if (!detalle) return;
    const actual = detalle.anestesico ?? { nombre: "", concentracion: "", cantidad: "", via: "" };
    set("anestesico", { ...actual, [campo]: valor });
  }

  function marcarSinProcedimiento() {
    onChange((prev) => ({ ...prev, detalleProcedimiento: undefined, justificacionSinProcedimiento: prev.justificacionSinProcedimiento ?? "" }), { inmediato: true });
  }

  if (!detalle) {
    return (
      <div className="space-y-3">
        {tratamientosSugeridos.length > 0 && (
          <div>
            <label className={labelClass}>Tratamiento agendado — reutilizar (puedes modificarlo después)</label>
            <div className="flex flex-wrap gap-2">
              {tratamientosSugeridos.map((t) => (
                <Chip key={t} seleccionado={false} onClick={() => iniciar(t)}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>
        )}
        <button type="button" onClick={() => iniciar()} className={botonSecundario}>
          + Registrar procedimiento realizado
        </button>
        <div>
          <label className={labelClass}>O explica por qué no se realizó ningún procedimiento hoy</label>
          <input
            className={inputClass}
            value={justificacionSinProcedimiento ?? ""}
            onChange={(e) => onChange((prev) => ({ ...prev, justificacionSinProcedimiento: e.target.value }))}
            placeholder="Ej. Solo valoración, sin tratamiento en esta cita"
          />
        </div>
      </div>
    );
  }

  const generico = detalle as DetalleGenerico;

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Procedimiento</label>
        <input className={inputClass} value={generico.procedimientoNombre} onChange={(e) => set("procedimientoNombre", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Qué hiciste hoy (actividad realizada)</label>
        <input className={inputClass} value={generico.actividadRealizada} onChange={(e) => set("actividadRealizada", e.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Técnica (opcional)</label>
          <input className={inputClass} value={generico.tecnica ?? ""} onChange={(e) => set("tecnica", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Aislamiento (opcional)</label>
          <input className={inputClass} value={generico.aislamiento ?? ""} onChange={(e) => set("aislamiento", e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Anestésico (opcional)</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input className={inputClass} placeholder="Nombre" value={generico.anestesico?.nombre ?? ""} onChange={(e) => setAnestesico("nombre", e.target.value)} />
          <input className={inputClass} placeholder="Concentración" value={generico.anestesico?.concentracion ?? ""} onChange={(e) => setAnestesico("concentracion", e.target.value)} />
          <input className={inputClass} placeholder="Cantidad" value={generico.anestesico?.cantidad ?? ""} onChange={(e) => setAnestesico("cantidad", e.target.value)} />
          <input className={inputClass} placeholder="Vía" value={generico.anestesico?.via ?? ""} onChange={(e) => setAnestesico("via", e.target.value)} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Materiales (opcional)</label>
        <input className={inputClass} value={generico.materiales ?? ""} onChange={(e) => set("materiales", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Observaciones (opcional)</label>
        <textarea className={inputClass} rows={2} value={generico.observaciones ?? ""} onChange={(e) => set("observaciones", e.target.value)} onBlur={onBlurTexto} />
      </div>
      <div>
        <label className={labelClass}>Incidentes durante el procedimiento (opcional)</label>
        <input className={inputClass} value={generico.incidentes ?? ""} onChange={(e) => set("incidentes", e.target.value)} />
      </div>

      <button type="button" onClick={marcarSinProcedimiento} className="text-xs text-ink/40 hover:text-ink">
        Quitar procedimiento — no se realizó ninguno
      </button>
    </div>
  );
}
