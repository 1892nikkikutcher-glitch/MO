"use client";

import { useState } from "react";

const medicos = ["Dr. Nicolás Medina González", "Dra. Ana Paola Ríos Cervantes"];

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

type Nota = {
  id: string;
  fecha: string;
  medico: string;
} & Record<PsoapKey, string>;

const notasIniciales: Nota[] = [
  {
    id: "1",
    fecha: "02/07/2026",
    medico: "Dr. Nicolás Medina González",
    presentacion: "Paciente acude a revisión de rutina, sin dolor referido.",
    subjetivo: "Refiere leve sangrado al cepillado.",
    objetivo: "Encías con mejoría visible respecto a la visita anterior, sin placa acumulada.",
    analisis: "Gingivitis leve en remisión por buena higiene.",
    pronostico: "Favorable. Continuar con la higiene actual y revisión en 3 meses.",
  },
  {
    id: "2",
    fecha: "15/05/2026",
    medico: "Dra. Ana Paola Ríos Cervantes",
    presentacion: "Cita programada para limpieza profunda.",
    subjetivo: "Sin molestias reportadas.",
    objetivo: "Se realizó profilaxis y raspado sin complicaciones.",
    analisis: "Buena respuesta al tratamiento periodontal.",
    pronostico: "Próxima revisión en 3 meses.",
  },
];

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

export default function NotasEvolucion() {
  const [notas, setNotas] = useState<Nota[]>(notasIniciales);
  const [medico, setMedico] = useState(medicos[0]);
  const [form, setForm] = useState<Record<PsoapKey, string>>(emptyForm);

  const puedeAgregar = Object.values(form).some((v) => v.trim().length > 0);

  const handleAgregar = () => {
    if (!puedeAgregar) return;
    setNotas((prev) => [
      {
        id: `${Date.now()}`,
        fecha: todayFormatted(),
        medico,
        presentacion: form.presentacion.trim(),
        subjetivo: form.subjetivo.trim(),
        objetivo: form.objetivo.trim(),
        analisis: form.analisis.trim(),
        pronostico: form.pronostico.trim(),
      },
      ...prev,
    ]);
    setForm(emptyForm);
  };

  const handleEliminar = (id: string) => {
    setNotas((prev) => prev.filter((n) => n.id !== id));
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
              <option key={m} value={m}>
                {m}
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
              <textarea
                value={form[campo.key]}
                onChange={(e) => setForm((prev) => ({ ...prev, [campo.key]: e.target.value }))}
                placeholder={campo.placeholder}
                rows={2}
                className={`${inputClass} resize-none`}
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleAgregar}
          disabled={!puedeAgregar}
          className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
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
