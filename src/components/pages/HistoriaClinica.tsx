"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Odontograma from "./Odontograma";
import { usePatientData } from "@/context/PatientDataContext";
import ConfirmarEliminar from "@/components/ConfirmarEliminar";
import {
  claveDetalleSiNo,
  esNegacionExplicita,
  esSeccionAntecedentesPatologicos,
  esSeccionDiagnosticoSistemico,
  esSeccionExamenTejidos,
  esSeccionGinecoObstetrica,
  estadoDiagnosticoOdontogramaLabel,
  estadoDiagnosticoOdontogramaOptions,
  estadoParaMostrar,
  respuestasVacias,
  resumenAntecedentesPatologicos,
  valorOdontogramaComoDiagnosticos,
  type DiagnosticoOdontograma,
  type EstadoDiagnosticoOdontograma,
  type PreguntaTemplate,
  type PresupuestoPrefillItem,
  type RespuestaValor,
  type RespuestasHistoriaClinica,
} from "@/lib/historiaClinica";
import {
  buscarProcedimientoPorNombre,
  construirPlanTratamientoItem,
  destinoPlanTratamientoLabel,
  destinoPlanTratamientoOptions,
  prioridadTratamientoLabel,
  prioridadTratamientoOptions,
  validarCreacionPlanTratamiento,
  type DestinoPlanTratamiento,
  type PlanTratamientoItem,
  type PrioridadTratamiento,
} from "@/lib/planTratamiento";
import type { SavedBudget } from "@/lib/patientData";

type SiNo = "" | "si" | "no";

const fasesTratamiento = ["I", "II", "III", "Ortodoncia"] as const;
type FaseTratamiento = (typeof fasesTratamiento)[number];
type PuntoPrioridad = { id: string; texto: string; fase?: FaseTratamiento };

const faseInfo: Record<FaseTratamiento, { titulo: string; descripcion: string }> = {
  I: {
    titulo: "Fase I",
    descripcion: "Motivo de consulta, limpieza bucal. Disminución de carga bacteriana, curetajes cerrados.",
  },
  II: { titulo: "Fase II", descripcion: "Operatoria dental" },
  III: {
    titulo: "Fase III",
    descripcion: "Exodoncias, endodoncias, cirugías, injertos, curetajes abiertos.",
  },
  Ortodoncia: {
    titulo: "Fase IV",
    descripcion: "Fase ortodóncica, fase protésica.",
  },
};

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
        <span className="text-accent">{number}.</span> {title}
      </h3>
      {children}
    </div>
  );
}

function SiNoRow({
  label,
  value,
  onChange,
  detalle,
  onChangeDetalle,
  mostrarDetalle,
}: {
  label: string;
  value: SiNo;
  onChange: (v: SiNo) => void;
  detalle?: string;
  onChangeDetalle?: (v: string) => void;
  mostrarDetalle?: boolean;
}) {
  return (
    <div className="border-b border-edge/5 py-2 last:border-0">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-ink/70">{label}</span>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => onChange(value === "si" ? "" : "si")}
            className={`h-7 w-12 rounded-md border text-xs font-semibold transition-colors ${
              value === "si" ? "border-success bg-success/15 text-success" : "border-edge/15 text-ink/40 hover:border-edge/30"
            }`}
          >
            SI
          </button>
          <button
            type="button"
            onClick={() => onChange(value === "no" ? "" : "no")}
            className={`h-7 w-12 rounded-md border text-xs font-semibold transition-colors ${
              value === "no" ? "border-danger bg-danger/15 text-danger" : "border-edge/15 text-ink/40 hover:border-edge/30"
            }`}
          >
            NO
          </button>
        </div>
      </div>
      {value === "si" && mostrarDetalle && (
        <input
          type="text"
          value={detalle ?? ""}
          onChange={(e) => onChangeDetalle?.(e.target.value)}
          placeholder="Ej. desde cuándo, si está controlado(a) y con qué se controla..."
          className={`${inputClass} mt-2`}
        />
      )}
    </div>
  );
}

function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              isSelected ? "border-accent bg-accent/15 text-accent" : "border-edge/15 text-ink/50 hover:border-accent/40 hover:text-ink"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

function FaseSection({
  fase,
  puntos,
  onAgregar,
  onQuitar,
}: {
  fase: FaseTratamiento;
  puntos: PuntoPrioridad[];
  onAgregar: (texto: string) => void;
  onQuitar: (id: string) => void;
}) {
  const [nuevo, setNuevo] = useState("");
  const [puntoAQuitar, setPuntoAQuitar] = useState<PuntoPrioridad | null>(null);
  const info = faseInfo[fase];

  const agregar = () => {
    if (!nuevo.trim()) return;
    onAgregar(nuevo.trim());
    setNuevo("");
  };

  return (
    <div className="rounded-xl border border-edge/10 bg-inset p-4">
      <p className="text-sm font-semibold text-ink">{info.titulo}</p>
      <p className="mb-3 text-xs text-ink/50">{info.descripcion}</p>

      <div className="space-y-2">
        {puntos.map((punto, index) => (
          <div key={punto.id} className="flex items-center justify-between gap-3 rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm">
            <span className="text-ink">
              <span className="mr-2 font-semibold text-accent">{index + 1}.</span>
              {punto.texto}
            </span>
            <button onClick={() => setPuntoAQuitar(punto)} className="text-ink/30 hover:text-danger" title="Quitar">
              ✕
            </button>
          </div>
        ))}
        {puntos.length === 0 && <p className="text-xs text-ink/30">Sin puntos capturados todavía.</p>}
      </div>

      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              agregar();
            }
          }}
          placeholder="Ej. Extracción de OD 18, seguido de resina en OD 16..."
          className={inputClass}
        />
        <button onClick={agregar} className="shrink-0 rounded-lg border border-accent/40 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/10">
          + Agregar
        </button>
      </div>

      {puntoAQuitar && (
        <ConfirmarEliminar
          titulo="¿Quitar este punto?"
          mensaje={`"${puntoAQuitar.texto}"`}
          confirmLabel="Quitar"
          onCancel={() => setPuntoAQuitar(null)}
          onConfirm={() => {
            onQuitar(puntoAQuitar.id);
            setPuntoAQuitar(null);
          }}
        />
      )}
    </div>
  );
}

