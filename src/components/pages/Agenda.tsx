"use client";

import { useMemo, useRef, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import {
  citaEstatusOptions,
  type CitaAgenda,
  type CitaEstatus,
  type FrecuenciaRecurrencia,
  type Recurso,
} from "@/lib/patientData";
import { renderPlantilla, formatFechaLarga, formatHora12 } from "@/lib/formatosWhatsapp";
import { manejarCambioNombre } from "@/lib/textoNombre";

const PX_PER_MIN = 1.2;
const DIAS_SEMANA = ["lun.", "mar.", "mié.", "jue.", "vie.", "sáb.", "dom."];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const MESES_ABR = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sep.", "oct.", "nov.", "dic."];

const estatusColor: Record<CitaEstatus, { bg: string; text: string; dot: string }> = {
  Agendada: { bg: "bg-surface2", text: "text-ink/70", dot: "bg-ink/50" },
  Confirmada: { bg: "bg-info/10", text: "text-info", dot: "bg-info" },
  "En espera": { bg: "bg-accent/10", text: "text-accent", dot: "bg-accent" },
  Atendida: { bg: "bg-success/10", text: "text-success", dot: "bg-success" },
  Cancelada: { bg: "bg-danger/10", text: "text-danger", dot: "bg-danger" },
};

const colorPalette = ["#22c55e", "#3b82f6", "#f59e0b", "#dc2626", "#a855f7", "#ec4899", "#14b8a6", "#64748b"];
const duracionOptions = [15, 20, 25, 30, 45, 60, 90];

function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number) {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function toISODate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isSameDay(a: Date, b: Date) {
  return toISODate(a) === toISODate(b);
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

function minutesToTime(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function formatRangeLabel(inicio: Date, fin: Date) {
  const sameMonth = inicio.getMonth() === fin.getMonth();
  const mesInicio = MESES_ABR[inicio.getMonth()];
  const mesFin = MESES_ABR[fin.getMonth()];
  return sameMonth
    ? `${inicio.getDate()} – ${fin.getDate()} de ${mesFin} de ${fin.getFullYear()}`
    : `${inicio.getDate()} de ${mesInicio} – ${fin.getDate()} de ${mesFin} de ${fin.getFullYear()}`;
}

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

function assignLanes(citasDelDia: CitaAgenda[]) {
  const sorted = [...citasDelDia].sort(
    (a, b) => timeToMinutes(a.horaInicio) - timeToMinutes(b.horaInicio)
  );
  const lanesEnd: number[] = [];
  const withLane = sorted.map((c) => {
    const start = timeToMinutes(c.horaInicio);
    const end = timeToMinutes(c.horaFin);
    let lane = lanesEnd.findIndex((e) => e <= start);
    if (lane === -1) {
      lane = lanesEnd.length;
      lanesEnd.push(end);
    } else {
      lanesEnd[lane] = end;
    }
    return { cita: c, lane };
  });
  return { withLane, totalLanes: Math.max(lanesEnd.length, 1) };
}

function addMonths(d: Date, n: number) {
  const date = new Date(d);
  date.setMonth(date.getMonth() + n);
  return date;
}

function IconExpediente() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM14 4v6h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconNotas() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="M5 4h14v16l-3-2-3 2-3-2-3 2V4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 9h8M8 13h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <path
        d="M3 21l1.4-4.2A8.5 8.5 0 1 1 8.3 20.5L3 21ZM8.5 8.3c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .5.3.2.4.6 1.4.7 1.5.1.1.1.3 0 .4-.1.2-.2.3-.3.4-.2.2-.3.3-.1.6.7 1.1 1.4 1.7 2.5 2.3.2.1.3.1.4-.1.2-.2.5-.6.7-.8.1-.2.3-.2.5-.1.5.2 1.3.6 1.5.7.2.1.3.1.4.3.1.2.1.9-.2 1.4-.3.5-1.1.9-1.6 1-.5 0-1.1.1-3.4-.9-2.4-1.1-3.9-3.5-4.1-3.7-.1-.2-1-1.3-1-2.5s.6-1.7.8-2Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconReloj() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function NuevaRecursoDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (recurso: { nombre: string; tipo: "medico" | "unidad"; color: string }) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<"medico" | "unidad">("medico");
  const [color, setColor] = useState(colorPalette[0]);

  const puedeGuardar = nombre.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-[#111] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Nuevo Recurso</h3>
          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-ink/40">
          Un recurso puede ser un médico o una unidad/consultorio — lo importante es cómo organizas
          tu agenda.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Tipo</label>
            <div className="flex gap-2">
              {(["medico", "unidad"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={`flex-1 rounded-lg border py-2 text-xs font-semibold transition-colors ${
                    tipo === t
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-edge/15 text-ink/50 hover:border-accent/40"
                  }`}
                >
                  {t === "medico" ? "Médico" : "Unidad"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={tipo === "medico" ? "Ej. Dra. Fernanda Ruiz" : "Ej. Unidad 3 · Consultorio C"}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Color</label>
            <div className="flex flex-wrap gap-2">
              {colorPalette.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full border-2 transition-transform"
                  style={{
                    backgroundColor: c,
                    borderColor: color === c ? "#fff" : "transparent",
                    transform: color === c ? "scale(1.15)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-edge/15 py-2 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Cancelar
          </button>
          <button
            onClick={() => puedeGuardar && onSave({ nombre: nombre.trim(), tipo, color })}
            disabled={!puedeGuardar}
            className="flex-1 rounded-lg bg-gradient-to-r from-accent to-orange-500 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

const frecuenciaMeses: Record<FrecuenciaRecurrencia, number> = {
  mensual: 1,
  trimestral: 3,
  semestral: 6,
};

const frecuenciaLabel: Record<FrecuenciaRecurrencia, string> = {
  mensual: "Cada mes",
  trimestral: "Cada 3 meses",
  semestral: "Cada 6 meses",
};

function CitaDialog({
  recursos,
  initial,
  isEditing,
  onClose,
  onSave,
  onDelete,
}: {
  recursos: Recurso[];
  initial: Partial<CitaAgenda> & { fecha: string; horaInicio: string };
  isEditing: boolean;
  onClose: () => void;
  onSave: (citas: CitaAgenda[]) => void;
  onDelete?: () => void;
}) {
  const { patients, addPatient, updatePatient, irAExpediente, clinicInfo, formatosWhatsapp } =
    usePatientData();
  const [recursoId, setRecursoId] = useState(initial.recursoId ?? recursos[0]?.id ?? "");
  const [patientId, setPatientId] = useState(initial.patientId ?? "");
  const [searchText, setSearchText] = useState(initial.paciente ?? "");
  const patientData = initial.patientId ? patients.find((p) => p.id === initial.patientId) : undefined;
  const [telefono, setTelefono] = useState(patientData?.phone ?? "");
  const [correo, setCorreo] = useState(patientData?.email ?? "");
  const [tratamientos, setTratamientos] = useState<string[]>(initial.tratamientos ?? []);
  const [procedimientoInput, setProcedimientoInput] = useState("");
  const [comentarios, setComentarios] = useState(initial.comentarios ?? "");
  const [fecha, setFecha] = useState(initial.fecha);
  const [horaInicio, setHoraInicio] = useState(initial.horaInicio);
  const [duracion, setDuracion] = useState(
    initial.horaFin ? timeToMinutes(initial.horaFin) - timeToMinutes(initial.horaInicio) : 30
  );
  const [estatus, setEstatus] = useState<CitaEstatus>(initial.estatus ?? "Agendada");
  const [mostrarEstatusRapido, setMostrarEstatusRapido] = useState(false);
  const [recurrente, setRecurrente] = useState(false);
  const [frecuencia, setFrecuencia] = useState<FrecuenciaRecurrencia>("mensual");
  const [repeticiones, setRepeticiones] = useState(3);
  const folioRef = useState(() => initial.folio ?? `F-${Date.now().toString().slice(-6)}`)[0];

  const coincidencias =
    !patientId && searchText.trim().length > 0
      ? patients.filter((p) => p.name.toLowerCase().includes(searchText.trim().toLowerCase()))
      : [];

  const puedeGuardar =
    recursoId && fecha && horaInicio && (patientId || searchText.trim().length > 0);

  const seleccionarPaciente = (id: string) => {
    const p = patients.find((pp) => pp.id === id);
    if (!p) return;
    setPatientId(id);
    setSearchText(p.name);
    setTelefono(p.phone);
    setCorreo(p.email ?? "");
  };

  const cambiarPaciente = () => {
    setPatientId("");
    setSearchText("");
    setTelefono("");
    setCorreo("");
  };

  const crearPaciente = () => {
    if (!searchText.trim()) return;
    const nuevo = addPatient({ name: searchText.trim(), phone: telefono.trim() });
    setPatientId(nuevo.id);
  };

  const agregarProcedimiento = () => {
    const val = procedimientoInput.trim();
    if (!val) return;
    setTratamientos((prev) => [...prev, val]);
    setProcedimientoInput("");
  };

  const quitarProcedimiento = (idx: number) => {
    setTratamientos((prev) => prev.filter((_, i) => i !== idx));
  };

  const nombrePacienteActual = patientId
    ? patients.find((p) => p.id === patientId)?.name ?? searchText
    : searchText.trim();

  const enviarConfirmacion = () => {
    const telefonoLimpio = telefono.replace(/\D/g, "");
    if (!telefonoLimpio || !nombrePacienteActual || !fecha || !horaInicio) return;
    const texto = renderPlantilla(formatosWhatsapp.confirmacionCita, {
      clinica: clinicInfo?.nombre || "tu clínica",
      paciente: nombrePacienteActual,
      fecha: formatFechaLarga(fecha),
      hora: formatHora12(horaInicio),
    });
    window.open(`https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(texto)}`, "_blank");
  };

  const puedeEnviarConfirmacion =
    telefono.replace(/\D/g, "").length > 0 && !!nombrePacienteActual && !!fecha && !!horaInicio;

  const handleGuardar = () => {
    if (!puedeGuardar) return;
    const nombrePaciente = patientId
      ? patients.find((p) => p.id === patientId)?.name ?? searchText
      : searchText.trim();

    if (patientId) {
      const actual = patients.find((p) => p.id === patientId);
      if (actual && (actual.phone !== telefono.trim() || (actual.email ?? "") !== correo.trim())) {
        updatePatient(patientId, { phone: telefono.trim(), email: correo.trim() });
      }
    }

    const base: CitaAgenda = {
      id: initial.id ?? `${Date.now()}`,
      folio: initial.folio ?? folioRef,
      recursoId,
      patientId: patientId || null,
      paciente: nombrePaciente,
      tratamientos,
      comentarios: comentarios.trim(),
      fecha,
      horaInicio,
      horaFin: minutesToTime(timeToMinutes(horaInicio) + duracion),
      estatus,
      recurrenciaId: initial.recurrenciaId ?? (recurrente ? `rec${Date.now()}` : null),
    };

    const citasAGuardar: CitaAgenda[] = [base];
    if (!isEditing && recurrente && repeticiones > 0) {
      const meses = frecuenciaMeses[frecuencia];
      for (let i = 1; i <= repeticiones; i++) {
        const nuevaFecha = addMonths(new Date(`${fecha}T00:00:00`), meses * i);
        citasAGuardar.push({
          ...base,
          id: `${Date.now()}-${i}`,
          fecha: toISODate(nuevaFecha),
          estatus: "Agendada",
        });
      }
    }

    onSave(citasAGuardar);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              {isEditing ? "Editar Cita" : "Nueva Cita"}
            </h2>
            <p className="text-xs text-ink/40">Folio: {initial.folio ?? folioRef}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={enviarConfirmacion}
              disabled={!puedeEnviarConfirmacion}
              title={
                puedeEnviarConfirmacion
                  ? "Enviar confirmación de cita por WhatsApp"
                  : "Falta teléfono, paciente, fecha u hora para poder enviar"
              }
              className="flex h-9 w-9 items-center justify-center rounded-full text-success transition-colors hover:bg-success/15 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <IconWhatsApp />
            </button>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Responsable (médico o unidad)
            </label>
            <select value={recursoId} onChange={(e) => setRecursoId(e.target.value)} className={inputClass}>
              {recursos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Paciente</label>
            {patientId ? (
              <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm">
                <span className="text-ink">{searchText}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => irAExpediente(patientId)}
                    title="Ver expediente"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-success/80 transition-colors hover:bg-success/15 hover:text-success"
                  >
                    <IconExpediente />
                  </button>
                  <button
                    type="button"
                    onClick={() => irAExpediente(patientId, "Notas de Evolución y Seguimiento")}
                    title="Notas de evolución"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-success/80 transition-colors hover:bg-success/15 hover:text-success"
                  >
                    <IconNotas />
                  </button>
                  <button
                    onClick={cambiarPaciente}
                    className="ml-1 text-xs font-semibold text-success hover:text-success"
                  >
                    Cambiar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => manejarCambioNombre(e, setSearchText)}
                  placeholder="Buscar paciente por nombre..."
                  className={inputClass}
                />
                {coincidencias.length > 0 && (
                  <div className="mt-1.5 max-h-32 space-y-1 overflow-y-auto rounded-lg border border-edge/10 bg-field p-1.5">
                    {coincidencias.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => seleccionarPaciente(p.id)}
                        className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-ink/80 hover:bg-surface"
                      >
                        {p.name}
                        <span className="ml-2 text-xs text-ink/40">{p.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchText.trim().length > 0 && coincidencias.length === 0 && (
                  <div className="mt-2 rounded-lg border border-accent/30 bg-accent/10 p-3 text-xs">
                    <p className="text-accent">
                      El paciente &quot;{searchText.trim()}&quot; no se encuentra, ¿desea crearlo?
                    </p>
                    <button
                      onClick={crearPaciente}
                      className="mt-2 rounded-lg bg-gradient-to-r from-accent to-orange-500 px-3 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90"
                    >
                      Crear Paciente
                    </button>
                    <p className="mt-1.5 text-ink/30">
                      Se registrará con este nombre y el teléfono capturado abajo; podrás completar
                      su expediente después.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">
                Tel. celular (WhatsApp)
              </label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="55 1234 5678"
                className={inputClass}
              />
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMostrarEstatusRapido((v) => !v)}
                title="Estatus rápido"
                className="flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-edge/10 text-ink/50 transition-colors hover:bg-surface hover:text-ink"
              >
                <IconReloj />
              </button>
              {mostrarEstatusRapido && (
                <div className="absolute right-0 top-[42px] z-10 w-40 rounded-lg border border-edge/10 bg-field p-1.5 shadow-card">
                  {(["Confirmada", "En espera", "Atendida"] as CitaEstatus[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setEstatus(opt);
                        setMostrarEstatusRapido(false);
                      }}
                      className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-ink/80 hover:bg-surface"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Correo paciente</label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="correo@ejemplo.com"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Procedimiento(s) de la cita</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={procedimientoInput}
                onChange={(e) => setProcedimientoInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarProcedimiento();
                  }
                }}
                placeholder="Ej. Limpieza dental"
                className={inputClass}
              />
              <button
                type="button"
                onClick={agregarProcedimiento}
                className="shrink-0 rounded-lg border border-accent/40 px-3 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
              >
                Agregar
              </button>
            </div>
            {tratamientos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tratamientos.map((t, idx) => (
                  <span
                    key={`${t}-${idx}`}
                    className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => quitarProcedimiento(idx)}
                      className="text-accent/60 hover:text-accent"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Comentarios de la cita</label>
            <textarea
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="Notas para el equipo sobre esta cita..."
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Inicio</label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Duración</label>
              <select
                value={duracion}
                onChange={(e) => setDuracion(Number(e.target.value))}
                className={inputClass}
              >
                {duracionOptions.map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!isEditing && (
            <div className="rounded-lg border border-edge/10 p-3">
              <label className="flex items-center gap-2 text-sm font-medium text-ink/80">
                <input
                  type="checkbox"
                  checked={recurrente}
                  onChange={(e) => setRecurrente(e.target.checked)}
                  className="h-4 w-4 accent-accent"
                />
                Programar seguimiento recurrente
              </label>
              {recurrente && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink/60">Frecuencia</label>
                    <select
                      value={frecuencia}
                      onChange={(e) => setFrecuencia(e.target.value as FrecuenciaRecurrencia)}
                      className={inputClass}
                    >
                      {(Object.keys(frecuenciaLabel) as FrecuenciaRecurrencia[]).map((f) => (
                        <option key={f} value={f}>
                          {frecuenciaLabel[f]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-ink/60">
                      Citas a generar
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={repeticiones}
                      onChange={(e) => setRepeticiones(Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Estatus</label>
            <select
              value={estatus}
              onChange={(e) => setEstatus(e.target.value as CitaEstatus)}
              className={inputClass}
            >
              {citaEstatusOptions.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          {isEditing && onDelete && (
            <button
              onClick={onDelete}
              className="rounded-lg border border-danger/30 px-4 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
            >
              Eliminar
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={!puedeGuardar}
            className="flex-1 rounded-lg bg-gradient-to-r from-accent to-orange-500 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Agenda() {
  const { recursos, setRecursos, citas, setCitas, horario, setHorario } = usePatientData();
  /** La agenda siempre se ve/agenda de 7am a 22h como base (para casos
   * extemporáneos), pero si el horario de atención configurado es más
   * amplio, se extiende para que ese horario quede disponible también. */
  const HOUR_START = Math.min(7, Math.floor(timeToMinutes(horario.apertura || "07:00") / 60));
  const HOUR_END = Math.max(22, Math.ceil(timeToMinutes(horario.cierre || "22:00") / 60));
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [vista, setVista] = useState<"semana" | "3dias" | "dia" | "mes">("semana");
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => new Date());
  const [mesActual, setMesActual] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [recursosOcultos, setRecursosOcultos] = useState<Set<string>>(new Set());
  const [estatusOcultos, setEstatusOcultos] = useState<Set<CitaEstatus>>(new Set());
  const [showRecursoDialog, setShowRecursoDialog] = useState(false);
  const [dialogState, setDialogState] = useState<{
    initial: Partial<CitaAgenda> & { fecha: string; horaInicio: string };
    isEditing: boolean;
  } | null>(null);

  const dias = useMemo(() => {
    if (vista === "dia") return [diaSeleccionado];
    if (vista === "3dias") return Array.from({ length: 3 }, (_, i) => addDays(diaSeleccionado, i));
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [vista, weekStart, diaSeleccionado]);

  const minGridWidth = vista === "dia" ? 300 : vista === "3dias" ? 400 : 640;

  const diasMes = useMemo(() => {
    const inicio = getMonday(new Date(mesActual.getFullYear(), mesActual.getMonth(), 1));
    return Array.from({ length: 42 }, (_, i) => addDays(inicio, i));
  }, [mesActual]);

  const hoy = new Date();

  const slots = useMemo(() => {
    const arr: number[] = [];
    for (let m = HOUR_START * 60; m < HOUR_END * 60; m += 30) arr.push(m);
    return arr;
  }, []);

  const totalHeight = (HOUR_END - HOUR_START) * 60 * PX_PER_MIN;

  const recursoPorId = (id: string) => recursos.find((r) => r.id === id);

  const citasVisibles = citas.filter(
    (c) => !recursosOcultos.has(c.recursoId) && !estatusOcultos.has(c.estatus)
  );

  const conteoEstatus = citaEstatusOptions.map((e) => ({
    estatus: e,
    total: citas.filter((c) => c.estatus === e).length,
  }));

  const toggleRecurso = (id: string) => {
    setRecursosOcultos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleEstatus = (e: CitaEstatus) => {
    setEstatusOcultos((prev) => {
      const next = new Set(prev);
      if (next.has(e)) next.delete(e);
      else next.add(e);
      return next;
    });
  };

  const abrirNuevaCita = (fecha: Date, minutos: number) => {
    const inicio = Math.min(Math.max(Math.round(minutos / 30) * 30, HOUR_START * 60), HOUR_END * 60 - 30);
    setDialogState({
      initial: {
        fecha: toISODate(fecha),
        horaInicio: minutesToTime(inicio),
        horaFin: minutesToTime(inicio + 30),
        recursoId: recursos.find((r) => !recursosOcultos.has(r.id))?.id ?? recursos[0]?.id,
      },
      isEditing: false,
    });
  };

  const abrirEditarCita = (cita: CitaAgenda) => {
    setDialogState({ initial: cita, isEditing: true });
  };

  /** Arma la agenda del día en texto (respeta los médicos/unidades ocultos
   * en el filtro de Recursos, para poder mandar la agenda de uno solo) y
   * abre WhatsApp para elegir a quién enviarla — el grupo de la clínica o
   * el médico correspondiente. */
  const enviarAgendaDelDia = (dia: Date) => {
    const fechaISO = toISODate(dia);
    const citasDelDia = citasVisibles
      .filter((c) => c.fecha === fechaISO && c.estatus !== "Cancelada")
      .sort((a, b) => timeToMinutes(a.horaInicio) - timeToMinutes(b.horaInicio));

    const tituloDia = `${DIAS_SEMANA[(dia.getDay() + 6) % 7].replace(".", "").toUpperCase()} ${dia.getDate()} DE ${MESES[dia.getMonth()].toUpperCase()}`;
    const lineas = [`AGENDA ${tituloDia}.`, ""];

    if (citasDelDia.length === 0) {
      lineas.push("Sin citas agendadas.");
    } else {
      citasDelDia.forEach((c) => {
        const emoji = c.estatus === "Confirmada" || c.estatus === "Atendida" ? "🟢" : c.estatus === "En espera" ? "🟡" : "🔴";
        lineas.push(`${emoji} ${c.horaInicio}-${c.horaFin} ${c.paciente}`);
        if (c.tratamientos?.length) lineas.push(c.tratamientos.join(", "));
        lineas.push("");
      });
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(lineas.join("\n").trimEnd())}`, "_blank");
  };

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const dragGrabOffsetRef = useRef(0);

  const moverCita = (citaId: string, nuevaFecha: string, minutosSoltado: number) => {
    setCitas((prev) =>
      prev.map((c) => {
        if (c.id !== citaId) return c;
        const duracion = timeToMinutes(c.horaFin) - timeToMinutes(c.horaInicio);
        const nuevoInicio = Math.min(
          Math.max(Math.round(minutosSoltado / 30) * 30, HOUR_START * 60),
          HOUR_END * 60 - duracion
        );
        return {
          ...c,
          fecha: nuevaFecha,
          horaInicio: minutesToTime(nuevoInicio),
          horaFin: minutesToTime(nuevoInicio + duracion),
        };
      })
    );
    setDraggingId(null);
    setDragOverDay(null);
  };

  const guardarCita = (nuevasCitas: CitaAgenda[]) => {
    setCitas((prev) => {
      let next = prev;
      nuevasCitas.forEach((cita) => {
        const existe = next.some((c) => c.id === cita.id);
        next = existe ? next.map((c) => (c.id === cita.id ? cita : c)) : [...next, cita];
      });
      return next;
    });
    setDialogState(null);
  };

  const eliminarCita = () => {
    if (dialogState?.initial.id) {
      setCitas((prev) => prev.filter((c) => c.id !== dialogState.initial.id));
    }
    setDialogState(null);
  };

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <aside className="w-full space-y-6 print:hidden md:w-60 md:shrink-0">
        <div className="rounded-2xl border border-edge/10 bg-surface p-4">
          <label className="mb-2 block text-xs font-medium text-ink/60">Ir a fecha</label>
          <input
            type="date"
            value={toISODate(
              vista === "dia" || vista === "3dias" ? diaSeleccionado : vista === "mes" ? mesActual : weekStart
            )}
            onChange={(e) => {
              const d = new Date(`${e.target.value}T00:00:00`);
              setWeekStart(getMonday(d));
              setDiaSeleccionado(d);
              setMesActual(new Date(d.getFullYear(), d.getMonth(), 1));
            }}
            className={inputClass}
          />
          <button
            onClick={() => {
              const hoy = new Date();
              setWeekStart(getMonday(hoy));
              setDiaSeleccionado(hoy);
              setMesActual(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
            }}
            className="mt-2 w-full rounded-lg border border-accent/40 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
          >
            Hoy
          </button>
        </div>

        <div className="rounded-2xl border border-edge/10 bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50">Recursos</h3>
            <button
              onClick={() => setShowRecursoDialog(true)}
              title="Agregar recurso"
              className="flex h-6 w-6 items-center justify-center rounded-full border border-accent/40 text-accent transition-colors hover:bg-accent/10"
            >
              +
            </button>
          </div>
          <div className="space-y-1.5">
            {recursos.map((r) => {
              const oculto = recursosOcultos.has(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => toggleRecurso(r.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-opacity ${
                    oculto ? "opacity-30" : ""
                  } hover:bg-surface`}
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: r.color, boxShadow: `0 0 6px ${r.color}` }}
                  />
                  <span className="truncate text-ink/80">{r.nombre}</span>
                  <span className="ml-auto shrink-0 text-[10px] uppercase text-ink/30">
                    {r.tipo === "medico" ? "Médico" : "Unidad"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-edge/10 bg-surface p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
            Horario de Atención
          </h3>
          <div className="space-y-2.5">
            <div>
              <label className="mb-1 block text-[11px] text-ink/50">Hora de apertura</label>
              <input
                type="time"
                value={horario.apertura}
                onChange={(e) => setHorario((prev) => ({ ...prev, apertura: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] text-ink/50">Comida (de)</label>
                <input
                  type="time"
                  value={horario.comidaInicio}
                  onChange={(e) => setHorario((prev) => ({ ...prev, comidaInicio: e.target.value }))}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-ink/50">Comida (a)</label>
                <input
                  type="time"
                  value={horario.comidaFin}
                  onChange={(e) => setHorario((prev) => ({ ...prev, comidaFin: e.target.value }))}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-ink/50">Hora de cierre</label>
              <input
                type="time"
                value={horario.cierre}
                onChange={(e) => setHorario((prev) => ({ ...prev, cierre: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {conteoEstatus.map(({ estatus, total }) => {
              const oculto = estatusOcultos.has(estatus);
              const c = estatusColor[estatus];
              return (
                <button
                  key={estatus}
                  onClick={() => toggleEstatus(estatus)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-opacity ${c.bg} ${c.text} ${
                    oculto ? "opacity-30" : ""
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                  {total} {estatus}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-edge/10 p-0.5">
              <button
                onClick={() => setVista("semana")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  vista === "semana" ? "bg-accent/15 text-accent" : "text-ink/50"
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setVista("3dias")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  vista === "3dias" ? "bg-accent/15 text-accent" : "text-ink/50"
                }`}
              >
                3 días
              </button>
              <button
                onClick={() => setVista("dia")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  vista === "dia" ? "bg-accent/15 text-accent" : "text-ink/50"
                }`}
              >
                Día
              </button>
              <button
                onClick={() => setVista("mes")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  vista === "mes" ? "bg-accent/15 text-accent" : "text-ink/50"
                }`}
              >
                Mes
              </button>
            </div>
            <button
              onClick={() =>
                vista === "dia"
                  ? setDiaSeleccionado((d) => addDays(d, -1))
                  : vista === "3dias"
                    ? setDiaSeleccionado((d) => addDays(d, -3))
                    : vista === "mes"
                      ? setMesActual((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                      : setWeekStart((w) => addDays(w, -7))
              }
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-edge/10 text-ink/60 hover:bg-surface"
            >
              ‹
            </button>
            <button
              onClick={() =>
                vista === "dia"
                  ? setDiaSeleccionado((d) => addDays(d, 1))
                  : vista === "3dias"
                    ? setDiaSeleccionado((d) => addDays(d, 3))
                    : vista === "mes"
                      ? setMesActual((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                      : setWeekStart((w) => addDays(w, 7))
              }
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-edge/10 text-ink/60 hover:bg-surface"
            >
              ›
            </button>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-ink">
          {vista === "dia"
            ? `${DIAS_SEMANA[(diaSeleccionado.getDay() + 6) % 7]} ${diaSeleccionado.getDate()} de ${MESES[diaSeleccionado.getMonth()]} de ${diaSeleccionado.getFullYear()}`
            : vista === "3dias"
              ? formatRangeLabel(diaSeleccionado, addDays(diaSeleccionado, 2))
              : vista === "mes"
                ? `${MESES[mesActual.getMonth()].charAt(0).toUpperCase()}${MESES[mesActual.getMonth()].slice(1)} de ${mesActual.getFullYear()}`
                : formatRangeLabel(weekStart, addDays(weekStart, 6))}
        </h2>

        {vista === "mes" && (
          <div className="overflow-hidden rounded-2xl border border-edge/10 bg-surface">
            <div className="grid grid-cols-7 border-b border-edge/10">
              {DIAS_SEMANA.map((d) => (
                <div
                  key={d}
                  className="border-r border-edge/10 px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-ink/50 last:border-r-0"
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {diasMes.map((dia) => {
                const enMes = dia.getMonth() === mesActual.getMonth();
                const esHoy = isSameDay(dia, hoy);
                const citasDelDia = citasVisibles
                  .filter((c) => c.fecha === toISODate(dia))
                  .sort((a, b) => timeToMinutes(a.horaInicio) - timeToMinutes(b.horaInicio));
                const visibles = citasDelDia.slice(0, 3);
                const resto = citasDelDia.length - visibles.length;
                return (
                  <div
                    key={toISODate(dia)}
                    onClick={() => {
                      setDiaSeleccionado(dia);
                      setWeekStart(getMonday(dia));
                      setVista("dia");
                    }}
                    className={`flex min-h-[104px] cursor-pointer flex-col gap-1 border-b border-r border-edge/10 p-1.5 transition-colors last:border-r-0 hover:bg-app ${
                      enMes ? "" : "opacity-40"
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                        esHoy ? "bg-accent text-black" : "text-ink/60"
                      }`}
                    >
                      {dia.getDate()}
                    </span>
                    <div className="space-y-0.5">
                      {visibles.map((cita) => {
                        const recurso = recursoPorId(cita.recursoId);
                        return (
                          <button
                            key={cita.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirEditarCita(cita);
                            }}
                            title={`${cita.horaInicio}–${cita.horaFin} · ${cita.paciente} · ${recurso?.nombre ?? ""}`}
                            className="block w-full truncate rounded px-1 py-0.5 text-left text-[10px] font-medium text-white"
                            style={{ backgroundColor: recurso?.color ?? "#666" }}
                          >
                            {cita.horaInicio} {cita.paciente}
                          </button>
                        );
                      })}
                      {resto > 0 && <div className="px-1 text-[10px] text-ink/40">+{resto} más</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {vista !== "mes" && (
        <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
          <div className="flex" style={{ minWidth: minGridWidth }}>
            <div className="w-14 shrink-0 border-r border-edge/10">
              <div className="h-12 border-b border-edge/10" />
              {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i).map((h) => (
                <div
                  key={h}
                  style={{ height: 60 * PX_PER_MIN }}
                  className="border-b border-edge/5 px-1 text-[10px] text-ink/30"
                >
                  {h}:00
                </div>
              ))}
            </div>

            {dias.map((dia) => {
              const citasDelDia = citasVisibles.filter((c) => c.fecha === toISODate(dia));
              const { withLane, totalLanes } = assignLanes(citasDelDia);
              const esHoy = isSameDay(dia, hoy);
              return (
                <div key={toISODate(dia)} className="min-w-[130px] flex-1 border-r border-edge/10 last:border-r-0">
                  <div
                    className={`relative flex h-12 flex-col items-center justify-center border-b border-edge/10 text-xs ${
                      esHoy ? "bg-accent/10 text-accent" : "text-ink/60"
                    }`}
                  >
                    <span className="uppercase">{DIAS_SEMANA[(dia.getDay() + 6) % 7]}</span>
                    <span className="font-semibold">{dia.getDate()}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        enviarAgendaDelDia(dia);
                      }}
                      title="Enviar agenda del día por WhatsApp (al grupo de la clínica o al médico)"
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-success/70 transition-colors hover:bg-success/15 hover:text-success"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="shrink-0">
                        <path
                          d="M3 21l1.4-4.2A8.5 8.5 0 1 1 8.3 20.5L3 21ZM8.5 8.3c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .5.3.2.4.6 1.4.7 1.5.1.1.1.3 0 .4-.1.2-.2.3-.3.4-.2.2-.3.3-.1.6.7 1.1 1.4 1.7 2.5 2.3.2.1.3.1.4-.1.2-.2.5-.6.7-.8.1-.2.3-.2.5-.1.5.2 1.3.6 1.5.7.2.1.3.1.4.3.1.2.1.9-.2 1.4-.3.5-1.1.9-1.6 1-.5 0-1.1.1-3.4-.9-2.4-1.1-3.9-3.5-4.1-3.7-.1-.2-1-1.3-1-2.5s.6-1.7.8-2Z"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                  <div
                    className={`relative cursor-pointer transition-colors ${
                      dragOverDay === toISODate(dia) ? "bg-accent/5" : ""
                    }`}
                    style={{ height: totalHeight }}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const offsetY = e.clientY - rect.top;
                      const minutos = HOUR_START * 60 + offsetY / PX_PER_MIN;
                      abrirNuevaCita(dia, minutos);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      setDragOverDay(toISODate(dia));
                    }}
                    onDragLeave={() => setDragOverDay((prev) => (prev === toISODate(dia) ? null : prev))}
                    onDrop={(e) => {
                      e.preventDefault();
                      const citaId = e.dataTransfer.getData("text/plain");
                      if (!citaId) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const offsetY = e.clientY - rect.top - dragGrabOffsetRef.current;
                      const minutos = HOUR_START * 60 + offsetY / PX_PER_MIN;
                      moverCita(citaId, toISODate(dia), minutos);
                    }}
                  >
                    {horario.comidaInicio && horario.comidaFin && (
                      <div
                        className="pointer-events-none absolute left-0 right-0 bg-ink/[0.03]"
                        style={{
                          top: (timeToMinutes(horario.comidaInicio) - HOUR_START * 60) * PX_PER_MIN,
                          height:
                            (timeToMinutes(horario.comidaFin) - timeToMinutes(horario.comidaInicio)) *
                            PX_PER_MIN,
                        }}
                        title="Horario de comida"
                      />
                    )}
                    {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => (
                      <div
                        key={i}
                        className="absolute left-0 right-0 border-b border-edge/5"
                        style={{ top: i * 60 * PX_PER_MIN }}
                      />
                    ))}

                    {withLane.map(({ cita, lane }) => {
                      const recurso = recursoPorId(cita.recursoId);
                      const top = (timeToMinutes(cita.horaInicio) - HOUR_START * 60) * PX_PER_MIN;
                      const height = Math.max(
                        (timeToMinutes(cita.horaFin) - timeToMinutes(cita.horaInicio)) * PX_PER_MIN,
                        18
                      );
                      const widthPct = 100 / totalLanes;
                      return (
                        <button
                          key={cita.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/plain", cita.id);
                            e.dataTransfer.effectAllowed = "move";
                            const rect = e.currentTarget.getBoundingClientRect();
                            dragGrabOffsetRef.current = e.clientY - rect.top;
                            setDraggingId(cita.id);
                          }}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setDragOverDay(null);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirEditarCita(cita);
                          }}
                          className={`absolute overflow-hidden rounded-md px-1.5 py-0.5 text-left text-[10px] leading-tight text-ink shadow-sm transition-transform hover:z-10 hover:scale-[1.02] ${
                            draggingId === cita.id ? "cursor-grabbing opacity-40" : "cursor-grab"
                          }`}
                          style={{
                            top,
                            height,
                            left: `${lane * widthPct}%`,
                            width: `calc(${widthPct}% - 2px)`,
                            backgroundColor: recurso?.color ?? "#666",
                          }}
                          title={`${cita.horaInicio}–${cita.horaFin} · ${cita.paciente} · ${recurso?.nombre ?? ""} — arrastra para cambiar el horario`}
                        >
                          <div className="font-semibold">
                            {cita.horaInicio} {cita.paciente}
                          </div>
                          {(cita.tratamientos ?? []).length > 0 && (
                            <div className="opacity-80">{cita.tratamientos.join(", ")}</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}
      </div>

      {dialogState && (
        <CitaDialog
          recursos={recursos}
          initial={dialogState.initial}
          isEditing={dialogState.isEditing}
          onClose={() => setDialogState(null)}
          onSave={guardarCita}
          onDelete={dialogState.isEditing ? eliminarCita : undefined}
        />
      )}

      {showRecursoDialog && (
        <NuevaRecursoDialog
          onClose={() => setShowRecursoDialog(false)}
          onSave={(nuevo) => {
            setRecursos((prev) => [...prev, { id: `r${Date.now()}`, ...nuevo }]);
            setShowRecursoDialog(false);
          }}
        />
      )}
    </div>
  );
}
