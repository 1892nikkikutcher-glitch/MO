"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import type { Pendiente } from "@/lib/pendientes";
import type { ArticuloFaltante } from "@/lib/depositoDental";
import ConfirmarEliminar from "@/components/ConfirmarEliminar";

function BoxIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 8 12 3 3 8l9 5 9-5ZM3 8v9l9 5M21 8v9l-9 5M12 13v9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6h14Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function PendientesConsultorio() {
  const { pendientes, setPendientes, setArticulosFaltantes } = usePatientData();
  const [agregando, setAgregando] = useState(false);
  const [texto, setTexto] = useState("");
  const [verCompletados, setVerCompletados] = useState(false);
  const [pendienteAEliminar, setPendienteAEliminar] = useState<Pendiente | null>(null);

  const pendientesActivos = [...pendientes]
    .filter((p) => !p.completado)
    .sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1));
  const completados = [...pendientes]
    .filter((p) => p.completado)
    .sort((a, b) => ((a.completadoEn ?? "") < (b.completadoEn ?? "") ? 1 : -1));

  const guardar = () => {
    const limpio = texto.trim();
    if (!limpio) return;
    const nuevo: Pendiente = {
      id: `pend${Date.now()}`,
      texto: limpio,
      completado: false,
      creadoEn: new Date().toISOString(),
      completadoEn: null,
    };
    setPendientes((prev) => [nuevo, ...prev]);
    setTexto("");
    setAgregando(false);
  };

  const toggleCompletado = (p: Pendiente) => {
    setPendientes((prev) =>
      prev.map((x) =>
        x.id === p.id
          ? { ...x, completado: !x.completado, completadoEn: !x.completado ? new Date().toISOString() : null }
          : x
      )
    );
  };

  const eliminar = (id: string) => {
    setPendientes((prev) => prev.filter((x) => x.id !== id));
  };

  /** Copia el texto del pendiente a Faltantes por Surtir (Depósito Dental)
   * — para algo como "comprar una corona para un paciente", así no hay que
   * escribirlo dos veces ni llevar dos listas separadas de compras. */
  const enviarADeposito = (p: Pendiente) => {
    const nuevo: ArticuloFaltante = {
      id: `f${Date.now()}`,
      nombre: p.texto,
      tipo: "Otro",
      cantidad: "",
      urgencia: "Media",
      depositoId: "",
      surtido: false,
      creadoEn: new Date().toISOString(),
    };
    setArticulosFaltantes((prev) => [nuevo, ...prev]);
    setPendientes((prev) => prev.map((x) => (x.id === p.id ? { ...x, enviadoADeposito: true } : x)));
  };

  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            Pendientes del Consultorio
          </h2>
          <p className="mt-1 text-xs text-ink/40">
            Anota en un segundo lo que no te dio tiempo de hacer — una nota, un presupuesto, una
            constancia — y resuélvelo cuando puedas.
          </p>
        </div>
        {!agregando && (
          <button
            onClick={() => setAgregando(true)}
            className="shrink-0 rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
            style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
          >
            + Agregar Pendiente
          </button>
        )}
      </div>

      {agregando && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") guardar();
              if (e.key === "Escape") {
                setAgregando(false);
                setTexto("");
              }
            }}
            placeholder="Ej. Mandar presupuesto a Juan Pérez"
            className="min-w-[220px] flex-1 rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60"
          />
          <button
            onClick={guardar}
            disabled={!texto.trim()}
            className="rounded-lg border border-accent/60 bg-accent/15 px-3 py-2 text-xs font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar
          </button>
          <button
            onClick={() => {
              setAgregando(false);
              setTexto("");
            }}
            className="rounded-lg border border-edge/15 px-3 py-2 text-xs font-semibold text-ink/70 hover:bg-surface2"
          >
            Cancelar
          </button>
        </div>
      )}

      <div className="mt-4 space-y-2">
        {pendientesActivos.length === 0 && !agregando && (
          <p className="text-sm text-ink/40">No tienes pendientes por ahora. 🎉</p>
        )}
        {pendientesActivos.map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-3 rounded-lg border border-edge/10 bg-inset px-3 py-2"
          >
            <input
              type="checkbox"
              checked={false}
              onChange={() => toggleCompletado(p)}
              className="h-4 w-4 shrink-0 accent-accent"
            />
            <span className="flex-1 text-sm text-ink">{p.texto}</span>
            <button
              onClick={() => !p.enviadoADeposito && enviarADeposito(p)}
              disabled={p.enviadoADeposito}
              title={
                p.enviadoADeposito
                  ? "Ya está en Faltantes por Surtir (Depósito Dental)"
                  : "Agregar también a Faltantes por Surtir (Depósito Dental)"
              }
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-edge/15 px-2 py-1 text-xs font-medium text-ink/50 transition-colors hover:border-accent/50 hover:text-accent disabled:cursor-default disabled:border-success/30 disabled:text-success/70 disabled:hover:border-success/30 disabled:hover:text-success/70"
            >
              <BoxIcon />
              {p.enviadoADeposito ? "En Depósito Dental" : "Depósito Dental"}
            </button>
            <button
              onClick={() => setPendienteAEliminar(p)}
              title="Eliminar pendiente"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink/30 transition-colors hover:bg-danger/10 hover:text-danger"
            >
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>

      {completados.length > 0 && (
        <div className="mt-4 border-t border-edge/10 pt-3">
          <button
            onClick={() => setVerCompletados((v) => !v)}
            className="text-xs font-semibold text-ink/50 hover:text-ink"
          >
            {verCompletados ? "Ocultar" : "Ver"} completados ({completados.length})
          </button>
          {verCompletados && (
            <div className="mt-2 space-y-2">
              {completados.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 rounded-lg border border-edge/10 bg-inset px-3 py-2 opacity-60"
                >
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={() => toggleCompletado(p)}
                    className="h-4 w-4 shrink-0 accent-accent"
                  />
                  <span className="flex-1 text-sm text-ink line-through">{p.texto}</span>
                  <button
                    onClick={() => setPendienteAEliminar(p)}
                    title="Eliminar pendiente"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink/30 transition-colors hover:bg-danger/10 hover:text-danger"
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {pendienteAEliminar && (
        <ConfirmarEliminar
          titulo="¿Eliminar este pendiente?"
          mensaje={`"${pendienteAEliminar.texto}"`}
          onCancel={() => setPendienteAEliminar(null)}
          onConfirm={() => {
            eliminar(pendienteAEliminar.id);
            setPendienteAEliminar(null);
          }}
        />
      )}
    </div>
  );
}
