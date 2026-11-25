"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import {
  ESCALA_CALIFICACION,
  calcularCumplimiento,
  categoriasRegulacion,
  checklistRegulacionSanitaria,
  estadoDePunto,
  evaluarPunto,
  puntosComplementarios,
  puntosDeLaGuia,
  type Calificacion,
  type EstadoPuntoRegulacion,
  type PuntoRegulacion,
} from "@/lib/regulacionSanitaria";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-2.5 py-1.5 text-xs text-ink outline-none focus:border-accent/60";

/** Colores de cada calificación: rojo (0), ámbar (1), verde (2). */
const ESTILO_CALIFICACION: Record<Calificacion, { activo: string; reposo: string }> = {
  0: { activo: "border-danger bg-danger/20 text-danger", reposo: "border-edge/20 text-ink/60 hover:border-danger/60 hover:text-danger" },
  1: { activo: "border-accent bg-accent/20 text-accent", reposo: "border-edge/20 text-ink/60 hover:border-accent/60 hover:text-accent" },
  2: { activo: "border-success bg-success/20 text-success", reposo: "border-edge/20 text-ink/60 hover:border-success/60 hover:text-success" },
};

export default function RegulacionSanitaria() {
  const { regulacionSanitaria, setRegulacionSanitaria } = usePatientData();
  const [soloPendientes, setSoloPendientes] = useState(false);

  // Un punto de la guía que reemplaza uno anterior hereda lo ya marcado la primera vez que se toca.
  const actualizarPunto = (punto: PuntoRegulacion, cambios: Partial<EstadoPuntoRegulacion>) => {
    setRegulacionSanitaria((prev) => ({ ...prev, [punto.id]: { ...estadoDePunto(punto, prev), ...cambios } }));
  };

  const calificar = (punto: PuntoRegulacion, valor: Calificacion) => {
    const actual = evaluarPunto(punto, regulacionSanitaria).calificacion;
    const nueva = actual === valor ? null : valor; // tocar la misma calificación otra vez la quita
    actualizarPunto(punto, { calificacion: nueva, cumple: nueva === 2, noAplica: false });
  };

  const guia = calcularCumplimiento(puntosDeLaGuia, regulacionSanitaria);
  const extra = calcularCumplimiento(puntosComplementarios, regulacionSanitaria);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-3xl">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Cumplimiento normativo</h3>
            <p className="mt-1 text-xs text-ink/40">
              Basado en la Guía para Establecimientos de Atención Estomatológica de la COPRISEM/ISEM (Estado de México, versión agosto 2024): 43 reactivos que se
              califican de 0 a 2. Marca cada punto conforme lo vayas verificando — no sustituye asesoría legal especializada ni la visita de verificación.
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-accent">{guia.porcentaje}%</div>
            <div className="text-[11px] uppercase tracking-wide text-ink/40">
              {guia.obtenidos} de {guia.maximo} puntos
            </div>
            <div className="text-[11px] text-ink/40">
              {guia.evaluados} de {guia.total} reactivos evaluados
            </div>
          </div>
        </div>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-inset">
          <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all" style={{ width: `${guia.porcentaje}%` }} />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink/50">
            {ESCALA_CALIFICACION.map((c) => (
              <span key={c.valor}>
                <strong className="font-bold text-ink/80">{c.valor}</strong> = {c.etiqueta} ({c.descripcion.toLowerCase()})
              </span>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-ink/70">
            <input type="checkbox" checked={soloPendientes} onChange={(e) => setSoloPendientes(e.target.checked)} className="h-4 w-4 accent-accent" />
            Ver solo lo pendiente
          </label>
        </div>
        <p className="mt-2 text-[11px] text-ink/40">
          El instrumental por especialidad (reactivos 35 al 41) solo cuenta si lo evalúas: califica únicamente las especialidades que ofrece tu consultorio. Si un punto no
          corresponde a tu consultorio, márcalo «No aplica» y no entra en el porcentaje.
          {guia.noAplican > 0 && ` Ahora no cuentan ${guia.noAplican} reactivo${guia.noAplican === 1 ? "" : "s"}.`}
        </p>
      </div>

      {categoriasRegulacion.map((categoria) => {
        const puntos = checklistRegulacionSanitaria.filter((p) => p.categoria === categoria);
        if (puntos.length === 0) return null;
        const subtotal = calcularCumplimiento(puntos, regulacionSanitaria);
        const visibles = soloPendientes
          ? puntos.filter((p) => {
              const e = evaluarPunto(p, regulacionSanitaria);
              return e.aplica && (e.calificacion === null || e.calificacion < 2);
            })
          : puntos;
        if (visibles.length === 0) return null;
        const esExtra = puntos.every((p) => p.complementario);
        return (
          <div key={categoria} className="space-y-3 rounded-2xl border border-edge/10 bg-surface p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">{categoria}</h3>
              <span className="text-[11px] uppercase tracking-wide text-ink/40">
                {subtotal.total > 0 ? `${subtotal.obtenidos} de ${subtotal.maximo} puntos` : "Sin puntos que cuenten"}
                {esExtra && subtotal.total > 0 && ` · ${extra.porcentaje}%`}
              </span>
            </div>
            {esExtra && (
              <p className="text-[11px] text-ink/40">
                Puntos que tenías en la versión anterior y que la guía de la COPRISEM no trae. Se siguen calificando, pero no entran en el porcentaje de arriba.
              </p>
            )}
            <div className="space-y-3">
              {visibles.map((punto) => {
                const estado = estadoDePunto(punto, regulacionSanitaria);
                const { calificacion, aplica } = evaluarPunto(punto, regulacionSanitaria);
                const marco =
                  !aplica ? "border-edge/10 bg-inset opacity-60" : calificacion === 2 ? "border-success/30 bg-success/5" : calificacion === 1 ? "border-accent/30 bg-accent/5" : calificacion === 0 ? "border-danger/30 bg-danger/5" : "border-edge/10 bg-inset";
                return (
                  <div key={punto.id} className={`rounded-xl border p-4 transition-colors ${marco}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink">
                          {punto.numero !== undefined && <span className="mr-2 rounded-md bg-ink/10 px-1.5 py-0.5 text-[11px] font-bold text-ink/70">{punto.numero}</span>}
                          {punto.texto}
                        </p>
                        {punto.soloSiAplica && !estado.noAplica && calificacion === null && (
                          <p className="mt-0.5 text-[11px] text-ink/40">Solo si tu consultorio ofrece esta especialidad: califícalo y cuenta en el porcentaje.</p>
                        )}
                        {punto.referencia && <p className="mt-0.5 text-[11px] uppercase tracking-wide text-ink/30">{punto.referencia}</p>}
                        {punto.detalle && (
                          <details className="mt-1 text-xs text-ink/60">
                            <summary className="cursor-pointer text-[11px] font-semibold text-accent">Qué incluye</summary>
                            <p className="mt-1 leading-relaxed">{punto.detalle}</p>
                          </details>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5" role="group" aria-label={`Calificación: ${punto.texto}`}>
                        {ESCALA_CALIFICACION.map((c) => (
                          <button
                            key={c.valor}
                            type="button"
                            onClick={() => calificar(punto, c.valor)}
                            title={`${c.valor} · ${c.etiqueta}: ${c.descripcion}`}
                            aria-pressed={aplica && calificacion === c.valor}
                            className={`flex h-9 min-w-[3.4rem] flex-col items-center justify-center rounded-lg border px-2 text-center leading-tight transition-colors ${
                              aplica && calificacion === c.valor ? ESTILO_CALIFICACION[c.valor].activo : ESTILO_CALIFICACION[c.valor].reposo
                            }`}
                          >
                            <span className="text-sm font-bold">{c.valor}</span>
                            <span className="text-[9px] font-semibold uppercase tracking-wide">{c.etiqueta}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => actualizarPunto(punto, { noAplica: !estado.noAplica })}
                          aria-pressed={!!estado.noAplica}
                          title="No corresponde a mi consultorio: no cuenta en el porcentaje"
                          className={`flex h-9 items-center rounded-lg border px-2 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                            estado.noAplica ? "border-ink/50 bg-ink/10 text-ink" : "border-edge/20 text-ink/50 hover:border-ink/40 hover:text-ink"
                          }`}
                        >
                          No aplica
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-[11px] text-ink/40">Fecha de verificación</label>
                        <input
                          type="date"
                          value={estado.fecha ?? ""}
                          onChange={(e) => actualizarPunto(punto, { fecha: e.target.value })}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] text-ink/40">Notas</label>
                        <input
                          type="text"
                          value={estado.notas ?? ""}
                          onChange={(e) => actualizarPunto(punto, { notas: e.target.value })}
                          placeholder="Ej. folio, vigencia, pendiente..."
                          className={inputClass}
                        />
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
