"use client";

import { useEffect, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { obtenerAyuda } from "@/lib/ayudaPaginas";

function IconoAsistente() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="lg:h-8 lg:w-8">
      <path
        d="M12 18h.01M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-1 2-2 2.7-.6.4-1 .8-1 1.8M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Botón flotante presente en toda la app: abre una guía corta de "qué
 * hace esta sección y cómo hacer lo común aquí", según la página activa
 * (o el contexto más específico que publique esa página, ej. una pestaña
 * del expediente — ver ayudaContexto en PatientDataContext).
 *
 * Vive apilado justo arriba del ícono de navegación (misma esquina) — por
 * eso se esconde mientras ese abanico está abierto (`oculto`), en vez de
 * competir por el mismo espacio. */
export default function AsistenteFlotante({
  activePage,
  activeLabel,
  oculto,
}: {
  activePage: string;
  activeLabel: string;
  oculto: boolean;
}) {
  const { ayudaContexto } = usePatientData();
  const [abierto, setAbierto] = useState(false);
  const contexto = ayudaContexto ?? activePage;
  const ayuda = obtenerAyuda(contexto, activeLabel || "esta sección");

  // Si el abanico de navegación se abre mientras el panel de ayuda está
  // abierto, ciérralo también — no debe quedar flotando sin su botón.
  useEffect(() => {
    if (oculto) setAbierto(false);
  }, [oculto]);

  if (oculto) return null;

  return (
    <>
      <button
        onClick={() => setAbierto((v) => !v)}
        title="Asistente — qué puedo hacer aquí"
        style={{ boxShadow: "0 0 18px -2px rgb(var(--accent-rgb) / 0.7)" }}
        className="fixed bottom-[150px] right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-accent/50 bg-accent/20 text-accent backdrop-blur transition-transform hover:scale-105 print:hidden lg:bottom-6 lg:left-6 lg:right-auto lg:h-20 lg:w-20"
      >
        <IconoAsistente />
      </button>

      {abierto && (
        <>
          <div
            onClick={() => setAbierto(false)}
            className="fixed inset-0 z-40 print:hidden"
            aria-hidden
          />
          <div className="fixed bottom-[200px] right-6 z-50 max-h-[70vh] w-[calc(100vw-3rem)] max-w-sm overflow-y-auto rounded-2xl border border-edge/10 bg-modal-solid p-5 shadow-2xl print:hidden lg:bottom-[158px] lg:left-6 lg:right-auto">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
                  Asistente
                </p>
                <h3 className="text-base font-semibold text-ink">{ayuda.titulo}</h3>
              </div>
              <button
                onClick={() => setAbierto(false)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-ink/70">{ayuda.resumen}</p>

            {ayuda.puntos.length > 0 && (
              <ul className="mt-3 space-y-2">
                {ayuda.puntos.map((punto, i) => (
                  <li key={i} className="flex gap-2 text-sm text-ink/70">
                    <span className="mt-0.5 shrink-0 text-accent">•</span>
                    <span>{punto}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </>
  );
}
