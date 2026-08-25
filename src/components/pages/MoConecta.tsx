"use client";

import { useMemo, useState } from "react";
import { useMoConecta } from "@/context/MoConectaContext";
import { usePatientData } from "@/context/PatientDataContext";
import {
  interconsultaEstadoLabel,
  puedeTransicionar,
  TEXTO_DISCLAIMER_CONSENTIMIENTO,
  type CategoriaArchivoInterconsulta,
  type Interconsulta,
  type InterconsultaEstado,
  type PrioridadInterconsulta,
} from "@/lib/moConecta";
import {
  crearInterconsultaApi,
  crearInvitacionApi,
  crearMensajeApi,
  crearPerfilProfesionalApi,
  descargarArchivoInterconsultaApi,
  editarPerfilProfesionalApi,
  registrarContrarreferenciaApi,
  resolverSolicitudAccesoApi,
  revocarAccesoApi,
  subirArchivoInterconsultaApi,
  subirEvidenciaVerificacionApi,
  transicionarEstadoApi,
} from "@/lib/conectaApi";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect } from "react";
import { db } from "@/lib/firebase";
import type { MensajeInterconsulta } from "@/lib/conectaMensajes";
import type { SolicitudAcceso } from "@/lib/invitacionesConecta";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";
const labelClass = "mb-1 block text-xs font-medium text-ink/60";
const botonPrimario =
  "rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const botonSecundario =
  "rounded-lg border border-edge/10 bg-surface px-4 py-2 text-sm text-ink/70 transition-colors hover:text-ink";

const estadoColor: Record<InterconsultaEstado, string> = {
  sent: "bg-ink/10 text-ink/60",
  received: "bg-ink/10 text-ink/60",
  accepted: "bg-accent/15 text-accent",
  rejected: "bg-danger/10 text-danger",
  patient_contacted: "bg-accent/15 text-accent",
  scheduled: "bg-accent/15 text-accent",
  in_treatment: "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
  counter_referral_sent: "bg-success/10 text-success",
  closed: "bg-success/15 text-success",
  cancelled: "bg-danger/10 text-danger",
};

