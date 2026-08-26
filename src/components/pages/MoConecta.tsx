"use client";

import { useMemo, useState } from "react";
import { useMoConecta } from "@/context/MoConectaContext";
import { usePatientData } from "@/context/PatientDataContext";
import {
  interconsultaEstadoLabel,
  modalidadesAtencion,
  puedeTransicionar,
  TEXTO_DISCLAIMER_CONSENTIMIENTO,
  type CategoriaArchivoInterconsulta,
  type Interconsulta,
  type InterconsultaEstado,
  type AfiliacionClinica,
  type EstadoAfiliacion,
  type ModalidadAtencion,
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
  registrarEventoApi,
  resolverAfiliacionApi,
  resolverSolicitudAccesoApi,
  revocarAccesoApi,
  revocarConsentimientoApi,
  solicitarAfiliacionApi,
  subirArchivoInterconsultaApi,
  subirEvidenciaVerificacionApi,
  transicionarEstadoApi,
} from "@/lib/conectaApi";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect } from "react";
import { db } from "@/lib/firebase";
import { manejarCambioNombre } from "@/lib/textoNombre";
import { buildMensajeInvitacionConecta } from "@/lib/invitacionesConecta";
import type { MensajeInterconsulta } from "@/lib/conectaMensajes";
import type { SolicitudAcceso } from "@/lib/invitacionesConecta";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";
const labelClass = "mb-1 block text-xs font-medium text-ink/60";
const botonPrimario =
  "rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const botonSecundario =
  "rounded-lg border border-edge/10 bg-surface px-4 py-2 text-sm text-ink/70 transition-colors hover:text-ink";

/** wa.me exige el número completo con código de país, sin "+" ni espacios.
 * Si capturan solo los 10 dígitos locales (el caso normal en México), se
 * antepone "52" — WhatsApp ya no requiere el "1" extra para celulares
 * mexicanos que pedía hace años. Si ya trae más de 10 dígitos se asume que
 * el código de país ya viene incluido. */
function numeroWhatsappCompleto(numero: string): string {
  const soloDigitos = numero.replace(/\D/g, "");
  if (soloDigitos.length === 10) return `52${soloDigitos}`;
  return soloDigitos;
}

/** El mensaje ya incluye el enlace de invitación — que es la misma página
 * de /conecta/invite/[token] con su propio mini inicio de sesión/registro,
 * así que compartir por WhatsApp también sirve como puerta de entrada para
 * que cualquier colega se dé de alta en MO sin pasar primero por "/". Con
 * número de WhatsApp se manda directo a ese contacto; sin él, WhatsApp
 * abre su selector de contactos (mismo comportamiento de antes). */
function enviarInvitacionPorWhatsApp(nombreDestinatario: string, enlace: string, numeroWhatsapp?: string) {
  const mensaje = buildMensajeInvitacionConecta(nombreDestinatario || "colega", enlace);
  const numero = numeroWhatsapp ? numeroWhatsappCompleto(numeroWhatsapp) : "";
  const destino = numero ? `https://wa.me/${numero}` : "https://wa.me/";
  window.open(`${destino}?text=${encodeURIComponent(mensaje)}`, "_blank");
}

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

type TabId = "resumen" | "directorio" | "interconsultas" | "perfil" | "afiliacion";

