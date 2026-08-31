"use client";

/** Compara varias opciones en varias dimensiones con barras horizontales de
 * escala 0 a 5 — mismo lenguaje visual que generarComparativaPdf.ts (el PDF
 * de WhatsApp), reutilizado también en pantalla (NuevaComparativaRehabilitacion)
 * y en la versión imprimible (ComparativaImpresa) para que las 3 formas de
 * ver una comparativa se lean igual. Reemplaza a la gráfica de radar
 * anterior — un mismo lenguaje visual en los 3 formatos es más simple de
 * mantener que dos gráficas distintas para los mismos datos. */

export type OpcionGrafica = {
  id: string;
  color: string;
  etiqueta: string;
  /** Mismo orden y longitud que `ejes`, cada valor de 1 a 5. */
  valores: number[];
};

export default function BarrasComparativa({
  ejes,
  opciones,
  modoImpresion = false,
}: {
  ejes: string[];
  opciones: OpcionGrafica[];
  /** Para ComparativaImpresa.tsx — esa vista siempre es fondo blanco/texto
   * negro sin importar el tema activo de la app (misma convención que
   * PresupuestoImpreso.tsx). */
  modoImpresion?: boolean;
}) {
  const claseTexto = modoImpresion ? "text-black" : "text-ink";
  const claseTextoSuave = modoImpresion ? "text-black/60" : "text-ink/50";
  const claseFondoBarra = modoImpresion ? "bg-black/10" : "bg-edge/20";
  const claseDivisor = modoImpresion ? "bg-white" : "bg-surface";

  return (
    <div className="flex w-full flex-col gap-5">
      {opciones.map((op) => (
        <div key={op.id}>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: op.color }} aria-hidden="true" />
            <span className={`text-sm font-semibold ${claseTexto}`}>{op.etiqueta}</span>
          </div>
          <div className="space-y-1.5">
            {ejes.map((eje, i) => {
              const nivel = op.valores[i] ?? 0;
              return (
                // En celular (pantalla angosta) la etiqueta va arriba y la
                // barra ocupa todo el ancho disponible — con la etiqueta al
                // costado (como en tablet/escritorio) la barra quedaba
                // apretada en menos de 150px. modoImpresion siempre usa el
                // layout horizontal: una hoja impresa nunca es tan angosta.
                <div key={eje} className="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:gap-2">
                  <span className={`sm:w-36 sm:shrink-0 ${claseTextoSuave}`}>{eje}</span>
                  <div className="flex items-center gap-2">
                    <div className={`relative h-2.5 flex-1 overflow-hidden rounded-sm ${claseFondoBarra}`}>
                      <div
                        className="absolute inset-y-0 left-0 rounded-sm"
                        style={{ width: `${(nivel / 5) * 100}%`, background: op.color }}
                      />
                      {[1, 2, 3, 4].map((marca) => (
                        <span
                          key={marca}
                          className={`absolute inset-y-0 w-px ${claseDivisor}`}
                          style={{ left: `${(marca / 5) * 100}%` }}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <span className={`w-8 shrink-0 text-right font-semibold ${claseTexto}`}>{nivel}/5</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
