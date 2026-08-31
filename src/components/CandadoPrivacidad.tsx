"use client";

import { usePrivacidad } from "@/context/PrivacidadContext";

function EyeOpenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M6.2 6.7C3.9 8.3 2 12 2 12s3.6 7 10 7c1.9 0 3.5-.5 4.8-1.2M17.9 17.4C20 15.7 22 12 22 12s-1.2-2.3-3.4-4.3A12 12 0 0 0 12 5c-.7 0-1.4.06-2 .17"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Candado de privacidad, compartido por cualquier pantalla con cifras
 * financieras sensibles (Dashboard Principal, Contabilidad...) — mismo
 * patrón que la app de un banco: cifras ocultas por default (útil cuando
 * la sesión se comparte con colaboradores en la misma computadora), un PIN
 * de 4 dígitos las revela para el resto de la sesión. El estado (oculto/
 * revelado) vive en PrivacidadProvider, montado una sola vez en
 * Dashboard.tsx — por eso desbloquear aquí también revela las cifras en
 * cualquier otra pantalla, sin volver a pedir el PIN. */
export default function CandadoPrivacidad() {
  const { oculto, solicitarRevelar, ocultar } = usePrivacidad();
  return (
    <button
      onClick={oculto ? solicitarRevelar : ocultar}
      title={oculto ? "Mostrar cifras financieras" : "Ocultar cifras financieras"}
      className="flex items-center gap-2 rounded-lg border border-edge/15 bg-surface px-3 py-2 text-xs font-semibold text-ink/60 transition-colors hover:text-ink"
    >
      {oculto ? <EyeClosedIcon /> : <EyeOpenIcon />}
      {oculto ? "Cifras ocultas" : "Cifras visibles"}
    </button>
  );
}
