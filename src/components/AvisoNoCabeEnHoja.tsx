"use client";

/** Aviso en pantalla (nunca se imprime — print:hidden) de que un documento
 * podría no caber en una sola hoja al imprimirlo. Es una heurística basada
 * en cantidad de renglones/texto, no una medición real del alto
 * renderizado — cuando dude, usa Vista previa (donde exista) para
 * confirmarlo con tus propios ojos antes de imprimir o enviar. */
export default function AvisoNoCabeEnHoja({
  mostrar,
  children,
}: {
  mostrar: boolean;
  children: React.ReactNode;
}) {
  if (!mostrar) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning print:hidden">
      <span aria-hidden="true">⚠</span>
      <span>{children}</span>
    </div>
  );
}