export default function MoConecta() {
  const { perfilPublico, pacientePreseleccionado } = useMoConecta();
  const [tab, setTab] = useState<TabId>(pacientePreseleccionado ? "directorio" : "resumen");
  const [casoAbierto, setCasoAbierto] = useState<string | null>(null);
  const [mostrarNuevaInterconsulta, setMostrarNuevaInterconsulta] = useState(false);
  const [mostrarInvitarOdontologo, setMostrarInvitarOdontologo] = useState(false);

  function irAlCasoCreado(id: string) {
    setMostrarNuevaInterconsulta(false);
    setMostrarInvitarOdontologo(false);
    setCasoAbierto(id);
    setTab("interconsultas");
  }

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-ink/60">
        Colabora con otros odontólogos, refiere pacientes y recibe contrarreferencias de manera segura.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 border-b border-edge/10">
          {[
            { id: "resumen" as const, label: "Resumen" },
            { id: "directorio" as const, label: "Directorio" },
            { id: "interconsultas" as const, label: "Interconsultas" },
            { id: "perfil" as const, label: "Mi perfil" },
            { id: "afiliacion" as const, label: "Afiliación" },
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

        <div className="flex gap-2 pb-2">
          <button onClick={() => setMostrarInvitarOdontologo(true)} className={botonSecundario}>
            Invitar odontólogo
          </button>
          <button onClick={() => setMostrarNuevaInterconsulta(true)} className={botonPrimario}>
            + Nueva interconsulta
          </button>
        </div>
      </div>

      {tab === "resumen" && (
        <ResumenTab
          onIrATab={setTab}
          onNuevaInterconsulta={() => setMostrarNuevaInterconsulta(true)}
          onAbrirCaso={(id) => {
            setCasoAbierto(id);
            setTab("interconsultas");
          }}
        />
      )}
      {tab === "directorio" && (
        <DirectorioTab
          onCasoCreado={(id) => {
            setCasoAbierto(id);
            setTab("interconsultas");
          }}
          onInvitarOdontologo={() => setMostrarInvitarOdontologo(true)}
          onIrAPerfil={() => setTab("perfil")}
        />
      )}
      {tab === "interconsultas" && <CasosTab casoAbiertoId={casoAbierto} onAbrirCaso={setCasoAbierto} />}
      {tab === "perfil" && <PerfilTab />}
      {tab === "afiliacion" && <AfiliacionTab />}

      {!perfilPublico && tab !== "perfil" && tab !== "resumen" && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          Todavía no creas tu perfil profesional — ve a la pestaña &quot;Mi perfil&quot; para aparecer en el directorio y
          poder enviar o recibir interconsultas.
        </p>
      )}

      {mostrarNuevaInterconsulta && (
        <NuevaInterconsultaDialog
          destinatarioInicial={null}
          onClose={() => setMostrarNuevaInterconsulta(false)}
          onCreada={irAlCasoCreado}
        />
      )}
      {mostrarInvitarOdontologo && (
        <NuevaInterconsultaDialog
          destinatarioInicial={null}
          forzarExterno
          onClose={() => setMostrarInvitarOdontologo(false)}
          onCreada={irAlCasoCreado}
        />
      )}
    </div>
  );
}

