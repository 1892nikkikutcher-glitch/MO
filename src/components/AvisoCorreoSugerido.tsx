"use client";

/** Aviso "¿Quisiste escribir …?" cuando el correo parece tener un error de
 * dedo (ver src/lib/correoSugerencia.ts). Un correo mal escrito crea una
 * cuenta que nunca se puede verificar. */
export default function AvisoCorreoSugerido({
  sugerencia,
  onUsar,
  onContinuar,
}: {
  sugerencia: string;
  onUsar: () => void;
  onContinuar: () => void;
}) {
  return (
    <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-ink/80" role="alert">
      <p>
        Ese correo parece tener un error. ¿Quisiste escribir <strong className="break-all">{sugerencia}</strong>?
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onUsar}
          className="rounded-lg bg-accent px-3 py-1.5 font-semibold text-black hover:opacity-90"
        >
          Usar {sugerencia}
        </button>
        <button
          type="button"
          onClick={onContinuar}
          className="rounded-lg border border-edge/20 px-3 py-1.5 font-semibold text-ink/70 hover:bg-surface"
        >
          Es correcto, continuar
        </button>
      </div>
    </div>
  );
}
