"use client";

const upperPermanent = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const upperPrimary = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const lowerPrimary = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];
const lowerPermanent = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

export default function Odontograma({
  selectedTeeth,
  onToggleTooth,
  title = "Odontograma",
}: {
  selectedTeeth: number[];
  onToggleTooth: (tooth: number) => void;
  title?: string;
}) {
  const renderArch = (teeth: number[]) => (
    <div className="flex gap-1">
      {teeth.map((tooth) => {
        const isSelected = selectedTeeth.includes(tooth);
        return (
          <button
            key={tooth}
            type="button"
            onClick={() => onToggleTooth(tooth)}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-[10px] font-semibold transition-colors ${
              isSelected
                ? "border-accent bg-accent/20 text-accent"
                : "border-edge/15 text-ink/50 hover:border-accent/40 hover:text-ink"
            }`}
            style={isSelected ? { boxShadow: "0 0 8px rgba(251,146,60,0.4)" } : undefined}
          >
            {tooth}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-5">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ink/50">{title}</h3>
      <div className="overflow-x-auto">
        <div className="flex w-fit min-w-full flex-col items-center gap-2">
          <span className="self-start text-[10px] uppercase tracking-wide text-ink/30">
            Superior permanente
          </span>
          {renderArch(upperPermanent)}

          <span className="mt-2 self-start text-[10px] uppercase tracking-wide text-ink/30">
            Superior temporal
          </span>
          {renderArch(upperPrimary)}

          <div className="my-1 h-px w-full bg-surface2" />

          <span className="self-start text-[10px] uppercase tracking-wide text-ink/30">
            Inferior temporal
          </span>
          {renderArch(lowerPrimary)}

          <span className="mt-2 self-start text-[10px] uppercase tracking-wide text-ink/30">
            Inferior permanente
          </span>
          {renderArch(lowerPermanent)}
        </div>
      </div>
      {selectedTeeth.length > 0 && (
        <p className="mt-4 text-center text-xs text-ink/50">
          Dientes seleccionados: {[...selectedTeeth].sort((a, b) => a - b).join(", ")}
        </p>
      )}
    </div>
  );
}
