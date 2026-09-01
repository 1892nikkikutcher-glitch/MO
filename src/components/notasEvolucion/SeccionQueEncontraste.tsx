"use client";

import { useState } from "react";
import Odontograma from "@/components/pages/Odontograma";
import { usePatientData } from "@/context/PatientDataContext";
import { subirFotoPaciente } from "@/lib/fotosPaciente";
import type { FotoPaciente } from "@/lib/patientData";
import { Chip, botonSecundario, inputClass, labelClass } from "./NotaUI";
import {
  chipsHallazgos,
  recomendacionSignosVitales,
  type ChipHallazgo,
  type DecisionSignosVitales,
  type NotaEvolucionV2,
  type QueEncontraste,
  type SignosVitales,
} from "@/lib/notasEvolucion";

const etiquetas: Record<ChipHallazgo, string> = {
  caries: "Caries",
  fractura: "Fractura",
  movilidad: "Movilidad",
  inflamacion_gingival: "Inflamación gingival",
  absceso: "Absceso",
  fistula: "Fístula",
  sensibilidad_percusion: "Sensibilidad a la percusión",
  calculo: "Cálculo",
  placa: "Placa",
  restauracion_defectuosa: "Restauración defectuosa",
  sin_hallazgos_relevantes: "Sin hallazgos clínicos relevantes",
  otro: "Otro",
};

