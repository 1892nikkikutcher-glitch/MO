"use client";

/** Lista de barras horizontales rankeadas — para "qué genera más" (ej.
 * Producción por Tratamiento). Nada decorativo: nombre, barra proporcional
 * al máximo, y valor. */
export default function HorizontalBarList({
  data,
  color,
  formatValue = (v) => String(v),
}: {
  data: { label: string; valor: number; subtitulo?: string }[];
  color: string;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.valor));

  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={i}>
          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
            <span className="truncate text-ink/80">{d.label}</span>
            <span className="shrink-0 font-semibold text-ink">{formatValue(d.valor)}</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-inset">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max((d.valor / max) * 100, 2)}%`, backgroundColor: color }}
            />
          </div>
          {d.subtitulo && <div className="mt-0.5 text-[10px] text-ink/30">{d.subtitulo}</div>}
        </div>
      ))}
    </div>
  );
}
