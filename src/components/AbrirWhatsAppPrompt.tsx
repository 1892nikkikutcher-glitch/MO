"use client";

import { useState } from "react";
import { archivoPendiente, limpiarArchivoPendiente } from "@/lib/enviarPdfWhatsapp";

/** Aparece después de generar un PDF para WhatsApp cuando el envío no pudo completarse solo (ver enviarPdfWhatsapp.ts):
 *
 *  - Escritorio: el PDF ya se descargó y la redirección programática a WhatsApp no es confiable en Safari/Mac. Un <a
 *    target="_blank"> real, no un window.open() en el onClick, para que el navegador lo trate como una navegación de
 *    usuario normal y nunca lo bloquee un popup blocker.
 *  - Celular: Safari de iPhone solo abre el menú de compartir dentro de un toque reciente, y generar el PDF tarda más.
 *    El PDF queda listo y este botón ("Compartir PDF") es ese segundo toque, que sí cuenta como reciente. */
export default function AbrirWhatsAppPrompt({ waUrl, onCerrar, mensaje }: { waUrl: string; onCerrar: () => void; mensaje?: string }) {
  const [archivo] = useState<File | null>(() => archivoPendiente());
  const [fallo, setFallo] = useState(false);

  const cerrar = () => {
    limpiarArchivoPendiente();
    onCerrar();
  };

  const compartir = async () => {
    if (!archivo) return;
    try {
      await navigator.share({ files: [archivo] });
      cerrar();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return; // cerró el menú de compartir: puede volver a intentarlo
      // El menú de compartir no abrió: se descarga el PDF y se ofrece abrir el chat (el flujo de siempre).
      const url = URL.createObjectURL(archivo);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = archivo.name;
      enlace.click();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setFallo(true);
    }
  };

  const textoPorDefecto = archivo
    ? fallo
      ? "No se pudo abrir el menú de compartir: el PDF se descargó. Abre WhatsApp y adjúntalo desde tus archivos."
      : "La receta ya está lista. Toca «Compartir PDF» y elige WhatsApp."
    : "El PDF ya se descargó. Abre WhatsApp, pulsa «+» → Documento y adjúntalo (el mensaje ya va escrito). Ábrelo una sola vez: si lo abres de nuevo, el texto se repite.";

  return (
    <div className="fixed inset-x-0 bottom-24 z-50 mx-auto flex w-full max-w-md items-center gap-3 rounded-xl border border-success/40 bg-modal-solid px-4 py-3 shadow-[0_8px_30px_-10px_rgba(0,0,0,0.6)]">
      <p className="flex-1 text-xs text-ink/70">{mensaje ?? textoPorDefecto}</p>
      {archivo && !fallo ? (
        <button
          onClick={compartir}
          className="shrink-0 rounded-lg border border-success/50 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success transition-colors hover:bg-success/20"
        >
          Compartir PDF
        </button>
      ) : (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={cerrar}
          className="shrink-0 rounded-lg border border-success/50 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success transition-colors hover:bg-success/20"
        >
          Abrir WhatsApp
        </a>
      )}
      <button
        onClick={cerrar}
        title="Cerrar"
        className="shrink-0 text-ink/40 transition-colors hover:text-ink/70"
      >
        ✕
      </button>
    </div>
  );
}