export default function SeccionQueEncontraste({
  valor,
  patientId,
  tipoProcedimientoSeleccionado,
  onChange,
  onBlurTexto,
}: {
  valor: QueEncontraste;
  patientId: string;
  tipoProcedimientoSeleccionado?: string;
  onChange: (updater: (prev: NotaEvolucionV2) => NotaEvolucionV2, opts?: { inmediato?: boolean }) => void;
  onBlurTexto?: () => void;
}) {
  const [mostrarSignosVitales, setMostrarSignosVitales] = useState(!!valor.signosVitales);
  const { clinicUid, fotosPorPaciente, setFotosPaciente } = usePatientData();
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [errorFoto, setErrorFoto] = useState("");

  function set<K extends keyof QueEncontraste>(key: K, value: QueEncontraste[K], opts?: { inmediato?: boolean }) {
    onChange((prev) => ({ ...prev, queEncontraste: { ...valor, [key]: value } }), opts);
  }

  // Las fotos en sí viven en fotosPorPaciente (mismo documento que
  // Fotografías, carpeta "notasEvolucion") — la nota solo guarda IDs
  // (fotosVinculadasIds), nunca duplica el archivo ni su registro.
  const fotosDelPaciente = fotosPorPaciente[patientId]?.notasEvolucion ?? [];
  const fotosAdjuntas = (valor.fotosVinculadasIds ?? [])
    .map((id) => fotosDelPaciente.find((f) => f.id === id))
    .filter((f): f is FotoPaciente => !!f);

  const agregarFoto = async (file: File) => {
    if (!clinicUid) return;
    setSubiendoFoto(true);
    setErrorFoto("");
    try {
      const foto = await subirFotoPaciente(clinicUid, patientId, "notasEvolucion", file);
      setFotosPaciente(patientId, (prev) => ({ ...prev, notasEvolucion: [...(prev.notasEvolucion ?? []), foto] }));
      set("fotosVinculadasIds", [...(valor.fotosVinculadasIds ?? []), foto.id], { inmediato: true });
    } catch (err) {
      setErrorFoto(err instanceof Error ? err.message : "No se pudo subir la foto.");
    } finally {
      setSubiendoFoto(false);
    }
  };

  // Solo desvincula de esta nota — nunca borra el archivo ni el registro en
  // fotosPorPaciente, para no perder información clínica por accidente.
  const quitarFotoDeLaNota = (fotoId: string) => {
    set("fotosVinculadasIds", (valor.fotosVinculadasIds ?? []).filter((id) => id !== fotoId), { inmediato: true });
  };

  function toggleChip(chip: ChipHallazgo) {
    const chips = valor.chips.includes(chip) ? valor.chips.filter((c) => c !== chip) : [...valor.chips, chip];
    set("chips", chips, { inmediato: true });
  }

  function setDecisionSignosVitales(decision: DecisionSignosVitales, opts?: { inmediato?: boolean }) {
    set("signosVitales", decision, opts);
  }

  function setValorSignoVital(campo: keyof SignosVitales, v: string) {
    const actual = valor.signosVitales?.valores ?? {};
    setDecisionSignosVitales({
      accion: "registrados_ahora",
      recomendacionMostrada: valor.signosVitales?.recomendacionMostrada,
      valores: { ...actual, [campo]: v },
    });
  }

  const recomendado = recomendacionSignosVitales(tipoProcedimientoSeleccionado);

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Órgano dental / zona</label>
        <Odontograma selectedTeeth={valor.organosDentales} onToggleTooth={(t) => {
          const organos = valor.organosDentales.includes(t)
            ? valor.organosDentales.filter((o) => o !== t)
            : [...valor.organosDentales, t];
          set("organosDentales", organos, { inmediato: true });
        }} />
      </div>

      <div className="flex flex-wrap gap-2">
        {chipsHallazgos.map((c) => (
          <Chip key={c} seleccionado={valor.chips.includes(c)} onClick={() => toggleChip(c)}>
            {etiquetas[c]}
          </Chip>
        ))}
      </div>

      <div>
        <label className={labelClass}>Exploración clínica (opcional)</label>
        <textarea
          className={inputClass}
          rows={2}
          value={valor.exploracionClinica ?? ""}
          onChange={(e) => set("exploracionClinica", e.target.value)}
          onBlur={onBlurTexto}
        />
      </div>

      <div>
        <label className={labelClass}>Estudios revisados (opcional)</label>
        <input
          className={inputClass}
          value={valor.estudiosRevisados ?? ""}
          onChange={(e) => set("estudiosRevisados", e.target.value)}
        />
      </div>

      <div>
        <label className={labelClass}>Fotografías del hallazgo (opcional, a tu criterio)</label>
        <p className="mb-2 text-xs text-ink/40">
          Útil para dejar evidencia visual del caso — por ejemplo, si el diagnóstico se pierde o para aclarar dudas después.
        </p>
        {fotosAdjuntas.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {fotosAdjuntas.map((foto) => (
              <div key={foto.id} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={foto.url} alt={foto.name} className="h-20 w-20 rounded-lg border border-edge/15 object-cover" />
                <button
                  type="button"
                  onClick={() => quitarFotoDeLaNota(foto.id)}
                  title="Quitar de esta nota"
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-xs text-white"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <label className={`${botonSecundario} inline-flex cursor-pointer items-center gap-1.5 ${subiendoFoto ? "pointer-events-none opacity-60" : ""}`}>
          📷 {subiendoFoto ? "Subiendo…" : "Agregar foto"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={subiendoFoto}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) agregarFoto(file);
            }}
          />
        </label>
        {errorFoto && <p className="mt-1 text-xs text-danger">{errorFoto}</p>}
      </div>

      {recomendado && !valor.signosVitales && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          Por el procedimiento seleccionado recomendamos registrar TA y FC antes de continuar — no es obligatorio.
        </p>
      )}

      {!mostrarSignosVitales && !valor.signosVitales && (
        <button type="button" onClick={() => setMostrarSignosVitales(true)} className={botonSecundario}>
          Agregar signos vitales
        </button>
      )}

      {(mostrarSignosVitales || valor.signosVitales) && (
        <div className="rounded-lg border border-edge/10 bg-field p-3">
          <div className="mb-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setDecisionSignosVitales({ accion: "registrados_ahora", valores: valor.signosVitales?.valores ?? {} }, { inmediato: true })}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                valor.signosVitales?.accion === "registrados_ahora" ? "border-accent/60 bg-accent/15 text-accent" : "border-edge/15 text-ink/60"
              }`}
            >
              Registrar ahora
            </button>
            <button
              type="button"
              onClick={() => setDecisionSignosVitales({ accion: "reutilizados_recientes" }, { inmediato: true })}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                valor.signosVitales?.accion === "reutilizados_recientes" ? "border-accent/60 bg-accent/15 text-accent" : "border-edge/15 text-ink/60"
              }`}
            >
              Usar signos vitales recientes
            </button>
            <button
              type="button"
              onClick={() => setDecisionSignosVitales({ accion: "no_necesario" }, { inmediato: true })}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                valor.signosVitales?.accion === "no_necesario" ? "border-accent/60 bg-accent/15 text-accent" : "border-edge/15 text-ink/60"
              }`}
            >
              No fue necesario repetirlos
            </button>
          </div>

          {valor.signosVitales?.accion === "registrados_ahora" && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(
                [
                  ["presionArterial", "TA"],
                  ["frecuenciaCardiaca", "FC"],
                  ["frecuenciaRespiratoria", "FR"],
                  ["temperatura", "Temp."],
                  ["saturacion", "SpO₂"],
                  ["peso", "Peso"],
                ] as const
              ).map(([campo, etiqueta]) => (
                <div key={campo}>
                  <label className={labelClass}>{etiqueta}</label>
                  <input
                    className={inputClass}
                    value={valor.signosVitales?.valores?.[campo] ?? ""}
                    onChange={(e) => setValorSignoVital(campo, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
