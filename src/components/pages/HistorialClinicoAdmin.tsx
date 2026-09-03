"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import {
  plantillaInicial,
  tipoPreguntaLabel,
  type PreguntaTemplate,
  type SeccionTemplate,
  type TipoPregunta,
} from "@/lib/historiaClinica";
import ConfirmarEliminar from "@/components/ConfirmarEliminar";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function nuevoId(prefijo: string) {
  return `${prefijo}${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
}

function moverEnArray<T>(arr: T[], index: number, direccion: -1 | 1): T[] {
  const nuevoIndex = index + direccion;
  if (nuevoIndex < 0 || nuevoIndex >= arr.length) return arr;
  const copia = [...arr];
  [copia[index], copia[nuevoIndex]] = [copia[nuevoIndex], copia[index]];
  return copia;
}

function PreguntaEditor({
  pregunta,
  esPrimera,
  esUltima,
  onCambiar,
  onMover,
  onQuitar,
}: {
  pregunta: PreguntaTemplate;
  esPrimera: boolean;
  esUltima: boolean;
  onCambiar: (cambios: Partial<PreguntaTemplate>) => void;
  onMover: (direccion: -1 | 1) => void;
  onQuitar: () => void;
}) {
  const [confirmandoQuitar, setConfirmandoQuitar] = useState(false);

  return (
    <div className="rounded-lg border border-edge/10 bg-inset p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_160px_auto]">
        <input
          type="text"
          value={pregunta.etiqueta}
          onChange={(e) => onCambiar({ etiqueta: e.target.value })}
          placeholder="Etiqueta de la pregunta"
          className={inputClass}
        />
        <select
          value={pregunta.tipo}
          onChange={(e) => onCambiar({ tipo: e.target.value as TipoPregunta })}
          className={inputClass}
        >
          {(Object.keys(tipoPreguntaLabel) as TipoPregunta[]).map((t) => (
            <option key={t} value={t}>
              {tipoPreguntaLabel[t]}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMover(-1)}
            disabled={esPrimera}
            title="Subir"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-edge/15 text-ink/60 hover:bg-surface disabled:opacity-30"
          >
            ↑
          </button>
          <button
            onClick={() => onMover(1)}
            disabled={esUltima}
            title="Bajar"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-edge/15 text-ink/60 hover:bg-surface disabled:opacity-30"
          >
            ↓
          </button>
          <button
            onClick={() => setConfirmandoQuitar(true)}
            title="Quitar pregunta"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-danger/30 text-danger hover:bg-danger/10"
          >
            ✕
          </button>
        </div>
      </div>

      {confirmandoQuitar && (
        <ConfirmarEliminar
          titulo="¿Quitar esta pregunta?"
          mensaje={`"${pregunta.etiqueta || "(sin etiqueta)"}" se quitará de la Historia Clínica de todos los pacientes. Esta acción no se puede deshacer.`}
          confirmLabel="Quitar"
          onCancel={() => setConfirmandoQuitar(false)}
          onConfirm={() => {
            onQuitar();
            setConfirmandoQuitar(false);
          }}
        />
      )}

      {pregunta.tipo === "chips" && (
        <input
          type="text"
          value={(pregunta.opciones ?? []).join(", ")}
          onChange={(e) => onCambiar({ opciones: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
          placeholder="Opciones separadas por coma"
          className={`${inputClass} mt-2`}
        />
      )}
      {pregunta.tipo === "texto" && (
        <input
          type="text"
          value={pregunta.placeholder ?? ""}
          onChange={(e) => onCambiar({ placeholder: e.target.value })}
          placeholder="Texto de ejemplo (placeholder), opcional"
          className={`${inputClass} mt-2`}
        />
      )}
      {pregunta.tipo === "sino" && (
        <div className="mt-2 space-y-2">
          <label className="flex items-center gap-2 text-xs text-ink/60">
            <input
              type="checkbox"
              checked={pregunta.mostrarDetalle ?? false}
              onChange={(e) => onCambiar({ mostrarDetalle: e.target.checked })}
            />
            Pedir un detalle adicional cuando responda "Sí"
          </label>
          {pregunta.mostrarDetalle && (
            <input
              type="text"
              value={pregunta.detallePlaceholder ?? ""}
              onChange={(e) => onCambiar({ detallePlaceholder: e.target.value })}
              placeholder='Texto de ejemplo del detalle, ej. "¿Con qué y con qué frecuencia?"'
              className={inputClass}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SeccionEditor({
  seccion,
  esPrimera,
  esUltima,
  onCambiar,
  onMover,
  onQuitar,
}: {
  seccion: SeccionTemplate;
  esPrimera: boolean;
  esUltima: boolean;
  onCambiar: (siguiente: SeccionTemplate) => void;
  onMover: (direccion: -1 | 1) => void;
  onQuitar: () => void;
}) {
  const [confirmandoQuitar, setConfirmandoQuitar] = useState(false);

  const actualizarPregunta = (id: string, cambios: Partial<PreguntaTemplate>) => {
    onCambiar({
      ...seccion,
      preguntas: seccion.preguntas.map((p) => (p.id === id ? { ...p, ...cambios } : p)),
    });
  };

  const moverPregunta = (index: number, direccion: -1 | 1) => {
    onCambiar({ ...seccion, preguntas: moverEnArray(seccion.preguntas, index, direccion) });
  };

  const quitarPregunta = (id: string) => {
    onCambiar({ ...seccion, preguntas: seccion.preguntas.filter((p) => p.id !== id) });
  };

  const agregarPregunta = () => {
    const nueva: PreguntaTemplate = { id: nuevoId("p"), tipo: "texto", etiqueta: "" };
    onCambiar({ ...seccion, preguntas: [...seccion.preguntas, nueva] });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-edge/10 bg-surface p-5">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={seccion.titulo}
          onChange={(e) => onCambiar({ ...seccion, titulo: e.target.value })}
          placeholder="Título de la sección"
          className={`${inputClass} font-semibold`}
        />
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => onMover(-1)}
            disabled={esPrimera}
            title="Subir sección"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-edge/15 text-ink/60 hover:bg-surface disabled:opacity-30"
          >
            ↑
          </button>
          <button
            onClick={() => onMover(1)}
            disabled={esUltima}
            title="Bajar sección"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-edge/15 text-ink/60 hover:bg-surface disabled:opacity-30"
          >
            ↓
          </button>
          <button
            onClick={() => setConfirmandoQuitar(true)}
            title="Quitar sección"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-danger/30 text-danger hover:bg-danger/10"
          >
            ✕ Sección
          </button>
        </div>
      </div>

      {confirmandoQuitar && (
        <ConfirmarEliminar
          titulo="¿Quitar esta sección completa?"
          mensaje={`"${seccion.titulo || "(sin título)"}" y sus ${seccion.preguntas.length} pregunta(s) se quitarán de la Historia Clínica de todos los pacientes. Esta acción no se puede deshacer.`}
          confirmLabel="Quitar sección"
          onCancel={() => setConfirmandoQuitar(false)}
          onConfirm={() => {
            onQuitar();
            setConfirmandoQuitar(false);
          }}
        />
      )}

      <div className="space-y-2">
        {seccion.preguntas.map((pregunta, i) => (
          <PreguntaEditor
            key={pregunta.id}
            pregunta={pregunta}
            esPrimera={i === 0}
            esUltima={i === seccion.preguntas.length - 1}
            onCambiar={(cambios) => actualizarPregunta(pregunta.id, cambios)}
            onMover={(dir) => moverPregunta(i, dir)}
            onQuitar={() => quitarPregunta(pregunta.id)}
          />
        ))}
        {seccion.preguntas.length === 0 && (
          <p className="text-xs text-ink/30">Esta sección no tiene preguntas todavía.</p>
        )}
      </div>

      <button
        onClick={agregarPregunta}
        className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/10"
      >
        + Agregar pregunta
      </button>
    </div>
  );
}

export default function HistorialClinicoAdmin() {
  const { miRol, historiaClinicaTemplate, setHistoriaClinicaTemplate } = usePatientData();
  const [confirmandoRestaurar, setConfirmandoRestaurar] = useState(false);

  if (miRol !== "admin") {
    return (
      <div className="rounded-2xl border border-edge/10 bg-surface p-10 text-center text-sm text-ink/50">
        Solo el dueño de la clínica puede configurar la Historia Clínica.
      </div>
    );
  }

  const secciones = historiaClinicaTemplate.secciones;

  const actualizarSeccion = (index: number, siguiente: SeccionTemplate) => {
    setHistoriaClinicaTemplate((prev) => ({
      secciones: prev.secciones.map((s, i) => (i === index ? siguiente : s)),
    }));
  };

  const moverSeccion = (index: number, direccion: -1 | 1) => {
    setHistoriaClinicaTemplate((prev) => ({ secciones: moverEnArray(prev.secciones, index, direccion) }));
  };

  const quitarSeccion = (index: number) => {
    setHistoriaClinicaTemplate((prev) => ({ secciones: prev.secciones.filter((_, i) => i !== index) }));
  };

  const agregarSeccion = () => {
    const nueva: SeccionTemplate = { id: nuevoId("sec"), titulo: "", preguntas: [] };
    setHistoriaClinicaTemplate((prev) => ({ secciones: [...prev.secciones, nueva] }));
  };

  const restaurarPlantilla = () => {
    setHistoriaClinicaTemplate(plantillaInicial);
    setConfirmandoRestaurar(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm text-accent">
        <p>
          Los cambios que hagas aquí se reflejan de inmediato en la pestaña &quot;Historia Clínica&quot;
          de todos los pacientes. Puedes agregar, quitar, reordenar y editar preguntas y secciones
          para adaptar la historia clínica a tu práctica.
        </p>
      </div>

      <div className="space-y-4">
        {secciones.map((seccion, i) => (
          <SeccionEditor
            key={seccion.id}
            seccion={seccion}
            esPrimera={i === 0}
            esUltima={i === secciones.length - 1}
            onCambiar={(siguiente) => actualizarSeccion(i, siguiente)}
            onMover={(dir) => moverSeccion(i, dir)}
            onQuitar={() => quitarSeccion(i)}
          />
        ))}
        {secciones.length === 0 && (
          <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
            No hay secciones. Agrega una o restaura la plantilla original.
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={agregarSeccion}
          className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
          style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
        >
          + Agregar sección
        </button>

        {confirmandoRestaurar ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-ink/60">¿Restaurar la plantilla original? Se perderán tus cambios.</span>
            <button
              onClick={restaurarPlantilla}
              className="rounded-lg border border-danger/40 px-3 py-1.5 font-semibold text-danger hover:bg-danger/10"
            >
              Sí, restaurar
            </button>
            <button
              onClick={() => setConfirmandoRestaurar(false)}
              className="rounded-lg border border-edge/15 px-3 py-1.5 text-ink/70 hover:bg-surface"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmandoRestaurar(true)}
            className="rounded-lg border border-edge/15 px-4 py-2.5 text-sm font-semibold text-ink/70 hover:bg-surface"
          >
            Restaurar plantilla original
          </button>
        )}
      </div>
    </div>
  );
}