function GuiaPaso({ hecho, texto }: { hecho: boolean; texto: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
          hecho ? "bg-success/15 text-success" : "bg-ink/10 text-ink/40"
        }`}
      >
        {hecho ? "✓" : ""}
      </span>
      <span className={hecho ? "text-ink/50 line-through" : "text-ink/80"}>{texto}</span>
    </div>
  );
}

function ResumenTab({
  onIrATab,
  onNuevaInterconsulta,
  onAbrirCaso,
}: {
  onIrATab: (tab: TabId) => void;
  onNuevaInterconsulta: () => void;
  onAbrirCaso: (id: string) => void;
}) {
  const { perfilPublico, directorio, uid, casosEnviados, casosRecibidos, misCasos } = useMoConecta();

  const activas: InterconsultaEstado[] = ["sent", "received", "accepted", "patient_contacted", "scheduled", "in_treatment"];
  const concluidasEstados: InterconsultaEstado[] = ["completed", "counter_referral_sent", "closed", "cancelled", "rejected"];
  const pendientes = misCasos.filter((c) => activas.includes(c.estado)).length;
  const concluidas = misCasos.filter((c) => concluidasEstados.includes(c.estado)).length;

  const tieneColegas = directorio.filter((p) => p.uid !== uid).length > 0;
  const yaEnvioAlguno = casosEnviados.length > 0;
  const yaRecibioContrarreferencia = misCasos.some((c) => c.contrarreferencia);

  const recientes = misCasos
    .slice()
    .sort((a, b) => b.actualizadoEl.localeCompare(a.actualizadoEl))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Enviadas", valor: casosEnviados.length },
          { label: "Recibidas", valor: casosRecibidos.length },
          { label: "Pendientes", valor: pendientes },
          { label: "Concluidas", valor: concluidas },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-edge/10 bg-surface p-4">
            <p className="text-2xl font-semibold text-ink">{s.valor}</p>
            <p className="text-xs text-ink/50">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-ink">Primeros pasos</h3>
        <div className="space-y-2">
          <GuiaPaso hecho={!!perfilPublico} texto="Completa tu perfil profesional" />
          <GuiaPaso hecho={tieneColegas} texto="Busca o invita a un colega" />
          <GuiaPaso hecho={yaEnvioAlguno} texto="Envía tu primera interconsulta" />
          <GuiaPaso hecho={yaRecibioContrarreferencia} texto="Recibe una contrarreferencia" />
        </div>
      </div>

      {!tieneColegas ? (
        <TarjetaBienvenida onCompletarPerfil={() => onIrATab("perfil")} onInvitar={onNuevaInterconsulta} />
      ) : (
        <div className="rounded-2xl border border-edge/10 bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Casos recientes</h3>
            <button onClick={() => onIrATab("interconsultas")} className="text-xs text-accent hover:underline">
              Ver todas
            </button>
          </div>
          {recientes.length === 0 ? (
            <p className="text-sm text-ink/50">Todavía no tienes interconsultas. Empieza con &quot;+ Nueva interconsulta&quot;.</p>
          ) : (
            <div className="space-y-2">
              {recientes.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onAbrirCaso(c.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-edge/10 p-3 text-left transition-colors hover:border-accent/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {c.resumenPaciente.nombre} · {c.especialidadSolicitada}
                    </p>
                    <p className="truncate text-xs text-ink/50">{c.motivo}</p>
                  </div>
                  <EstadoBadge estado={c.estado} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TarjetaBienvenida({ onCompletarPerfil, onInvitar }: { onCompletarPerfil: () => void; onInvitar: () => void }) {
  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-8 text-center">
      <h3 className="text-lg font-semibold text-ink">Tu red profesional comienza aquí</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
        Encuentra especialistas, comparte únicamente la información autorizada y da seguimiento a tus interconsultas
        desde MO.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button onClick={onCompletarPerfil} className={botonSecundario}>
          Completar mi perfil
        </button>
        <button onClick={onInvitar} className={botonPrimario}>
          Invitar a un colega
        </button>
      </div>
    </div>
  );
}

const estadoAfiliacionLabel: Record<EstadoAfiliacion, string> = {
  pendiente: "Pendiente",
  activa: "Activa",
  rechazada: "Rechazada",
  revocada: "Revocada",
};

const estadoAfiliacionColor: Record<EstadoAfiliacion, string> = {
  pendiente: "bg-warning/10 text-warning",
  activa: "bg-success/10 text-success",
  rechazada: "bg-danger/10 text-danger",
  revocada: "bg-danger/10 text-danger",
};

function AfiliacionTab() {
  const { misAfiliaciones, directorio } = useMoConecta();
  const { clinicUid, clinicInfo, puedeVerFinanzas } = usePatientData();
  const [solicitudesRecibidas, setSolicitudesRecibidas] = useState<AfiliacionClinica[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [solicitando, setSolicitando] = useState(false);

  useEffect(() => {
    // Solo el admin de la clínica puede LEER las afiliaciones recibidas
    // (firestore.rules) — para un colaborador sin ese rol, ni se intenta.
    if (!clinicUid || !puedeVerFinanzas) return;
    const unsub = onSnapshot(
      query(collection(db, "afiliaciones"), where("clinicaId", "==", clinicUid)),
      (snap) => setSolicitudesRecibidas(snap.docs.map((d) => d.data() as AfiliacionClinica)),
      (err) => console.error('MoConecta: listener "afiliacionesRecibidas" falló', err)
    );
    return unsub;
  }, [clinicUid, puedeVerFinanzas]);

  const miAfiliacionActual = misAfiliaciones.find((a) => a.clinicaId === clinicUid);
  const otrasAfiliaciones = misAfiliaciones.filter((a) => a.clinicaId !== clinicUid);

  async function solicitar() {
    if (!clinicUid) return;
    setSolicitando(true);
    setError(null);
    try {
      await solicitarAfiliacionApi(clinicUid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo solicitar la afiliación.");
    } finally {
      setSolicitando(false);
    }
  }

  async function resolver(id: string, accion: "aceptar" | "rechazar" | "revocar") {
    setError(null);
    try {
      await resolverAfiliacionApi(id, accion);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo resolver la afiliación.");
    }
  }

  function nombreDe(uid: string): string {
    return directorio.find((p) => p.uid === uid)?.nombreCompleto || uid;
  }

  const pendientes = solicitudesRecibidas.filter((a) => a.estado === "pendiente");
  const activas = solicitudesRecibidas.filter((a) => a.estado === "activa");

  return (
    <div className="max-w-2xl space-y-6">
      <p className="text-sm text-ink/60">
        Afiliarte a una clínica hace que tu perfil del directorio muestre su nombre — útil si un profesional trabaja en
        más de una clínica, o quiere que se vea con cuál está identificado.
      </p>

      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <h3 className="mb-3 text-sm font-semibold text-ink">Mi afiliación</h3>
        {error && <p className="mb-2 text-sm text-danger">{error}</p>}
        {clinicInfo && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-ink/70">
              Tu clínica actual: <strong className="text-ink">{clinicInfo.nombre}</strong>
            </span>
            {miAfiliacionActual ? (
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${estadoAfiliacionColor[miAfiliacionActual.estado]}`}>
                {estadoAfiliacionLabel[miAfiliacionActual.estado]}
              </span>
            ) : (
              <button onClick={solicitar} disabled={solicitando} className={botonPrimario}>
                {solicitando ? "Solicitando…" : "Solicitar afiliación a esta clínica"}
              </button>
            )}
          </div>
        )}
      </div>

      {otrasAfiliaciones.length > 0 && (
        <div className="rounded-2xl border border-edge/10 bg-surface p-5">
          <h3 className="mb-3 text-sm font-semibold text-ink">Otras afiliaciones</h3>
          <div className="space-y-1.5 text-sm">
            {otrasAfiliaciones.map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <span className="text-ink/70">{a.clinicaNombre}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${estadoAfiliacionColor[a.estado]}`}>
                  {estadoAfiliacionLabel[a.estado]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {puedeVerFinanzas && (
        <div className="rounded-2xl border border-edge/10 bg-surface p-5">
          <h3 className="mb-3 text-sm font-semibold text-ink">Solicitudes de afiliación a tu clínica</h3>
          {pendientes.length === 0 && <p className="text-sm text-ink/50">No hay solicitudes pendientes.</p>}
          <div className="space-y-2">
            {pendientes.map((a) => (
              <div
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-edge/10 p-3 text-sm"
              >
                <span className="text-ink/70">{nombreDe(a.uid)}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => resolver(a.id, "aceptar")}
                    className="rounded-lg bg-success/15 px-3 py-1 text-xs font-medium text-success"
                  >
                    Aceptar
                  </button>
                  <button
                    onClick={() => resolver(a.id, "rechazar")}
                    className="rounded-lg bg-danger/15 px-3 py-1 text-xs font-medium text-danger"
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {activas.length > 0 && (
            <div className="mt-4 border-t border-edge/10 pt-3">
              <p className="mb-2 text-xs font-medium text-ink/40">Afiliados activos</p>
              <div className="space-y-1.5">
                {activas.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <span className="text-ink/70">{nombreDe(a.uid)}</span>
                    <button onClick={() => resolver(a.id, "revocar")} className="text-xs text-danger hover:underline">
                      Revocar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
    modalidadAtencion: perfilPublico?.modalidadAtencion ?? ([] as ModalidadAtencion[]),
    horariosGenerales: perfilPublico?.horariosGenerales ?? "",
    aceptaInterconsultas: perfilPublico?.aceptaInterconsultas ?? true,
    tiposCasosRecibe: (perfilPublico?.tiposCasosRecibe ?? []).join(", "),
    aceptaUrgencias: perfilPublico?.aceptaUrgencias ?? false,
    tiempoRespuestaHabitual: perfilPublico?.tiempoRespuestaHabitual ?? "",
    activoEnDirectorio: perfilPublico?.activoEnDirectorio ?? false,
    cedulaProfesional: perfilPrivado?.cedulaProfesional ?? "",
    cedulaEspecialidad: perfilPrivado?.cedulaEspecialidad ?? "",
    especialidadCedula: perfilPrivado?.especialidadCedula ?? "",
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
        await registrarEventoApi("professional_profile_created");
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
            onChange={(e) => manejarCambioNombre(e, (v) => setForm((f) => ({ ...f, nombreCompleto: v })))}
          />
        </div>
        <div>
          <label className={labelClass}>Universidad</label>
          <input
            className={inputClass}
            value={form.universidad}
            onChange={(e) => manejarCambioNombre(e, (v) => setForm((f) => ({ ...f, universidad: v })))}
          />
        </div>
        <div>
          <label className={labelClass}>Municipio</label>
          <input
            className={inputClass}
            value={form.municipio}
            onChange={(e) => manejarCambioNombre(e, (v) => setForm((f) => ({ ...f, municipio: v })))}
          />
        </div>
        <div>
          <label className={labelClass}>Estado</label>
          <input
            className={inputClass}
            value={form.estado}
            onChange={(e) => manejarCambioNombre(e, (v) => setForm((f) => ({ ...f, estado: v })))}
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
          <div className="space-y-1.5 rounded-lg border border-edge/10 bg-field px-3 py-2">
            {modalidadesAtencion.map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm text-ink/80">
                <input
                  type="checkbox"
                  checked={form.modalidadAtencion.includes(m)}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      modalidadAtencion: e.target.checked
                        ? [...f.modalidadAtencion, m]
                        : f.modalidadAtencion.filter((x) => x !== m),
                    }))
                  }
                />
                {m}
              </label>
            ))}
            <label className="flex items-center gap-2 border-t border-edge/10 pt-1.5 text-sm text-ink/80">
              <input
                type="checkbox"
                checked={form.modalidadAtencion.length === modalidadesAtencion.length}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    modalidadAtencion: e.target.checked ? [...modalidadesAtencion] : [],
                  }))
                }
              />
              Todas las anteriores
            </label>
          </div>
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
          <label className={labelClass}>Cédula de especialidad (si aplica)</label>
          <input
            className={inputClass}
            value={form.cedulaEspecialidad}
            onChange={(e) => setForm((f) => ({ ...f, cedulaEspecialidad: e.target.value }))}
            placeholder="Solo si ya cuentas con ella"
          />
        </div>
        <div>
          <label className={labelClass}>Especialidad que certifica esa cédula</label>
          <input
            className={inputClass}
            value={form.especialidadCedula}
            onChange={(e) => setForm((f) => ({ ...f, especialidadCedula: e.target.value }))}
            placeholder="Ej. Ortodoncia"
            disabled={!form.cedulaEspecialidad.trim()}
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

function DirectorioTab({
  onCasoCreado,
  onInvitarOdontologo,
  onIrAPerfil,
}: {
  onCasoCreado: (interconsultaId: string) => void;
  onInvitarOdontologo: () => void;
  onIrAPerfil: () => void;
}) {
  const { directorio, uid, pacientePreseleccionado, limpiarPacientePreseleccionado } = useMoConecta();
  const [destinatario, setDestinatario] = useState<{ uid: string; nombreCompleto: string } | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEspecialidad, setFiltroEspecialidad] = useState("");
  const [filtroMunicipio, setFiltroMunicipio] = useState("");
  const [filtroModalidad, setFiltroModalidad] = useState<ModalidadAtencion | "">("");
  const [soloUrgencias, setSoloUrgencias] = useState(false);
  const [soloVerificados, setSoloVerificados] = useState(false);

  const colegas = directorio.filter((p) => p.uid !== uid);

  const especialidades = Array.from(new Set(colegas.flatMap((p) => p.areasPractica))).sort();
  const municipios = Array.from(new Set(colegas.map((p) => p.municipio).filter(Boolean))).sort() as string[];

  const colegasFiltrados = colegas.filter((p) => {
    const texto = busqueda.trim().toLowerCase();
    if (
      texto &&
      !p.nombreCompleto.toLowerCase().includes(texto) &&
      !p.areasPractica.some((a) => a.toLowerCase().includes(texto))
    )
      return false;
    if (filtroEspecialidad && !p.areasPractica.includes(filtroEspecialidad)) return false;
    if (filtroMunicipio && p.municipio !== filtroMunicipio) return false;
    if (filtroModalidad && !(p.modalidadAtencion ?? []).includes(filtroModalidad)) return false;
    if (soloUrgencias && !p.aceptaUrgencias) return false;
    if (soloVerificados && p.estadoVerificacion !== "verificado") return false;
    return true;
  });

  const hayFiltrosActivos =
    !!busqueda || !!filtroEspecialidad || !!filtroMunicipio || !!filtroModalidad || soloUrgencias || soloVerificados;

  return (
    <div className="space-y-4">
      {pacientePreseleccionado && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
          <span>
            Interconsulta para <strong>{pacientePreseleccionado.patientName}</strong> — elige a continuación el colega
            destinatario.
          </span>
          <button onClick={limpiarPacientePreseleccionado} className="text-xs underline hover:no-underline">
            Quitar
          </button>
        </div>
      )}

      {colegas.length === 0 ? (
        <TarjetaBienvenida onCompletarPerfil={onIrAPerfil} onInvitar={onInvitarOdontologo} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-edge/10 bg-surface p-3">
            <input
              className={`${inputClass} max-w-xs`}
              placeholder="Buscar por nombre o especialidad…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <select
              className={`${inputClass} w-auto`}
              value={filtroEspecialidad}
              onChange={(e) => setFiltroEspecialidad(e.target.value)}
            >
              <option value="">Especialidad</option>
              {especialidades.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
            <select className={`${inputClass} w-auto`} value={filtroMunicipio} onChange={(e) => setFiltroMunicipio(e.target.value)}>
              <option value="">Municipio</option>
              {municipios.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              className={`${inputClass} w-auto`}
              value={filtroModalidad}
              onChange={(e) => setFiltroModalidad(e.target.value as ModalidadAtencion | "")}
            >
              <option value="">Modalidad</option>
              {modalidadesAtencion.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-ink/70">
              <input type="checkbox" checked={soloUrgencias} onChange={(e) => setSoloUrgencias(e.target.checked)} />
              Acepta urgencias
            </label>
            <label className="flex items-center gap-1.5 text-xs text-ink/70">
              <input type="checkbox" checked={soloVerificados} onChange={(e) => setSoloVerificados(e.target.checked)} />
              Verificados
            </label>
            {hayFiltrosActivos && (
              <button
                onClick={() => {
                  setBusqueda("");
                  setFiltroEspecialidad("");
                  setFiltroMunicipio("");
                  setFiltroModalidad("");
                  setSoloUrgencias(false);
                  setSoloVerificados(false);
                }}
                className="text-xs text-ink/50 hover:text-ink"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <button onClick={onInvitarOdontologo} className={botonSecundario}>
            ¿Tu colega no está en MO? Invítalo por enlace
          </button>

          {colegasFiltrados.length === 0 && (
            <p className="text-sm text-ink/50">Ningún colega coincide con estos filtros.</p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {colegasFiltrados.map((p) => (
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
        </>
      )}

      {destinatario && (
        <NuevaInterconsultaDialog
          destinatarioInicial={destinatario}
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

type DestinatarioElegido = { uid: string; nombreCompleto: string };

function NuevaInterconsultaDialog({
  destinatarioInicial,
  forzarExterno,
  onClose,
  onCreada,
}: {
  destinatarioInicial: DestinatarioElegido | null;
  forzarExterno?: boolean;
  onClose: () => void;
  onCreada: (id: string) => void;
}) {
  const { clinicUid, patients } = usePatientData();
  const { pacientePreseleccionado, limpiarPacientePreseleccionado, directorio, uid: miUid } = useMoConecta();
  const [destinatario, setDestinatario] = useState<DestinatarioElegido | null>(destinatarioInicial);
  const [modo, setModo] = useState<"elegir" | "formulario">(
    destinatarioInicial || forzarExterno ? "formulario" : "elegir"
  );
  const [busquedaColega, setBusquedaColega] = useState("");
  const [pacienteId, setPacienteId] = useState(pacientePreseleccionado?.patientId ?? "");
  const [especialidadSolicitada, setEspecialidadSolicitada] = useState("");
  const [motivo, setMotivo] = useState("");
  const [preguntaClinica, setPreguntaClinica] = useState("");
  const [prioridad, setPrioridad] = useState<PrioridadInterconsulta>("ordinaria");
  const [informacionMinima, setInformacionMinima] = useState("");
  const [nombreEspecialista, setNombreEspecialista] = useState("");
  const [correoEspecialista, setCorreoEspecialista] = useState("");
  const [whatsappEspecialista, setWhatsappEspecialista] = useState("");
  const [aceptaConsentimiento, setAceptaConsentimiento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interconsultaCreadaId, setInterconsultaCreadaId] = useState<string | null>(null);
  const [enlace, setEnlace] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

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
        destinatarioUid: destinatario?.uid,
        informacionMinima: informacionMinima || undefined,
        consentimiento: {
          destinatarioTipo: destinatario ? "odontologo_registrado" : "invitacion",
          destinatarioId: destinatario?.uid,
          finalidad: "Interconsulta odontológica para valoración/tratamiento del paciente.",
          informacionCompartida: ["Resumen de historia clínica", "Motivo y pregunta clínica", especialidadSolicitada].filter(
            Boolean
          ),
        },
      });
      limpiarPacientePreseleccionado();

      if (destinatario) {
        onCreada(interconsulta.id);
        return;
      }

      // Sin destinatario del directorio: se crea la invitación de una vez con
      // el contacto del especialista, en el mismo paso — sin esto, el caso
      // quedaba creado "para nadie" hasta un segundo clic aparte en la Sala
      // del Caso para recién ahí generar el enlace.
      const { enlace: url } = await crearInvitacionApi({
        interconsultaId: interconsulta.id,
        destinatarioNombre: nombreEspecialista || undefined,
        destinatarioCorreo: correoEspecialista,
        canal: "copiar_enlace",
      });
      setInterconsultaCreadaId(interconsulta.id);
      setEnlace(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la interconsulta.");
    } finally {
      setEnviando(false);
    }
  }

  async function copiarEnlace() {
    if (!enlace) return;
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
    } catch {
      // El input de abajo se puede seleccionar/copiar a mano si el navegador
      // bloquea el portapapeles.
    }
    registrarEventoApi("invite_shared", { interconsultaId: interconsultaCreadaId ?? undefined }).catch(() => {});
  }

  if (enlace) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-md rounded-2xl border border-edge/10 bg-modal p-6">
          <h2 className="mb-4 text-lg font-semibold text-ink">Interconsulta creada</h2>
          <p className="mb-3 text-sm text-ink/70">
            Comparte este enlace con {nombreEspecialista || "el especialista"} (vence en 7 días, un solo uso). Al abrirlo,
            si no tiene cuenta en MO puede crearla ahí mismo.
          </p>
          <input readOnly className={inputClass} value={enlace} onFocus={(e) => e.target.select()} />
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              onClick={() => enviarInvitacionPorWhatsApp(nombreEspecialista, enlace, whatsappEspecialista)}
              className={botonSecundario}
            >
              Enviar por WhatsApp
            </button>
            <button onClick={copiarEnlace} className={botonSecundario}>
              {copiado ? "¡Copiado!" : "Copiar enlace"}
            </button>
            <button onClick={() => interconsultaCreadaId && onCreada(interconsultaCreadaId)} className={botonPrimario}>
              Ir al caso
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (modo === "elegir") {
    const colegas = directorio.filter((p) => p.uid !== miUid);
    const texto = busquedaColega.trim().toLowerCase();
    const colegasFiltrados = texto
      ? colegas.filter(
          (p) =>
            p.nombreCompleto.toLowerCase().includes(texto) ||
            p.areasPractica.some((a) => a.toLowerCase().includes(texto))
        )
      : colegas;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
          <h2 className="mb-1 text-lg font-semibold text-ink">Nueva interconsulta</h2>
          <p className="mb-4 text-sm text-ink/60">¿A qué colega quieres enviársela?</p>

          <input
            className={inputClass}
            placeholder="Buscar por nombre o especialidad…"
            value={busquedaColega}
            onChange={(e) => setBusquedaColega(e.target.value)}
            autoFocus
          />

          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {colegasFiltrados.map((p) => (
              <button
                key={p.uid}
                onClick={() => {
                  setDestinatario({ uid: p.uid, nombreCompleto: p.nombreCompleto });
                  setModo("formulario");
                }}
                disabled={!p.aceptaInterconsultas}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-edge/10 p-3 text-left text-sm transition-colors hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{p.nombreCompleto}</p>
                  {p.areasPractica.length > 0 && (
                    <p className="truncate text-xs text-ink/50">{p.areasPractica.join(" · ")}</p>
                  )}
                </div>
                {p.estadoVerificacion === "verificado" && (
                  <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                    Verificado
                  </span>
                )}
              </button>
            ))}
            {colegasFiltrados.length === 0 && (
              <p className="py-2 text-sm text-ink/50">Ningún colega coincide con esa búsqueda.</p>
            )}
          </div>

          <button
            onClick={() => setModo("formulario")}
            className="mt-4 w-full rounded-lg border border-dashed border-edge/20 p-3 text-center text-sm text-ink/60 hover:border-accent/40 hover:text-ink"
          >
            ¿Tu colega no está en MO? Invítalo por enlace
          </button>

          <div className="mt-5 flex justify-end">
            <button onClick={onClose} className={botonSecundario}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
        {!destinatarioInicial && !forzarExterno && (
          <button
            onClick={() => setModo("elegir")}
            className="mb-3 text-xs text-ink/50 hover:text-ink hover:underline"
          >
            ← Elegir de mi directorio
          </button>
        )}
        <h2 className="mb-4 text-lg font-semibold text-ink">
          {destinatario ? `Enviar interconsulta a ${destinatario.nombreCompleto}` : "Nueva interconsulta para invitar por enlace"}
        </h2>
        {!destinatario && (
          <p className="mb-3 text-sm text-ink/60">
            Al guardar, se genera de una vez el enlace seguro para tu colega — solo necesitamos su contacto abajo.
          </p>
        )}

        <div className="space-y-3">
          {!destinatario && (
            <>
              <div>
                <label className={labelClass}>Nombre del especialista (opcional)</label>
                <input
                  className={inputClass}
                  value={nombreEspecialista}
                  onChange={(e) => manejarCambioNombre(e, setNombreEspecialista)}
                />
              </div>
              <div>
                <label className={labelClass}>Correo del especialista</label>
                <input
                  className={inputClass}
                  type="email"
                  value={correoEspecialista}
                  onChange={(e) => setCorreoEspecialista(e.target.value)}
                  placeholder="para identificarlo al reclamar el enlace"
                />
              </div>
              <div>
                <label className={labelClass}>WhatsApp del especialista (opcional)</label>
                <input
                  className={inputClass}
                  type="tel"
                  value={whatsappEspecialista}
                  onChange={(e) => setWhatsappEspecialista(e.target.value)}
                  placeholder="10 dígitos — para mandarle el enlace directo si no revisa su correo"
                />
              </div>
            </>
          )}
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
              !aceptaConsentimiento ||
              (!destinatario && !correoEspecialista.trim())
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
  const { irAPagina } = usePatientData();
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

  async function revocarConsentimiento() {
    if (!confirm("¿Revocar el consentimiento registrado para compartir este caso?")) return;
    const motivo = window.prompt("Motivo de la revocación (opcional):") ?? undefined;
    try {
      await revocarConsentimientoApi(interconsulta.consentimientoId, motivo || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo revocar el consentimiento.");
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
      <div className="flex items-center justify-between">
        <button onClick={onVolver} className="text-sm text-ink/60 hover:text-ink">
          ← Volver a interconsultas
        </button>
        {esRemitente && (
          <button onClick={() => irAPagina("pacientes")} className="text-sm text-ink/60 hover:text-ink">
            Volver al expediente del paciente →
          </button>
        )}
      </div>

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

        {interconsulta.historialEstados.length > 0 && (
          <div className="mt-4 border-t border-edge/10 pt-3">
            <p className="mb-2 text-xs font-medium text-ink/40">Historial</p>
            <div className="space-y-1">
              {interconsulta.historialEstados
                .slice()
                .reverse()
                .map((h, i) => (
                  <div key={i} className="text-xs text-ink/60">
                    <span className="font-medium text-ink/80">{interconsultaEstadoLabel[h.estado]}</span> ·{" "}
                    {new Date(h.fecha).toLocaleString("es-MX")}
                    {h.nota && <span> — {h.nota}</span>}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {interconsulta.contrarreferencia && (
        <div className="rounded-2xl border border-edge/10 bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">Contrarreferencia</h3>
            {interconsulta.contrarreferencia.esBorrador && (
              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning">Borrador</span>
            )}
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <p className="text-xs text-ink/40">Resumen de la atención</p>
              <p className="text-ink/80">{interconsulta.contrarreferencia.resumenAtencion}</p>
            </div>
            <div>
              <p className="text-xs text-ink/40">Estado actual del paciente</p>
              <p className="text-ink/80">{interconsulta.contrarreferencia.estadoActual}</p>
            </div>
            {interconsulta.contrarreferencia.recomendaciones && (
              <div>
                <p className="text-xs text-ink/40">Recomendaciones</p>
                <p className="text-ink/80">{interconsulta.contrarreferencia.recomendaciones}</p>
              </div>
            )}
            <p className="text-xs text-ink/40">
              {new Date(interconsulta.contrarreferencia.fecha).toLocaleString("es-MX")}
            </p>
          </div>
        </div>
      )}

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
        {esRemitente && (
          <button onClick={revocarConsentimiento} className="mt-3 text-xs text-danger hover:underline">
            Revocar consentimiento de compartir este caso
          </button>
        )}
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
  const [whatsapp, setWhatsapp] = useState("");
  const [enlace, setEnlace] = useState<string | null>(null);
  const [invitacionId, setInvitacionId] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function crear() {
    setEnviando(true);
    setError(null);
    try {
      const { id, enlace: url } = await crearInvitacionApi({
        interconsultaId,
        destinatarioNombre: nombre || undefined,
        destinatarioCorreo: correo,
        canal: "copiar_enlace",
      });
      setEnlace(url);
      setInvitacionId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la invitación.");
    } finally {
      setEnviando(false);
    }
  }

  async function copiar() {
    if (!enlace) return;
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
    } catch {
      // Algunos navegadores bloquean el portapapeles fuera de HTTPS/gesto
      // directo — el input de abajo se puede seleccionar/copiar a mano.
    }
    registrarEventoApi("invite_shared", { invitacionId: invitacionId ?? undefined, interconsultaId }).catch(() => {});
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
            <div>
              <label className={labelClass}>WhatsApp del colega (opcional)</label>
              <input
                className={inputClass}
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="10 dígitos — para mandarle el enlace directo si no revisa su correo"
              />
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
            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={() => enviarInvitacionPorWhatsApp(nombre, enlace, whatsapp)} className={botonSecundario}>
                Enviar por WhatsApp
              </button>
              <button onClick={copiar} className={botonSecundario}>
                {copiado ? "¡Copiado!" : "Copiar enlace"}
              </button>
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
