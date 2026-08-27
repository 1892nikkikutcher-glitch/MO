"use client";

import { useEffect, useRef, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import type { NotaEvolucion } from "@/lib/patientData";
import { sugerencias, type Sugerencia } from "@/lib/vocabularioNotas";

const psoapCampos = [
  {
    key: "presentacion",
    letra: "P",
    label: "Presentación",
    placeholder: "Motivo de la consulta, estado general con el que llega el paciente...",
  },
  {
    key: "subjetivo",
    letra: "S",
    label: "Subjetivo",
    placeholder: "Lo que el paciente refiere: dolor, molestias, síntomas...",
  },
  {
    key: "objetivo",
    letra: "O",
    label: "Objetivo",
    placeholder: "Hallazgos clínicos observados: exploración, estudios, signos...",
  },
  {
    key: "analisis",
    letra: "A",
    label: "Análisis",
    placeholder: "Valoración/diagnóstico del médico a partir de lo anterior...",
  },
  {
    key: "pronostico",
    letra: "P",
    label: "Pronóstico",
    placeholder: "Evolución esperada, plan a seguir y próxima cita...",
  },
] as const;

type PsoapKey = (typeof psoapCampos)[number]["key"];

const emptyForm: Record<PsoapKey, string> = {
  presentacion: "",
  subjetivo: "",
  objetivo: "",
  analisis: "",
  pronostico: "",
};

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function todayFormatted() {
  return new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Textarea con autocompletado propio de MO (diccionario dental + palabras
 * frecuentes de la clínica) en vez del corrector nativo del navegador — ver
 * src/lib/vocabularioNotas.ts para el porqué. `spellCheck={false}` apaga el
 * corrector nativo, que no se puede enseñar vocabulario clínico y termina
 * sugiriendo reemplazos incorrectos (ej. "sistémico" → "sistemático"). */
function CampoConSugerencias({
  value,
  onChange,
  placeholder,
  vocabularioClinica,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  vocabularioClinica: Record<string, number>;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursor, setCursor] = useState(0);

  const antesDelCursor = value.slice(0, cursor);
  const coincidencia = antesDelCursor.match(/[a-záéíóúñü]+$/i);
  const palabraActual = coincidencia?.[0] ?? "";
  const inicioPalabra = coincidencia ? cursor - palabraActual.length : cursor;
  const listaSugerencias: Sugerencia[] = palabraActual ? sugerencias(palabraActual, vocabularioClinica) : [];

  function aplicarSugerencia(palabra: string) {
    const nuevoValor = `${value.slice(0, inicioPalabra)}${palabra} ${value.slice(cursor)}`;
    onChange(nuevoValor);
    const nuevaPosicion = inicioPalabra + palabra.length + 1;
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(nuevaPosicion, nuevaPosicion);
    });
  }

  return (
    <div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setCursor(e.target.selectionStart ?? e.target.value.length);
        }}
        onClick={(e) => setCursor(e.currentTarget.selectionStart ?? 0)}
        onKeyUp={(e) => setCursor(e.currentTarget.selectionStart ?? 0)}
        onKeyDown={(e) => {
          if (e.key === "Tab" && listaSugerencias.length > 0) {
            e.preventDefault();
            aplicarSugerencia(listaSugerencias[0].palabra);
          }
        }}
        placeholder={placeholder}
        rows={2}
        spellCheck={false}
        className={`${inputClass} resize-none`}
      />
      {listaSugerencias.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {listaSugerencias.map((s) => (
            <button
              key={s.palabra}
              type="button"
              onClick={() => aplicarSugerencia(s.palabra)}
              title={s.fuente === "clinica" ? "De tu clínica" : "Diccionario dental"}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                s.fuente === "clinica"
                  ? "border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
                  : "border-edge/15 bg-field text-ink/60 hover:bg-surface2"
              }`}
            >
              {s.palabra}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotasEvolucion({ patientId }: { patientId: string }) {
  const {
    recursos,
    notasEvolucionPorPaciente,
    setNotasEvolucionPaciente,
    setCambiosSinGuardar,
    vocabularioNotas,
    registrarPalabrasDeNota,
  } = usePatientData();
  const medicos = recursos.filter((r) => r.tipo === "medico");
  const notas = notasEvolucionPorPaciente[patientId] ?? [];

  const [medico, setMedico] = useState(medicos[0]?.nombre ?? "");
  const [form, setForm] = useState<Record<PsoapKey, string>>(emptyForm);

  const puedeAgregar = Object.values(form).some((v) => v.trim().length > 0);

  // El botón "+ Agregar Nota" es lo único que guarda — si se escribe en los
  // campos PSOAP y se sale sin darle clic, antes se perdía en silencio.
  useEffect(() => {
    setCambiosSinGuardar(puedeAgregar ? "Tienes una nota de evolución sin guardar." : null);
    return () => setCambiosSinGuardar(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeAgregar]);

  // Este componente no se desmonta al cambiar de paciente (ej. desde "Ver
  // expediente" en Agenda) — sin este reset, un borrador sin guardar de un
  // paciente podía quedar pegado y agregarse por error al paciente nuevo.
  useEffect(() => {
    setForm(emptyForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const handleAgregar = () => {
    if (!puedeAgregar) return;
    const nota: NotaEvolucion = {
      id: `${Date.now()}`,
      fecha: todayFormatted(),
      medico,
      presentacion: form.presentacion.trim(),
      subjetivo: form.subjetivo.trim(),
      objetivo: form.objetivo.trim(),
      analisis: form.analisis.trim(),
      pronostico: form.pronostico.trim(),
    };
    setNotasEvolucionPaciente(patientId, (prev) => [nota, ...prev]);
    registrarPalabrasDeNota(
      [nota.presentacion, nota.subjetivo, nota.objetivo, nota.analisis, nota.pronostico].join(" ")
    );
    setForm(emptyForm);
  };

  const handleEliminar = (id: string) => {
    setNotasEvolucionPaciente(patientId, (prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            Agregar Nota de Evolución
          </h3>
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent">
            Formato PSOAP
          </span>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Médico</label>
          <select value={medico} onChange={(e) => setMedico(e.target.value)} className={inputClass}>
            {medicos.map((m) => (
              <option key={m.id} value={m.nombre}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          {psoapCampos.map((campo) => (
            <div key={campo.key}>
              <label className="mb-1 flex items-center gap-2 text-xs font-medium text-ink/60">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent">
                  {campo.letra}
                </span>
                {campo.label}
              </label>
              <CampoConSugerencias
                value={form[campo.key]}
                onChange={(v) => setForm((prev) => ({ ...prev, [campo.key]: v }))}
                placeholder={campo.placeholder}
                vocabularioClinica={vocabularioNotas.palabras}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleAgregar}
          disabled={!puedeAgregar}
          className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
        >
          + Agregar Nota
        </button>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/60">
          Historial de Seguimiento
        </h3>
        {notas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
            No hay notas de evolución registradas
          </div>
        ) : (
          <div className="space-y-3">
            {notas.map((n) => (
              <div key={n.id} className="rounded-2xl border border-edge/10 bg-surface p-4">
                <div className="flex items-center justify-between text-xs text-ink/40">
                  <span>
                    <span className="font-medium text-ink/60">{n.fecha}</span> · {n.medico}
                  </span>
                  <button
                    onClick={() => handleEliminar(n.id)}
                    className="text-ink/30 hover:text-danger"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-3 space-y-2">
                  {psoapCampos
                    .filter((campo) => n[campo.key]?.trim())
                    .map((campo) => (
                      <div key={campo.key} className="flex gap-2 text-sm">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-bold text-accent">
                          {campo.letra}
                        </span>
                        <p className="text-ink/80">
                          <span className="font-medium text-ink/50">{campo.label}: </span>
                          {n[campo.key]}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
