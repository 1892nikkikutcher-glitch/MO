"use client";

import { useEffect, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import {
  citaEstatusOptions,
  computeTratamientosPendientes,
  formatNombreConEdad,
  type CitaAgenda,
  type CitaEstatus,
  type FrecuenciaRecurrencia,
  type Recurso,
  type LineItem,
  type SavedBudget,
} from "@/lib/patientData";
import { renderPlantilla, formatFechaLarga, formatHora12 } from "@/lib/formatosWhatsapp";
import { manejarCambioNombre } from "@/lib/textoNombre";
import { formatDuracion } from "@/lib/procedimientos";
import GlobalAgregarPago from "@/components/GlobalAgregarPago";
import ConfirmarEliminar from "@/components/ConfirmarEliminar";
import {
  timeToMinutes,
  minutesToTime,
  detectarConflictos,
  inputClass,
  duracionOptions,
  addMonths,
  toISODate,
  statusAlpha,
  CITA_ESTATUS_HEX,
  CITA_BORDE_NEUTRO,
} from "@/lib/agendaHelpers";
import { IconExpediente, IconNotas, IconWhatsApp, IconPago } from "./AgendaIcons";

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

export default function AgendaCitaDialog({
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
  const {
    patients,
    addPatient,
    updatePatient,
    irAExpediente,
    clinicInfo,
    formatosWhatsapp,
    cargarDatosPaciente,
    presupuestosPorPaciente,
    setPresupuestosPaciente,
    pagosPorPaciente,
    citas,
  } = usePatientData();
  const medicos = recursos.filter((r) => r.tipo === "medico");
  const unidades = recursos.filter((r) => r.tipo === "unidad");
  /** Prioriza medicoId/unidadId; si la cita es legada (solo tiene
   * recursoId), resuelve el tipo del recurso apuntado para saber si era un
   * médico o una unidad. */
  const [medicoId, setMedicoId] = useState(() => {
    if (initial.medicoId) return initial.medicoId;
    const legado = initial.recursoId ? recursos.find((r) => r.id === initial.recursoId) : undefined;
    if (legado?.tipo === "medico") return initial.recursoId ?? "";
    return !isEditing ? medicos[0]?.id ?? "" : "";
  });
  const [unidadId, setUnidadId] = useState(() => {
    if (initial.unidadId) return initial.unidadId;
    const legado = initial.recursoId ? recursos.find((r) => r.id === initial.recursoId) : undefined;
    if (legado?.tipo === "unidad") return initial.recursoId ?? "";
    return "";
  });
  const [patientId, setPatientId] = useState(initial.patientId ?? "");
  const [searchText, setSearchText] = useState(initial.paciente ?? "");
  const [showAgregarPago, setShowAgregarPago] = useState(false);
  const patientData = initial.patientId ? patients.find((p) => p.id === initial.patientId) : undefined;

  useEffect(() => {
    if (initial.patientId) cargarDatosPaciente(initial.patientId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial.patientId]);

  const [telefono, setTelefono] = useState(patientData?.phone ?? "");
  const [correo, setCorreo] = useState(patientData?.email ?? "");
  const [tratamientos, setTratamientos] = useState<string[]>(initial.tratamientos ?? []);
  const [procedimientoInput, setProcedimientoInput] = useState("");
  const [costo, setCosto] = useState(initial.costo ?? "");
  const [comentarios, setComentarios] = useState(initial.comentarios ?? "");
  const [fecha, setFecha] = useState(initial.fecha);
  const [horaInicio, setHoraInicio] = useState(initial.horaInicio);
  const [duracion, setDuracion] = useState(
    initial.horaFin ? timeToMinutes(initial.horaFin) - timeToMinutes(initial.horaInicio) : 30
  );
  const [estatus, setEstatus] = useState<CitaEstatus>(initial.estatus ?? "Agendada");
  const [horaLlegada, setHoraLlegada] = useState(initial.horaLlegada ?? "");
  const [confirmandoEliminarCita, setConfirmandoEliminarCita] = useState(false);

  /** "En espera" significa que el paciente ya llegó y está esperando ser
   * atendido (no "pendiente de confirmar" — eso es Agendada). Al marcarla,
   * se estampa la hora real de llegada si aún no existe. */
  const marcarEstatus = (opt: CitaEstatus) => {
    setEstatus(opt);
    if (opt === "En espera" && !horaLlegada) {
      const ahora = new Date();
      setHoraLlegada(`${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`);
    }
  };
  const [recurrente, setRecurrente] = useState(false);
  const [frecuencia, setFrecuencia] = useState<FrecuenciaRecurrencia>("mensual");
  const [repeticiones, setRepeticiones] = useState(3);
  const folioRef = useState(() => initial.folio ?? `F-${Date.now().toString().slice(-6)}`)[0];

  const coincidencias =
    !patientId && searchText.trim().length > 0
      ? patients.filter((p) => p.name.toLowerCase().includes(searchText.trim().toLowerCase()))
      : [];

  const puedeGuardar =
    (medicoId || unidadId) && fecha && horaInicio && (patientId || searchText.trim().length > 0);

  const conflictos =
    fecha && horaInicio && (medicoId || unidadId)
      ? detectarConflictos(recursos, citas, {
          id: initial.id,
          fecha,
          horaInicio,
          horaFin: minutesToTime(timeToMinutes(horaInicio) + duracion),
          medicoId: medicoId || null,
          unidadId: unidadId || null,
          recursoId: medicoId || unidadId,
        })
      : [];

  const seleccionarPaciente = (id: string) => {
    const p = patients.find((pp) => pp.id === id);
    if (!p) return;
    setPatientId(id);
    setSearchText(p.name);
    setTelefono(p.phone);
    setCorreo(p.email ?? "");
    cargarDatosPaciente(id);
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

  const tratamientosPendientes = patientId
    ? computeTratamientosPendientes(
        presupuestosPorPaciente[patientId] ?? [],
        pagosPorPaciente[patientId] ?? []
      )
    : [];

  const agregarDelPresupuesto = (label: string) => {
    if (tratamientos.includes(label)) return;
    setTratamientos((prev) => [...prev, label]);
  };

  const quitarProcedimiento = (idx: number) => {
    setTratamientos((prev) => prev.filter((_, i) => i !== idx));
  };

  const nombrePacienteActual = patientId
    ? patients.find((p) => p.id === patientId)?.name ?? searchText
    : searchText.trim();

  // Inasistencias previas de este paciente (sin contar la cita que se está
  // editando) — para avisar antes de agendarle otra vez sin más precaución.
  const inasistenciasPrevias = patientId
    ? citas.filter((c) => c.patientId === patientId && c.estatus === "No Asistió" && c.id !== initial.id)
        .length
    : 0;

  const enviarConfirmacion = () => {
    const telefonoLimpio = telefono.replace(/\D/g, "");
    if (!telefonoLimpio || !nombrePacienteActual || !fecha || !horaInicio) return;
    const texto = renderPlantilla(formatosWhatsapp.confirmacionCita, {
      clinica: clinicInfo?.nombre || "tu clínica",
      paciente: nombrePacienteActual,
      fecha: formatFechaLarga(fecha),
      hora: formatHora12(horaInicio),
      procedimiento: tratamientos.join(", ") || "su tratamiento",
      costo: costo.trim() || "por confirmar",
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
      recursoId: medicoId || unidadId,
      medicoId: medicoId || null,
      unidadId: unidadId || null,
      patientId: patientId || null,
      paciente: nombrePaciente,
      tratamientos,
      costo: costo.trim(),
      comentarios: comentarios.trim(),
      fecha,
      horaInicio,
      horaFin: minutesToTime(timeToMinutes(horaInicio) + duracion),
      estatus,
      recurrenciaId: initial.recurrenciaId ?? (recurrente ? `rec${Date.now()}` : null),
      horaLlegada: horaLlegada || null,
    };

    // Si la cita queda ligada a un paciente y trae un costo estimado, se
    // refleja de una vez en su Presupuesto — así el presupuesto y los pagos
    // (que ya se calculan contra el presupuesto) quedan conectados desde
    // el momento en que se agenda, sin esperar a que alguien lo capture a
    // mano por separado. El presupuesto queda ligado 1 a 1 a esta cita
    // (mismo id, "pres-cita-<id de la cita>"): si se vuelve a guardar la
    // misma cita con otro costo o tratamientos, se actualiza ese mismo
    // presupuesto en vez de crear uno nuevo. Antes se evitaba duplicar
    // comparando el NOMBRE del procedimiento contra todo el historial del
    // paciente, pero eso hacía que una limpieza (o cualquier tratamiento
    // recurrente) ya facturada alguna vez dejara de generar presupuesto en
    // citas futuras — quedaban sin nada pendiente por cobrar.
    if (patientId && tratamientos.length > 0) {
      const montoCosto = Number(costo.replace(/[^\d.]/g, "")) || 0;
      if (montoCosto > 0) {
        const presupuestoId = `pres-cita-${base.id}`;
        const items: LineItem[] = tratamientos.map((t, idx) => ({
          id: `item-cita-${base.id}-${idx}`,
          procedure: t,
          price: idx === 0 ? montoCosto - Math.floor(montoCosto / tratamientos.length) * (tratamientos.length - 1) : Math.floor(montoCosto / tratamientos.length),
          teeth: [],
          note: "",
        }));
        const presupuestoDeCita: SavedBudget = {
          id: presupuestoId,
          folio: base.id.slice(-6),
          fecha,
          medico: recursos.find((r) => r.id === (medicoId || unidadId))?.nombre ?? "",
          tipoDePrecio: "Consultorio",
          especialidad: "Odontología General",
          diagnostico: "Generado automáticamente a partir de una cita agendada.",
          items,
          total: montoCosto,
        };
        setPresupuestosPaciente(patientId, (prev) => {
          const existe = prev.some((p) => p.id === presupuestoId);
          return existe
            ? prev.map((p) => (p.id === presupuestoId ? presupuestoDeCita : p))
            : [presupuestoDeCita, ...prev];
        });
      }
    }

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
      <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-edge/10 bg-modal-solid p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              {isEditing ? "Editar Cita" : "Nueva Cita"}
            </h2>
            <p className="text-xs text-ink/40">Folio: {initial.folio ?? folioRef}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {citaEstatusOptions.map((opt) => {
                const hex = CITA_ESTATUS_HEX[opt] ?? CITA_BORDE_NEUTRO;
                const activo = estatus === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => marcarEstatus(opt)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-opacity ${
                      activo ? "" : "opacity-45 hover:opacity-80"
                    }`}
                    style={{
                      color: hex,
                      borderColor: hex,
                      backgroundColor: statusAlpha(hex, activo ? 0.22 : 0.1),
                    }}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => patientId && irAExpediente(patientId)}
              disabled={!patientId}
              title={patientId ? "Ver expediente" : "Selecciona un paciente primero"}
              className="flex h-11 w-11 items-center justify-center rounded-full text-success transition-colors hover:bg-success/15 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <IconExpediente size={22} />
            </button>
            <button
              type="button"
              onClick={() => patientId && irAExpediente(patientId, "Notas de Evolución y Seguimiento")}
              disabled={!patientId}
              title={patientId ? "Notas de evolución" : "Selecciona un paciente primero"}
              className="flex h-11 w-11 items-center justify-center rounded-full text-success transition-colors hover:bg-success/15 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <IconNotas size={22} />
            </button>
            <button
              type="button"
              onClick={enviarConfirmacion}
              disabled={!puedeEnviarConfirmacion}
              title={
                puedeEnviarConfirmacion
                  ? "Enviar confirmación de cita por WhatsApp"
                  : "Falta teléfono, paciente, fecha u hora para poder enviar"
              }
              className="flex h-11 w-11 items-center justify-center rounded-full text-success transition-colors hover:bg-success/15 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <IconWhatsApp size={24} />
            </button>
            <button
              type="button"
              onClick={() => patientId && setShowAgregarPago(true)}
              disabled={!patientId}
              title={patientId ? "Registrar pago" : "Selecciona un paciente primero"}
              className="flex h-11 w-11 items-center justify-center rounded-full text-success transition-colors hover:bg-success/15 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <IconPago size={22} />
            </button>
            <button
              onClick={onClose}
              className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Médico</label>
            <select value={medicoId} onChange={(e) => setMedicoId(e.target.value)} className={inputClass}>
              <option value="">Sin médico asignado</option>
              {medicos.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Unidad</label>
            <select value={unidadId} onChange={(e) => setUnidadId(e.target.value)} className={inputClass}>
              <option value="">Sin unidad asignada</option>
              {unidades.map((r) => (
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
                <button
                  onClick={cambiarPaciente}
                  className="text-xs font-semibold text-success hover:text-success"
                >
                  Cambiar
                </button>
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
                        {formatNombreConEdad(p.name, p.birthDate)}
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
          </div>

          {inasistenciasPrevias > 0 && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
              <p className="font-semibold">
                ⚠️ Este paciente no asistió a {inasistenciasPrevias === 1 ? "una cita anterior" : `${inasistenciasPrevias} citas anteriores`} sin avisar.
              </p>
              <p className="mt-1 text-danger/80">
                Considera ofrecer un horario que te afecte menos si vuelve a faltar, o pedirle un
                pago anticipado (transferencia u otro medio electrónico) antes de confirmar esta
                cita.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Procedimiento(s) de la cita o Motivo de Consulta
            </label>
            {tratamientosPendientes.length > 0 && (
              <div className="mb-2 space-y-1">
                <p className="text-[11px] text-ink/40">Del presupuesto de este paciente:</p>
                <div className="flex flex-wrap gap-1.5">
                  {tratamientosPendientes.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => agregarDelPresupuesto(t.label)}
                      disabled={tratamientos.includes(t.label)}
                      className="rounded-full border border-accent/30 px-2.5 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      + {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Costo estimado (aparece en el recordatorio de WhatsApp)</label>
            <input
              type="text"
              value={costo}
              onChange={(e) => setCosto(e.target.value)}
              placeholder="Ej. $1,200"
              className={inputClass}
            />
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
                    {formatDuracion(d)}
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
        </div>

        {conflictos.length > 0 && (
          <div className="mt-4 space-y-0.5 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
            {conflictos.map((c, i) => (
              <p key={i}>⚠️ {c}</p>
            ))}
          </div>
        )}

        <div className="mt-6 flex gap-3">
          {isEditing && onDelete && (
            <button
              onClick={() => setConfirmandoEliminarCita(true)}
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

      {showAgregarPago && patientId && (
        <GlobalAgregarPago initialPatientId={patientId} onClose={() => setShowAgregarPago(false)} />
      )}

      {confirmandoEliminarCita && onDelete && (
        <ConfirmarEliminar
          titulo="¿Eliminar esta cita?"
          mensaje={`Vas a eliminar la cita de ${nombrePacienteActual || searchText || "este paciente"}${
            fecha ? ` del ${fecha}` : ""
          }${horaInicio ? ` a las ${horaInicio}` : ""}. Esta acción no se puede deshacer.`}
          onCancel={() => setConfirmandoEliminarCita(false)}
          onConfirm={onDelete}
        />
      )}
    </div>
  );
}
