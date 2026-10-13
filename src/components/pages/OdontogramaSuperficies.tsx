"use client";

import { CUADRANTES, esDienteAnterior, ladoMesialDerecha, ordenarDientes, type SuperficieDental } from "@/lib/odontograma";
import { COLORES_ODONTOGRAMA, colorOdontogramaInfo, type ColorOdontograma } from "@/lib/historiaClinica";

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

/** Lo ya guardado que se pinta en el odontograma (un diagnóstico). Sin superficies =
 * todo el diente. Sin color = el neutro de siempre. */
export type PinturaOdontograma = {
  dientes: number[];
  superficiesPorDiente?: Record<number, SuperficieDental[]>;
  color?: ColorOdontograma;
};

/** Con qué se ve una superficie ya guardada, o null si ningún diagnóstico la toca. Los
 * diagnósticos vienen del más nuevo al más viejo: si dos tocan la misma cara, gana el más
 * reciente. `pleno` = la cara se marcó una por una (más intensa que "todo el diente"). */
function pinturaDeSuperficie(
  pintados: PinturaOdontograma[],
  tooth: number,
  superficie: SuperficieDental
): { color: ColorOdontograma | undefined; pleno: boolean } | null {
  for (const p of pintados) {
    if (!p.dientes.includes(tooth)) continue;
    const marcadas = p.superficiesPorDiente?.[tooth] ?? [];
    if (marcadas.length === 0) return { color: p.color, pleno: false };
    if (marcadas.includes(superficie)) return { color: p.color, pleno: true };
  }
  return null;
}

/** Color del hallazgo más reciente de un diente, para rotular su número. */
function colorDeDiente(pintados: PinturaOdontograma[], tooth: number): ColorOdontograma | undefined {
  return pintados.find((p) => p.dientes.includes(tooth))?.color;
}

