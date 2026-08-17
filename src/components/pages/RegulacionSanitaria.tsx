"use client";

import { usePatientData } from "@/context/PatientDataContext";
import {
  categoriasRegulacion,
  checklistRegulacionSanitaria,
  type EstadoPuntoRegulacion,
} from "@/lib/regulacionSanitaria";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent/60";

export default function RegulacionSanitaria() {
  const { regulacionSanitaria, setRegulacionSanitaria } = usePatientData();

  const actualizarPunto = (id: string, cambios: Partial<EstadoPuntoRegulacion>) => {
    setRegulacionSanitaria((prev) => {
      const actual: EstadoPuntoRegulacion = prev[id] ?? { cumple: false };
      return { ...prev, [id]: { ...actual, ...cambios } };
    });
  };

  const totalPuntos = checklistRegulacionSanitaria.length;
  const cumplidos = checklistRegulacionSanitaria.filter((p) => regulacionSanitaria[p.id]?.cumple).length;
  const porcentaje = totalPuntos > 0 ? Math.round((cumplidos / totalPuntos) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
              Cumplimiento normativo
            </h3>
            <p className="mt-1 text-xs text-ink/40">
              Checklist de referencia para verificar que el consultorio cumple con COFEPRIS,
              COPRISEM y la normativa sanitaria aplicable. Márcalo conforme vayas verificando cada
              punto — no sustituye asesoría legal especializada.
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-accent">{porcentaje}%</div>
            <div className="text-[11px] uppercase tracking-wide text-ink/40">
              {cumplidos} de {totalPuntos} puntos
            </div>
          </div>
        </div>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-inset">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>

      {categoriasRegulacion.map((categoria) => {
        const puntos = checklistRegulacionSanitaria.filter((p) => p.categoria === categoria);
        if (puntos.length === 0) return null;
        return (
          <div key={categoria} className="space-y-3 rounded-2xl border border-edge/10 bg-surface p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">{categoria}</h3>
            <div className="space-y-3">
              {puntos.map((punto) => {
                const estado = regulacionSanitaria[punto.id] ?? { cumple: false };
                return (
                  <div
                    key={punto.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      estado.cumple ? "border-success/30 bg-success/5" : "border-edge/10 bg-inset"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => actualizarPunto(punto.id, { cumple: !estado.cumple })}
                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-xs font-bold transition-colors ${
                          estado.cumple
                            ? "border-success bg-success/20 text-success"
                            : "border-edge/30 text-transparent hover:border-accent/50"
                        }`}
                      >
                        ✓
                      </button>
                      <div className="flex-1">
                        <p className="text-sm text-ink">{punto.texto}</p>
                        {punto.referencia && (
                          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-ink/30">
                            {punto.referencia}
                          </p>
                        )}
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-[11px] text-ink/40">
                              Fecha de verificación
                            </label>
                            <input
                              type="date"
                              value={estado.fecha ?? ""}
                              onChange={(e) => actualizarPunto(punto.id, { fecha: e.target.value })}
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] text-ink/40">Notas</label>
                            <input
                              type="text"
                              value={estado.notas ?? ""}
                              onChange={(e) => actualizarPunto(punto.id, { notas: e.target.value })}
                              placeholder="Ej. folio, vigencia, pendiente..."
                              className={inputClass}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
