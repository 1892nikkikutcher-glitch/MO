"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { botonPrimario, inputClass, labelClass } from "./NotaUI";
import type { DiagnosticoNota, DiagnosticoPaciente, EstadoDiagnostico, NotaEvolucionV2 } from "@/lib/notasEvolucion";

/** Sección 3 — "Diagnóstico". El catálogo por paciente (recuperar
 * diagnósticos activos, confirmar sin sobrescribir, agregar nuevo) es real
 * desde la Fase 1; la sugerencia/búsqueda de código CIE y otras mejoras de
 * catálogo llegan en la Fase 4 — el campo `cieCodigo`/`cieDescripcion` ya
 * existe en el tipo, solo no tiene UI todavía. */
export default function SeccionDiagnostico({
  patientId,
  notaId,
  valor,
  organosSugeridos,
  onChange,
}: {
  patientId: string;
  notaId: string;
  valor: DiagnosticoNota;
  organosSugeridos: number[];
  onChange: (updater: (prev: NotaEvolucionV2) => NotaEvolucionV2) => void;
}) {
  const { diagnosticosPorPaciente, setDiagnosticosPaciente } = usePatientData();
  const catalogo = diagnosticosPorPaciente[patientId] ?? [];
  const [nuevoTexto, setNuevoTexto] = useState("");
  const [nuevoEstado, setNuevoEstado] = useState<EstadoDiagnostico>("provisional");

  function setDiagnostico(updater: (prev: DiagnosticoNota) => DiagnosticoNota) {
    onChange((prev) => ({ ...prev, diagnostico: updater(valor) }));
  }

  function agregarId(id: string) {
    setDiagnostico((prev) => ({ ...prev, diagnosticosIds: [...prev.diagnosticosIds, id] }));
  }

  function quitarId(id: string) {
    setDiagnostico((prev) => ({ ...prev, diagnosticosIds: prev.diagnosticosIds.filter((x) => x !== id) }));
  }

  function confirmarExistente(dx: DiagnosticoPaciente) {
    const id = `dx${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    const nuevo: DiagnosticoPaciente = {
      ...dx,
      id,
      creadoEn: new Date().toISOString(),
      origen: "confirmado_de_historial",
      notaOrigenId: notaId,
    };
    setDiagnosticosPaciente(patientId, (prev) => [...prev, nuevo]);
    agregarId(id);
  }

  function agregarNuevo() {
    if (!nuevoTexto.trim()) return;
    const id = `dx${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    const nuevo: DiagnosticoPaciente = {
      id,
      dientes: organosSugeridos,
      diagnostico: nuevoTexto.trim(),
      estado: nuevoEstado,
      creadoEn: new Date().toISOString(),
      origen: "nuevo",
      notaOrigenId: notaId,
    };
    setDiagnosticosPaciente(patientId, (prev) => [...prev, nuevo]);
    agregarId(id);
    setNuevoTexto("");
  }

  const seleccionados = valor.diagnosticosIds
    .map((id) => catalogo.find((d) => d.id === id))
    .filter((d): d is DiagnosticoPaciente => Boolean(d));
  const disponiblesParaConfirmar = catalogo.filter((d) => !valor.diagnosticosIds.includes(d.id));

  return (
    <div className="space-y-4">
      {seleccionados.length > 0 && (
        <div className="space-y-1.5">
          {seleccionados.map((dx) => (
            <div key={dx.id} className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm">
              <span className="text-ink">
                {dx.diagnostico}
                {dx.dientes.length > 0 && <span className="text-ink/50"> · OD {dx.dientes.join(", ")}</span>}
                <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${dx.estado === "provisional" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"}`}>
                  {dx.estado}
                </span>
              </span>
              <button type="button" onClick={() => quitarId(dx.id)} className="text-xs text-ink/40 hover:text-danger">
                Quitar
              </button>
            </div>
          ))}
        </div>
      )}

      {disponiblesParaConfirmar.length > 0 && (
        <div>
          <label className={labelClass}>Diagnósticos previos del paciente — confirmar sin reescribir</label>
          <div className="space-y-1.5">
            {disponiblesParaConfirmar.map((dx) => (
              <button
                key={dx.id}
                type="button"
                onClick={() => confirmarExistente(dx)}
                className="flex w-full items-center justify-between rounded-lg border border-edge/10 bg-field px-3 py-2 text-left text-sm text-ink/70 hover:border-accent/40"
              >
                <span>
                  {dx.diagnostico}
                  {dx.dientes.length > 0 && <span className="text-ink/40"> · OD {dx.dientes.join(", ")}</span>}
                </span>
                <span className="text-xs text-accent">Confirmar hoy</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-edge/10 bg-field p-3">
        <label className={labelClass}>Agregar nuevo diagnóstico</label>
        <div className="flex flex-wrap items-end gap-2">
          <input
            className={`${inputClass} flex-1`}
            placeholder={organosSugeridos.length > 0 ? `Ej. Caries clase I — OD ${organosSugeridos.join(", ")}` : "Describe el diagnóstico"}
            value={nuevoTexto}
            onChange={(e) => setNuevoTexto(e.target.value)}
          />
          <select className={`${inputClass} w-auto`} value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value as EstadoDiagnostico)}>
            <option value="provisional">Provisional</option>
            <option value="definitivo">Definitivo</option>
          </select>
          <button type="button" onClick={agregarNuevo} disabled={!nuevoTexto.trim()} className={botonPrimario}>
            Agregar
          </button>
        </div>
      </div>

      {valor.diagnosticosIds.length === 0 && (
        <div>
          <label className={labelClass}>O explica por qué esta atención no requiere diagnóstico</label>
          <input
            className={inputClass}
            value={valor.justificacionSinDiagnostico ?? ""}
            onChange={(e) => setDiagnostico((prev) => ({ ...prev, justificacionSinDiagnostico: e.target.value }))}
            placeholder="Ej. Control de rutina sin hallazgos nuevos"
          />
        </div>
      )}
    </div>
  );
}

