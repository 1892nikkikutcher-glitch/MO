"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { planesDisponibles, type PlanId, type CategoriaSugerencia, type EstadoSugerencia } from "@/lib/patientData";
import { adminOtorgarFundadoraApi, adminVerificarPerfilApi, verEvidenciaVerificacionApi } from "@/lib/conectaApi";
import type { EstadoVerificacion } from "@/lib/moConecta";

type ClinicaResumen = {
  id: string;
  nombre: string;
  correoContacto: string;
  creadoEl: string | null;
  estadoCuenta: "activa" | "suspendida" | "cancelada";
  usuarios: number;
  planActivo: PlanId;
  estadoSuscripcion: "prueba" | "activa" | "atrasada" | "cancelada";
  origenSuscripcion: "stripe" | "manual";
  mrr: number;
  ultimaActividad: string | null;
};

type SugerenciaResumen = {
  id: string;
  clinicNombre: string;
  autor: string;
  categoria: CategoriaSugerencia;
  mensaje: string;
  estado: EstadoSugerencia;
  fecha: string;
};

type PerfilPendienteResumen = {
  uid: string;
  nombreCompleto: string;
  estadoVerificacion: EstadoVerificacion;
  correo: string | null;
  cedulaProfesional: string | null;
  cedulaEspecialidad: string | null;
  especialidadCedula: string | null;
  tieneEvidencia: boolean;
};

type MoConectaResumen = {
  perfilesTotal: number;
  perfilesVerificados: number;
  perfilesPendientes: PerfilPendienteResumen[];
  interconsultasTotal: number;
  interconsultasPorEstado: Record<string, number>;
  invitacionesTotal: number;
  invitacionesReclamadas: number;
  afiliacionesActivas: number;
  eventosUltimos30Dias: Record<string, number>;
};

type Resumen = {
  consultoriosRegistrados: number;
  usuariosTotales: number;
  suscripcionesPagando: number;
  mrr: number;
  arpu: number;
  porPlan: Record<string, number>;
  conversion: number;
  nuevasDelMes: number;
  pruebasActivas: number;
  cancelaciones: number;
  churnMensual: number | null;
  clinicas: ClinicaResumen[];
  sugerencias: SugerenciaResumen[];
  moConecta: MoConectaResumen;
};

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

const categoriaLabel: Record<CategoriaSugerencia, string> = {
  sugerencia: "Sugerencia",
  problema: "Problema",
  nueva_funcion: "Nueva función",
  facturacion: "Facturación",
  otro: "Otro",
};

const estadoCuentaLabel: Record<ClinicaResumen["estadoCuenta"], { texto: string; clase: string }> = {
  activa: { texto: "Activa", clase: "bg-success/10 text-success" },
  suspendida: { texto: "Suspendida", clase: "bg-warning/10 text-warning" },
  cancelada: { texto: "Cancelada", clase: "bg-danger/10 text-danger" },
};

const estadoSuscripcionLabel: Record<ClinicaResumen["estadoSuscripcion"], { texto: string; clase: string }> = {
  prueba: { texto: "Prueba", clase: "bg-ink/10 text-ink/60" },
  activa: { texto: "Activa", clase: "bg-success/10 text-success" },
  atrasada: { texto: "Atrasada", clase: "bg-warning/10 text-warning" },
  cancelada: { texto: "Cancelada", clase: "bg-danger/10 text-danger" },
};

function formatMoneda(n: number) {
  return `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })} MXN`;
}

function formatFecha(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "—";
  }
}

