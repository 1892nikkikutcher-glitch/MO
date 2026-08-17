"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import {
  diasSemanaOptions,
  horarioVacio,
  estadoEntrada,
  estadoLabel,
  estadoColor,
  estadoLlegadaPaciente,
  estadoLlegadaLabel,
  estadoLlegadaColor,
  horaActual,
  type PersonalAsistencia,
  type DiaSemana,
  type BloqueHorario,
} from "@/lib/asistencia";
import { manejarCambioNombre } from "@/lib/textoNombre";
import ConfirmarEliminar from "@/components/ConfirmarEliminar";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function PersonalDialog({
  inicial,
  onClose,
  onGuardar,
}: {
  inicial: PersonalAsistencia | null;
  onClose: () => void;
  onGuardar: (data: Omit<PersonalAsistencia, "id">) => void;
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  const [puesto, setPuesto] = useState(inicial?.puesto ?? "Odontólogo");
  const [horario, setHorario] = useState(inicial?.horario ?? horarioVacio());

  const actualizarDia = (dia: DiaSemana, bloque: BloqueHorario) => {
    setHorario((prev) => ({ ...prev, [dia]: bloque }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">
            {inicial ? "Editar personal" : "Agregar personal"}
          </h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Nombre</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => manejarCambioNombre(e, setNombre)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Puesto</label>
              <input type="text" value={puesto} onChange={(e) => setPuesto(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-ink/60">Horario semanal</label>
            <div className="space-y-2">
              {diasSemanaOptions.map((d) => {
                const bloque = horario[d.value];
                return (
                  <div key={d.value} className="flex items-center gap-2">
                    <span className="w-10 shrink-0 text-xs font-semibold text-ink/60">{d.label}</span>
                    <label className="flex shrink-0 items-center gap-1.5 text-xs text-ink/50">
                      <input
                        type="checkbox"
                        checked={bloque !== null}
                        onChange={(e) =>
                          actualizarDia(d.value, e.target.checked ? { inicio: "09:00", fin: "18:00" } : null)
                        }
                        className="h-3.5 w-3.5 rounded border-edge/30"
                      />
                      Labora
                    </label>
                    {bloque && (
                      <>
                        <input
                          type="time"
                          value={bloque.inicio}
                          onChange={(e) => actualizarDia(d.value, { ...bloque, inicio: e.target.value })}
                          className={`${inputClass} py-1`}
                        />
                        <span className="text-xs text-ink/30">a</span>
                        <input
                          type="time"
                          value={bloque.fin}
                          onChange={(e) => actualizarDia(d.value, { ...bloque, fin: e.target.value })}
                          className={`${inputClass} py-1`}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Cancelar
          </button>
          <button
            onClick={() => nombre.trim() && onGuardar({ nombre: nombre.trim(), puesto: puesto.trim(), horario })}
            disabled={!nombre.trim()}
            className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function TabPersonal() {
  const { personalAsistencia, setPersonalAsistencia, registrosAsistencia, marcarAsistencia, miRol } =
    usePatientData();
  const [editando, setEditando] = useState<PersonalAsistencia | "nuevo" | null>(null);
  const [fecha, setFecha] = useState(hoyISO());
  const [personalAEliminar, setPersonalAEliminar] = useState<PersonalAsistencia | null>(null);

  const guardarPersonal = (data: Omit<PersonalAsistencia, "id">) => {
    if (editando && editando !== "nuevo") {
      setPersonalAsistencia((prev) => prev.map((p) => (p.id === editando.id ? { ...p, ...data } : p)));
    } else {
      const nuevo: PersonalAsistencia = { id: `pers${Date.now()}`, ...data };
      setPersonalAsistencia((prev) => [...prev, nuevo]);
    }
    setEditando(null);
  };

  const eliminarPersonal = (id: string) => {
    setPersonalAsistencia((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-edge/10 bg-surface p-4">
        <label className="mb-1 block text-xs font-medium text-ink/60">Registro del día</label>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className={`${inputClass} max-w-[200px]`}
        />
      </div>

      {personalAsistencia.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          Aún no agregas personal.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-edge/10 bg-surface">
          <div className="grid grid-cols-[1fr_100px_100px_120px_auto] gap-3 border-b border-edge/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink/40">
            <span>Nombre</span>
            <span>Entrada</span>
            <span>Salida</span>
            <span>Estado</span>
            <span className="text-right">Acción</span>
          </div>
          <div className="divide-y divide-edge/5">
            {personalAsistencia.map((p) => {
              const registro = registrosAsistencia.find((r) => r.id === `${p.id}_${fecha}`);
              const estado = estadoEntrada(p.horario, fecha, registro?.entrada ?? null);
              return (
                <div key={p.id} className="grid grid-cols-[1fr_100px_100px_120px_auto] items-center gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">{p.nombre}</p>
                    <p className="text-xs text-ink/40">{p.puesto}</p>
                  </div>
                  <span className="text-sm text-ink/70">{registro?.entrada ?? "—"}</span>
                  <span className="text-sm text-ink/70">{registro?.salida ?? "—"}</span>
                  <span className={`text-xs font-semibold ${estadoColor[estado]}`}>{estadoLabel[estado]}</span>
                  <div className="flex justify-end gap-1.5">
                    {!registro?.entrada ? (
                      <button
                        onClick={() => marcarAsistencia(p.id, fecha, "entrada", horaActual())}
                        className="rounded-lg border border-success/40 px-2.5 py-1 text-xs font-semibold text-success hover:bg-success/10"
                      >
                        Entrada
                      </button>
                    ) : !registro?.salida ? (
                      <button
                        onClick={() => marcarAsistencia(p.id, fecha, "salida", horaActual())}
                        className="rounded-lg border border-accent/40 px-2.5 py-1 text-xs font-semibold text-accent hover:bg-accent/10"
                      >
                        Salida
                      </button>
                    ) : (
                      <span className="text-xs text-ink/30">Completo</span>
                    )}
                    {miRol === "admin" && (
                      <>
                        <button
                          onClick={() => setEditando(p)}
                          className="rounded-lg border border-edge/15 px-2.5 py-1 text-xs text-ink/70 hover:bg-surface2"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setPersonalAEliminar(p)}
                          className="rounded-lg border border-danger/30 px-2.5 py-1 text-xs text-danger hover:bg-danger/10"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {miRol === "admin" && (
        <button
          onClick={() => setEditando("nuevo")}
          className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
          style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
        >
          + Agregar personal
        </button>
      )}

      {editando && (
        <PersonalDialog
          inicial={editando === "nuevo" ? null : editando}
          onClose={() => setEditando(null)}
          onGuardar={guardarPersonal}
        />
      )}

      {personalAEliminar && (
        <ConfirmarEliminar
          titulo="¿Eliminar a este colaborador?"
          mensaje={`Vas a eliminar a "${personalAEliminar.nombre}" (${personalAEliminar.puesto}) de la lista de personal. Esta acción no se puede deshacer.`}
          onCancel={() => setPersonalAEliminar(null)}
          onConfirm={() => {
            eliminarPersonal(personalAEliminar.id);
            setPersonalAEliminar(null);
          }}
        />
      )}
    </div>
  );
}

function TabPacientes() {
  const { citas, marcarLlegadaCita } = usePatientData();
  const [fecha, setFecha] = useState(hoyISO());

  const citasDelDia = citas
    .filter((c) => c.fecha === fecha && c.estatus !== "Cancelada")
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-edge/10 bg-surface p-4">
        <label className="mb-1 block text-xs font-medium text-ink/60">Día</label>
        <input
          type="date"
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className={`${inputClass} max-w-[200px]`}
        />
      </div>

      {citasDelDia.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          No hay citas para este día.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-edge/10 bg-surface">
          <div className="grid grid-cols-[80px_1fr_140px_auto] gap-3 border-b border-edge/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink/40">
            <span>Hora</span>
            <span>Paciente</span>
            <span>Estado</span>
            <span className="text-right">Acción</span>
          </div>
          <div className="divide-y divide-edge/5">
            {citasDelDia.map((c) => {
              const estado = estadoLlegadaPaciente(c.fecha, c.horaInicio, c.horaFin, c.horaLlegada);
              return (
                <div key={c.id} className="grid grid-cols-[80px_1fr_140px_auto] items-center gap-3 px-4 py-3">
                  <span className="text-sm text-ink/70">{c.horaInicio}</span>
                  <div>
                    <p className="text-sm font-medium text-ink">{c.paciente}</p>
                    {c.tratamientos.length > 0 && (
                      <p className="text-xs text-ink/40">{c.tratamientos.join(", ")}</p>
                    )}
                  </div>
                  <span className={`text-xs font-semibold ${estadoLlegadaColor[estado]}`}>
                    {estadoLlegadaLabel[estado]}
                    {c.horaLlegada && ` · ${c.horaLlegada}`}
                  </span>
                  <div className="flex justify-end">
                    {c.horaLlegada ? (
                      <button
                        onClick={() => marcarLlegadaCita(c.id, null)}
                        className="rounded-lg border border-edge/15 px-2.5 py-1 text-xs text-ink/60 hover:bg-surface2"
                      >
                        Quitar
                      </button>
                    ) : (
                      <button
                        onClick={() => marcarLlegadaCita(c.id, horaActual())}
                        className="rounded-lg border border-success/40 px-2.5 py-1 text-xs font-semibold text-success hover:bg-success/10"
                      >
                        Marcar llegada
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Asistencia() {
  const [tab, setTab] = useState<"personal" | "pacientes">("personal");

  return (
    <div className="space-y-4">
      <div className="flex w-fit rounded-lg border border-edge/10 p-0.5">
        <button
          onClick={() => setTab("personal")}
          className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
            tab === "personal" ? "bg-accent/15 text-accent" : "text-ink/50"
          }`}
        >
          Odontólogos y colaboradores
        </button>
        <button
          onClick={() => setTab("pacientes")}
          className={`rounded-md px-4 py-1.5 text-xs font-semibold transition-colors ${
            tab === "pacientes" ? "bg-accent/15 text-accent" : "text-ink/50"
          }`}
        >
          Pacientes
        </button>
      </div>

      {tab === "personal" ? <TabPersonal /> : <TabPacientes />}
    </div>
  );
}