function ListaPrioridad({ valor, onChange }: { valor: PuntoPrioridad[]; onChange: (v: PuntoPrioridad[]) => void }) {
  const puntosPorFase = (fase: FaseTratamiento) =>
    valor.filter((p) => (p.fase ?? "I") === fase);

  const agregar = (fase: FaseTratamiento, texto: string) => {
    onChange([...valor, { id: `${Date.now()}`, texto, fase }]);
  };

  const quitar = (id: string) => onChange(valor.filter((p) => p.id !== id));

  return (
    <div className="space-y-3">
      {fasesTratamiento.map((fase) => (
        <FaseSection
          key={fase}
          fase={fase}
          puntos={puntosPorFase(fase)}
          onAgregar={(texto) => agregar(fase, texto)}
          onQuitar={quitar}
        />
      ))}
    </div>
  );
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatFechaCorta(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** Selector del estado clínico de un diagnóstico — siempre visible y
 * editable en cualquier momento, independiente de crear un plan. Un
 * diagnóstico legado sin `estado` se muestra como "Sin clasificar", NUNCA
 * se le asume "confirmado" (ver estadoParaMostrar en historiaClinica.ts). */
function EstadoDiagnosticoSelector({
  estado,
  onChange,
}: {
  estado: EstadoDiagnosticoOdontograma | undefined;
  onChange: (nuevo: EstadoDiagnosticoOdontograma) => void;
}) {
  const mostrado = estadoParaMostrar({ estado });
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1">
      <span className="text-xs text-ink/40">Estado:</span>
      {estadoDiagnosticoOdontogramaOptions.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
            mostrado === opt
              ? "border-accent/60 bg-accent/15 text-accent"
              : "border-edge/15 text-ink/50 hover:bg-surface"
          }`}
        >
          {estadoDiagnosticoOdontogramaLabel[opt]}
        </button>
      ))}
      {mostrado === "sin_clasificar" && (
        <span className="text-[11px] italic text-ink/30">Sin clasificar</span>
      )}
    </div>
  );
}

/** Clasifica `tratamiento` contra el catálogo real y exige confirmación
 * explícita del profesional antes de fijar cualquier precio — nunca elige
 * sola entre 2+ candidatos, y hasta un match único requiere un clic. */
function ResolverCatalogoYCotizar({
  tratamiento,
  onConfirmar,
  onCancelar,
}: {
  tratamiento: string;
  /** precioConfirmado ausente = "Precio pendiente", el renglón nace en $0
   * en NuevoPresupuesto (mismo comportamiento que hoy). */
  onConfirmar: (procedimientoId: string | undefined, precioConfirmado: number | undefined) => void;
  onCancelar: () => void;
}) {
  const { procedimientos } = usePatientData();
  const resultado = buscarProcedimientoPorNombre(tratamiento, procedimientos);

  if (resultado.tipo === "sin_match") {
    return (
      <div className="space-y-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs">
        <p className="text-warning">
          &quot;{tratamiento}&quot; no está en el catálogo — el renglón nacerá con &quot;Precio pendiente&quot;.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onConfirmar(undefined, undefined)}
            className="rounded-lg border border-accent/50 bg-accent/15 px-3 py-1.5 font-semibold text-accent hover:bg-accent/25"
          >
            Continuar con precio pendiente
          </button>
          <button type="button" onClick={onCancelar} className="rounded-lg border border-edge/15 px-3 py-1.5 text-ink/60 hover:bg-surface">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  if (resultado.tipo === "match_unico") {
    const p = resultado.procedimiento;
    return (
      <div className="space-y-2 rounded-lg border border-accent/30 bg-accent/10 p-3 text-xs">
        <p className="text-ink">
          Procedimiento encontrado en catálogo: <span className="font-semibold">{p.nombre}</span> — ${p.costoPaciente.toLocaleString("es-MX")}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onConfirmar(p.id, p.costoPaciente)}
            className="rounded-lg border border-accent/50 bg-accent/15 px-3 py-1.5 font-semibold text-accent hover:bg-accent/25"
          >
            Confirmar este precio
          </button>
          <button
            type="button"
            onClick={() => onConfirmar(undefined, undefined)}
            className="rounded-lg border border-edge/15 px-3 py-1.5 text-ink/60 hover:bg-surface"
          >
            Precio pendiente en su lugar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs">
      <p className="text-warning">Hay varias coincidencias — elige la correcta (nunca se elige sola):</p>
      <div className="flex flex-col gap-1.5">
        {resultado.candidatos.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onConfirmar(p.id, p.costoPaciente)}
            className="rounded-lg border border-edge/15 bg-surface px-3 py-1.5 text-left hover:border-accent/40"
          >
            {p.nombre} — ${p.costoPaciente.toLocaleString("es-MX")}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onConfirmar(undefined, undefined)}
          className="rounded-lg border border-edge/15 px-3 py-1.5 text-left text-ink/60 hover:bg-surface"
        >
          Ninguno de estos — precio pendiente
        </button>
      </div>
    </div>
  );
}

/** Panel corto para crear UN PlanTratamientoItem a partir de un diagnóstico
 * ya anotado — "¿qué haremos con este diagnóstico?" → tratamiento/prioridad
 * si aplica → "Incluir en presupuesto" resuelve el catálogo con
 * confirmación explícita. El plan se persiste SIEMPRE al guardar, sin
 * importar si se decide cotizar ahora o después (ver PlanTratamientoItem en
 * planTratamiento.ts, ronda 3 punto 3). */
function CrearPlanTratamientoPanel({
  entry,
  patientId,
  preguntaId,
  miUid,
  onConfirmarEstado,
  onGuardarPlan,
  onCancelar,
}: {
  entry: DiagnosticoOdontograma;
  patientId: string;
  preguntaId: string;
  miUid: string;
  onConfirmarEstado: (nuevo: EstadoDiagnosticoOdontograma) => void;
  onGuardarPlan: (plan: PlanTratamientoItem, prefill: PresupuestoPrefillItem | null) => void;
  onCancelar: () => void;
}) {
  const [destino, setDestino] = useState<DestinoPlanTratamiento | null>(null);
  const [tratamiento, setTratamiento] = useState(entry.tratamientoSugerido ?? "");
  const [prioridad, setPrioridad] = useState<PrioridadTratamiento>("media");
  const [incluirEnPresupuesto, setIncluirEnPresupuesto] = useState(true);
  const [resolviendoCatalogo, setResolviendoCatalogo] = useState(false);

  const validacion = destino ? validarCreacionPlanTratamiento(entry.estado, destino) : null;
  const bloqueadoPorProvisional = destino === "tratamiento_clinica" && entry.estado === "provisional";
  const motivoBloqueo = validacion && !validacion.permitido ? validacion.motivo : null;

  const construirYGuardar = (procedimientoId: string | undefined, precioConfirmado: number | undefined) => {
    if (!destino || !entry.estado) return;
    const id = `plan${Date.now()}`;
    const plan = construirPlanTratamientoItem({
      id,
      patientId,
      diagnosticoId: entry.id,
      preguntaId,
      diagnosticoTexto: entry.diagnostico,
      estadoDiagnosticoSnapshot: entry.estado,
      dientes: entry.dientes,
      tratamiento: destino === "tratamiento_clinica" ? tratamiento.trim() : "",
      procedimientoId,
      prioridad,
      destino,
      creadoEn: new Date().toISOString(),
      creadoPorUid: miUid,
    });
    const prefill: PresupuestoPrefillItem | null =
      destino === "tratamiento_clinica" && incluirEnPresupuesto
        ? {
            preguntaId,
            diagnosticoId: entry.id,
            planTratamientoItemId: id,
            procedure: tratamiento.trim(),
            teeth: entry.dientes,
            note: entry.diagnostico,
            precioConfirmado,
            prioridad,
          }
        : null;
    onGuardarPlan(plan, prefill);
  };

  const handleGuardarClick = () => {
    if (!validacion?.permitido) return;
    if (destino === "tratamiento_clinica" && incluirEnPresupuesto && tratamiento.trim()) {
      setResolviendoCatalogo(true);
      return;
    }
    construirYGuardar(undefined, undefined);
  };

  if (resolviendoCatalogo) {
    return (
      <div className="mt-2 space-y-2">
        <ResolverCatalogoYCotizar
          tratamiento={tratamiento.trim()}
          onConfirmar={(procedimientoId, precioConfirmado) => construirYGuardar(procedimientoId, precioConfirmado)}
          onCancelar={() => setResolviendoCatalogo(false)}
        />
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-accent/20 bg-accent/5 p-3">
      <div>
        <p className="mb-1 text-xs font-medium text-ink/60">¿Qué haremos con este diagnóstico?</p>
        <div className="flex flex-wrap gap-1.5">
          {destinoPlanTratamientoOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setDestino(opt)}
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                destino === opt ? "border-accent/60 bg-accent/15 text-accent" : "border-edge/15 text-ink/60 hover:bg-surface"
              }`}
            >
              {destinoPlanTratamientoLabel[opt]}
            </button>
          ))}
        </div>
      </div>

      {destino && motivoBloqueo && !bloqueadoPorProvisional && (
        <p className="text-xs text-danger">{motivoBloqueo}</p>
      )}

      {bloqueadoPorProvisional && (
        <div className="rounded-lg border border-warning/30 bg-warning/10 p-2.5 text-xs">
          <p className="text-warning">{motivoBloqueo}</p>
          <button
            type="button"
            onClick={() => onConfirmarEstado("confirmado")}
            className="mt-1.5 rounded-lg border border-accent/50 bg-accent/15 px-3 py-1 font-semibold text-accent hover:bg-accent/25"
          >
            Confirmar diagnóstico
          </button>
        </div>
      )}

      {destino === "tratamiento_clinica" && validacion?.permitido && (
        <div className="space-y-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Tratamiento</label>
            <input
              type="text"
              value={tratamiento}
              onChange={(e) => setTratamiento(e.target.value)}
              placeholder="Ej. Resina clase I"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Prioridad</label>
            <div className="flex flex-wrap gap-1.5">
              {prioridadTratamientoOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setPrioridad(opt)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${
                    prioridad === opt ? "border-accent/60 bg-accent/15 text-accent" : "border-edge/15 text-ink/60 hover:bg-surface"
                  }`}
                >
                  {prioridadTratamientoLabel[opt]}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-ink/70">
            <input
              type="checkbox"
              checked={incluirEnPresupuesto}
              onChange={(e) => setIncluirEnPresupuesto(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Incluir en presupuesto
          </label>
        </div>
      )}

      {destino && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGuardarClick}
            disabled={!validacion?.permitido || (destino === "tratamiento_clinica" && !tratamiento.trim())}
            className="rounded-lg border border-accent/50 bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar plan
          </button>
          <button type="button" onClick={onCancelar} className="rounded-lg border border-edge/15 px-3 py-1.5 text-xs font-semibold text-ink/60 hover:bg-surface">
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

/** Fila de un plan de tratamiento ya guardado — "Crear nueva cotización"
 * siempre disponible sin importar cuántas veces ya se haya cotizado (nunca
 * se bloquea por presupuestosVinculados existentes, ver ronda 3 punto 3). */
function PlanTratamientoRow({
  plan,
  patientId,
  onCotizar,
}: {
  plan: PlanTratamientoItem;
  patientId: string;
  onCotizar: (plan: PlanTratamientoItem, prefill: PresupuestoPrefillItem) => void;
}) {
  const [cotizando, setCotizando] = useState(false);
  const vinculos = plan.presupuestosVinculados ?? [];

  return (
    <div className="rounded-lg border border-edge/10 bg-inset px-2.5 py-2 text-xs">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-accent/10 px-2 py-0.5 font-semibold text-accent">{destinoPlanTratamientoLabel[plan.destino]}</span>
        {plan.destino === "tratamiento_clinica" && (
          <>
            <span className="text-ink">{plan.tratamiento}</span>
            <span className="rounded-full border border-edge/15 px-2 py-0.5 text-ink/50">{prioridadTratamientoLabel[plan.prioridad]}</span>
          </>
        )}
        <span className="text-ink/30">· estado del diagnóstico al crear el plan: {estadoDiagnosticoOdontogramaLabel[plan.estadoDiagnosticoSnapshot]}</span>
      </div>
      {vinculos.length > 0 && (
        <p className="mt-1 text-ink/40">Cotizado {vinculos.length} {vinculos.length === 1 ? "vez" : "veces"}</p>
      )}
      {plan.destino === "tratamiento_clinica" && plan.estadoClinico !== "cancelado" && (
        <div className="mt-1.5">
          {!cotizando ? (
            <button type="button" onClick={() => setCotizando(true)} className="font-semibold text-accent hover:underline">
              {vinculos.length > 0 ? "Crear nueva cotización" : "Crear cotización"}
            </button>
          ) : (
            <ResolverCatalogoYCotizar
              tratamiento={plan.tratamiento}
              onConfirmar={(procedimientoId, precioConfirmado) => {
                onCotizar(plan, {
                  preguntaId: plan.preguntaId,
                  diagnosticoId: plan.diagnosticoId,
                  planTratamientoItemId: plan.id,
                  procedure: plan.tratamiento,
                  teeth: plan.dientes,
                  note: plan.diagnosticoTexto,
                  precioConfirmado,
                  prioridad: plan.prioridad,
                });
                setCotizando(false);
              }}
              onCancelar={() => setCotizando(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** Odontograma para anotar diagnósticos por diente (uno o varios a la
 * vez) — marcar dientes arriba deja una selección "en borrador" que se
 * convierte en un renglón guardado al capturar el diagnóstico, igual que
 * el flujo de agregar procedimientos en Nuevo Presupuesto. El tratamiento
 * sugerido es criterio del médico (no un cálculo), y sirve después para
 * prellenar el tratamiento de un PlanTratamientoItem para este mismo
 * diagnóstico (ver "Crear plan de tratamiento" en cada renglón). */
function OdontogramaDiagnostico({
  entries,
  onChange,
  presupuestos,
  planesTratamiento,
  patientId,
  preguntaId,
  miUid,
  onGuardarPlan,
  onCrearCotizacion,
  onVerPresupuestos,
}: {
  entries: DiagnosticoOdontograma[];
  onChange: (entries: DiagnosticoOdontograma[]) => void;
  presupuestos: SavedBudget[];
  planesTratamiento: PlanTratamientoItem[];
  patientId: string;
  preguntaId: string;
  miUid: string;
  onGuardarPlan: (plan: PlanTratamientoItem) => void;
  onCrearCotizacion: (prefill: PresupuestoPrefillItem) => void;
  onVerPresupuestos: () => void;
}) {
  const { procedimientos } = usePatientData();
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [diagnosticoTexto, setDiagnosticoTexto] = useState("");
  const [tratamientoSugerido, setTratamientoSugerido] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [entradaAEliminar, setEntradaAEliminar] = useState<DiagnosticoOdontograma | null>(null);
  const [planEnCreacionParaId, setPlanEnCreacionParaId] = useState<string | null>(null);

  const toggleTooth = (t: number) =>
    setSelectedTeeth((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  const limpiarFormulario = () => {
    setSelectedTeeth([]);
    setDiagnosticoTexto("");
    setTratamientoSugerido("");
    setEditandoId(null);
  };

  const iniciarEdicion = (entry: DiagnosticoOdontograma) => {
    setEditandoId(entry.id);
    setSelectedTeeth(entry.dientes);
    setDiagnosticoTexto(entry.diagnostico);
    setTratamientoSugerido(entry.tratamientoSugerido ?? "");
  };

  const guardarEntrada = () => {
    const diagnostico = diagnosticoTexto.trim();
    if (selectedTeeth.length === 0 || !diagnostico) return;
    if (editandoId) {
      const original = entries.find((e) => e.id === editandoId);
      const tieneDescendientes = planesTratamiento.some((p) => p.diagnosticoId === editandoId);
      // Protección mínima: un diagnóstico CONFIRMADO que ya originó al
      // menos un PlanTratamientoItem nunca se sobrescribe destructivamente
      // — se crea una entrada derivada en vez de mutar la original, que
      // permanece intacta y visible (ver derivadoDeDiagnosticoId,
      // historiaClinica.ts). Diagnósticos sin descendientes o no
      // confirmados se siguen editando en el mismo id, como antes.
      if (original?.estado === "confirmado" && tieneDescendientes) {
        const derivado: DiagnosticoOdontograma = {
          id: `diag${Date.now()}`,
          dientes: selectedTeeth,
          diagnostico,
          tratamientoSugerido: tratamientoSugerido.trim() || undefined,
          fecha: todayISO(),
          derivadoDeDiagnosticoId: original.id,
        };
        onChange([derivado, ...entries]);
      } else {
        onChange(
          entries.map((e) =>
            e.id === editandoId
              ? {
                  ...e,
                  dientes: selectedTeeth,
                  diagnostico,
                  tratamientoSugerido: tratamientoSugerido.trim() || undefined,
                  fecha: e.fecha || todayISO(),
                }
              : e
          )
        );
      }
    } else {
      const nuevo: DiagnosticoOdontograma = {
        id: `diag${Date.now()}`,
        dientes: selectedTeeth,
        diagnostico,
        tratamientoSugerido: tratamientoSugerido.trim() || undefined,
        fecha: todayISO(),
      };
      onChange([nuevo, ...entries]);
    }
    limpiarFormulario();
  };

  const quitarEntrada = (id: string) => onChange(entries.filter((e) => e.id !== id));

  const cambiarEstado = (entryId: string, nuevoEstado: EstadoDiagnosticoOdontograma) => {
    onChange(entries.map((e) => (e.id === entryId ? { ...e, estado: nuevoEstado } : e)));
  };

  return (
    <div className="space-y-4">
      <Odontograma selectedTeeth={selectedTeeth} onToggleTooth={toggleTooth} title="" hideSummary />

      <div className="space-y-3 rounded-lg border border-dashed border-edge/15 p-3">
        <p className="text-xs text-ink/40">
          Marca uno o varios dientes arriba y anota su diagnóstico — un mismo diagnóstico puede
          aplicar a varios dientes a la vez (ej. caries clase I en 3 piezas). Después de agregarlo o
          editarlo aquí, no olvides guardar el historial completo con el botón de hasta abajo.
        </p>
        {selectedTeeth.length > 0 && (
          <p className="text-xs font-semibold text-accent">
            OD {[...selectedTeeth].sort((a, b) => a - b).join(", ")}
          </p>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Diagnóstico</label>
          <input
            type="text"
            value={diagnosticoTexto}
            onChange={(e) => setDiagnosticoTexto(e.target.value)}
            placeholder="Ej. Caries de segundo grado clase I"
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">
            Tratamiento sugerido (opcional — para prellenar el presupuesto después)
          </label>
          <input
            type="text"
            list="odontograma-catalogo-procedimientos"
            value={tratamientoSugerido}
            onChange={(e) => setTratamientoSugerido(e.target.value)}
            placeholder="Ej. Resina clase I"
            className={inputClass}
          />
          <datalist id="odontograma-catalogo-procedimientos">
            {procedimientos.map((p) => (
              <option key={p.id} value={p.nombre} />
            ))}
          </datalist>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={guardarEntrada}
            disabled={selectedTeeth.length === 0 || !diagnosticoTexto.trim()}
            className="flex-1 rounded-lg border border-accent/40 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {editandoId ? "Aplicar al diagnóstico" : "+ Agregar diagnóstico"}
          </button>
          {editandoId && (
            <button
              type="button"
              onClick={limpiarFormulario}
              className="rounded-lg border border-edge/15 px-3 py-2 text-xs font-semibold text-ink/60 hover:bg-surface"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry) => {
            const folioLigado = entry.presupuestoId
              ? presupuestos.find((p) => p.id === entry.presupuestoId)?.folio
              : undefined;
            const planesDeEsteDiagnostico = planesTratamiento.filter((p) => p.diagnosticoId === entry.id);
            return (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-edge/10 bg-inset px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-accent">
                    OD {[...entry.dientes].sort((a, b) => a - b).join(", ")}
                  </p>
                  <p className="text-ink">
                    {entry.diagnostico || (
                      <span className="italic text-ink/40">Sin diagnóstico anotado — edítalo para agregarlo</span>
                    )}
                  </p>
                  {entry.tratamientoSugerido && (
                    <p className="text-xs text-ink/50">Tratamiento sugerido: {entry.tratamientoSugerido}</p>
                  )}
                  {(entry.fecha || entry.fechaPresupuesto) && (
                    <p className="text-xs text-ink/30">
                      {entry.fecha && `Diagnosticado ${formatFechaCorta(entry.fecha)}`}
                      {entry.fecha && entry.fechaPresupuesto && " · "}
                      {entry.fechaPresupuesto && `Presupuestado ${formatFechaCorta(entry.fechaPresupuesto)}`}
                    </p>
                  )}
                  {entry.presupuestoId && (
                    <button
                      type="button"
                      onClick={onVerPresupuestos}
                      className="text-xs font-semibold text-accent hover:underline"
                    >
                      Ya en presupuesto{folioLigado ? ` #${folioLigado}` : ""} — ver
                    </button>
                  )}

                  <EstadoDiagnosticoSelector estado={entry.estado} onChange={(nuevo) => cambiarEstado(entry.id, nuevo)} />

                  {planesDeEsteDiagnostico.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {planesDeEsteDiagnostico.map((plan) => (
                        <PlanTratamientoRow key={plan.id} plan={plan} patientId={patientId} onCotizar={(_, prefill) => onCrearCotizacion(prefill)} />
                      ))}
                    </div>
                  )}

                  {planEnCreacionParaId === entry.id ? (
                    <CrearPlanTratamientoPanel
                      entry={entry}
                      patientId={patientId}
                      preguntaId={preguntaId}
                      miUid={miUid}
                      onConfirmarEstado={(nuevo) => cambiarEstado(entry.id, nuevo)}
                      onGuardarPlan={(plan, prefill) => {
                        onGuardarPlan(plan);
                        if (prefill) onCrearCotizacion(prefill);
                        setPlanEnCreacionParaId(null);
                      }}
                      onCancelar={() => setPlanEnCreacionParaId(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPlanEnCreacionParaId(entry.id)}
                      className="mt-2 rounded-lg border border-accent/40 px-2.5 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
                    >
                      Crear plan de tratamiento
                    </button>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => iniciarEdicion(entry)}
                    title="Editar"
                    className="text-ink/30 transition-colors hover:text-accent"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntradaAEliminar(entry)}
                    title="Quitar"
                    className="text-ink/30 transition-colors hover:text-danger"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {entradaAEliminar && (
        <ConfirmarEliminar
          titulo="¿Quitar este diagnóstico?"
          mensaje={`OD ${[...entradaAEliminar.dientes].sort((a, b) => a - b).join(", ")} — "${
            entradaAEliminar.diagnostico || "Sin diagnóstico anotado"
          }". Esta acción no se puede deshacer.`}
          confirmLabel="Quitar"
          onCancel={() => setEntradaAEliminar(null)}
          onConfirm={() => {
            quitarEntrada(entradaAEliminar.id);
            setEntradaAEliminar(null);
          }}
        />
      )}
    </div>
  );
}

