"use client";

/** Gráfica de radar reutilizable para comparar varias opciones en varias
 * dimensiones (economía, función, estética, conservación biológica) — se
 * usa tanto en pantalla (NuevaComparativaRehabilitacion.tsx) como en la
 * versión imprimible (ComparativaImpresa.tsx), ambas veces como SVG real —
 * se imprime tal cual vía el motor de impresión del navegador, sin generar
 * una imagen aparte. Entre más lejos del centro llega la figura de una
 * opción en un eje, mejor le va en ese aspecto — todos los ejes se definen
 * en sentido positivo (nunca "entre más lejos, peor") para que el tamaño
 * de la figura se lea de forma consistente. */

const TAMANIO = 400;
const CENTRO = TAMANIO / 2;
const RADIO_MAX = 150;
const NIVEL_MAX = 5;

function anguloEje(indice: number, totalEjes: number): number {
  return -90 + indice * (360 / totalEjes);
}

function puntoEnEje(anguloGrados: number, radio: number): [number, number] {
  const rad = (anguloGrados * Math.PI) / 180;
  return [CENTRO + radio * Math.cos(rad), CENTRO + radio * Math.sin(rad)];
}

function puntosPoligono(valores: number[], ejesTotal: number): string {
  return valores
    .map((valor, i) => puntoEnEje(anguloEje(i, ejesTotal), (valor / NIVEL_MAX) * RADIO_MAX).join(","))
    .join(" ");
}

export type OpcionRadar = {
  id: string;
  color: string;
  etiqueta: string;
  /** Mismo orden y longitud que `ejes`, cada valor de 1 a 5. */
  valores: number[];
};

export default function RadarComparativa({
  ejes,
  opciones,
  modoImpresion = false,
}: {
  ejes: string[];
  opciones: OpcionRadar[];
  /** Para ComparativaImpresa.tsx — esa vista siempre es fondo blanco/texto
   * negro sin importar el tema activo de la app (misma convención que
   * PresupuestoImpreso.tsx), pero las clases de Tailwind de la rejilla/ejes
   * (stroke-edge, fill-ink) sí siguen el tema activo — en modo oscuro
   * saldrían casi blancas sobre el papel blanco. Este modo las fuerza a
   * negro/gris con estilos literales, no con variables de tema. */
  modoImpresion?: boolean;
}) {
  const niveles = [1, 2, 3, 4, 5];
  const claseRejilla = modoImpresion ? "fill-none" : "fill-none stroke-edge/20";
  const estiloRejilla = modoImpresion ? { stroke: "#00000030" } : undefined;
  const claseEje = modoImpresion ? "" : "stroke-edge/20";
  const estiloEje = modoImpresion ? { stroke: "#00000030" } : undefined;
  const claseTexto = modoImpresion ? "text-[12px] font-semibold" : "fill-ink/60 text-[12px] font-semibold";
  const estiloTexto = modoImpresion ? { fill: "#000000" } : undefined;

  return (
    <div className="flex flex-col items-center gap-4">
      <svg viewBox={`0 0 ${TAMANIO} ${TAMANIO}`} className="w-full max-w-[420px]" role="img" aria-label="Comparación de opciones">
        <g>
          {niveles.map((nivel) => (
            <polygon
              key={nivel}
              points={puntosPoligono(ejes.map(() => nivel), ejes.length)}
              className={claseRejilla}
              style={estiloRejilla}
              strokeWidth={1}
            />
          ))}
        </g>
        <g>
          {ejes.map((label, i) => {
            const [x2, y2] = puntoEnEje(anguloEje(i, ejes.length), RADIO_MAX);
            const [lx, ly] = puntoEnEje(anguloEje(i, ejes.length), RADIO_MAX + 32);
            return (
              <g key={label}>
                <line x1={CENTRO} y1={CENTRO} x2={x2} y2={y2} className={claseEje} style={estiloEje} strokeWidth={1} />
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className={claseTexto}
                  style={estiloTexto}
                >
                  {label}
                </text>
              </g>
            );
          })}
        </g>
        <g>
          {opciones.map((op) => (
            <polygon
              key={op.id}
              points={puntosPoligono(op.valores, ejes.length)}
              style={{ stroke: op.color, fill: op.color, fillOpacity: 0.16 }}
              strokeWidth={2.25}
            />
          ))}
        </g>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        {opciones.map((op) => (
          <span
            key={op.id}
            className={`flex items-center gap-1.5 text-xs font-semibold ${modoImpresion ? "text-black" : "text-ink/70"}`}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: op.color }} />
            {op.etiqueta}
          </span>
        ))}
      </div>
    </div>
  );
}
