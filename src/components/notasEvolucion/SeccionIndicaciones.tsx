"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { botonPrimario, botonSecundario, inputClass, labelClass } from "./NotaUI";
import type { IndicacionesSiguientePaso, MedicamentoNota, NotaEvolucionV2, Pronostico } from "@/lib/notasEvolucion";

const pronosticoOpciones: { valor: Pronostico; etiqueta: string }[] = [
  { valor: "favorable", etiqueta: "Favorable" },
  { valor: "reservado", etiqueta: "Reservado" },
  { valor: "desfavorable", etiqueta: "Desfavorable" },
];

function medicamentoVacio(): MedicamentoNota {
  return { id: `med${Date.now()}${Math.random().toString(36).slice(2, 6)}`, principioActivo: "", dosis: "", via: "", frecuencia: "" };
}

/** Sección 6 — "Indicaciones y siguiente paso". Receta vinculada y próxima
 * cita quedan aquí como referencia simple (id/fecha) en la Fase 1 — la
 * integración de "crear sin salir del flujo" con Recetas/Agenda llega en la
 * Fase 4, sobre esta misma base. */
export default function SeccionIndicaciones({
  valor,
  onChange,
  onBlurTexto,
}: {
  valor: IndicacionesSiguientePaso | undefined;
  onChange: (updater: (prev: NotaEvolucionV2) => NotaEvolucionV2, opts?: { inmediato?: boolean }) => void;
  onBlurTexto?: () => void;
}) {
  const { catalogoMedicamentos } = usePatientData();
  const actual: IndicacionesSiguientePaso = valor ?? { medicamentos: [] };

  function set<K extends keyof IndicacionesSiguientePaso>(key: K, v: IndicacionesSiguientePaso[K], opts?: { inmediato?: boolean }) {
    onChange((prev) => ({ ...prev, indicaciones: { ...actual, [key]: v } }), opts);
  }

  // Medicamento es uno de los campos críticos explícitos del plan (§7.2.1)
  // — se persiste de inmediato en TODOS sus subcampos, incluidos los de
  // texto corto (dosis/vía/frecuencia): el riesgo clínico de perder un dato
  // de medicación justifica la excepción a "texto → debounce".
  function agregarMedicamento() {
    set("medicamentos", [...actual.medicamentos, medicamentoVacio()], { inmediato: true });
  }

  function actualizarMedicamento(id: string, cambios: Partial<MedicamentoNota>) {
    set(
      "medicamentos",
      actual.medicamentos.map((m) => (m.id === id ? { ...m, ...cambios } : m)),
      { inmediato: true }
    );
  }

  function quitarMedicamento(id: string) {
    set("medicamentos", actual.medicamentos.filter((m) => m.id !== id), { inmediato: true });
  }

  function elegirDelCatalogo(id: string, medicamentoCatalogoId: string) {
    const cat = catalogoMedicamentos.find((c) => c.id === medicamentoCatalogoId);
    if (!cat) return actualizarMedicamento(id, { medicamentoCatalogoId: "" });
    actualizarMedicamento(id, {
      medicamentoCatalogoId,
      principioActivo: cat.principioActivo || cat.nombre,
      presentacion: cat.presentacion,
      dosis: cat.dosisFrecuencia ?? "",
      frecuencia: cat.dosisFrecuencia ?? "",
      duracion: cat.periodo,
      advertenciasOEfectosAdversos: cat.advertenciasOEfectosAdversos,
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Indicaciones posoperatorias</label>
        <textarea className={inputClass} rows={2} value={actual.indicacionesPosoperatorias ?? ""} onChange={(e) => set("indicacionesPosoperatorias", e.target.value)} onBlur={onBlurTexto} />
        <label className="mt-1.5 flex items-center gap-2 text-xs text-ink/60">
          <input
            type="checkbox"
            checked={!!actual.indicacionesNoNecesarias}
            onChange={(e) => set("indicacionesNoNecesarias", e.target.checked, { inmediato: true })}
          />
          No fueron necesarias indicaciones adicionales
        </label>
      </div>

      <div>
        <label className={labelClass}>Signos de alarma explicados (opcional)</label>
        <textarea className={inputClass} rows={2} value={actual.signosAlarmaExplicados ?? ""} onChange={(e) => set("signosAlarmaExplicados", e.target.value)} onBlur={onBlurTexto} />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className={labelClass}>Medicamentos</label>
          <button type="button" onClick={agregarMedicamento} className="text-xs font-semibold text-accent hover:underline">
            + Agregar medicamento
          </button>
        </div>
        <div className="space-y-3">
          {actual.medicamentos.map((m) => (
            <div key={m.id} className="rounded-lg border border-edge/10 bg-field p-3">
              <div className="mb-2 flex items-center justify-between">
                <select className={`${inputClass} w-auto`} value={m.medicamentoCatalogoId ?? ""} onChange={(e) => elegirDelCatalogo(m.id, e.target.value)}>
                  <option value="">Elegir del catálogo…</option>
                  {catalogoMedicamentos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => quitarMedicamento(m.id)} className="text-xs text-ink/40 hover:text-danger">
                  Quitar
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <input className={inputClass} placeholder="Principio activo" value={m.principioActivo} onChange={(e) => actualizarMedicamento(m.id, { principioActivo: e.target.value })} />
                <input className={inputClass} placeholder="Presentación" value={m.presentacion ?? ""} onChange={(e) => actualizarMedicamento(m.id, { presentacion: e.target.value })} />
                <input className={inputClass} placeholder="Dosis" value={m.dosis} onChange={(e) => actualizarMedicamento(m.id, { dosis: e.target.value })} />
                <input className={inputClass} placeholder="Vía" value={m.via} onChange={(e) => actualizarMedicamento(m.id, { via: e.target.value })} />
                <input className={inputClass} placeholder="Frecuencia" value={m.frecuencia} onChange={(e) => actualizarMedicamento(m.id, { frecuencia: e.target.value })} />
                <input className={inputClass} placeholder="Duración" value={m.duracion ?? ""} onChange={(e) => actualizarMedicamento(m.id, { duracion: e.target.value })} />
                <input className={`${inputClass} col-span-2`} placeholder="Advertencias / efectos adversos" value={m.advertenciasOEfectosAdversos ?? ""} onChange={(e) => actualizarMedicamento(m.id, { advertenciasOEfectosAdversos: e.target.value })} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>Pronóstico</label>
        <div className="flex gap-2">
          {pronosticoOpciones.map((p) => (
            <button
              key={p.valor}
              type="button"
              onClick={() => set("pronostico", p.valor, { inmediato: true })}
              className={actual.pronostico === p.valor ? botonPrimario : botonSecundario}
            >
              {p.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Tratamiento pendiente (opcional)</label>
          <input className={inputClass} value={actual.tratamientoPendiente ?? ""} onChange={(e) => set("tratamientoPendiente", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Próximo procedimiento (opcional)</label>
          <input className={inputClass} value={actual.proximoProcedimiento ?? ""} onChange={(e) => set("proximoProcedimiento", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Fecha sugerida próxima cita (opcional)</label>
          <input type="date" className={inputClass} value={actual.fechaSugeridaProximaCita ?? ""} onChange={(e) => set("fechaSugeridaProximaCita", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Receta vinculada — folio (opcional)</label>
          <input className={inputClass} value={actual.recetaVinculadaId ?? ""} onChange={(e) => set("recetaVinculadaId", e.target.value)} />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink/70">
        <input type="checkbox" checked={!!actual.necesitaInterconsulta} onChange={(e) => set("necesitaInterconsulta", e.target.checked, { inmediato: true })} />
        Necesita interconsulta o referencia
      </label>
      {actual.necesitaInterconsulta && (
        <input
          className={inputClass}
          placeholder="Detalle de la interconsulta"
          value={actual.interconsultaDetalle ?? ""}
          onChange={(e) => set("interconsultaDetalle", e.target.value)}
        />
      )}
    </div>
  );
}