/** Convierte el valor separado por comas en la lista de términos ya
 * elegidos, y agrega/quita `termino` al hacer clic en su chip — el campo
 * sigue siendo texto libre (se puede escribir cualquier otra cosa además),
 * esto solo agiliza capturar los hallazgos más comunes de ese campo. */
function alternarSugerencia(valorActual: string, termino: string): string {
  const partes = valorActual
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const yaEsta = partes.some((p) => p.toLowerCase() === termino.toLowerCase());
  const siguientes = yaEsta ? partes.filter((p) => p.toLowerCase() !== termino.toLowerCase()) : [...partes, termino];
  return siguientes.join(", ");
}

function ChipsSugerencia({ valor, sugerencias, onChange }: { valor: string; sugerencias: string[]; onChange: (v: string) => void }) {
  const seleccionados = valor
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {sugerencias.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(alternarSugerencia(valor, s))}
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
            seleccionados.includes(s.toLowerCase())
              ? "border-accent bg-accent/15 text-accent"
              : "border-edge/15 bg-field text-ink/60 hover:border-accent/40 hover:text-ink"
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

function PreguntaRenderer({
  pregunta,
  valor,
  onChange,
  detalle,
  onChangeDetalle,
  mostrarDetalle,
  presupuestos,
  planesTratamiento,
  patientId,
  miUid,
  onGuardarPlan,
  onCrearCotizacion,
  onVerPresupuestos,
}: {
  pregunta: PreguntaTemplate;
  valor: RespuestaValor | undefined;
  onChange: (v: RespuestaValor) => void;
  detalle?: string;
  onChangeDetalle?: (v: string) => void;
  mostrarDetalle?: boolean;
  presupuestos: SavedBudget[];
  planesTratamiento: PlanTratamientoItem[];
  patientId: string;
  miUid: string;
  onGuardarPlan: (plan: PlanTratamientoItem) => void;
  onCrearCotizacion: (prefill: PresupuestoPrefillItem) => void;
  onVerPresupuestos: () => void;
}) {
  if (pregunta.tipo === "sino") {
    return (
      <SiNoRow
        label={pregunta.etiqueta}
        value={(valor as SiNo) ?? ""}
        onChange={onChange}
        detalle={detalle}
        onChangeDetalle={onChangeDetalle}
        mostrarDetalle={mostrarDetalle}
      />
    );
  }
  if (pregunta.tipo === "texto") {
    const texto = (valor as string) ?? "";
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">{pregunta.etiqueta}</label>
        <input
          type="text"
          value={texto}
          placeholder={pregunta.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
        {pregunta.sugerencias && pregunta.sugerencias.length > 0 && (
          <ChipsSugerencia valor={texto} sugerencias={pregunta.sugerencias} onChange={onChange} />
        )}
      </div>
    );
  }
  if (pregunta.tipo === "textarea") {
    const texto = (valor as string) ?? "";
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">{pregunta.etiqueta}</label>
        <textarea
          value={texto}
          placeholder={pregunta.placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={`${inputClass} resize-none`}
        />
        {pregunta.sugerencias && pregunta.sugerencias.length > 0 && (
          <ChipsSugerencia valor={texto} sugerencias={pregunta.sugerencias} onChange={onChange} />
        )}
      </div>
    );
  }
  if (pregunta.tipo === "chips") {
    const seleccion = (valor as string[]) ?? [];
    return (
      <div>
        <label className="mb-2 block text-xs font-medium text-ink/60">{pregunta.etiqueta}</label>
        <ChipGroup
          options={pregunta.opciones ?? []}
          selected={seleccion}
          onToggle={(opcion) =>
            onChange(seleccion.includes(opcion) ? seleccion.filter((o) => o !== opcion) : [...seleccion, opcion])
          }
        />
      </div>
    );
  }
  if (pregunta.tipo === "odontograma") {
    const entries = valorOdontogramaComoDiagnosticos(valor);
    return (
      <OdontogramaDiagnostico
        entries={entries}
        onChange={(next) => onChange(next as unknown as RespuestaValor)}
        presupuestos={presupuestos}
        planesTratamiento={planesTratamiento}
        patientId={patientId}
        preguntaId={pregunta.id}
        miUid={miUid}
        onGuardarPlan={onGuardarPlan}
        onCrearCotizacion={onCrearCotizacion}
        onVerPresupuestos={onVerPresupuestos}
      />
    );
  }
  if (pregunta.tipo === "listaPrioridad") {
    const puntos = (valor as unknown as PuntoPrioridad[]) ?? [];
    return <ListaPrioridad valor={puntos} onChange={(v) => onChange(v as unknown as RespuestaValor)} />;
  }
  return null;
}

function formatFechaHora(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoriaClinica({
  patientId,
  onAgregarAPresupuesto,
  onVerPresupuestos,
  onVerFotografias,
}: {
  patientId: string;
  /** Se llama al elegir uno o varios diagnósticos del odontograma y darle
   * "Agregar a presupuesto" — quien monta este componente (Expediente.tsx)
   * decide qué hacer (abrir Nuevo Presupuesto prellenado, cambiar de
   * pestaña). Este componente ya se aseguró de guardar el historial antes
   * de llamarlo, para que el diagnóstico no quede solo en el borrador. */
  onAgregarAPresupuesto: (items: PresupuestoPrefillItem[]) => void;
  /** Cambia a la pestaña Presupuestos — para el link "Ya en presupuesto…". */
  onVerPresupuestos: () => void;
  /** Cambia a la pestaña Fotografías — acceso directo desde el examen
   * clínico estomatológico, para respaldar visualmente el diagnóstico. */
  onVerFotografias: () => void;
}) {
  const {
    historiaClinicaTemplate,
    historiaClinicaPorPaciente,
    setRespuestasHistoriaClinica,
    irAPagina,
    setCambiosSinGuardar,
    patients,
    presupuestosPorPaciente,
    planTratamientoPorPaciente,
    setPlanTratamientoPaciente,
    miUid,
  } = usePatientData();
  const guardadas = historiaClinicaPorPaciente[patientId] ?? respuestasVacias;
  const presupuestos = presupuestosPorPaciente[patientId] ?? [];
  const planesTratamiento = planTratamientoPorPaciente[patientId] ?? [];
  const esMasculino = patients.find((p) => p.id === patientId)?.sexo === "Masculino";

  const [borrador, setBorrador] = useState<RespuestasHistoriaClinica>(guardadas);
  const [guardando, setGuardando] = useState(false);

  // Al cambiar de paciente (o cuando llegan datos guardados por primera vez
  // desde Firestore), se recarga el borrador local desde lo guardado — pero
  // sin pisar ediciones que el usuario todavía no ha guardado.
  useEffect(() => {
    setBorrador(guardadas);
    ultimoAutoGeneradoRef.current = "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  // Id de la pregunta textarea de "Diagnóstico Sistémico" (se detecta por
  // título de sección, igual que el resto de esta plantilla configurable).
  const preguntaDiagSistemicoId = useMemo(() => {
    for (const seccion of historiaClinicaTemplate.secciones) {
      if (esSeccionDiagnosticoSistemico(seccion.titulo)) {
        return seccion.preguntas.find((p) => p.tipo === "textarea")?.id ?? null;
      }
    }
    return null;
  }, [historiaClinicaTemplate]);

  const resumenAntecedentes = useMemo(
    () => resumenAntecedentesPatologicos(historiaClinicaTemplate, { porPregunta: borrador.porPregunta }),
    [historiaClinicaTemplate, borrador.porPregunta]
  );

  // Rastrea el último texto que ESTE efecto escribió en Diagnóstico
  // Sistémico — mientras el campo siga igual a eso, se sigue actualizando
  // solo; en cuanto el doctor lo edite a mano (o lo borre), deja de
  // tocarlo, para no pisar lo que ya escribió. La decisión y la mutación
  // del ref viven en el cuerpo del efecto (no dentro del updater de
  // setBorrador) a propósito: en modo estricto de desarrollo React invoca
  // dos veces la forma funcional de un setState, y mutar el ref ahí adentro
  // hacía que la segunda invocación viera un ref ya actualizado y descartara
  // la actualización silenciosamente.
  const ultimoAutoGeneradoRef = useRef("");
  useEffect(() => {
    if (!preguntaDiagSistemicoId) return;
    const actual = (borrador.porPregunta[preguntaDiagSistemicoId] as string) ?? "";
    const sigueSiendoAutoGenerado = actual === "" || actual === ultimoAutoGeneradoRef.current;
    if (!sigueSiendoAutoGenerado || actual === resumenAntecedentes) return;
    ultimoAutoGeneradoRef.current = resumenAntecedentes;
    setBorrador((prev) => ({
      ...prev,
      porPregunta: { ...prev.porPregunta, [preguntaDiagSistemicoId]: resumenAntecedentes },
    }));
  }, [resumenAntecedentes, preguntaDiagSistemicoId, borrador.porPregunta]);

  const yaGuardado = Boolean(guardadas.actualizadoEn);
  const hayCambiosSinGuardar = JSON.stringify(borrador) !== JSON.stringify(guardadas);

  // Avisa antes de salir (cambiar de pestaña dentro del expediente, ir a
  // otro módulo, o cerrar la pestaña) si hay ediciones sin guardar — antes
  // se perdían silenciosamente al cambiar de pantalla.
  useEffect(() => {
    setCambiosSinGuardar(hayCambiosSinGuardar ? "Historia Clínica tiene cambios sin guardar." : null);
    return () => setCambiosSinGuardar(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hayCambiosSinGuardar]);

  const actualizarPregunta = (preguntaId: string, valor: RespuestaValor) => {
    setBorrador((prev) => ({ ...prev, porPregunta: { ...prev.porPregunta, [preguntaId]: valor } }));
  };

  const guardar = () => {
    setGuardando(true);
    const conFecha: RespuestasHistoriaClinica = {
      ...borrador,
      actualizadoEn: new Date().toISOString(),
    };
    setRespuestasHistoriaClinica(patientId, conFecha);
    setBorrador(conFecha);
    setGuardando(false);
  };

  // Auto-guardado: cada 8s, si quedaron ediciones sin guardar, se guardan
  // solas — para no depender de que el doctor se acuerde de dar clic en
  // "Guardar" (información clínica delicada no debe depender de eso). Usa
  // refs en vez de depender de [borrador] directamente para que el
  // intervalo no se reinicie con cada tecleo — así se garantiza que corre
  // cada 8s de verdad, incluso si el doctor escribe sin pausar.
  const guardarRef = useRef(guardar);
  guardarRef.current = guardar;
  const hayCambiosSinGuardarRef = useRef(hayCambiosSinGuardar);
  hayCambiosSinGuardarRef.current = hayCambiosSinGuardar;
  useEffect(() => {
    const intervalo = setInterval(() => {
      if (hayCambiosSinGuardarRef.current) guardarRef.current();
    }, 8000);
    return () => clearInterval(intervalo);
  }, []);

  // Guarda el historial primero (el diagnóstico recién anotado, o su
  // estado recién confirmado, podrían existir solo en el borrador local
  // todavía) y hasta entonces persiste el plan — así un PlanTratamientoItem
  // nunca referencia un diagnóstico que en realidad no llegó a persistirse.
  // Crear el plan y cotizarlo son dos pasos independientes (ver
  // planTratamiento.ts): el plan se guarda SIEMPRE aquí; si además se pidió
  // cotizar, manejarCrearCotizacion se llama aparte y solo abre Presupuestos.
  const manejarGuardarPlan = (plan: PlanTratamientoItem) => {
    guardar();
    setPlanTratamientoPaciente(patientId, (prev) => [plan, ...prev]);
  };

  const manejarCrearCotizacion = (prefill: PresupuestoPrefillItem) => {
    onAgregarAPresupuesto([prefill]);
  };

  return (
    <div className="space-y-6">
      <p className="text-xs text-ink/30">
        💡 Este historial se guarda automáticamente mientras escribes. Aun así, para información
        delicada (diagnósticos, alergias), te recomendamos tomar una captura de pantalla como
        respaldo adicional por si acaso.
      </p>
      {(() => {
        const texto = borrador.alergias ?? "";
        const negado = esNegacionExplicita(texto);
        const hayAlergia = texto.trim().length > 0 && !negado;
        const estado = hayAlergia ? "danger" : negado ? "success" : "neutro";
        const estilos = {
          danger: {
            card: "border-danger/40 bg-danger/10",
            label: "text-danger",
            campo: "border-danger/30 focus:border-danger/60",
            nota: "text-danger/80",
            icono: "⚠ ",
          },
          success: {
            card: "border-success/40 bg-success/10",
            label: "text-success",
            campo: "border-success/30 focus:border-success/60",
            nota: "text-success/80",
            icono: "✓ ",
          },
          neutro: {
            card: "border-edge/10 bg-surface",
            label: "text-ink/70",
            campo: "border-edge/10 focus:border-accent/60",
            nota: "text-ink/40",
            icono: "",
          },
        }[estado];
        return (
          <div className={`space-y-3 rounded-2xl border p-6 ${estilos.card}`}>
            <label className={`block text-sm font-semibold ${estilos.label}`}>
              {estilos.icono}Alergias conocidas (medicamentos, alimentos, anestesia, etc.)
            </label>
            <textarea
              value={texto}
              onChange={(e) => setBorrador((prev) => ({ ...prev, alergias: e.target.value }))}
              placeholder="Ej. Penicilina, Aspirina — sepáralas por comas. Este campo se muestra como alerta en todo el expediente y al recetar."
              rows={2}
              className={`w-full resize-none rounded-lg border bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none ${estilos.campo}`}
            />
            <p className={`text-xs ${estilos.nota}`}>
              Muy importante: si el paciente tiene alguna alergia, regístrala aquí exactamente como
              se llama la sustancia — se usará para alertar antes de recetar un medicamento al que
              sea alérgico.
            </p>
            {estado !== "success" && (
              <p className="text-xs text-ink/40">
                Si no tiene alergias, escribe una de estas palabras para que el recuadro se ponga en
                verde:{" "}
                <span className="font-medium text-ink/60">
                  Ninguna, Negado(a), No refiere, Sin alergias, No presenta, No tiene, Desconoce
                </span>
                .
              </p>
            )}
          </div>
        );
      })()}

      {historiaClinicaTemplate.secciones.map((seccion, i) => (
        <Section key={seccion.id} number={i + 1} title={seccion.titulo}>
          {esSeccionExamenTejidos(seccion.titulo) && (
            <button
              type="button"
              onClick={onVerFotografias}
              className="flex items-center gap-1.5 rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
            >
              📷 Anexar fotografías del examen
            </button>
          )}
          {esMasculino && esSeccionGinecoObstetrica(seccion.titulo) ? (
            <p className="text-sm italic text-ink/40">
              No aplicable — paciente de sexo masculino.
            </p>
          ) : (
            seccion.preguntas.map((pregunta) => (
              <PreguntaRenderer
                key={pregunta.id}
                pregunta={pregunta}
                valor={borrador.porPregunta[pregunta.id]}
                onChange={(v) => actualizarPregunta(pregunta.id, v)}
                mostrarDetalle={esSeccionAntecedentesPatologicos(seccion.titulo)}
                detalle={borrador.porPregunta[claveDetalleSiNo(pregunta.id)] as string | undefined}
                onChangeDetalle={(v) => actualizarPregunta(claveDetalleSiNo(pregunta.id), v)}
                presupuestos={presupuestos}
                planesTratamiento={planesTratamiento}
                patientId={patientId}
                miUid={miUid}
                onGuardarPlan={manejarGuardarPlan}
                onCrearCotizacion={manejarCrearCotizacion}
                onVerPresupuestos={onVerPresupuestos}
              />
            ))
          )}
        </Section>
      ))}

      {historiaClinicaTemplate.secciones.length === 0 && (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          Aún no hay secciones configuradas. Ve a{" "}
          <button
            onClick={() => irAPagina("administracion-historial-clinico")}
            className="font-semibold text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
          >
            Administración → Historial Clínico
          </button>{" "}
          para crearlas.
        </div>
      )}

      <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 rounded-2xl border border-edge/10 bg-modal p-4 shadow-card">
        <p className="text-xs text-ink/40">
          {guardadas.actualizadoEn
            ? `Última actualización: ${formatFechaHora(guardadas.actualizadoEn)}`
            : "Este historial todavía no se ha guardado."}
          {hayCambiosSinGuardar && (
            <span className="ml-2 font-semibold text-accent">
              Tienes cambios sin guardar — se guardan solos en unos segundos, o dale clic a
              &quot;Guardar&quot; para no esperar.
            </span>
          )}
        </p>
        <button
          onClick={guardar}
          disabled={guardando || !hayCambiosSinGuardar}
          className="shrink-0 rounded-lg border border-accent/60 bg-accent/15 px-5 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {guardando ? "Guardando…" : yaGuardado ? "Actualizar Historial" : "Guardar Historial"}
        </button>
      </div>
    </div>
  );
}
