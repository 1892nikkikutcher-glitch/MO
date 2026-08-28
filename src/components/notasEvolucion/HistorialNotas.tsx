"use client";

/** Historial de Notas de Evolución — muestra v1 (PSOAP, formato original,
 * nunca reinterpretado) y v2 ("Registrar atención de hoy") en una sola
 * lista, con los borradores v2 separados visiblemente de las notas
 * firmadas: un borrador nunca se presenta como si ya formara parte del
 * expediente clínico definitivo. */

import { usePatientData } from "@/context/PatientDataContext";
import { esNotaV2, type NotaEvolucionAny, type NotaEvolucionV2 } from "@/lib/notasEvolucion";
import type { NotaEvolucion } from "@/lib/patientData";

const psoapCampos = [
  { key: "presentacion" as const, letra: "P", label: "Presentación" },
  { key: "subjetivo" as const, letra: "S", label: "Subjetivo" },
  { key: "objetivo" as const, letra: "O", label: "Objetivo" },
  { key: "analisis" as const, letra: "A", label: "Análisis" },
  { key: "pronostico" as const, letra: "P", label: "Pronóstico" },
];

const estadoBadge: Record<NotaEvolucionV2["estado"], { texto: string; clase: string }> = {
  borrador: { texto: "Borrador — pendiente de revisión y firma", clase: "bg-warning/15 text-warning" },
  lista_revision: { texto: "Lista para revisión", clase: "bg-accent/15 text-accent" },
  firmada: { texto: "Firmada", clase: "bg-success/15 text-success" },
  con_aclaracion: { texto: "Con aclaración", clase: "bg-accent/15 text-accent" },
};

function TarjetaBorrador({ nota, onContinuar }: { nota: NotaEvolucionV2; onContinuar: () => void }) {
  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-warning">
          {estadoBadge[nota.estado].texto}
        </span>
        <span className="text-xs text-ink/40">Última edición {new Date(nota.actualizadoEn).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <p className="mt-1 text-sm font-medium text-ink">
        {nota.detalleProcedimiento?.actividadRealizada || "Sin actividad registrada todavía"}
      </p>
      <button onClick={onContinuar} className="mt-2 text-xs font-semibold text-accent hover:underline">
        Continuar →
      </button>
    </div>
  );
}

function TarjetaFirmadaV2({ nota }: { nota: NotaEvolucionV2 }) {
  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink/40">
        <span>
          <span className="font-medium text-ink/70">{new Date(nota.creadoEn).toLocaleDateString("es-MX")}</span> · {nota.encabezado.medico}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${estadoBadge[nota.estado].clase}`}>
          {nota.estado === "con_aclaracion" ? "Con aclaración" : "Firmada"}
        </span>
      </div>
      {nota.detalleProcedimiento?.actividadRealizada && (
        <p className="mt-2 text-sm font-medium text-ink">
          {nota.detalleProcedimiento.actividadRealizada}
          {nota.encabezado.organosDentales.length > 0 && ` · OD ${nota.encabezado.organosDentales.join(", ")}`}
        </p>
      )}
      {nota.narrativa.texto && <p className="mt-1 whitespace-pre-line text-sm text-ink/70">{nota.narrativa.texto}</p>}
      {nota.aclaraciones.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-edge/10 pt-2">
          {nota.aclaraciones.map((a) => (
            <div key={a.id} className="text-xs text-ink/60">
              <span className="font-medium text-ink/80">Aclaración ({a.motivo}):</span> {a.contenido}
              <span className="block text-ink/40">{a.autorNombre} · {new Date(a.fecha).toLocaleString("es-MX")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TarjetaV1({ nota }: { nota: NotaEvolucion }) {
  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-4">
      <div className="flex items-center justify-between text-xs text-ink/40">
        <span>
          <span className="font-medium text-ink/60">{nota.fecha}</span> · {nota.medico}
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {psoapCampos
          .filter((campo) => nota[campo.key]?.trim())
          .map((campo) => (
            <div key={campo.key} className="flex gap-2 text-sm">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/10 text-[11px] font-bold text-accent">
                {campo.letra}
              </span>
              <p className="text-ink/80">
                <span className="font-medium text-ink/50">{campo.label}: </span>
                {nota[campo.key]}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}

export default function HistorialNotas({ patientId, onContinuarBorrador }: { patientId: string; onContinuarBorrador: (notaId: string) => void }) {
  const { notasEvolucionPorPaciente } = usePatientData();
  const notas = notasEvolucionPorPaciente[patientId] ?? [];

  const borradores = notas.filter((n): n is NotaEvolucionV2 => esNotaV2(n) && (n.estado === "borrador" || n.estado === "lista_revision"));
  const firmadasV2 = notas
    .filter((n): n is NotaEvolucionV2 => esNotaV2(n) && (n.estado === "firmada" || n.estado === "con_aclaracion"))
    .sort((a, b) => b.actualizadoEn.localeCompare(a.actualizadoEn));
  const notasV1 = notas.filter((n): n is NotaEvolucion => !esNotaV2(n as NotaEvolucionAny));

  if (notas.length === 0) {
    return <p className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">No hay notas de evolución registradas</p>;
  }

  return (
    <div className="space-y-6">
      {borradores.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/50">Borradores</h3>
          <div className="space-y-2">
            {borradores.map((n) => (
              <TarjetaBorrador key={n.id} nota={n} onContinuar={() => onContinuarBorrador(n.id)} />
            ))}
          </div>
        </div>
      )}

      <div>
        {borradores.length > 0 && <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/50">Historial</h3>}
        <div className="space-y-3">
          {firmadasV2.map((n) => (
            <TarjetaFirmadaV2 key={n.id} nota={n} />
          ))}
          {notasV1.map((n) => (
            <TarjetaV1 key={n.id} nota={n} />
          ))}
        </div>
      </div>
    </div>
  );
}
