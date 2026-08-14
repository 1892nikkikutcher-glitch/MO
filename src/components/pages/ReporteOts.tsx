"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import type { TipoLaboratorio } from "@/lib/patientData";

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

const tipoColor: Record<TipoLaboratorio, string> = {
  Dental: "bg-info/10 text-info",
  Químico: "bg-pink-400/10 text-pink-400",
  Radiografía: "bg-accent/10 text-accent",
};

export default function ReporteOts() {
  const { otsLog, setOtsLog, irAExpediente } = usePatientData();

  const ordenados = [...otsLog].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  const totalCosto = ordenados.reduce((s, o) => s + o.costo, 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Órdenes de Trabajo (OTs)
        </h3>
        <p className="mt-1 text-xs text-ink/40">
          Bitácora de solicitudes a laboratorio dental, laboratorio químico/clínico y radiografía,
          registradas desde la pestaña Laboratorios de cada paciente.
        </p>
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <div className="text-2xl font-bold text-accent">{formatCurrency(totalCosto)}</div>
        <div className="mt-1 text-xs uppercase tracking-wide text-ink/40">
          {ordenados.length} {ordenados.length === 1 ? "orden registrada" : "órdenes registradas"}
        </div>
      </div>

      {ordenados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          Aún no se ha registrado ninguna orden de trabajo.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                <th className="px-6 py-3 font-medium">Envío</th>
                <th className="px-6 py-3 font-medium">Tipo</th>
                <th className="px-6 py-3 font-medium">Paciente</th>
                <th className="px-6 py-3 font-medium">Laboratorio</th>
                <th className="px-6 py-3 font-medium">Trabajo solicitado</th>
                <th className="px-6 py-3 font-medium">Médico</th>
                <th className="px-6 py-3 text-right font-medium">Costo</th>
                <th className="px-6 py-3 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((o) => (
                <tr key={o.id} className="border-b border-edge/5 last:border-0">
                  <td className="px-6 py-3 whitespace-nowrap text-ink/60">{o.fechaEnvio}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tipoColor[o.tipo]}`}
                    >
                      {o.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => irAExpediente(o.patientId, "Laboratorios")}
                      className="font-medium text-ink underline decoration-ink/20 underline-offset-2 hover:text-accent hover:decoration-accent/50"
                    >
                      {o.patientName}
                    </button>
                  </td>
                  <td className="px-6 py-3 text-ink/70">{o.laboratorio}</td>
                  <td className="px-6 py-3 text-ink/70">{o.trabajo}</td>
                  <td className="px-6 py-3 text-ink/60">{o.medico}</td>
                  <td className="px-6 py-3 text-right font-semibold text-ink">
                    {formatCurrency(o.costo)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => setOtsLog((prev) => prev.filter((x) => x.id !== o.id))}
                      title="Quitar de esta bitácora (no borra la solicitud del expediente)"
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
  );
}
