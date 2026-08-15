"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { agruparLaboratoriosPendientes } from "@/lib/dashboardMetrics";
import type { LaboratorioPendienteEntry } from "@/lib/laboratoriosPendientes";

function Grupo({
  titulo,
  entries,
  tono,
  onSelect,
}: {
  titulo: string;
  entries: LaboratorioPendienteEntry[];
  tono: "danger" | "warning" | "ink";
  onSelect: (patientId: string) => void;
}) {
  if (entries.length === 0) return null;
  const colorTexto = tono === "danger" ? "text-danger" : tono === "warning" ? "text-warning" : "text-ink/60";
  const colorBorde = tono === "danger" ? "border-danger/20" : tono === "warning" ? "border-warning/20" : "border-edge/10";

  return (
    <div>
      <h4 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${colorTexto}`}>
        {titulo} ({entries.length})
      </h4>
      <div className="space-y-2">
        {entries.map((e) => (
          <button
            key={e.id}
            onClick={() => onSelect(e.patientId)}
            className={`flex w-full items-center justify-between rounded-lg border ${colorBorde} bg-surface px-3 py-2 text-left text-sm transition-colors hover:bg-surface2`}
          >
            <div className="min-w-0">
              <div className="truncate font-medium text-ink">{e.patientName || "Paciente"}</div>
              <div className="truncate text-xs text-ink/40">
                {e.trabajo || e.tipo} · {e.laboratorio}
              </div>
            </div>
            <div className="ml-3 shrink-0 text-xs text-ink/50">{e.fechaEntrega || "Sin fecha"}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LaboratoriosPendientesPanel({ onClose }: { onClose: () => void }) {
  const { laboratoriosPendientes, estadisticas, irAExpediente } = usePatientData();
  const grupos = agruparLaboratoriosPendientes(Object.values(laboratoriosPendientes.porOrden));

  const seleccionar = (patientId: string) => {
    onClose();
    irAExpediente(patientId, "Laboratorios");
  };

  const total = Object.values(laboratoriosPendientes.porOrden).length;
  const totalReal = estadisticas.laboratoriosPendientesCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Laboratorios Pendientes</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>

        {total < totalReal && (
          <p className="mb-4 rounded-lg border border-warning/20 bg-warning/10 p-3 text-xs text-warning">
            Este detalle solo muestra {total} de las {totalReal} solicitudes pendientes reales — se
            completa conforme se abren y editan los expedientes de laboratorio pendientes.
          </p>
        )}

        {total === 0 ? (
          <p className="text-sm text-ink/40">No hay solicitudes de laboratorio pendientes.</p>
        ) : (
          <div className="space-y-5">
            <Grupo titulo="Vencidos" entries={grupos.vencidos} tono="danger" onSelect={seleccionar} />
            <Grupo titulo="Vencen Hoy" entries={grupos.vencenHoy} tono="warning" onSelect={seleccionar} />
            <Grupo titulo="Próximos" entries={grupos.proximos} tono="ink" onSelect={seleccionar} />
            <Grupo titulo="Sin Fecha de Entrega" entries={grupos.sinFecha} tono="ink" onSelect={seleccionar} />
          </div>
        )}
      </div>
    </div>
  );
}
