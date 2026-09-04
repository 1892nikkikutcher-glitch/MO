"use client";

/** Aparece después de descargar un PDF en escritorio, cuando no se pudo
 * redirigir automáticamente a WhatsApp (ver enviarPdfWhatsapp.ts — la
 * redirección programática de una pestaña pre-abierta no es confiable en
 * Safari/Mac). Un <a target="_blank"> real, no un window.open() en el
 * onClick, para que el navegador lo trate como una navegación de usuario
 * normal y nunca lo bloquee un popup blocker. */
export default function AbrirWhatsAppPrompt({ waUrl, onCerrar }: { waUrl: string; onCerrar: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-24 z-50 mx-auto flex w-full max-w-md items-center gap-3 rounded-xl border border-success/40 bg-modal-solid px-4 py-3 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.6)]">
      <p className="flex-1 text-xs text-ink/70">El PDF ya se descargó — ábrelo en WhatsApp para adjuntarlo.</p>
      <a
        href={waUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onCerrar}
        className="shrink-0 rounded-lg border border-success/50 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success transition-colors hover:bg-success/20"
      >
        Abrir WhatsApp
      </a>
      <button
        onClick={onCerrar}
        title="Cerrar"
        className="shrink-0 text-ink/40 transition-colors hover:text-ink/70"
      >
        ✕
      </button>
    </div>
  );
}
