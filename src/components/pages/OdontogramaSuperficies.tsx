"use client";

import { CUADRANTES, esDienteAnterior, ladoMesialDerecha, ordenarDientes, type SuperficieDental } from "@/lib/odontograma";

/** Odontograma de diagnóstico por superficies — cada diente es el símbolo
 * clásico de 5 caras (círculo central Oclusal/Incisal + anillo de 4
 * cuadrantes: Vestibular arriba, Lingual/Palatino abajo, Mesial/Distal a
 * los lados según el cuadrante), igual que la hoja clínica en papel. Uso
 * EXCLUSIVO del odontograma de diagnóstico en Historia Clínica — los
 * otros 4 lugares que seleccionan dientes (órdenes de laboratorio,
 * presupuesto, nota de evolución) siguen usando Odontograma.tsx tal cual,
 * donde solo importa el diente completo, nunca la superficie. */

const CX = 32;
const CY = 32;
const R_OUTER = 27;
const R_INNER = 12;

function puntoEnCirculo(radio: number, anguloGrados: number) {
  const rad = (anguloGrados * Math.PI) / 180;
  return { x: CX + radio * Math.sin(rad), y: CY - radio * Math.cos(rad) };
}

/** Path de un "gajo" de dona (sector anular) de 90°, centrado en
 * anguloGrados (convención de pantalla: 0°=arriba/Vestibular,
 * 90°=derecha, 180°=abajo/Lingual, 270°=izquierda). */
function pathGajo(anguloGrados: number) {
  const a0 = anguloGrados - 45;
  const a1 = anguloGrados + 45;
  const iniInt = puntoEnCirculo(R_INNER, a0);
  const iniExt = puntoEnCirculo(R_OUTER, a0);
  const finExt = puntoEnCirculo(R_OUTER, a1);
  const finInt = puntoEnCirculo(R_INNER, a1);
  return [
    `M ${iniInt.x} ${iniInt.y}`,
    `L ${iniExt.x} ${iniExt.y}`,
    `A ${R_OUTER} ${R_OUTER} 0 0 1 ${finExt.x} ${finExt.y}`,
    `L ${finInt.x} ${finInt.y}`,
    `A ${R_INNER} ${R_INNER} 0 0 0 ${iniInt.x} ${iniInt.y}`,
    "Z",
  ].join(" ");
}

const rellenoSuperficie = (activo: boolean) =>
  activo ? "fill-accent/70 hover:fill-accent/80" : "fill-surface hover:fill-accent/20";

function SimboloDiente({
  tooth,
  superficiesActivas,
  onToggleSuperficie,
}: {
  tooth: number;
  superficiesActivas: SuperficieDental[];
  onToggleSuperficie: (superficie: SuperficieDental) => void;
}) {
  const anterior = esDienteAnterior(tooth);
  const mesialDerecha = ladoMesialDerecha(tooth);
  const anguloMesial = mesialDerecha === false ? 270 : 90;
  const anguloDistal = mesialDerecha === false ? 90 : 270;

  const zonas: { superficie: SuperficieDental; angulo: number; titulo: string }[] = [
    { superficie: "vestibular", angulo: 0, titulo: "Vestibular" },
    { superficie: "distal", angulo: anguloDistal, titulo: "Distal" },
    { superficie: "lingual", angulo: 180, titulo: "Lingual/Palatino" },
    { superficie: "mesial", angulo: anguloMesial, titulo: "Mesial" },
  ];

  const activa = (s: SuperficieDental) => superficiesActivas.includes(s);

  return (
    <svg
      viewBox="0 0 64 64"
      width="44"
      height="44"
      className="shrink-0 overflow-visible [&_path]:stroke-edge/30 [&_path]:stroke-[1.5] [&_circle]:stroke-edge/30 [&_circle]:stroke-[1.5]"
    >
      {zonas.map((z) => (
        <path
          key={z.superficie}
          d={pathGajo(z.angulo)}
          onClick={() => onToggleSuperficie(z.superficie)}
          className={`cursor-pointer transition-colors ${rellenoSuperficie(activa(z.superficie))}`}
        >
          <title>{z.titulo}</title>
        </path>
      ))}
      <circle
        cx={CX}
        cy={CY}
        r={R_INNER}
        onClick={() => onToggleSuperficie("oclusal")}
        className={`cursor-pointer transition-colors ${rellenoSuperficie(activa("oclusal"))}`}
      >
        <title>{anterior === false ? "Oclusal" : "Incisal"}</title>
      </circle>
    </svg>
  );
}

export default function OdontogramaSuperficies({
  selectedTeeth,
  selectedSurfaces,
  onToggleTooth,
  onToggleSurface,
  title = "Odontograma",
}: {
  selectedTeeth: number[];
  selectedSurfaces: Record<number, SuperficieDental[]>;
  onToggleTooth: (tooth: number) => void;
  onToggleSurface: (tooth: number, superficie: SuperficieDental) => void;
  title?: string;
}) {
  const renderFila = (teeth: number[]) => (
    <div className="flex flex-wrap gap-2">
      {teeth.map((tooth) => {
        const seleccionado = selectedTeeth.includes(tooth);
        return (
          <div key={tooth} className="flex shrink-0 flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={() => onToggleTooth(tooth)}
              className={`rounded px-1 text-[10px] font-semibold transition-colors ${
                seleccionado ? "bg-accent/20 text-accent" : "text-ink/50 hover:text-ink"
              }`}
            >
              {tooth}
            </button>
            <SimboloDiente
              tooth={tooth}
              superficiesActivas={selectedSurfaces[tooth] ?? []}
              onToggleSuperficie={(s) => onToggleSurface(tooth, s)}
            />
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50">{title}</h3>
        <p className="text-[11px] text-ink/40">
          Clic en el número = todo el diente · clic en una cara del símbolo = esa superficie
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {CUADRANTES.map((c) => {
          const alinearDerecha = c.numero === 1 || c.numero === 4;
          return (
            <div key={c.numero} className="space-y-2 rounded-xl border border-edge/10 bg-inset p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink/30">
                Cuadrante {c.numero}
              </span>
              <div className="overflow-x-auto">
                <div className={`w-fit space-y-2 ${alinearDerecha ? "lg:ml-auto" : ""}`}>
                  {renderFila(c.permanentes)}
                  {c.temporales.length > 0 && renderFila(c.temporales)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {selectedTeeth.length > 0 && (
        <p className="mt-4 text-center text-xs text-ink/50">
          Dientes seleccionados: {ordenarDientes(selectedTeeth).join(", ")}
        </p>
      )}
    </div>
  );
}
