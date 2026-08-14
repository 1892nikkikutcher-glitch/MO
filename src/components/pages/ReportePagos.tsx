"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";

export default function ReportePagos() {
  const { pagosEliminados } = usePatientData();

  const ordenados = [...pagosEliminados].sort((a, b) => b.eliminadoEn.localeCompare(a.eliminadoEn));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Pagos Eliminados
        </h3>
        <p className="mt-1 text-xs text-ink/40">
          Bitácora de auditoría: cada vez que se elimina un pago desde el expediente de un
          paciente, queda registrado aquí junto con el motivo.
        </p>
      </div>

      {ordenados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          No se ha eliminado ningún pago.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                <th className="px-6 py-3 font-medium">Eliminado</th>
                <th className="px-6 py-3 font-medium">Paciente</th>
                <th className="px-6 py-3 font-medium">Fecha del pago</th>
                <th className="px-6 py-3 font-medium">Conceptos</th>
                <th className="px-6 py-3 text-right font-medium">Monto</th>
                <th className="px-6 py-3 font-medium">Motivo</th>
                <th className="px-6 py-3 font-medium">Eliminado por</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((r) => (
                <tr key={r.id} className="border-b border-edge/5 last:border-0 align-top">
                  <td className="px-6 py-3 whitespace-nowrap text-ink/60">
                    {new Date(r.eliminadoEn).toLocaleString("es-MX", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-3 font-medium text-ink/80">{r.patientName}</td>
                  <td className="px-6 py-3 text-ink/60">{r.pago.fecha}</td>
                  <td className="px-6 py-3 text-ink/60">
                    {r.pago.lineas.length > 0 ? r.pago.lineas.map((l) => l.label).join(", ") : "—"}
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-danger">
                    {formatCurrency(r.pago.total)}
                  </td>
                  <td className="px-6 py-3 text-ink/70">{r.motivo}</td>
                  <td className="px-6 py-3 text-ink/40">{r.eliminadoPor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
