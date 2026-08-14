"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";

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

export default function ReportePresupuestos() {
  const { presupuestosLog, setPresupuestosLog, irAExpediente } = usePatientData();

  const ordenados = [...presupuestosLog].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  const total = ordenados.reduce((s, p) => s + p.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Presupuestos Creados
        </h3>
        <p className="mt-1 text-xs text-ink/40">
          Bitácora de presupuestos creados desde que se activó este reporte — no incluye
          ediciones o borrados posteriores, ni presupuestos de antes de esta fecha.
        </p>
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <div className="text-2xl font-bold text-accent">{formatCurrency(total)}</div>
        <div className="mt-1 text-xs uppercase tracking-wide text-ink/40">
          {ordenados.length} {ordenados.length === 1 ? "presupuesto registrado" : "presupuestos registrados"}
        </div>
      </div>

      {ordenados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          Aún no se ha creado ningún presupuesto desde que se activó este reporte.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                <th className="px-6 py-3 font-medium">Fecha</th>
                <th className="px-6 py-3 font-medium">Folio</th>
                <th className="px-6 py-3 font-medium">Paciente</th>
                <th className="px-6 py-3 font-medium">Procedimientos</th>
                <th className="px-6 py-3 font-medium">Médico</th>
                <th className="px-6 py-3 text-right font-medium">Total</th>
                <th className="px-6 py-3 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((p) => (
                <tr key={p.id} className="border-b border-edge/5 last:border-0">
                  <td className="px-6 py-3 whitespace-nowrap text-ink/60">{p.fecha}</td>
                  <td className="px-6 py-3 text-ink/60">{p.folio}</td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => irAExpediente(p.patientId, "Presupuestos")}
                      className="font-medium text-ink underline decoration-ink/20 underline-offset-2 hover:text-accent hover:decoration-accent/50"
                    >
                      {p.patientName}
                    </button>
                  </td>
                  <td className="px-6 py-3 text-ink/70">{p.procedimientos.join(", ") || "—"}</td>
                  <td className="px-6 py-3 text-ink/60">{p.medico}</td>
                  <td className="px-6 py-3 text-right font-semibold text-ink">
                    {formatCurrency(p.total)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => setPresupuestosLog((prev) => prev.filter((x) => x.id !== p.id))}
                      title="Quitar de esta bitácora (no borra el presupuesto del expediente)"
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