async function llamarApi(path: string, options: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      Authorization: `Bearer ${token ?? ""}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Ocurrió un error.");
  return data;
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-4">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wide text-ink/50">{label}</p>
      {sub && <p className="mt-1 text-xs text-ink/40">{sub}</p>}
    </div>
  );
}

function EditarPlanModal({ clinica, onClose, onGuardado }: { clinica: ClinicaResumen; onClose: () => void; onGuardado: () => void }) {
  const [planActivo, setPlanActivo] = useState<PlanId>(clinica.planActivo);
  const [estadoSuscripcion, setEstadoSuscripcion] = useState(clinica.estadoSuscripcion);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const guardar = async () => {
    setGuardando(true);
    setError("");
    try {
      await llamarApi(`/api/admin/clinicas/${clinica.id}`, {
        method: "PATCH",
        body: JSON.stringify({ accion: "editar-plan", planActivo, estadoSuscripcion }),
      });
      onGuardado();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-edge/10 bg-modal p-6">
        <h3 className="text-base font-semibold text-ink">Editar plan — {clinica.nombre}</h3>

        {clinica.origenSuscripcion === "stripe" && (
          <p className="mt-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
            Esta clínica tiene una suscripción real de Stripe. Cambiarla aquí no cancela ni modifica el cobro en
            Stripe — solo cambia lo que ve MO, y quedará marcada como manual hasta el próximo evento de Stripe.
          </p>
        )}

        <label className="mb-1 mt-4 block text-xs font-medium text-ink/60">Plan</label>
        <select value={planActivo} onChange={(e) => setPlanActivo(e.target.value as PlanId)} className={inputClass}>
          {planesDisponibles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>

        <label className="mb-1 mt-4 block text-xs font-medium text-ink/60">Estado de la suscripción</label>
        <select
          value={estadoSuscripcion}
          onChange={(e) => setEstadoSuscripcion(e.target.value as ClinicaResumen["estadoSuscripcion"])}
          className={inputClass}
        >
          {(["prueba", "activa", "atrasada", "cancelada"] as const).map((s) => (
            <option key={s} value={s}>
              {estadoSuscripcionLabel[s].texto}
            </option>
          ))}
        </select>

        {error && <p className="mt-3 text-xs text-danger">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 hover:bg-surface">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/25 disabled:opacity-40"
          >
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EliminarClinicaModal({ clinica, onClose, onEliminado }: { clinica: ClinicaResumen; onClose: () => void; onEliminado: () => void }) {
  const [texto, setTexto] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState("");
  // Si la clínica no tiene nombre propio, pedir que se escriba el
  // placeholder "(sin nombre)" tal cual (con paréntesis) sería una mala
  // confirmación — se pide una palabra fija en su lugar. Comparación sin
  // distinguir mayúsculas para no exigir precisión innecesaria.
  const tieneNombrePropio = Boolean(clinica.nombre) && clinica.nombre !== "(sin nombre)";
  const palabraConfirmacion = tieneNombrePropio ? clinica.nombre : "ELIMINAR";
  const habilitado = texto.trim().toLowerCase() === palabraConfirmacion.toLowerCase();

  const eliminar = async () => {
    setEliminando(true);
    setError("");
    try {
      await llamarApi(`/api/admin/clinicas/${clinica.id}`, { method: "DELETE" });
      onEliminado();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar.");
      setEliminando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-danger/40 bg-modal p-6">
        <h3 className="text-base font-semibold text-ink">Eliminar registro de {clinica.nombre}</h3>
        <p className="mt-2 text-sm text-ink/70">
          Esto borra únicamente el registro de esta clínica en la plataforma (deja de aparecer aquí y pierde
          acceso). <span className="font-semibold text-ink">No borra su información clínica</span> — pacientes,
          citas, presupuestos e historia clínica siguen intactos.
        </p>
        <p className="mt-2 text-sm text-ink/70">
          Para revocar acceso sin perder nada, usa <span className="font-semibold">Suspender</span> en vez de esto.
        </p>
        <p className="mt-4 text-xs text-ink/50">
          Escribe <span className="font-semibold text-ink">{palabraConfirmacion}</span> para confirmar:
        </p>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} className={`${inputClass} mt-1`} />
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 hover:bg-surface">
            Cancelar
          </button>
          <button
            onClick={eliminar}
            disabled={!habilitado || eliminando}
            className="flex-1 rounded-lg bg-danger py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {eliminando ? "Eliminando…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetalleClinicaModal({ clinicId, onClose }: { clinicId: string; onClose: () => void }) {
  const [detalle, setDetalle] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    llamarApi(`/api/admin/clinicas/${clinicId}`)
      .then(setDetalle)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar."));
  }, [clinicId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Detalle de clínica</h3>
          <button onClick={onClose} className="text-ink/40 hover:text-ink">
            ✕
          </button>
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}
        {!detalle && !error && <p className="mt-4 text-sm text-ink/50">Cargando…</p>}

        {detalle && (
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <p className="text-lg font-semibold text-ink">{detalle.nombre || "(sin nombre)"}</p>
              <p className="text-ink/50">{detalle.correoContacto || "Sin correo de contacto"}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl border border-edge/10 bg-inset p-4">
              <div>
                <p className="text-ink/40">Plan</p>
                <p className="font-medium text-ink">
                  {planesDisponibles.find((p) => p.id === detalle.suscripcion.planActivo)?.nombre}
                </p>
              </div>
              <div>
                <p className="text-ink/40">Estado de suscripción</p>
                <p className="font-medium text-ink">{estadoSuscripcionLabel[detalle.suscripcion.estadoSuscripcion as ClinicaResumen["estadoSuscripcion"]].texto}</p>
              </div>
              <div>
                <p className="text-ink/40">Origen</p>
                <p className="font-medium text-ink">{detalle.suscripcion.origenSuscripcion === "stripe" ? "Stripe" : "Manual"}</p>
              </div>
              <div>
                <p className="text-ink/40">Estado de cuenta</p>
                <p className="font-medium text-ink">{estadoCuentaLabel[(detalle.estadoCuenta ?? "activa") as ClinicaResumen["estadoCuenta"]].texto}</p>
              </div>
              <div>
                <p className="text-ink/40">Fecha de alta</p>
                <p className="font-medium text-ink">{formatFecha(detalle.creadoEl)}</p>
              </div>
              <div>
                <p className="text-ink/40">Último acceso</p>
                <p className="font-medium text-ink">{formatFecha(detalle.ultimoAcceso)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-xl border border-edge/10 bg-inset p-4 sm:grid-cols-4">
              <div>
                <p className="text-lg font-semibold text-ink">{detalle.uso.pacientes}</p>
                <p className="text-xs text-ink/40">Pacientes</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-ink">{detalle.uso.citasTotales}</p>
                <p className="text-xs text-ink/40">Citas totales</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-ink">{detalle.uso.citasEsteMes}</p>
                <p className="text-xs text-ink/40">Citas este mes</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-ink">{detalle.uso.recursos}</p>
                <p className="text-xs text-ink/40">Médicos/unidades</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">Usuarios ({detalle.miembros.length})</p>
              <div className="space-y-1.5">
                {detalle.miembros.map((m: any) => (
                  <div key={m.uid} className="flex items-center justify-between rounded-lg border border-edge/10 px-3 py-1.5 text-xs">
                    <span className="text-ink">{m.nombre || m.correo}</span>
                    <span className="text-ink/40">{m.role === "admin" ? "Admin" : "Colaborador"}</span>
                  </div>
                ))}
              </div>
            </div>

            {detalle.sugerencias.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">
                  Sugerencias de esta clínica ({detalle.sugerencias.length})
                </p>
                <div className="space-y-1.5">
                  {detalle.sugerencias.map((s: SugerenciaResumen) => (
                    <div key={s.id} className="rounded-lg border border-edge/10 px-3 py-2 text-xs">
                      <p className="text-ink/40">
                        {categoriaLabel[s.categoria]} · {formatFecha(s.fecha)}
                      </p>
                      <p className="mt-0.5 text-ink">{s.mensaje}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const estadoVerificacionLabel: Record<EstadoVerificacion, { texto: string; clase: string }> = {
  pendiente: { texto: "Pendiente", clase: "bg-warning/10 text-warning" },
  verificado: { texto: "Verificado", clase: "bg-success/10 text-success" },
  rechazado: { texto: "Rechazado", clase: "bg-danger/10 text-danger" },
};

function PerfilPendienteRow({ perfil, onCambio }: { perfil: PerfilPendienteResumen; onCambio: () => void }) {
  const [accionando, setAccionando] = useState(false);
  const [error, setError] = useState("");

  async function resolver(accion: "verificar" | "rechazar") {
    setAccionando(true);
    setError("");
    try {
      await adminVerificarPerfilApi(perfil.uid, { accion });
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar.");
    } finally {
      setAccionando(false);
    }
  }

  async function verEvidencia() {
    setError("");
    try {
      await verEvidenciaVerificacionApi(perfil.uid);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir la evidencia.");
    }
  }

  return (
    <div className="rounded-xl border border-edge/10 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium text-ink">{perfil.nombreCompleto || "(sin nombre)"}</p>
          <p className="text-xs text-ink/50">
            {perfil.correo || "sin correo"} {perfil.cedulaProfesional && `· Cédula ${perfil.cedulaProfesional}`}
            {perfil.cedulaEspecialidad &&
              ` · Cédula especialidad ${perfil.cedulaEspecialidad}${perfil.especialidadCedula ? ` (${perfil.especialidadCedula})` : ""}`}
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${estadoVerificacionLabel[perfil.estadoVerificacion].clase}`}>
          {estadoVerificacionLabel[perfil.estadoVerificacion].texto}
        </span>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          onClick={verEvidencia}
          disabled={!perfil.tieneEvidencia}
          className="text-xs font-semibold text-ink/50 hover:text-ink disabled:opacity-30"
          title={perfil.tieneEvidencia ? "Ver evidencia de cédula" : "Todavía no sube evidencia"}
        >
          Ver evidencia
        </button>
        <button
          onClick={() => resolver("verificar")}
          disabled={accionando}
          className="text-xs font-semibold text-success hover:text-success disabled:opacity-40"
        >
          Verificar
        </button>
        <button
          onClick={() => resolver("rechazar")}
          disabled={accionando}
          className="text-xs font-semibold text-danger hover:text-danger disabled:opacity-40"
        >
          Rechazar
        </button>
      </div>
    </div>
  );
}

