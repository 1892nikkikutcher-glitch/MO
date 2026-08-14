"use client";

import { useEffect, useState } from "react";
import Odontograma from "./Odontograma";
import { usePatientData } from "@/context/PatientDataContext";
import {
  esNegacionExplicita,
  respuestasVacias,
  type PreguntaTemplate,
  type RespuestaValor,
  type RespuestasHistoriaClinica,
} from "@/lib/historiaClinica";

type SiNo = "" | "si" | "no";

const fasesTratamiento = ["I", "II", "III", "Ortodoncia"] as const;
type FaseTratamiento = (typeof fasesTratamiento)[number];
type PuntoPrioridad = { id: string; texto: string; fase?: FaseTratamiento };

const faseInfo: Record<FaseTratamiento, { titulo: string; descripcion: string }> = {
  I: { titulo: "Fase I", descripcion: "Remoción de procesos infecciosos" },
  II: { titulo: "Fase II", descripcion: "Rehabilitación" },
  III: { titulo: "Fase III", descripcion: "Mantenimiento" },
  Ortodoncia: {
    titulo: "Etapa de Ortodoncia",
    descripcion: "Independiente de las fases I-III — solo si el caso lo requiere",
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

function SiNoRow({ label, value, onChange }: { label: string; value: SiNo; onChange: (v: SiNo) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-edge/5 py-2 last:border-0">
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
  const info = faseInfo[fase];

  const agregar = () => {
    if (!nuevo.trim()) return;
    onAgregar(nuevo.trim());
    setNuevo("");
  };

  return (
    <div className={`rounded-xl border p-4 ${fase === "Ortodoncia" ? "border-info/25 bg-info/5" : "border-edge/10 bg-inset"}`}>
      <p className="text-sm font-semibold text-ink">{info.titulo}</p>
      <p className="mb-3 text-xs text-ink/50">{info.descripcion}</p>

      <div className="space-y-2">
        {puntos.map((punto, index) => (
          <div key={punto.id} className="flex items-center justify-between gap-3 rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm">
            <span className="text-ink">
              <span className="mr-2 font-semibold text-accent">{index + 1}.</span>
              {punto.texto}
            </span>
            <button onClick={() => onQuitar(punto.id)} className="text-ink/30 hover:text-danger" title="Quitar">
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

function PreguntaRenderer({
  pregunta,
  valor,
  onChange,
}: {
  pregunta: PreguntaTemplate;
  valor: RespuestaValor | undefined;
  onChange: (v: RespuestaValor) => void;
}) {
  if (pregunta.tipo === "sino") {
    return <SiNoRow label={pregunta.etiqueta} value={(valor as SiNo) ?? ""} onChange={onChange} />;
  }
  if (pregunta.tipo === "texto") {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">{pregunta.etiqueta}</label>
        <input
          type="text"
          value={(valor as string) ?? ""}
          placeholder={pregunta.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      </div>
    );
  }
  if (pregunta.tipo === "textarea") {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">{pregunta.etiqueta}</label>
        <textarea
          value={(valor as string) ?? ""}
          placeholder={pregunta.placeholder}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={`${inputClass} resize-none`}
        />
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
    const dientes = (valor as number[]) ?? [];
    return (
      <Odontograma
        selectedTeeth={dientes}
        onToggleTooth={(tooth) => onChange(dientes.includes(tooth) ? dientes.filter((t) => t !== tooth) : [...dientes, tooth])}
        title=""
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

export default function HistoriaClinica({ patientId }: { patientId: string }) {
  const { historiaClinicaTemplate, historiaClinicaPorPaciente, setRespuestasHistoriaClinica, irAPagina } =
    usePatientData();
  const guardadas = historiaClinicaPorPaciente[patientId] ?? respuestasVacias;

  const [borrador, setBorrador] = useState<RespuestasHistoriaClinica>(guardadas);
  const [guardando, setGuardando] = useState(false);

  // Al cambiar de paciente (o cuando llegan datos guardados por primera vez
  // desde Firestore), se recarga el borrador local desde lo guardado — pero
  // sin pisar ediciones que el usuario todavía no ha guardado.
  useEffect(() => {
    setBorrador(guardadas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const yaGuardado = Boolean(guardadas.actualizadoEn);
  const hayCambiosSinGuardar = JSON.stringify(borrador) !== JSON.stringify(guardadas);

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

  return (
    <div className="space-y-6">
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
          </div>
        );
      })()}

      {historiaClinicaTemplate.secciones.map((seccion, i) => (
        <Section key={seccion.id} number={i + 1} title={seccion.titulo}>
          {seccion.preguntas.map((pregunta) => (
            <PreguntaRenderer
              key={pregunta.id}
              pregunta={pregunta}
              valor={borrador.porPregunta[pregunta.id]}
              onChange={(v) => actualizarPregunta(pregunta.id, v)}
            />
          ))}
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
            <span className="ml-2 font-semibold text-accent">Tienes cambios sin guardar.</span>
          )}
        </p>
        <button
          onClick={guardar}
          disabled={guardando || !hayCambiosSinGuardar}
          className="shrink-0 rounded-lg bg-gradient-to-r from-accent to-orange-500 px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {guardando ? "Guardando…" : yaGuardado ? "Actualizar Historial" : "Guardar Historial"}
        </button>
      </div>
    </div>
  );
}