function EstadoBadge({ estado }: { estado: InterconsultaEstado }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${estadoColor[estado]}`}>
      {interconsultaEstadoLabel[estado]}
    </span>
  );
}

export default function MoConecta() {
  const [tab, setTab] = useState<"perfil" | "directorio" | "casos">("perfil");
  const { perfilPublico } = useMoConecta();
  const [casoAbierto, setCasoAbierto] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-ink/60">
        MO Conecta es la red profesional entre odontólogos dentro de MO: encuentra colegas, envía interconsultas con el
        expediente mínimo necesario y da seguimiento al caso sin salir de la plataforma.
      </p>

      <div className="flex gap-2 border-b border-edge/10">
        {[
          { id: "perfil" as const, label: "Mi perfil" },
          { id: "directorio" as const, label: "Directorio" },
          { id: "casos" as const, label: "Mis casos" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "border-b-2 border-accent text-accent" : "text-ink/50 hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "perfil" && <PerfilTab />}
      {tab === "directorio" && (
        <DirectorioTab
          onCasoCreado={(id) => {
            setCasoAbierto(id);
            setTab("casos");
          }}
        />
      )}
      {tab === "casos" && <CasosTab casoAbiertoId={casoAbierto} onAbrirCaso={setCasoAbierto} />}

      {!perfilPublico && tab !== "perfil" && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          Todavía no creas tu perfil profesional — ve a la pestaña &quot;Mi perfil&quot; para aparecer en el directorio y
          poder enviar o recibir interconsultas.
        </p>
      )}
    </div>
  );
}

function PerfilTab() {
  const { perfilPublico, perfilPrivado, uid } = useMoConecta();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const [form, setForm] = useState({
    nombreCompleto: perfilPublico?.nombreCompleto ?? "",
    universidad: perfilPublico?.universidad ?? "",
    areasPractica: (perfilPublico?.areasPractica ?? []).join(", "),
    descripcion: perfilPublico?.descripcion ?? "",
    municipio: perfilPublico?.municipio ?? "",
    estado: perfilPublico?.estado ?? "",
    modalidadAtencion: perfilPublico?.modalidadAtencion ?? "",
    horariosGenerales: perfilPublico?.horariosGenerales ?? "",
    aceptaInterconsultas: perfilPublico?.aceptaInterconsultas ?? true,
    tiposCasosRecibe: (perfilPublico?.tiposCasosRecibe ?? []).join(", "),
    aceptaUrgencias: perfilPublico?.aceptaUrgencias ?? false,
    tiempoRespuestaHabitual: perfilPublico?.tiempoRespuestaHabitual ?? "",
    activoEnDirectorio: perfilPublico?.activoEnDirectorio ?? false,
    cedulaProfesional: perfilPrivado?.cedulaProfesional ?? "",
    telefonoProfesional: perfilPrivado?.telefonoProfesional ?? "",
  });

  async function guardar() {
    setGuardando(true);
    setError(null);
    setOk(false);
    try {
      const body = {
        ...form,
        areasPractica: form.areasPractica.split(",").map((s) => s.trim()).filter(Boolean),
        tiposCasosRecibe: form.tiposCasosRecibe.split(",").map((s) => s.trim()).filter(Boolean),
      };
      if (perfilPublico) {
        await editarPerfilProfesionalApi(uid, body);
      } else {
        await crearPerfilProfesionalApi(body);
      }
      setOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el perfil.");
    } finally {
      setGuardando(false);
    }
  }

  async function subirEvidencia(archivo: File) {
    try {
      await subirEvidenciaVerificacionApi(uid, archivo);
      setOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la evidencia.");
    }
  }

  return (
    <div className="max-w-2xl space-y-5 rounded-2xl border border-edge/10 bg-surface p-5">
      {perfilPublico?.estadoVerificacion && (
        <div
          className={`rounded-lg px-3 py-2 text-sm ${
            perfilPublico.estadoVerificacion === "verificado"
              ? "bg-success/10 text-success"
              : perfilPublico.estadoVerificacion === "rechazado"
                ? "bg-danger/10 text-danger"
                : "bg-ink/10 text-ink/60"
          }`}
        >
          Verificación:{" "}
          {perfilPublico.estadoVerificacion === "verificado"
            ? "Perfil verificado"
            : perfilPublico.estadoVerificacion === "rechazado"
              ? "Evidencia rechazada — sube un documento válido"
              : "Pendiente de revisión"}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Nombre completo</label>
          <input
            className={inputClass}
            value={form.nombreCompleto}
            onChange={(e) => setForm((f) => ({ ...f, nombreCompleto: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Universidad</label>
          <input
            className={inputClass}
            value={form.universidad}
            onChange={(e) => setForm((f) => ({ ...f, universidad: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Municipio</label>
          <input
            className={inputClass}
            value={form.municipio}
            onChange={(e) => setForm((f) => ({ ...f, municipio: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Estado</label>
          <input
            className={inputClass}
            value={form.estado}
            onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Áreas de práctica (separadas por coma)</label>
          <input
            className={inputClass}
            value={form.areasPractica}
            onChange={(e) => setForm((f) => ({ ...f, areasPractica: e.target.value }))}
            placeholder="Endodoncia, Ortodoncia, Cirugía maxilofacial"
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Descripción breve</label>
          <textarea
            className={inputClass}
            rows={3}
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Modalidad de atención</label>
          <input
            className={inputClass}
            value={form.modalidadAtencion}
            onChange={(e) => setForm((f) => ({ ...f, modalidadAtencion: e.target.value }))}
            placeholder="Consultorio, a domicilio, ambos"
          />
        </div>
        <div>
          <label className={labelClass}>Horarios generales</label>
          <input
            className={inputClass}
            value={form.horariosGenerales}
            onChange={(e) => setForm((f) => ({ ...f, horariosGenerales: e.target.value }))}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>Tipos de caso que recibe (separados por coma)</label>
          <input
            className={inputClass}
            value={form.tiposCasosRecibe}
            onChange={(e) => setForm((f) => ({ ...f, tiposCasosRecibe: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Tiempo de respuesta habitual</label>
          <input
            className={inputClass}
            value={form.tiempoRespuestaHabitual}
            onChange={(e) => setForm((f) => ({ ...f, tiempoRespuestaHabitual: e.target.value }))}
            placeholder="Ej. dentro de 24 horas"
          />
        </div>
        <div>
          <label className={labelClass}>Cédula profesional</label>
          <input
            className={inputClass}
            value={form.cedulaProfesional}
            onChange={(e) => setForm((f) => ({ ...f, cedulaProfesional: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Teléfono profesional</label>
          <input
            className={inputClass}
            value={form.telefonoProfesional}
            onChange={(e) => setForm((f) => ({ ...f, telefonoProfesional: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={form.aceptaInterconsultas}
            onChange={(e) => setForm((f) => ({ ...f, aceptaInterconsultas: e.target.checked }))}
          />
          Acepto recibir interconsultas
        </label>
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={form.aceptaUrgencias}
            onChange={(e) => setForm((f) => ({ ...f, aceptaUrgencias: e.target.checked }))}
          />
          Acepto casos urgentes
        </label>
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={form.activoEnDirectorio}
            onChange={(e) => setForm((f) => ({ ...f, activoEnDirectorio: e.target.checked }))}
          />
          Mostrar mi perfil en el directorio
        </label>
      </div>

      {perfilPublico && (
        <div>
          <label className={labelClass}>Evidencia de cédula (para verificación por el administrador)</label>
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            onChange={(e) => e.target.files?.[0] && subirEvidencia(e.target.files[0])}
            className="text-sm text-ink/70"
          />
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      {ok && <p className="text-sm text-success">Guardado correctamente.</p>}

      <button onClick={guardar} disabled={guardando || !form.nombreCompleto.trim()} className={botonPrimario}>
        {guardando ? "Guardando…" : perfilPublico ? "Guardar cambios" : "Crear mi perfil"}
      </button>
    </div>
  );
}

function DirectorioTab({ onCasoCreado }: { onCasoCreado: (interconsultaId: string) => void }) {
  const { directorio, uid } = useMoConecta();
  const [destinatario, setDestinatario] = useState<{ uid: string; nombreCompleto: string } | null>(null);
  const colegas = directorio.filter((p) => p.uid !== uid);

  return (
    <div className="space-y-4">
      {colegas.length === 0 && (
        <p className="text-sm text-ink/50">Todavía no hay colegas con el directorio activo. Sé de los primeros.</p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {colegas.map((p) => (
          <div key={p.uid} className="rounded-2xl border border-edge/10 bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-ink">{p.nombreCompleto}</h3>
              {p.estadoVerificacion === "verificado" && (
                <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                  Verificado
                </span>
              )}
            </div>
            {p.clinicaNombre && <p className="mt-1 text-xs text-ink/50">{p.clinicaNombre}</p>}
            {(p.municipio || p.estado) && (
              <p className="text-xs text-ink/50">{[p.municipio, p.estado].filter(Boolean).join(", ")}</p>
            )}
            {p.areasPractica.length > 0 && (
              <p className="mt-2 text-xs text-ink/70">{p.areasPractica.join(" · ")}</p>
            )}
            {p.descripcion && <p className="mt-2 text-xs text-ink/60">{p.descripcion}</p>}
            <button
              onClick={() => setDestinatario({ uid: p.uid, nombreCompleto: p.nombreCompleto })}
              className={`${botonPrimario} mt-3 w-full text-center`}
              disabled={!p.aceptaInterconsultas}
              title={p.aceptaInterconsultas ? "Enviar interconsulta" : "Este colega no está recibiendo interconsultas ahora"}
            >
              Enviar interconsulta
            </button>
          </div>
        ))}
      </div>

      {destinatario && (
        <NuevaInterconsultaDialog
          destinatario={destinatario}
          onClose={() => setDestinatario(null)}
          onCreada={(id) => {
            setDestinatario(null);
            onCasoCreado(id);
          }}
        />
      )}
    </div>
  );
}

function NuevaInterconsultaDialog({
  destinatario,
  onClose,
  onCreada,
}: {
  destinatario: { uid: string; nombreCompleto: string };
  onClose: () => void;
  onCreada: (id: string) => void;
}) {
  const { clinicUid, patients } = usePatientData();
  const [pacienteId, setPacienteId] = useState("");
  const [especialidadSolicitada, setEspecialidadSolicitada] = useState("");
  const [motivo, setMotivo] = useState("");
  const [preguntaClinica, setPreguntaClinica] = useState("");
  const [prioridad, setPrioridad] = useState<PrioridadInterconsulta>("ordinaria");
  const [informacionMinima, setInformacionMinima] = useState("");
  const [aceptaConsentimiento, setAceptaConsentimiento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pacienteSeleccionado = patients.find((p) => p.id === pacienteId);

  async function enviar() {
    if (!clinicUid || !pacienteSeleccionado) return;
    setEnviando(true);
    setError(null);
    try {
      const { interconsulta } = await crearInterconsultaApi({
        clinicaRemitenteId: clinicUid,
        pacienteId,
        especialidadSolicitada,
        motivo,
        preguntaClinica,
        prioridad,
        destinatarioUid: destinatario.uid,
        informacionMinima: informacionMinima || undefined,
        consentimiento: {
          destinatarioTipo: "odontologo_registrado",
          destinatarioId: destinatario.uid,
          finalidad: "Interconsulta odontológica para valoración/tratamiento del paciente.",
          informacionCompartida: ["Resumen de historia clínica", "Motivo y pregunta clínica", especialidadSolicitada].filter(
            Boolean
          ),
        },
      });
      onCreada(interconsulta.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la interconsulta.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
        <h2 className="mb-4 text-lg font-semibold text-ink">Enviar interconsulta a {destinatario.nombreCompleto}</h2>

        <div className="space-y-3">
          <div>
            <label className={labelClass}>Paciente</label>
            <select className={inputClass} value={pacienteId} onChange={(e) => setPacienteId(e.target.value)}>
              <option value="">Selecciona un paciente…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Especialidad solicitada</label>
            <input
              className={inputClass}
              value={especialidadSolicitada}
              onChange={(e) => setEspecialidadSolicitada(e.target.value)}
              placeholder="Ej. Endodoncia"
            />
          </div>
          <div>
            <label className={labelClass}>Motivo</label>
            <textarea className={inputClass} rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Pregunta clínica</label>
            <textarea
              className={inputClass}
              rows={2}
              value={preguntaClinica}
              onChange={(e) => setPreguntaClinica(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Información mínima adicional (opcional)</label>
            <textarea
              className={inputClass}
              rows={2}
              value={informacionMinima}
              onChange={(e) => setInformacionMinima(e.target.value)}
              placeholder="Solo lo estrictamente necesario para este caso"
            />
          </div>
          <div>
            <label className={labelClass}>Prioridad</label>
            <select
              className={inputClass}
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value as PrioridadInterconsulta)}
            >
              <option value="ordinaria">Ordinaria</option>
              <option value="preferente">Preferente</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>

          <div className="rounded-lg border border-edge/10 bg-field p-3 text-xs text-ink/60">
            {TEXTO_DISCLAIMER_CONSENTIMIENTO}
          </div>
          <label className="flex items-start gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={aceptaConsentimiento}
              onChange={(e) => setAceptaConsentimiento(e.target.checked)}
            />
            Cuento con el consentimiento del paciente para compartir esta información con el colega destinatario.
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className={botonSecundario}>
            Cancelar
          </button>
          <button
            onClick={enviar}
            disabled={
              enviando ||
              !pacienteId ||
              !especialidadSolicitada.trim() ||
              !motivo.trim() ||
              !preguntaClinica.trim() ||
              !aceptaConsentimiento
            }
            className={botonPrimario}
          >
            {enviando ? "Enviando…" : "Enviar interconsulta"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CasosTab({
  casoAbiertoId,
  onAbrirCaso,
}: {
  casoAbiertoId: string | null;
  onAbrirCaso: (id: string | null) => void;
}) {
  const { casosEnviados, casosRecibidos, cargando } = useMoConecta();
  const [sub, setSub] = useState<"enviados" | "recibidos">("enviados");
  const casoAbierto = [...casosEnviados, ...casosRecibidos].find((c) => c.id === casoAbiertoId) ?? null;

  if (casoAbierto) {
    return <SalaDelCaso interconsulta={casoAbierto} onVolver={() => onAbrirCaso(null)} />;
  }

  const lista = sub === "enviados" ? casosEnviados : casosRecibidos;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setSub("enviados")}
          className={`rounded-lg px-3 py-1.5 text-sm ${sub === "enviados" ? "bg-accent text-black" : "bg-surface text-ink/60"}`}
        >
          Enviados ({casosEnviados.length})
        </button>
        <button
          onClick={() => setSub("recibidos")}
          className={`rounded-lg px-3 py-1.5 text-sm ${sub === "recibidos" ? "bg-accent text-black" : "bg-surface text-ink/60"}`}
        >
          Recibidos ({casosRecibidos.length})
        </button>
      </div>

      {cargando && <p className="text-sm text-ink/50">Cargando…</p>}
      {!cargando && lista.length === 0 && <p className="text-sm text-ink/50">No hay casos aquí todavía.</p>}

      <div className="space-y-2">
        {lista
          .slice()
          .sort((a, b) => b.actualizadoEl.localeCompare(a.actualizadoEl))
          .map((c) => (
            <button
              key={c.id}
              onClick={() => onAbrirCaso(c.id)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-edge/10 bg-surface p-4 text-left transition-colors hover:border-accent/40"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  {c.resumenPaciente.nombre} · {c.especialidadSolicitada}
                </p>
                <p className="truncate text-xs text-ink/50">{c.motivo}</p>
              </div>
              <EstadoBadge estado={c.estado} />
            </button>
          ))}
      </div>
    </div>
  );
}

function useMensajes(interconsultaId: string) {
  const [mensajes, setMensajes] = useState<MensajeInterconsulta[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "interconsultas", interconsultaId, "mensajes"), (snap) => {
      setMensajes(
        snap.docs
          .map((d) => d.data() as MensajeInterconsulta)
          .sort((a, b) => a.fecha.localeCompare(b.fecha))
      );
    });
    return unsub;
  }, [interconsultaId]);
  return mensajes;
}

function useSolicitudesAcceso(interconsultaId: string) {
  const [solicitudes, setSolicitudes] = useState<SolicitudAcceso[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "interconsultas", interconsultaId, "solicitudesAcceso"), where("estado", "==", "pendiente")),
      (snap) => setSolicitudes(snap.docs.map((d) => d.data() as SolicitudAcceso))
    );
    return unsub;
  }, [interconsultaId]);
  return solicitudes;
}

function SalaDelCaso({ interconsulta, onVolver }: { interconsulta: Interconsulta; onVolver: () => void }) {
  const { uid } = useMoConecta();
  const mensajes = useMensajes(interconsulta.id);
  const solicitudesAcceso = useSolicitudesAcceso(interconsulta.id);
  const esRemitente = interconsulta.odontologoRemitenteUid === uid;
  const esDestinatario = interconsulta.destinatarioUid === uid;

  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);
  const [notaTransicion, setNotaTransicion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [mostrarInvitar, setMostrarInvitar] = useState(false);
  const [mostrarContrarreferencia, setMostrarContrarreferencia] = useState(false);

  async function cambiarEstado(siguiente: InterconsultaEstado) {
    setError(null);
    try {
      await transicionarEstadoApi(interconsulta.id, siguiente, notaTransicion || undefined);
      setNotaTransicion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el estado.");
    }
  }

  async function enviarMensaje() {
    if (!nuevoMensaje.trim()) return;
    setEnviandoMensaje(true);
    try {
      await crearMensajeApi(interconsulta.id, nuevoMensaje.trim());
      setNuevoMensaje("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar el mensaje.");
    } finally {
      setEnviandoMensaje(false);
    }
  }

  async function subirArchivo(archivo: File, categoria: CategoriaArchivoInterconsulta) {
    setSubiendoArchivo(true);
    setError(null);
    try {
      await subirArchivoInterconsultaApi(interconsulta.id, archivo, categoria);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el archivo.");
    } finally {
      setSubiendoArchivo(false);
    }
  }

  async function revocar(uidARevocar: string) {
    if (!confirm("¿Quitar el acceso de este participante a este caso?")) return;
    try {
      await revocarAccesoApi(interconsulta.id, uidARevocar);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo revocar el acceso.");
    }
  }

  const tieneJustificacion = notaTransicion.trim().length > 0;
  const siguientesPosibles: InterconsultaEstado[] = [
    "accepted",
    "rejected",
    "patient_contacted",
    "scheduled",
    "in_treatment",
    "completed",
    "closed",
    "cancelled",
  ].filter((e) => puedeTransicionar(interconsulta.estado, e as InterconsultaEstado, tieneJustificacion)) as InterconsultaEstado[];

  return (
    <div className="space-y-4">
      <button onClick={onVolver} className="text-sm text-ink/60 hover:text-ink">
        ← Volver a mis casos
      </button>

      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              {interconsulta.resumenPaciente.nombre} · {interconsulta.especialidadSolicitada}
            </h2>
            <p className="text-sm text-ink/60">{interconsulta.motivo}</p>
          </div>
          <EstadoBadge estado={interconsulta.estado} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-ink/40">Edad</p>
            <p className="text-ink/80">{interconsulta.resumenPaciente.edadTexto}</p>
          </div>
          {interconsulta.resumenPaciente.alergias && (
            <div>
              <p className="text-xs text-ink/40">Alergias</p>
              <p className="text-danger">{interconsulta.resumenPaciente.alergias}</p>
            </div>
          )}
          {interconsulta.resumenPaciente.condicionesSistemicas.length > 0 && (
            <div className="sm:col-span-2">
              <p className="text-xs text-ink/40">Condiciones sistémicas</p>
              <p className="text-ink/80">{interconsulta.resumenPaciente.condicionesSistemicas.join(", ")}</p>
            </div>
          )}
          <div className="sm:col-span-2">
            <p className="text-xs text-ink/40">Pregunta clínica</p>
            <p className="text-ink/80">{interconsulta.preguntaClinica}</p>
          </div>
        </div>
      </div>

      {solicitudesAcceso.length > 0 && esRemitente && (
        <div className="space-y-2 rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <p className="text-sm font-medium text-warning">Solicitudes de acceso pendientes</p>
          {solicitudesAcceso.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink/70">{s.identidadVerificadaUsada}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => resolverSolicitudAccesoApi(interconsulta.id, s.id, "aprobar")}
                  className="rounded-lg bg-success/15 px-3 py-1 text-xs font-medium text-success"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => resolverSolicitudAccesoApi(interconsulta.id, s.id, "rechazar")}
                  className="rounded-lg bg-danger/15 px-3 py-1 text-xs font-medium text-danger"
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-ink">Estado del caso</h3>
        {error && <p className="mb-2 text-sm text-danger">{error}</p>}
        {siguientesPosibles.length > 0 ? (
          <div className="space-y-2">
            <input
              className={inputClass}
              placeholder="Nota / justificación (obligatoria para algunas transiciones)"
              value={notaTransicion}
              onChange={(e) => setNotaTransicion(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {siguientesPosibles.map((e) => (
                <button key={e} onClick={() => cambiarEstado(e)} className={botonSecundario}>
                  {interconsultaEstadoLabel[e]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink/50">Este caso no tiene transiciones disponibles en este momento.</p>
        )}

        {!interconsulta.destinatarioUid && esRemitente && (
          <button onClick={() => setMostrarInvitar(true)} className={`${botonPrimario} mt-3`}>
            Invitar a un colega que no está en MO
          </button>
        )}

        {esDestinatario && interconsulta.estado !== "cancelled" && interconsulta.estado !== "rejected" && (
          <button onClick={() => setMostrarContrarreferencia(true)} className={`${botonSecundario} mt-3`}>
            Registrar contrarreferencia
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-ink">Participantes</h3>
        <div className="space-y-1 text-sm text-ink/70">
          {interconsulta.participantesAutorizados.map((p) => (
            <div key={p} className="flex items-center justify-between">
              <span>
                {p === interconsulta.odontologoRemitenteUid ? "Remitente" : "Destinatario"} — {p === uid ? "Tú" : p}
              </span>
              {p !== interconsulta.odontologoRemitenteUid && p !== uid && (
                <button onClick={() => revocar(p)} className="text-xs text-danger hover:underline">
                  Revocar acceso
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-ink">Archivos</h3>
        <div className="space-y-2">
          {interconsulta.archivos.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-edge/10 p-2 text-sm">
              <span className="truncate text-ink/70">{a.nombreOriginalSaneado}</span>
              <button
                onClick={() => descargarArchivoInterconsultaApi(interconsulta.id, a.id, a.nombreOriginalSaneado)}
                className="text-xs text-accent hover:underline"
              >
                Descargar
              </button>
            </div>
          ))}
          {interconsulta.archivos.length === 0 && <p className="text-sm text-ink/50">Sin archivos todavía.</p>}
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            disabled={subiendoArchivo}
            onChange={(e) => e.target.files?.[0] && subirArchivo(e.target.files[0], "documento")}
            className="text-sm text-ink/70"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-ink">Mensajes</h3>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {mensajes.map((m) => (
            <div
              key={m.id}
              className={`max-w-[80%] rounded-lg p-2 text-sm ${
                m.autor === uid ? "ml-auto bg-accent/15 text-ink" : "bg-field text-ink/80"
              }`}
            >
              {m.contenido}
            </div>
          ))}
          {mensajes.length === 0 && <p className="text-sm text-ink/50">Sin mensajes todavía.</p>}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            className={inputClass}
            value={nuevoMensaje}
            onChange={(e) => setNuevoMensaje(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enviarMensaje()}
            placeholder="Escribe un mensaje…"
          />
          <button onClick={enviarMensaje} disabled={enviandoMensaje || !nuevoMensaje.trim()} className={botonPrimario}>
            Enviar
          </button>
        </div>
      </div>

      {mostrarInvitar && (
        <InvitarColegaDialog interconsultaId={interconsulta.id} onClose={() => setMostrarInvitar(false)} />
      )}
      {mostrarContrarreferencia && (
        <ContrarreferenciaDialog interconsultaId={interconsulta.id} onClose={() => setMostrarContrarreferencia(false)} />
      )}
    </div>
  );
}

function InvitarColegaDialog({ interconsultaId, onClose }: { interconsultaId: string; onClose: () => void }) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [enlace, setEnlace] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function crear() {
    setEnviando(true);
    setError(null);
    try {
      const { enlace: url } = await crearInvitacionApi({
        interconsultaId,
        destinatarioNombre: nombre || undefined,
        destinatarioCorreo: correo,
        canal: "copiar_enlace",
      });
      setEnlace(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la invitación.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-edge/10 bg-modal p-6">
        <h3 className="mb-4 text-base font-semibold text-ink">Invitar colega por enlace seguro</h3>
        {!enlace ? (
          <div className="space-y-3">
            <div>
              <label className={labelClass}>Nombre (opcional)</label>
              <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Correo del colega</label>
              <input className={inputClass} type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} />
            </div>
            <p className="text-xs text-ink/50">
              El enlace solo se puede reclamar identificándose con ese correo (verificado por Firebase) — si alguien más
              lo abre con otra identidad, se te pedirá aprobar su acceso antes de que vea el caso.
            </p>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={onClose} className={botonSecundario}>
                Cancelar
              </button>
              <button onClick={crear} disabled={enviando || !correo.trim()} className={botonPrimario}>
                {enviando ? "Creando…" : "Crear enlace"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-ink/70">Comparte este enlace con tu colega (vence en 7 días, un solo uso):</p>
            <input readOnly className={inputClass} value={enlace} onFocus={(e) => e.target.select()} />
            <div className="flex justify-end">
              <button onClick={onClose} className={botonPrimario}>
                Listo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ContrarreferenciaDialog({ interconsultaId, onClose }: { interconsultaId: string; onClose: () => void }) {
  const [resumenAtencion, setResumenAtencion] = useState("");
  const [estadoActual, setEstadoActual] = useState("");
  const [recomendaciones, setRecomendaciones] = useState("");
  const [devolverAlRemitente, setDevolverAlRemitente] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(esBorrador: boolean) {
    setEnviando(true);
    setError(null);
    try {
      await registrarContrarreferenciaApi(interconsultaId, {
        resumenAtencion,
        estadoActual,
        recomendaciones: recomendaciones || undefined,
        devolverAlRemitente,
        esBorrador,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar la contrarreferencia.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-edge/10 bg-modal p-6">
        <h3 className="mb-4 text-base font-semibold text-ink">Registrar contrarreferencia</h3>
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Resumen de la atención</label>
            <textarea
              className={inputClass}
              rows={3}
              value={resumenAtencion}
              onChange={(e) => setResumenAtencion(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Estado actual del paciente</label>
            <textarea className={inputClass} rows={2} value={estadoActual} onChange={(e) => setEstadoActual(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Recomendaciones (opcional)</label>
            <textarea
              className={inputClass}
              rows={2}
              value={recomendaciones}
              onChange={(e) => setRecomendaciones(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={devolverAlRemitente}
              onChange={(e) => setDevolverAlRemitente(e.target.checked)}
            />
            Devolver el seguimiento al odontólogo remitente
          </label>
        </div>
        {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className={botonSecundario}>
            Cancelar
          </button>
          <button onClick={() => enviar(true)} disabled={enviando} className={botonSecundario}>
            Guardar borrador
          </button>
          <button
            onClick={() => enviar(false)}
            disabled={enviando || !resumenAtencion.trim() || !estadoActual.trim()}
            className={botonPrimario}
          >
            Enviar contrarreferencia
          </button>
        </div>
      </div>
    </div>
  );
}
