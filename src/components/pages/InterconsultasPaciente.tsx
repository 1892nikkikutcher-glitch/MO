"use client";

/** Pestaña "MO Conecta" del Expediente — interconsultas de ESTE paciente
 * en particular, filtradas de `misCasos` (ya cargado por MoConectaContext
 * con el listener en tiempo real que ya usa MoConecta.tsx — nunca una
 * consulta nueva). Abrir un caso navega a la página MO Conecta con ese
 * caso ya seleccionado (mismo patrón que "Solicitar interconsulta" ya
 * usa para preseleccionar el paciente en sentido inverso).
 *
 * "Responsable actual": esta pestaña se ve siempre desde la clínica que
 * originó el paciente (mismo pacienteId local, nunca el destinatario de un
 * caso recibido — ese ve al paciente en SU PROPIO expediente, con su
 * propio pacienteId). Por eso el default es siempre "Tu clínica"; solo
 * cambia si alguna interconsulta `transferencia_continuidad` de este
 * paciente llegó a "transferida" — ahí el responsable pasa a ser el
 * destinatario de esa transferencia, hasta que él a su vez transfiera de
 * nuevo (arquitectura v3 §10 histórico, calculado aquí solo con datos ya
 * en vivo — el ExpedienteClinico.responsablePrincipalUid real de v3 sigue
 * inerte, sin ningún dato real todavía). */

import { useMoConecta } from "@/context/MoConectaContext";
import { EstadoBadge, nombreYEspecialidad } from "./MoConecta";
import type { Interconsulta } from "@/lib/moConecta";
import { calcularResponsableActual } from "@/lib/responsableActualInterconsulta";

function nombreColega(caso: Interconsulta, uid: string, directorio: { uid: string; nombreCompleto: string }[]): string {
  const otroUid = caso.odontologoRemitenteUid === uid ? caso.destinatarioUid : caso.odontologoRemitenteUid;
  if (!otroUid) return "colega por confirmar";
  return directorio.find((p) => p.uid === otroUid)?.nombreCompleto ?? "un colega";
}

function textoResponsable(casos: Interconsulta[], directorio: { uid: string; nombreCompleto: string }[]): string {
  const resultado = calcularResponsableActual(casos);
  if (resultado.tipo === "propia_clinica") return "Tu clínica";
  return directorio.find((p) => p.uid === resultado.uid)?.nombreCompleto ?? "Colega (transferido)";
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

  const responsable = textoResponsable(casos, directorio);
  const banner = (
    <div className="rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm">
      <span className="text-ink/50">Responsable actual: </span>
      <span className="font-medium text-ink">{responsable}</span>
    </div>
  );

  if (casos.length === 0) {
    return (
      <div className="space-y-3">
        {banner}
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center">
          <p className="text-sm text-ink/50">Todavía no hay interconsultas para este paciente.</p>
          <button
            onClick={onSolicitar}
            className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Solicitar interconsulta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {banner}
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
                <p className="truncate text-xs text-ink/50">{nombreYEspecialidad(c.motivo || "Sin motivo", c.especialidadSolicitada)}</p>
              </div>
              <EstadoBadge estado={c.estado} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
