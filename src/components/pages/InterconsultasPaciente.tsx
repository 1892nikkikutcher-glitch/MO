"use client";

/** Pestaña "MO Conecta" del Expediente — interconsultas de ESTE paciente
 * en particular, filtradas de `misCasos` (ya cargado por MoConectaContext
 * con el listener en tiempo real que ya usa MoConecta.tsx — nunca una
 * consulta nueva). Abrir un caso navega a la página MO Conecta con ese
 * caso ya seleccionado (mismo patrón que "Solicitar interconsulta" ya
 * usa para preseleccionar el paciente en sentido inverso). */

import { useMoConecta } from "@/context/MoConectaContext";
import { EstadoBadge } from "./MoConecta";
import type { Interconsulta } from "@/lib/moConecta";

function nombreColega(caso: Interconsulta, uid: string, directorio: { uid: string; nombreCompleto: string }[]): string {
  const otroUid = caso.odontologoRemitenteUid === uid ? caso.destinatarioUid : caso.odontologoRemitenteUid;
  if (!otroUid) return "colega por confirmar";
  return directorio.find((p) => p.uid === otroUid)?.nombreCompleto ?? "un colega";
}

export default function InterconsultasPaciente({
  patientId,
  onSolicitar,
  onAbrirCaso,
}: {
  patientId: string;
  onSolicitar: () => void;
  onAbrirCaso: (interconsultaId: string) => void;
}) {
  const { uid, directorio, misCasos, cargando } = useMoConecta();
  const casos = misCasos
    .filter((c) => c.pacienteId === patientId)
    .slice()
    .sort((a, b) => b.actualizadoEl.localeCompare(a.actualizadoEl));

  if (cargando) {
    return <p className="text-sm text-ink/50">Cargando…</p>;
  }

  if (casos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center">
        <p className="text-sm text-ink/50">Todavía no hay interconsultas para este paciente.</p>
        <button
          onClick={onSolicitar}
          className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Solicitar interconsulta
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={onSolicitar} className="text-xs text-accent hover:underline">
          + Nueva interconsulta para este paciente
        </button>
      </div>
      <div className="space-y-2">
        {casos.map((c) => {
          const esRemitente = c.odontologoRemitenteUid === uid;
          return (
            <button
              key={c.id}
              onClick={() => onAbrirCaso(c.id)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-edge/10 bg-surface p-4 text-left transition-colors hover:border-accent/40"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">
                  {esRemitente ? "Enviada a" : "Recibida de"} {nombreColega(c, uid, directorio)}
                </p>
                <p className="truncate text-xs text-ink/50">
                  {c.especialidadSolicitada} · {c.motivo}
                </p>
              </div>
              <EstadoBadge estado={c.estado} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
