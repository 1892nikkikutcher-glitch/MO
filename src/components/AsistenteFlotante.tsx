"use client";

import { useEffect, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { obtenerAyuda } from "@/lib/ayudaPaginas";
import { EVENTO_ABRIR_TUTORIAL } from "./TutorialInicio";
import { EVENTO_INICIAR_GUIA } from "./GuiaPrimerPaciente";
import {
  claveSesionAsistente,
  claveVisitasAsistente,
  debeLlamarLaAtencion,
  leerVisitasAsistente,
} from "@/lib/llamadaAsistente";

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
  const { ayudaContexto, miUid } = usePatientData();
  const [abierto, setAbierto] = useState(false);
  const [llamando, setLlamando] = useState(false);

  // Cuenta una visita por sesión del navegador (la bandera de sesión evita contar dos veces un mismo ingreso).
  useEffect(() => {
    if (!miUid) return;
    try {
      let visitas = leerVisitasAsistente(localStorage.getItem(claveVisitasAsistente(miUid)));
      if (!sessionStorage.getItem(claveSesionAsistente(miUid))) {
        visitas += 1;
        localStorage.setItem(claveVisitasAsistente(miUid), String(visitas));
        sessionStorage.setItem(claveSesionAsistente(miUid), "llamando");
      }
      setLlamando(debeLlamarLaAtencion(visitas) && sessionStorage.getItem(claveSesionAsistente(miUid)) === "llamando");
    } catch {
      // Sin almacenamiento (ventana privada, datos bloqueados): simplemente no se llama la atención.
    }
  }, [miUid]);

  function dejarDeLlamar() {
    setLlamando(false);
    try {
      sessionStorage.setItem(claveSesionAsistente(miUid), "atendida");
    } catch {
      // ignorado: solo se pierde recordar que ya la tocó en esta sesión
    }
  }
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
      {llamando && !abierto && (
        <button
          onClick={() => {
            dejarDeLlamar();
            setAbierto(true);
          }}
          className="fixed bottom-[154px] right-[4.5rem] z-40 max-w-[12rem] rounded-xl border border-accent/70 bg-modal-solid px-3 py-2 text-left text-xs font-semibold text-accent shadow-xl motion-safe:animate-bounce print:hidden lg:bottom-11 lg:right-[7.5rem] lg:max-w-none lg:text-sm"
        >
          ¿Dudas? Toca aquí y te ayudo
        </button>
      )}
      <button
        onClick={() => {
          if (llamando) dejarDeLlamar();
          setAbierto((v) => !v);
        }}
        title="Asistente — qué puedo hacer aquí"
        style={{
          boxShadow: llamando
            ? "0 0 26px 2px rgb(var(--accent-rgb) / 0.95)"
            : "0 0 18px -2px rgb(var(--accent-rgb) / 0.7)",
        }}
        className={`fixed bottom-[150px] right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border text-accent backdrop-blur transition-transform hover:scale-105 print:hidden lg:bottom-6 lg:h-20 lg:w-20 ${
          llamando ? "border-accent bg-accent/45" : "border-accent/50 bg-accent/20"
        }`}
      >
        {llamando && (
          <>
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full bg-accent/50 motion-safe:animate-ping"
            />
            <span
              aria-hidden
              className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-bold leading-none text-white"
            >
              !
            </span>
          </>
        )}
        <span className="relative">
          <IconoAsistente />
        </span>
      </button>

      {abierto && (
        <>
          <div
            onClick={() => setAbierto(false)}
            className="fixed inset-0 z-40 print:hidden"
            aria-hidden
          />
          <div className="fixed bottom-[200px] right-6 z-50 max-h-[70vh] w-[calc(100vw-3rem)] max-w-sm overflow-y-auto rounded-2xl border border-edge/10 bg-modal-solid p-5 shadow-2xl print:hidden lg:bottom-[158px]">
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

            <button
              onClick={() => {
                setAbierto(false);
                window.dispatchEvent(new Event(EVENTO_ABRIR_TUTORIAL));
              }}
              className="mt-4 w-full rounded-lg border border-accent/40 bg-accent/10 py-2 text-sm font-semibold text-accent hover:bg-accent/20"
            >
              Primeros pasos: ver el tutorial
            </button>
            <button
              onClick={() => {
                setAbierto(false);
                window.dispatchEvent(new Event(EVENTO_INICIAR_GUIA));
              }}
              className="mt-2 w-full rounded-lg border border-accent/40 bg-accent/10 py-2 text-sm font-semibold text-accent hover:bg-accent/20"
            >
              Guía del primer paciente
            </button>
          </div>
        </>
      )}
    </>
  );
}
