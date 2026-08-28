"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";

export default function PresupuestosPendientesPanel({ onClose }: { onClose: () => void }) {
  const { presupuestosPendientesDetalle, irAExpediente } = usePatientData();
  const entradas = Object.values(presupuestosPendientesDetalle.porPresupuesto).sort((a, b) =>
    a.fecha.localeCompare(b.fecha)
  );

  const seleccionar = (patientId: string) => {
    onClose();
    irAExpediente(patientId, "Presupuestos");
  };

  const totalConDetalle = entradas.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Presupuestos Pendientes</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>

        <p className="mb-4 text-xs text-ink/50">
          Presupuestos sin marcar como Aceptado, Rechazado o Expirado — ordenados del más antiguo al más
          reciente. Este detalle solo refleja presupuestos tocados desde que existe este seguimiento; puede
          mostrar menos que el total histórico de la tarjeta hasta que se vayan actualizando con el uso normal.
        </p>

        {totalConDetalle === 0 ? (
          <p className="text-sm text-ink/40">No hay presupuestos pendientes en el detalle todavía.</p>
        ) : (
          <div className="space-y-2">
            {entradas.map((e) => (
              <button
                key={e.id}
                onClick={() => seleccionar(e.patientId)}
                className="flex w-full items-center justify-between rounded-lg border border-edge/10 bg-surface px-3 py-2 text-left text-sm transition-colors hover:bg-surface2"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-ink">{e.patientName || "Paciente"}</div>
                  <div className="truncate text-xs text-ink/40">
                    Folio {e.folio} · {e.fecha}
                  </div>
                </div>
                <div className="ml-3 shrink-0 text-sm font-semibold text-ink/70">{formatCurrency(e.total)}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
