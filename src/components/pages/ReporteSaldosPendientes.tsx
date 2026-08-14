"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";

export default function ReporteSaldosPendientes() {
  const { saldosPendientes, irAExpediente } = usePatientData();

  const lista = Object.values(saldosPendientes.porPaciente).sort(
    (a, b) => b.totalPresupuestado - b.totalPagado - (a.totalPresupuestado - a.totalPagado)
  );
  const totalPendiente = lista.reduce((s, e) => s + (e.totalPresupuestado - e.totalPagado), 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Saldos Pendientes
        </h3>
        <p className="mt-1 text-xs text-ink/40">
          Se actualiza en tiempo real conforme se registran presupuestos y pagos — no incluye
          saldos de antes de activarse este reporte hasta que se toque de nuevo ese expediente.
        </p>
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <div className="text-2xl font-bold text-danger">{formatCurrency(totalPendiente)}</div>
        <div className="mt-1 text-xs uppercase tracking-wide text-ink/40">
          Total pendiente ({lista.length} {lista.length === 1 ? "paciente" : "pacientes"})
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          No hay saldos pendientes registrados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                <th className="px-6 py-3 font-medium">Paciente</th>
                <th className="px-6 py-3 text-right font-medium">Presupuestado</th>
                <th className="px-6 py-3 text-right font-medium">Pagado</th>
                <th className="px-6 py-3 text-right font-medium">Pendiente</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((e) => (
                <tr key={e.patientId} className="border-b border-edge/5 last:border-0">
                  <td className="px-6 py-3">
                    <button
                      onClick={() => irAExpediente(e.patientId, "Pagos")}
                      className="font-medium text-ink underline decoration-ink/20 underline-offset-2 hover:text-accent hover:decoration-accent/50"
                    >
                      {e.patientName}
                    </button>
                  </td>
                  <td className="px-6 py-3 text-right text-ink/70">
                    {formatCurrency(e.totalPresupuestado)}
                  </td>
                  <td className="px-6 py-3 text-right text-success">
                    {formatCurrency(e.totalPagado)}
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-danger">
                    {formatCurrency(e.totalPresupuestado - e.totalPagado)}
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
