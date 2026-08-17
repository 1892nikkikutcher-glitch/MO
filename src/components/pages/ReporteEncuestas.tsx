"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { renderPlantilla, formatosWhatsAppInicial } from "@/lib/formatosWhatsapp";
import { formatFechaCita } from "@/lib/patientData";
import type { EncuestaEnviada } from "@/lib/encuestas";
import ConfirmarEliminar from "@/components/ConfirmarEliminar";

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 21l1.4-4.2A8.5 8.5 0 1 1 8.3 20.5L3 21ZM8.5 8.3c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .5.3.2.4.6 1.4.7 1.5.1.1.1.3 0 .4-.1.2-.2.3-.3.4-.2.2-.3.3-.1.6.7 1.1 1.4 1.7 2.5 2.3.2.1.3.1.4-.1.2-.2.5-.6.7-.8.1-.2.3-.2.5-.1.5.2 1.3.6 1.5.7.2.1.3.1.4.3.1.2.1.9-.2 1.4-.3.5-1.1.9-1.6 1-.5 0-1.1.1-3.4-.9-2.4-1.1-3.9-3.5-4.1-3.7-.1-.2-1-1.3-1-2.5s.6-1.7.8-2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6h14Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Estrellas({ calificacion }: { calificacion: number }) {
  return (
    <span className="text-accent">
      {"★".repeat(calificacion)}
      <span className="text-ink/20">{"★".repeat(5 - calificacion)}</span>
    </span>
  );
}

function hoyISO() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

function haceDias(dias: number) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

