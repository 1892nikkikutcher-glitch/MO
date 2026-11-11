"use client";

import { useEffect, useState } from "react";
import {
  enlaceParaCompartir,
  MENSAJE_COMPARTIR_MO,
  REDES_COMPARTIR,
  TITULO_COMPARTIR_MO,
  urlCompartir,
} from "@/lib/compartirMo";

export function CompartirIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v12M12 3 8 7M12 3l4 4M5 12v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Sin permiso de portapapeles (navegador antiguo o contexto no seguro): se copia con un campo temporal.
    try {
      const campo = document.createElement("textarea");
      campo.value = texto;
      campo.style.position = "fixed";
      campo.style.opacity = "0";
      document.body.appendChild(campo);
      campo.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(campo);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function CompartirMoModal({ onClose }: { onClose: () => void }) {
  const [enlace, setEnlace] = useState("");
  const [copiado, setCopiado] = useState<"enlace" | "mensaje" | "error" | null>(null);
  const [puedeCompartirNativo, setPuedeCompartirNativo] = useState(false);

  // El enlace se arma al abrir (no en el servidor) porque depende del dominio desde el que se está usando MO.
  useEffect(() => {
    setEnlace(enlaceParaCompartir(window.location.origin));
    setPuedeCompartirNativo(typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(null), 2500);
    return () => clearTimeout(t);
  }, [copiado]);

  async function copiar(tipo: "enlace" | "mensaje") {
    const texto = tipo === "enlace" ? enlace : `${MENSAJE_COMPARTIR_MO} ${enlace}`;
    setCopiado((await copiarAlPortapapeles(texto)) ? tipo : "error");
  }

  async function compartirNativo() {
    try {
      await navigator.share({ title: TITULO_COMPARTIR_MO, text: MENSAJE_COMPARTIR_MO, url: enlace });
    } catch {
      // Cerró el menú sin elegir nada: no es un error.
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Compartir MO"
        className="w-full max-w-md rounded-2xl border border-edge/10 bg-modal p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-ink">Compartir MO</h3>
        <p className="mt-1 text-xs text-ink/50">
          Recomiéndale MO a un colega o publícalo en tus redes. El enlace lleva a la página de entrada de MO.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-edge/15 bg-surface p-1.5 pl-3">
          <span className="min-w-0 flex-1 truncate text-sm text-ink/80" title={enlace}>
            {enlace}
          </span>
          <button
            onClick={() => copiar("enlace")}
            disabled={!enlace}
            className="shrink-0 rounded-md border border-accent/50 bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/25 disabled:opacity-50"
          >
            {copiado === "enlace" ? "¡Copiado!" : "Copiar enlace"}
          </button>
        </div>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-ink/50">Enviar por</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {REDES_COMPARTIR.map((red) => (
            <a
              key={red.id}
              href={enlace ? urlCompartir(red.id, enlace) : undefined}
              target={red.id === "correo" ? undefined : "_blank"}
              rel="noopener noreferrer"
              className={`rounded-lg border px-3 py-2.5 text-center text-sm font-semibold transition-colors hover:bg-surface ${
                red.id === "whatsapp" ? "border-accent/60 bg-accent/10 text-accent" : "border-edge/15 text-ink/70"
              }`}
            >
              {red.nombre}
            </a>
          ))}
        </div>

        {puedeCompartirNativo && (
          <button
            onClick={compartirNativo}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/70 transition-colors hover:bg-surface"
          >
            <CompartirIcon />
            Más opciones (Instagram, TikTok, mensajes…)
          </button>
        )}

        <button
          onClick={() => copiar("mensaje")}
          disabled={!enlace}
          className="mt-3 w-full text-center text-xs text-ink/50 underline-offset-2 transition-colors hover:text-ink hover:underline disabled:opacity-50"
        >
          {copiado === "mensaje"
            ? "¡Copiado! Pégalo en tu publicación o historia."
            : "Copiar mensaje con enlace para pegarlo en Instagram, TikTok u otra red"}
        </button>
        {copiado === "error" && (
          <p className="mt-2 text-center text-xs text-danger">
            No se pudo copiar. Selecciona el enlace de arriba y cópialo a mano.
          </p>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/70 transition-colors hover:bg-surface"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