function SimboloDiente({
  tooth,
  superficiesActivas,
  dienteCompleto,
  colorActual,
  pintados,
  onToggleSuperficie,
}: {
  tooth: number;
  superficiesActivas: SuperficieDental[];
  /** El diente está marcado entero (sin caras específicas): se pinta completo en el color actual. */
  dienteCompleto: boolean;
  colorActual: ColorOdontograma;
  pintados: PinturaOdontograma[];
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

  /** Relleno de una cara: lo que se está marcando ahora (borrador) va encima de lo
   * guardado; las caras sin pintar conservan su relleno de siempre. */
  const estiloDe = (superficie: SuperficieDental): { clase: string; style?: { fill: string } } => {
    if (superficiesActivas.includes(superficie)) {
      return { clase: "", style: { fill: `rgb(${colorOdontogramaInfo[colorActual].rgb} / 0.8)` } };
    }
    if (dienteCompleto) {
      return { clase: "", style: { fill: `rgb(${colorOdontogramaInfo[colorActual].rgb} / 0.6)` } };
    }
    const guardada = pinturaDeSuperficie(pintados, tooth, superficie);
    if (!guardada) return { clase: rellenoSuperficie(false) };
    if (!guardada.color) return { clase: rellenoSuperficie(true) };
    const alfa = guardada.pleno ? 0.8 : 0.6;
    return { clase: "", style: { fill: `rgb(${colorOdontogramaInfo[guardada.color].rgb} / ${alfa})` } };
  };

  const circulo = estiloDe("oclusal");

  return (
    <svg
      viewBox="0 0 64 64"
      className="h-auto w-full max-w-[44px] shrink-0 overflow-visible [&_path]:stroke-edge/30 [&_path]:stroke-[1.5] [&_circle]:stroke-edge/30 [&_circle]:stroke-[1.5]"
    >
      {zonas.map((z) => {
        const e = estiloDe(z.superficie);
        return (
          <path
            key={z.superficie}
            d={pathGajo(z.angulo)}
            onClick={() => onToggleSuperficie(z.superficie)}
            style={e.style}
            className={`cursor-pointer transition-colors ${e.clase}`}
          >
            <title>{z.titulo}</title>
          </path>
        );
      })}
      <circle
        cx={CX}
        cy={CY}
        r={R_INNER}
        onClick={() => onToggleSuperficie("oclusal")}
        style={circulo.style}
        className={`cursor-pointer transition-colors ${circulo.clase}`}
      >
        <title>{anterior === false ? "Oclusal" : "Incisal"}</title>
      </circle>
    </svg>
  );
}

const COLUMNAS_POR_CUADRANTE = 8;

export default function OdontogramaSuperficies({
  selectedTeeth,
  selectedSurfaces,
  onToggleTooth,
  onToggleSurface,
  colorActual = "rojo",
  onCambiarColor,
  pintados = [],
  title = "Odontograma",
}: {
  selectedTeeth: number[];
  selectedSurfaces: Record<number, SuperficieDental[]>;
  onToggleTooth: (tooth: number) => void;
  onToggleSurface: (tooth: number, superficie: SuperficieDental) => void;
  /** Color con que se pinta lo que se está marcando. */
  colorActual?: ColorOdontograma;
  /** Si se omite, no se muestra el selector de color. */
  onCambiarColor?: (color: ColorOdontograma) => void;
  /** Diagnósticos ya guardados, del más nuevo al más viejo, para pintarlos. */
  pintados?: PinturaOdontograma[];
  title?: string;
}) {
  const celda = (tooth: number, columna: number, fila: number) => {
    const seleccionado = selectedTeeth.includes(tooth);
    const colorGuardado = colorDeDiente(pintados, tooth);
    // Número del diente: del color del hallazgo guardado (si lo tiene), o resaltado si se está marcando.
    const estiloNumero =
      !seleccionado && colorGuardado ? { color: `rgb(${colorOdontogramaInfo[colorGuardado].rgb})` } : undefined;
    return (
      <div
        key={tooth}
        className="flex min-w-0 flex-col items-center gap-0.5"
        style={{ gridColumnStart: columna + 1, gridRowStart: fila + 1 }}
      >
        <button
          type="button"
          onClick={() => onToggleTooth(tooth)}
          style={estiloNumero}
          className={`rounded px-1 text-[10px] font-semibold transition-colors ${
            seleccionado ? "bg-accent/20 text-accent" : colorGuardado ? "" : "text-ink/50 hover:text-ink"
          }`}
        >
          {tooth}
        </button>
        <SimboloDiente
          tooth={tooth}
          superficiesActivas={selectedSurfaces[tooth] ?? []}
          dienteCompleto={seleccionado && (selectedSurfaces[tooth] ?? []).length === 0}
          colorActual={colorActual}
          pintados={pintados}
          onToggleSuperficie={(s) => onToggleSurface(tooth, s)}
        />
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        {title && <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50">{title}</h3>}
        {onCambiarColor && (
          <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Color con el que se pinta">
            <span className="text-[11px] font-semibold text-ink/50">Pintar en:</span>
            {COLORES_ODONTOGRAMA.map((c) => {
              const info = colorOdontogramaInfo[c];
              const activo = colorActual === c;
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  onClick={() => onCambiarColor(c)}
                  title={`${info.etiqueta}: ${info.significado}`}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    activo ? "border-ink/40 bg-ink/10 text-ink" : "border-edge/15 text-ink/50 hover:text-ink"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: `rgb(${info.rgb})` }} />
                  {info.etiqueta} · {info.significado}
                </button>
              );
            })}
          </div>
        )}
        <p className="w-full text-[11px] text-ink/40 sm:w-auto">
          Clic en el número = todo el diente · clic en una cara del símbolo = esa superficie
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {CUADRANTES.map((c) => {
          const alinearDerecha = c.numero === 1 || c.numero === 4;
          // Cada temporal va debajo de su permanente: el 51 bajo el 11, el 81 bajo el 41, el 55
          // bajo el 15... En los cuadrantes 1 y 4 el 11/41 es la última columna; en el 2 y 3,
          // la primera. Los 5 temporales ocupan las columnas de los incisivos hasta el
          // primer molar del cuadrante — nunca las de los molares permanentes.
          const columnaTemporal = (i: number) => (alinearDerecha ? COLUMNAS_POR_CUADRANTE - c.temporales.length + i : i);
          return (
            <div key={c.numero} className="space-y-2 rounded-xl border border-edge/10 bg-inset p-3">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ink/30">
                Cuadrante {c.numero}
              </span>
              <div
                className={`grid w-full max-w-[424px] gap-x-2 gap-y-2 ${alinearDerecha ? "lg:ml-auto" : ""}`}
                style={{ gridTemplateColumns: `repeat(${COLUMNAS_POR_CUADRANTE}, minmax(0, 1fr))` }}
              >
                {c.permanentes.map((tooth, i) => celda(tooth, i, 0))}
                {c.temporales.map((tooth, i) => celda(tooth, columnaTemporal(i), 1))}
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