function MoConectaSeccion({ resumen, onCambio }: { resumen: MoConectaResumen; onCambio: () => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Perfiles MO Conecta" value={String(resumen.perfilesTotal)} />
        <MetricCard label="Perfiles verificados" value={String(resumen.perfilesVerificados)} />
        <MetricCard label="Interconsultas totales" value={String(resumen.interconsultasTotal)} />
        <MetricCard label="Invitaciones creadas" value={String(resumen.invitacionesTotal)} />
        <MetricCard label="Invitaciones reclamadas" value={String(resumen.invitacionesReclamadas)} />
        <MetricCard label="Afiliaciones activas" value={String(resumen.afiliacionesActivas)} />
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-4">
        <p className="mb-3 text-sm font-semibold text-ink">Verificación de perfiles — MO Conecta</p>
        {resumen.perfilesPendientes.length === 0 ? (
          <p className="text-sm text-ink/40">No hay perfiles pendientes de revisión.</p>
        ) : (
          <div className="space-y-2">
            {resumen.perfilesPendientes.map((p) => (
              <PerfilPendienteRow key={p.uid} perfil={p} onCambio={onCambio} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PanelAdministrador() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [error, setError] = useState("");
  const [clinicaEditar, setClinicaEditar] = useState<ClinicaResumen | null>(null);
  const [clinicaEliminar, setClinicaEliminar] = useState<ClinicaResumen | null>(null);
  const [clinicaVerId, setClinicaVerId] = useState<string | null>(null);
  const [accionandoId, setAccionandoId] = useState<string | null>(null);

  const cargar = () => {
    llamarApi("/api/admin/resumen")
      .then(setResumen)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el panel."));
  };

  useEffect(() => {
    cargar();
  }, []);

  const alternarSuspension = async (clinica: ClinicaResumen) => {
    setAccionandoId(clinica.id);
    try {
      await llamarApi(`/api/admin/clinicas/${clinica.id}`, {
        method: "PATCH",
        body: JSON.stringify({ accion: clinica.estadoCuenta === "suspendida" ? "reactivar" : "suspender" }),
      });
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el estado.");
    } finally {
      setAccionandoId(null);
    }
  };

  const otorgarFundadora = async (clinica: ClinicaResumen) => {
    if (!confirm(`¿Otorgar Clínica Fundadora (90 días) a ${clinica.nombre}?`)) return;
    setAccionandoId(clinica.id);
    try {
      await adminOtorgarFundadoraApi(clinica.id);
      cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo otorgar Clínica Fundadora.");
    } finally {
      setAccionandoId(null);
    }
  };

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!resumen) return <p className="text-sm text-ink/50">Cargando…</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard label="Consultorios registrados" value={String(resumen.consultoriosRegistrados)} />
        <MetricCard label="Usuarios totales" value={String(resumen.usuariosTotales)} />
        <MetricCard label="Suscripciones pagando" value={String(resumen.suscripcionesPagando)} />
        <MetricCard label="Ingreso mensual recurrente" value={formatMoneda(resumen.mrr)} />
        <MetricCard label="ARPU" value={formatMoneda(Math.round(resumen.arpu))} />
        <MetricCard label="Nuevas clínicas (mes)" value={String(resumen.nuevasDelMes)} />
        <MetricCard label="Pruebas activas" value={String(resumen.pruebasActivas)} />
        <MetricCard label="Cancelaciones" value={String(resumen.cancelaciones)} />
        <MetricCard
          label="Churn mensual"
          value={resumen.churnMensual === null ? "—" : `${resumen.churnMensual}%`}
          sub={resumen.churnMensual === null ? "Pendiente de histórico mensual" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-edge/10 bg-surface p-4">
          <p className="mb-3 text-sm font-semibold text-ink">Por plan</p>
          <div className="space-y-2 text-sm">
            {planesDisponibles.map((p) => (
              <div key={p.id} className="flex items-center justify-between">
                <span className="text-ink/70">{p.nombre}</span>
                <span className="font-semibold text-ink">{resumen.porPlan[p.id] ?? 0}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-edge/10 bg-surface p-4">
          <p className="mb-1 text-sm font-semibold text-ink">Conversión a plan pago</p>
          <p className="text-3xl font-semibold text-ink">{resumen.conversion.toFixed(0)}%</p>
          <p className="mt-1 text-xs text-ink/40">
            {resumen.suscripcionesPagando} de {resumen.consultoriosRegistrados} consultorios registrados ya pagan
            una suscripción.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
              <th className="px-4 py-3">Clínica</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Usuarios</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Suscripción</th>
              <th className="px-4 py-3">MRR</th>
              <th className="px-4 py-3">Alta</th>
              <th className="px-4 py-3">Última actividad</th>
              <th className="px-4 py-3">Cuenta</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {resumen.clinicas.map((c) => (
              <tr key={c.id} className="border-b border-edge/5 last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{c.nombre}</td>
                <td className="px-4 py-3 text-ink/60">{c.correoContacto || "—"}</td>
                <td className="px-4 py-3 text-ink/60">{c.usuarios}</td>
                <td className="px-4 py-3 text-ink/60">{planesDisponibles.find((p) => p.id === c.planActivo)?.nombre}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${estadoSuscripcionLabel[c.estadoSuscripcion].clase}`}>
                    {estadoSuscripcionLabel[c.estadoSuscripcion].texto}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink/60">{formatMoneda(c.mrr)}</td>
                <td className="px-4 py-3 text-ink/60">{formatFecha(c.creadoEl)}</td>
                <td className="px-4 py-3 text-ink/60">{formatFecha(c.ultimaActividad)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${estadoCuentaLabel[c.estadoCuenta].clase}`}>
                    {estadoCuentaLabel[c.estadoCuenta].texto}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => setClinicaVerId(c.id)} className="text-xs font-semibold text-ink/50 hover:text-ink">
                      Ver
                    </button>
                    <button onClick={() => setClinicaEditar(c)} className="text-xs font-semibold text-accent hover:text-accent">
                      Editar
                    </button>
                    <button
                      onClick={() => alternarSuspension(c)}
                      disabled={accionandoId === c.id}
                      className="text-xs font-semibold text-warning hover:text-warning disabled:opacity-40"
                    >
                      {c.estadoCuenta === "suspendida" ? "Reactivar" : "Suspender"}
                    </button>
                    <button onClick={() => setClinicaEliminar(c)} className="text-xs text-danger/60 hover:text-danger">
                      Eliminar
                    </button>
                    <button
                      onClick={() => otorgarFundadora(c)}
                      disabled={accionandoId === c.id}
                      title="Otorgar Clínica Fundadora de MO Conecta (90 días)"
                      className="text-xs font-semibold text-accent/70 hover:text-accent disabled:opacity-40"
                    >
                      Fundadora
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <MoConectaSeccion resumen={resumen.moConecta} onCambio={cargar} />

      <div className="rounded-2xl border border-edge/10 bg-surface p-4">
        <p className="mb-3 text-sm font-semibold text-ink">Sugerencias recibidas</p>
        {resumen.sugerencias.length === 0 ? (
          <p className="text-sm text-ink/40">Todavía no hay sugerencias enviadas.</p>
        ) : (
          <div className="space-y-2">
            {resumen.sugerencias.map((s) => (
              <div key={s.id} className="rounded-xl border border-edge/10 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-ink">
                    {s.clinicNombre} · <span className="text-ink/50">{s.autor}</span>
                  </p>
                  <span className="text-xs text-ink/40">
                    {categoriaLabel[s.categoria]} · {formatFecha(s.fecha)}
                  </span>
                </div>
                <p className="mt-1 text-ink/70">{s.mensaje}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {clinicaEditar && (
        <EditarPlanModal clinica={clinicaEditar} onClose={() => setClinicaEditar(null)} onGuardado={cargar} />
      )}
      {clinicaEliminar && (
        <EliminarClinicaModal clinica={clinicaEliminar} onClose={() => setClinicaEliminar(null)} onEliminado={cargar} />
      )}
      {clinicaVerId && <DetalleClinicaModal clinicId={clinicaVerId} onClose={() => setClinicaVerId(null)} />}
    </div>
  );
}
