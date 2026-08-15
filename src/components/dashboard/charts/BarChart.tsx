"use client";

/** Gráfica de barras verticales simple (SVG puro, sin librería) — para
 * series de tiempo del Dashboard (ingresos, pacientes nuevos, ocupación).
 * Nada decorativo: solo barras, etiqueta de periodo y valor. */
export default function BarChart({
  data,
  color,
  formatValue = (v) => String(v),
  height = 140,
  suffix = "",
}: {
  data: { label: string; valor: number }[];
  color: string;
  formatValue?: (v: number) => string;
  height?: number;
  suffix?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.valor));
  const barWidth = 100 / data.length;

  return (
    <div>
      <div className="flex items-end gap-1" style={{ height }}>
        {data.map((d, i) => {
          const alturaPct = (d.valor / max) * 100;
          return (
            <div
              key={i}
              className="group relative flex h-full flex-1 flex-col justify-end"
              style={{ maxWidth: `${barWidth}%` }}
            >
              <span className="mb-1 hidden text-center text-[10px] font-semibold text-ink/70 group-hover:block">
                {formatValue(d.valor)}
                {suffix}
              </span>
              <div
                className="w-full rounded-t-sm transition-opacity group-hover:opacity-80"
                style={{
                  height: `${Math.max(alturaPct, d.valor > 0 ? 2 : 0)}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[10px] text-ink/40" style={{ maxWidth: `${barWidth}%` }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}