function RegistrarRespuestaDialog({
  encuesta,
  onClose,
  onGuardar,
}: {
  encuesta: EncuestaEnviada;
  onClose: () => void;
  onGuardar: (calificacion: number, comentario: string) => void;
}) {
  const [calificacion, setCalificacion] = useState(5);
  const [comentario, setComentario] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Registrar respuesta</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-ink/40">
          {encuesta.patientName} — lo que haya contestado en el chat de WhatsApp.
        </p>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Calificación</label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setCalificacion(n)}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold transition-colors ${
                    n <= calificacion
                      ? "border-accent/60 bg-accent/10 text-accent"
                      : "border-edge/15 text-ink/40 hover:border-edge/30"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Comentario (opcional)</label>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60"
              placeholder="Ej. Le encantó la atención, sugirió más horarios de sábado..."
            />
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
            onClick={() => onGuardar(calificacion, comentario.trim())}
            className="flex-1 rounded-lg bg-gradient-to-r from-accent to-orange-500 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReporteEncuestas() {
  const { citas, patients, clinicInfo, formatosWhatsapp, encuestas, setEncuestas, irAExpediente } =
    usePatientData();
  const [respondiendo, setRespondiendo] = useState<EncuestaEnviada | null>(null);
  const [encuestaAEliminar, setEncuestaAEliminar] = useState<EncuestaEnviada | null>(null);

  const desde = haceDias(30);
  const hasta = hoyISO();
  const citaIdsConEncuesta = new Set(encuestas.map((e) => e.citaId));

  const pendientesDeEnviar = citas
    .filter((c) => c.estatus === "Atendida")
    .filter((c) => c.fecha >= desde && c.fecha <= hasta)
    .filter((c) => !citaIdsConEncuesta.has(c.id))
    .sort((a, b) => (a.fecha + a.horaInicio > b.fecha + b.horaInicio ? -1 : 1));

  const enviadas = encuestas
    .filter((e) => !e.respondidaEn)
    .sort((a, b) => (a.enviadaEn > b.enviadaEn ? -1 : 1));

  const respondidas = encuestas
    .filter((e) => e.respondidaEn)
    .sort((a, b) => (a.respondidaEn! > b.respondidaEn! ? -1 : 1));

  const promedio =
    respondidas.length > 0
      ? respondidas.reduce((s, e) => s + (e.calificacion ?? 0), 0) / respondidas.length
      : null;

  const enviar = (cita: (typeof citas)[number]) => {
    const patient = patients.find((p) => p.id === cita.patientId);
    const telefono = patient?.phone?.replace(/\D/g, "");
    if (!telefono) return;
    const plantilla = formatosWhatsapp.encuestaSatisfaccion ?? formatosWhatsAppInicial.encuestaSatisfaccion;
    const texto = renderPlantilla(plantilla, {
      clinica: clinicInfo?.nombre || "tu clínica",
      paciente: cita.paciente,
      procedimiento: cita.tratamientos.join(", ") || "su tratamiento",
    });
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`, "_blank");

    const nueva: EncuestaEnviada = {
      id: `enc${Date.now()}`,
      citaId: cita.id,
      patientId: cita.patientId,
      patientName: cita.paciente,
      procedimiento: cita.tratamientos.join(", ") || "Sin procedimiento",
      fechaCita: cita.fecha,
      enviadaEn: new Date().toISOString(),
      calificacion: null,
      comentario: "",
      respondidaEn: null,
    };
    setEncuestas((prev) => [nueva, ...prev]);
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Encuestas de Satisfacción
        </h3>
        <p className="mt-1 text-xs text-ink/40">
          Se envían por WhatsApp después de la cita; como la respuesta llega al chat, se registra
          aquí a mano.
        </p>
      </div>

      {promedio !== null && (
        <div className="rounded-2xl border border-edge/10 bg-surface p-5">
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold text-accent">{promedio.toFixed(1)}</div>
            <Estrellas calificacion={Math.round(promedio)} />
          </div>
          <div className="mt-1 text-xs uppercase tracking-wide text-ink/40">
            Promedio de {respondidas.length} {respondidas.length === 1 ? "respuesta" : "respuestas"}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-ink/50">
          Pendientes de enviar ({pendientesDeEnviar.length})
        </h4>
        {pendientesDeEnviar.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-6 text-center text-sm text-ink/40">
            No hay citas atendidas en los últimos 30 días sin encuesta.
          </div>
        ) : (
          <div className="space-y-3">
            {pendientesDeEnviar.map((c) => {
              const patient = patients.find((p) => p.id === c.patientId);
              const tieneTelefono = Boolean(patient?.phone);
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-edge/10 bg-surface p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">{c.paciente}</p>
                    <p className="text-xs text-ink/50">
                      {formatFechaCita(c.fecha)} — {c.tratamientos.join(", ") || "Sin procedimiento"}
                    </p>
                  </div>
                  <button
                    onClick={() => enviar(c)}
                    disabled={!tieneTelefono}
                    title={tieneTelefono ? "Enviar encuesta" : "El paciente no tiene teléfono registrado"}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-success/30 px-3 py-2 text-xs font-semibold text-success/80 transition-colors hover:border-success hover:text-success disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <WhatsAppIcon />
                    Enviar
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-ink/50">
          Esperando respuesta ({enviadas.length})
        </h4>
        {enviadas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-6 text-center text-sm text-ink/40">
            No hay encuestas enviadas sin respuesta.
          </div>
        ) : (
          <div className="space-y-3">
            {enviadas.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-edge/10 bg-surface p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{e.patientName}</p>
                  <p className="text-xs text-ink/50">
                    Enviada el {formatFechaCita(e.enviadaEn.slice(0, 10))} — {e.procedimiento}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => setRespondiendo(e)}
                    className="rounded-lg border border-edge/15 px-3 py-2 text-xs font-semibold text-ink/70 transition-colors hover:border-accent/40 hover:text-accent"
                  >
                    Registrar respuesta
                  </button>
                  <button
                    onClick={() => setEncuestaAEliminar(e)}
                    title="Quitar de esta bitácora"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-danger/20 text-danger/50 transition-colors hover:border-danger/60 hover:text-danger"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-ink/50">
          Respuestas ({respondidas.length})
        </h4>
        {respondidas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-6 text-center text-sm text-ink/40">
            Aún no hay respuestas registradas.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                  <th className="px-6 py-3 font-medium">Paciente</th>
                  <th className="px-6 py-3 font-medium">Calificación</th>
                  <th className="px-6 py-3 font-medium">Comentario</th>
                  <th className="px-6 py-3 font-medium">Fecha</th>
                  <th className="px-6 py-3 text-right font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {respondidas.map((e) => (
                  <tr key={e.id} className="border-b border-edge/5 last:border-0">
                    <td className="px-6 py-3">
                      {e.patientId ? (
                        <button
                          onClick={() => irAExpediente(e.patientId!)}
                          className="font-medium text-ink underline decoration-ink/20 underline-offset-2 hover:text-accent hover:decoration-accent/50"
                        >
                          {e.patientName}
                        </button>
                      ) : (
                        <span className="text-ink">{e.patientName}</span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <Estrellas calificacion={e.calificacion ?? 0} />
                    </td>
                    <td className="px-6 py-3 text-ink/70">{e.comentario || "—"}</td>
                    <td className="px-6 py-3 text-ink/50">
                      {formatFechaCita(e.respondidaEn!.slice(0, 10))}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => setEncuestaAEliminar(e)}
                        title="Quitar de esta bitácora"
                        className="ml-auto flex h-7 w-7 items-center justify-center rounded-full border border-danger/20 text-danger/50 transition-colors hover:border-danger/60 hover:text-danger"
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {respondiendo && (
        <RegistrarRespuestaDialog
          encuesta={respondiendo}
          onClose={() => setRespondiendo(null)}
          onGuardar={(calificacion, comentario) => {
            setEncuestas((prev) =>
              prev.map((x) =>
                x.id === respondiendo.id
                  ? { ...x, calificacion, comentario, respondidaEn: new Date().toISOString() }
                  : x
              )
            );
            setRespondiendo(null);
          }}
        />
      )}

      {encuestaAEliminar && (
        <ConfirmarEliminar
          titulo="¿Quitar esta encuesta de la bitácora?"
          mensaje={`Encuesta de ${encuestaAEliminar.patientName}. Esta acción no se puede deshacer.`}
          confirmLabel="Quitar"
          onCancel={() => setEncuestaAEliminar(null)}
          onConfirm={() => {
            setEncuestas((prev) => prev.filter((x) => x.id !== encuestaAEliminar.id));
            setEncuestaAEliminar(null);
          }}
        />
      )}
    </div>
  );
}
