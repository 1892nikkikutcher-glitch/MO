"use client";

import { useEffect, useState } from "react";
import { compartirExpedienteApi, refrescarExpedienteApi } from "@/lib/conectaApi";
import { etiquetaSeccionCompartible, type SeccionCompartible } from "@/lib/expedienteCompartido";
import type { Interconsulta } from "@/lib/moConecta";
import { ElegirQueCompartirRapido } from "./ExpedienteCompartidoVista";

const INTERVALO_ACTUALIZAR_MS = 60_000;

/** "hace 3 min", "hace 2 h"… para decir qué tan al día está lo que se comparte. */
export function haceCuanto(iso: string | undefined, ahora: number): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return "";
  const seg = Math.max(0, Math.round((ahora - t) / 1000));
  if (seg < 60) return "hace unos segundos";
  const min = Math.round(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
}

function useAhora(cadaMs = 30_000) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), cadaMs);
    return () => clearInterval(t);
  }, [cadaMs]);
  return ahora;
}

const botonPrimario =
  "rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const botonSecundario = "rounded-lg border border-edge/15 px-4 py-2 text-sm text-ink/70 hover:bg-surface disabled:opacity-50";

function Interruptor({ activo, ocupado, onClick, etiqueta }: { activo: boolean; ocupado: boolean; onClick: () => void; etiqueta: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      disabled={ocupado}
      onClick={onClick}
      className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:opacity-50 ${
        activo ? "border-success/60 bg-success/40" : "border-edge/20 bg-ink/10"
      }`}
    >
      <span
        className={`absolute top-0.5 rounded-full bg-ink shadow transition-all ${activo ? "left-[1.5rem]" : "left-0.5"}`}
        style={{ height: "1.375rem", width: "1.375rem" }}
      />
    </button>
  );
}

/** Compartir el expediente del paciente con el colega de un caso, como un interruptor: mientras
 * está activo el colega lo ve al día (el servidor lo mantiene así), y al terminar el caso se
 * apaga y el colega deja de verlo. Quien envió el caso lo controla; el colega solo ve el estado.
 * Mientras esté activo, abrir el caso (de cualquier lado) pide la actualización cada minuto. */
export default function CompartirExpedientePanel({
  interconsulta,
  esRemitente,
  nombreColega,
}: {
  interconsulta: Interconsulta;
  esRemitente: boolean;
  nombreColega: string;
}) {
  const c = interconsulta.compartirExpediente;
  const activo = Boolean(c?.activo);
  const fotoFija = !c && Boolean(interconsulta.expedienteCompartido);
  const concluido = interconsulta.estado === "closed" || interconsulta.estado === "cancelled" || interconsulta.estado === "rejected";
  const ahora = useAhora();

  const [formAbierto, setFormAbierto] = useState(false);
  const [secciones, setSecciones] = useState<SeccionCompartible[]>([]);
  const [consentimiento, setConsentimiento] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mantener al día: mientras esté activo y alguien tenga el caso abierto, se pide la
  // actualización al abrirlo y cada minuto. El servidor decide si de verdad toca revisar.
  useEffect(() => {
    if (!activo) return;
    const pedir = () => {
      if (document.visibilityState === "visible") refrescarExpedienteApi(interconsulta.id).catch(() => {});
    };
    pedir();
    const t = setInterval(pedir, INTERVALO_ACTUALIZAR_MS);
    return () => clearInterval(t);
  }, [activo, interconsulta.id]);

  function abrirFormulario() {
    setSecciones(c?.secciones?.length ? c.secciones : (interconsulta.expedienteCompartido?.secciones ?? []));
    setConsentimiento(false);
    setError(null);
    setFormAbierto(true);
  }

  async function activar() {
    setOcupado(true);
    setError(null);
    try {
      await compartirExpedienteApi(interconsulta.id, { activo: true, secciones, consentimientoPaciente: consentimiento });
      setFormAbierto(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo activar.");
    } finally {
      setOcupado(false);
    }
  }

  async function desactivar() {
    const aviso = `${nombreColega} dejará de ver el expediente del paciente y se borran las copias de fotos que compartiste. Puedes volver a activarlo cuando quieras.`;
    if (!window.confirm(`¿Dejar de compartir el expediente?\n\n${aviso}`)) return;
    setOcupado(true);
    setError(null);
    try {
      await compartirExpedienteApi(interconsulta.id, { activo: false });
      setFormAbierto(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo desactivar.");
    } finally {
      setOcupado(false);
    }
  }

  // ---- Lo que ve el colega: solo el estado ----
  if (!esRemitente) {
    if (c && !c.activo) {
      return (
        <div className="rounded-2xl border border-edge/10 bg-surface p-4 text-sm text-ink/70">
          <span className="font-medium text-ink">{nombreColega}</span> dejó de compartir el expediente del paciente
          {c.desactivadoEl && <> ({haceCuanto(c.desactivadoEl, ahora)})</>}. Ya no está disponible aquí.
        </div>
      );
    }
    return null;
  }

  // ---- Quien envió el caso: el interruptor ----
  const textoEstado = activo
    ? `${nombreColega} ve el expediente al día${c?.secciones.length ? `: ${c.secciones.map((s) => etiquetaSeccionCompartible[s]).join(", ")}` : ""}. Última revisión ${haceCuanto(c?.actualizadoEl, ahora) || "ahora"}. ${
        c?.vistoPorColegaEl ? `Lo abrió ${haceCuanto(c.vistoPorColegaEl, ahora)}.` : "Aún no lo ha abierto."
      }`
    : c && !c.activo
      ? `Desactivado ${haceCuanto(c.desactivadoEl, ahora)}. ${nombreColega} ya no ve el expediente.`
      : fotoFija
        ? `${nombreColega} ve una foto fija de cuando enviaste el caso; no se actualiza sola. Actívalo para mantenerla al día, o deja de compartir.`
        : `Hoy ${nombreColega} solo ve lo básico: nombre, edad, alergias y tu motivo.`;

  return (
    <div className="space-y-3 rounded-2xl border border-edge/10 bg-surface p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-ink">Compartir expediente con {nombreColega}</h3>
          <p className="mt-0.5 text-xs text-ink/60">{textoEstado}</p>
          {activo && concluido && (
            <p className="mt-1 text-xs text-warning">
              El caso ya concluyó, así que lo compartido ya no se actualiza. Desactívalo cuando quieras.
            </p>
          )}
        </div>
        {fotoFija ? (
          <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
            <button type="button" onClick={abrirFormulario} disabled={ocupado} className={botonPrimario}>
              Mantener al día
            </button>
            <button type="button" onClick={desactivar} disabled={ocupado} className={botonSecundario}>
              Dejar de compartir
            </button>
          </div>
        ) : (
          <Interruptor
            activo={activo}
            ocupado={ocupado}
            etiqueta={`Compartir expediente con ${nombreColega}`}
            onClick={() => (activo ? desactivar() : formAbierto ? setFormAbierto(false) : abrirFormulario())}
          />
        )}
      </div>

      {activo && !formAbierto && (
        <button type="button" onClick={abrirFormulario} className="text-xs text-accent hover:underline">
          Cambiar qué se comparte
        </button>
      )}

      {formAbierto && (
        <div className="space-y-3 rounded-xl border border-edge/10 bg-field p-4">
          <ElegirQueCompartirRapido valor={secciones} onChange={setSecciones} nombreColega={nombreColega} />
          <label className="flex cursor-pointer items-start gap-2 text-sm text-ink/80">
            <input type="checkbox" className="mt-0.5" checked={consentimiento} onChange={(e) => setConsentimiento(e.target.checked)} />
            Cuento con el consentimiento del paciente para compartir esta información con el colega.
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={activar} disabled={ocupado || secciones.length === 0 || !consentimiento} className={botonPrimario}>
              {ocupado ? "Activando…" : activo ? "Guardar cambios" : "Activar"}
            </button>
            <button type="button" onClick={() => setFormAbierto(false)} disabled={ocupado} className={botonSecundario}>
              Cancelar
            </button>
          </div>
          {secciones.length === 0 && <p className="text-xs text-ink/50">Elige al menos una parte del expediente para activarlo.</p>}
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
