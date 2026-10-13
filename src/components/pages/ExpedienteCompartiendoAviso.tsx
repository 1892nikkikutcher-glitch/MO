"use client";

import { useState } from "react";
import { useMoConecta } from "@/context/MoConectaContext";
import { compartirExpedienteApi } from "@/lib/conectaApi";
import { casosQueComparten, estadoCompartirDelCaso } from "@/lib/compartirExpedienteEstado";
import { colegaDelCaso } from "@/lib/colegaDelCaso";

/** Aviso en el expediente del paciente: con quién se está compartiendo AHORA este expediente por
 * MO Conecta, para no perderlo de vista. Desde aquí se puede abrir el caso o dejar de compartir. */
export default function ExpedienteCompartiendoAviso({
  patientId,
  onAbrirCaso,
}: {
  patientId: string;
  onAbrirCaso: (interconsultaId: string) => void;
}) {
  const { uid, casosEnviados, directorio } = useMoConecta();
  const [apagando, setApagando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const casos = casosQueComparten(casosEnviados, uid, patientId);
  if (casos.length === 0) return null;

  async function dejarDeCompartir(id: string, nombre: string) {
    if (!window.confirm(`¿Dejar de compartir el expediente con ${nombre}?\n\nDejará de verlo y se borran las copias de fotos que compartiste.`)) return;
    setApagando(id);
    setError(null);
    try {
      await compartirExpedienteApi(id, { activo: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo dejar de compartir.");
    } finally {
      setApagando(null);
    }
  }

  return (
    <div className="space-y-2 rounded-2xl border border-accent/40 bg-accent/10 p-4 text-sm print:hidden">
      {casos.map((c) => {
        const nombre = colegaDelCaso(c, uid, directorio, undefined).nombre;
        const vivo = estadoCompartirDelCaso(c) === "vivo";
        return (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-ink/80">
              <span aria-hidden className="mr-1.5">🔗</span>
              Este expediente se está compartiendo con <span className="font-semibold text-ink">{nombre}</span>
              <span className="text-ink/50"> · {vivo ? "al día" : "foto fija"}</span>
            </p>
            <div className="flex gap-3 text-xs font-semibold">
              <button type="button" onClick={() => onAbrirCaso(c.id)} className="text-accent hover:underline">
                Ver caso
              </button>
              <button type="button" onClick={() => dejarDeCompartir(c.id, nombre)} disabled={apagando === c.id} className="text-danger hover:underline disabled:opacity-50">
                {apagando === c.id ? "Apagando…" : "Dejar de compartir"}
              </button>
            </div>
          </div>
        );
      })}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
