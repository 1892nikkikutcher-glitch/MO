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
  esSeccionGinecoObstetrica,
  respuestasVacias,
  resumenAntecedentesPatologicos,
  valorOdontogramaComoDiagnosticos,
  type DiagnosticoOdontograma,
  type PreguntaTemplate,
  type PresupuestoPrefillItem,
  type RespuestaValor,
  type RespuestasHistoriaClinica,
} from "@/lib/historiaClinica";
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

/** Odontograma para anotar diagnósticos por diente (uno o varios a la
 * vez) — marcar dientes arriba deja una selección "en borrador" que se
 * convierte en un renglón guardado al capturar el diagnóstico, igual que
 * el flujo de agregar procedimientos en Nuevo Presupuesto. El tratamiento
 * sugerido es criterio del médico (no un cálculo), y sirve después para
 * prellenar un renglón de presupuesto para este mismo diagnóstico. */
function OdontogramaDiagnostico({
  entries,
  onChange,
  presupuestos,
  onAgregarAPresupuesto,
  onVerPresupuestos,
}: {
  entries: DiagnosticoOdontograma[];
  onChange: (entries: DiagnosticoOdontograma[]) => void;
  presupuestos: SavedBudget[];
  onAgregarAPresupuesto: (entradas: DiagnosticoOdontograma[]) => void;
  onVerPresupuestos: () => void;
}) {
  const { procedimientos } = usePatientData();
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([]);
  const [diagnosticoTexto, setDiagnosticoTexto] = useState("");
  const [tratamientoSugerido, setTratamientoSugerido] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [entradaAEliminar, setEntradaAEliminar] = useState<DiagnosticoOdontograma | null>(null);
  const [seleccionadosParaPresupuesto, setSeleccionadosParaPresupuesto] = useState<Set<string>>(new Set());

  const toggleSeleccionParaPresupuesto = (id: string) => {
    setSeleccionadosParaPresupuesto((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
          {seleccionadosParaPresupuesto.size > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-accent/30 bg-accent/10 px-3 py-2">
              <span className="text-xs font-medium text-accent">
                {seleccionadosParaPresupuesto.size} diagnóstico(s) seleccionado(s)
              </span>
              <button
                type="button"
                onClick={() => {
                  onAgregarAPresupuesto(entries.filter((e) => seleccionadosParaPresupuesto.has(e.id)));
                  setSeleccionadosParaPresupuesto(new Set());
                }}
                className="rounded-lg border border-accent/50 bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/25"
              >
                + Agregar {seleccionadosParaPresupuesto.size} a presupuesto
              </button>
            </div>
          )}
          {entries.map((entry) => {
            const folioLigado = entry.presupuestoId
              ? presupuestos.find((p) => p.id === entry.presupuestoId)?.folio
              : undefined;
            const elegibleParaPresupuesto = Boolean(entry.tratamientoSugerido?.trim()) && !entry.presupuestoId;
            return (
              <div
                key={entry.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-edge/10 bg-inset px-3 py-2 text-sm"
              >
                <div className="flex items-start gap-2">
                  {elegibleParaPresupuesto && (
                    <input
                      type="checkbox"
                      checked={seleccionadosParaPresupuesto.has(entry.id)}
                      onChange={() => toggleSeleccionParaPresupuesto(entry.id)}
                      title="Seleccionar para agregar a presupuesto"
                      className="mt-1 accent-[color:var(--accent)]"
                    />
                  )}
                  <div>
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
                  </div>
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
  onAgregarAPresupuesto,
  onVerPresupuestos,
}: {
  pregunta: PreguntaTemplate;
  valor: RespuestaValor | undefined;
  onChange: (v: RespuestaValor) => void;
  detalle?: string;
  onChangeDetalle?: (v: string) => void;
  mostrarDetalle?: boolean;
  presupuestos: SavedBudget[];
  onAgregarAPresupuesto: (preguntaId: string, entradas: DiagnosticoOdontograma[]) => void;
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
        onAgregarAPresupuesto={(entradas) => onAgregarAPresupuesto(pregunta.id, entradas)}
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
}) {
  const {
    historiaClinicaTemplate,
    historiaClinicaPorPaciente,
    setRespuestasHistoriaClinica,
    irAPagina,
    setCambiosSinGuardar,
    patients,
    presupuestosPorPaciente,
  } = usePatientData();
  const guardadas = historiaClinicaPorPaciente[patientId] ?? respuestasVacias;
  const presupuestos = presupuestosPorPaciente[patientId] ?? [];
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

  // Guarda el historial primero (el diagnóstico recién anotado en el
  // odontograma podría existir solo en el borrador local todavía) y hasta
  // entonces avisa hacia arriba — así el presupuesto nunca referencia un
  // diagnóstico que en realidad no llegó a persistirse.
  const manejarAgregarAPresupuesto = (preguntaId: string, entradas: DiagnosticoOdontograma[]) => {
    guardar();
    onAgregarAPresupuesto(
      entradas.map((e) => ({
        preguntaId,
        diagnosticoId: e.id,
        procedure: e.tratamientoSugerido ?? "",
        teeth: e.dientes,
        note: e.diagnostico,
      }))
    );
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
                onAgregarAPresupuesto={manejarAgregarAPresupuesto}
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
