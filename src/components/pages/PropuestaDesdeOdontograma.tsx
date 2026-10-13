"use client";

import { useId, useMemo, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import {
  colorOdontogramaInfo,
  respuestasVacias,
  valorOdontogramaComoDiagnosticos,
  type PresupuestoPrefillItem,
  type RespuestaValor,
} from "@/lib/historiaClinica";
import { etiquetaSuperficie, formatearDientes, ordenarDientes } from "@/lib/odontograma";
import {
  buscarProcedimientoPorNombre,
  construirPlanTratamientoItem,
  prioridadTratamientoLabel,
  prioridadTratamientoOptions,
  type PlanTratamientoItem,
  type PrioridadTratamiento,
} from "@/lib/planTratamiento";
import { propuestaDesdeOdontograma, type PropuestaTratamiento } from "@/lib/propuestaTratamiento";

type Edicion = { incluir?: boolean; tratamiento?: string; prioridad?: PrioridadTratamiento };

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-2.5 py-1.5 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function textoDientes(p: PropuestaTratamiento) {
  const dientes = ordenarDientes(p.dientes);
  const caras = dientes
    .map((d) => {
      const s = p.superficiesPorDiente?.[d];
      return s && s.length > 0 ? `${d}: ${s.map((x) => etiquetaSuperficie(x, d)).join(", ")}` : null;
    })
    .filter(Boolean);
  return { base: formatearDientes(dientes), caras: caras.join(" · ") };
}

/** "Propuesta desde el odontograma": lo marcado por tratar queda ya listo como plan de
 * tratamiento y presupuesto — con los dientes del hallazgo y el tratamiento sugerido — para
 * que el profesional solo revise y confirme. Nada se crea hasta darle al botón, y el presupuesto
 * se abre para revisarlo antes de guardarlo. Al crear el plan, los diagnósticos incluidos
 * pasan a "confirmado" (es la decisión que se está tomando con ese clic). */
export default function PropuestaDesdeOdontograma({
  patientId,
  onCrearPresupuesto,
}: {
  patientId: string;
  /** Recibe los renglones para abrir Nuevo Presupuesto ya prellenado. */
  onCrearPresupuesto: (items: PresupuestoPrefillItem[]) => void;
}) {
  const {
    historiaClinicaTemplate,
    historiaClinicaPorPaciente,
    setRespuestasHistoriaClinica,
    planTratamientoPorPaciente,
    setPlanTratamientoPaciente,
    procedimientos,
    miUid,
  } = usePatientData();
  const idLista = useId();
  const [edicion, setEdicion] = useState<Record<string, Edicion>>({});
  const [creando, setCreando] = useState(false);

  const respuestas = historiaClinicaPorPaciente[patientId] ?? respuestasVacias;
  const planes = planTratamientoPorPaciente[patientId] ?? [];
  const catalogo = useMemo(() => procedimientos.filter((p) => p.activo !== false), [procedimientos]);
  const propuestas = useMemo(
    () => propuestaDesdeOdontograma(historiaClinicaTemplate, respuestas, planes, catalogo.map((c) => c.nombre)),
    [historiaClinicaTemplate, respuestas, planes, catalogo]
  );

  if (propuestas.length === 0) return null;

  const tratamientoDe = (p: PropuestaTratamiento) => edicion[p.diagnosticoId]?.tratamiento ?? p.tratamientoInicial;
  const prioridadDe = (p: PropuestaTratamiento): PrioridadTratamiento =>
    edicion[p.diagnosticoId]?.prioridad ?? p.planExistente?.prioridad ?? "media";
  // Por defecto entra todo lo que ya tiene tratamiento y no está en sospecha.
  const incluirDe = (p: PropuestaTratamiento) =>
    !p.bloqueo && (edicion[p.diagnosticoId]?.incluir ?? tratamientoDe(p).trim() !== "") && tratamientoDe(p).trim() !== "";
  const cambiar = (p: PropuestaTratamiento, cambios: Edicion) =>
    setEdicion((prev) => ({ ...prev, [p.diagnosticoId]: { ...prev[p.diagnosticoId], ...cambios } }));

  const elegidas = propuestas.filter(incluirDe);
  const sinTratamiento = propuestas.filter((p) => !p.bloqueo && tratamientoDe(p).trim() === "").length;

  function crear() {
    if (elegidas.length === 0 || creando) return;
    setCreando(true);
    const ahora = new Date().toISOString();
    const nuevosPlanes: PlanTratamientoItem[] = [];
    const prefill: PresupuestoPrefillItem[] = [];
    const porHallazgo = new Map<string, { tratamiento: string }>();

    elegidas.forEach((p, i) => {
      const tratamiento = tratamientoDe(p).trim();
      const prioridad = prioridadDe(p);
      // Precio: solo si el nombre coincide EXACTO con un único procedimiento activo del catálogo;
      // si no, el renglón queda como "Falta precio" para capturarlo al revisar el presupuesto.
      const match = buscarProcedimientoPorNombre(tratamiento, catalogo);
      const procedimiento = match.tipo === "match_unico" ? match.procedimiento : undefined;
      let planId = p.planExistente?.id;
      if (!planId) {
        planId = `plan${Date.now()}_${i}`;
        nuevosPlanes.push(
          construirPlanTratamientoItem({
            id: planId,
            patientId,
            diagnosticoId: p.diagnosticoId,
            preguntaId: p.preguntaId,
            diagnosticoTexto: p.diagnostico,
            estadoDiagnosticoSnapshot: "confirmado",
            dientes: p.dientes,
            tratamiento,
            procedimientoId: procedimiento?.id,
            prioridad,
            destino: "tratamiento_clinica",
            creadoEn: ahora,
            creadoPorUid: miUid,
          })
        );
      }
      porHallazgo.set(p.diagnosticoId, { tratamiento });
      prefill.push({
        preguntaId: p.preguntaId,
        diagnosticoId: p.diagnosticoId,
        planTratamientoItemId: planId,
        procedure: tratamiento,
        teeth: p.dientes,
        note: p.diagnostico,
        precioConfirmado: procedimiento?.costoPaciente,
        prioridad,
      });
    });

    // Los diagnósticos incluidos pasan a "confirmado" y conservan el tratamiento elegido.
    const actuales = respuestas;
    const porPregunta = { ...actuales.porPregunta };
    for (const preguntaId of new Set(elegidas.map((p) => p.preguntaId))) {
      porPregunta[preguntaId] = valorOdontogramaComoDiagnosticos(porPregunta[preguntaId]).map((e) => {
        const elegido = porHallazgo.get(e.id);
        if (!elegido) return e;
        return { ...e, estado: "confirmado" as const, tratamientoSugerido: e.tratamientoSugerido || elegido.tratamiento };
      }) as unknown as RespuestaValor;
    }
    if (nuevosPlanes.length > 0) setPlanTratamientoPaciente(patientId, (prev) => [...nuevosPlanes, ...prev]);
    setRespuestasHistoriaClinica(patientId, { ...actuales, porPregunta, actualizadoEn: ahora });
    onCrearPresupuesto(prefill);
    setCreando(false);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-accent/30 bg-accent/5 p-5">
      <div>
        <h4 className="text-sm font-semibold text-ink">Propuesta desde el odontograma</h4>
        <p className="mt-0.5 text-xs text-ink/60">
          {propuestas.length === 1 ? "Hay 1 hallazgo" : `Hay ${propuestas.length} hallazgos`} marcado{propuestas.length === 1 ? "" : "s"} por tratar
          que aún no están en un presupuesto. Ya vienen con sus dientes; revisa el tratamiento y qué incluir.
        </p>
      </div>

      <div className="space-y-2">
        {propuestas.map((p) => {
          const d = textoDientes(p);
          const incluida = incluirDe(p);
          return (
            <div
              key={p.diagnosticoId}
              className={`grid gap-2 rounded-xl border border-edge/10 bg-field p-3 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-center ${
                p.bloqueo ? "opacity-60" : ""
              }`}
            >
              <input
                type="checkbox"
                aria-label={`Incluir ${d.base}: ${p.diagnostico}`}
                checked={incluida}
                disabled={Boolean(p.bloqueo) || tratamientoDe(p).trim() === ""}
                onChange={(e) => cambiar(p, { incluir: e.target.checked })}
                className="h-4 w-4 accent-[color:var(--accent)]"
              />
              <div className="min-w-0 text-sm">
                <p className="font-semibold text-ink">
                  {p.color && (
                    <span
                      className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle"
                      style={{ backgroundColor: `rgb(${colorOdontogramaInfo[p.color].rgb})` }}
                      title={colorOdontogramaInfo[p.color].etiqueta}
                    />
                  )}
                  {d.base}
                </p>
                <p className="text-ink/70">{p.diagnostico}</p>
                {d.caras && <p className="text-xs text-ink/40">{d.caras}</p>}
                {p.bloqueo && <p className="text-xs text-warning">{p.bloqueo}</p>}
                {p.planExistente && <p className="text-xs text-ink/40">Ya tiene plan de tratamiento; falta cotizarlo.</p>}
              </div>
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  list={idLista}
                  value={tratamientoDe(p)}
                  disabled={Boolean(p.bloqueo)}
                  onChange={(e) => cambiar(p, { tratamiento: e.target.value })}
                  placeholder="Tratamiento (ej. Resina clase I)"
                  aria-label={`Tratamiento para ${d.base}`}
                  className={inputClass}
                />
                {!p.bloqueo && tratamientoDe(p).trim() === "" && <p className="text-xs text-ink/40">Escribe el tratamiento para incluirlo.</p>}
                {p.tratamientoDeducido && edicion[p.diagnosticoId]?.tratamiento === undefined && (
                  <p className="text-xs text-ink/40">Sugerido según el diagnóstico — revísalo.</p>
                )}
              </div>
              <select
                value={prioridadDe(p)}
                disabled={Boolean(p.bloqueo) || Boolean(p.planExistente)}
                onChange={(e) => cambiar(p, { prioridad: e.target.value as PrioridadTratamiento })}
                aria-label={`Prioridad de ${d.base}`}
                className={inputClass}
              >
                {prioridadTratamientoOptions.map((o) => (
                  <option key={o} value={o}>
                    {prioridadTratamientoLabel[o]}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
      <datalist id={idLista}>
        {catalogo.map((c) => (
          <option key={c.id} value={c.nombre} />
        ))}
      </datalist>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-xs text-ink/50">
          Al crear, los diagnósticos incluidos pasan a <span className="font-medium text-ink/70">confirmados</span>, se guarda el plan y se abre el
          presupuesto para que lo revises antes de guardarlo. El precio sale del catálogo cuando el nombre del tratamiento coincide; si no,
          queda &quot;Falta precio&quot;.
          {sinTratamiento > 0 && ` ${sinTratamiento} sin tratamiento no se incluye${sinTratamiento === 1 ? "" : "n"}.`}
        </p>
        <button
          type="button"
          onClick={crear}
          disabled={elegidas.length === 0 || creando}
          className="rounded-lg border border-accent/50 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.4)" }}
        >
          {elegidas.length === 0 ? "Crear plan y presupuesto" : `Crear plan y presupuesto (${elegidas.length})`}
        </button>
      </div>
    </div>
  );
}
