"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { computeTratamientosPendientes } from "@/lib/patientData";
import { AgregarPagoDialog } from "./pages/Pagos";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

export default function GlobalAgregarPago({ onClose }: { onClose: () => void }) {
  const { patients, presupuestosPorPaciente, pagosPorPaciente, setPagosPaciente } =
    usePatientData();
  const [patientId, setPatientId] = useState("");

  if (!patientId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-[#0a0a0a] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Registrar Pago</h2>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
            >
              ✕
            </button>
          </div>

          <label className="mb-1 block text-xs font-medium text-ink/60">
            ¿Para qué paciente es este pago?
          </label>
          <select
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecciona un paciente</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <p className="mt-2 text-xs text-ink/30">
            Al elegir un paciente se abrirá directamente el formulario de pago.
          </p>

          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const patient = patients.find((p) => p.id === patientId)!;
  const presupuestos = presupuestosPorPaciente[patientId] ?? [];
  const pagos = pagosPorPaciente[patientId] ?? [];
  const tratamientosPendientes = computeTratamientosPendientes(presupuestos, pagos);
  const saldoPendienteTotal = tratamientosPendientes.reduce((sum, t) => sum + t.pendiente, 0);

  return (
    <AgregarPagoDialog
      patientName={patient.name}
      saldoPendienteTotal={saldoPendienteTotal}
      tratamientosPendientes={tratamientosPendientes}
      onClose={onClose}
      onSave={(pago) => {
        setPagosPaciente(patientId, (prev) => {
          const existe = prev.some((p) => p.id === pago.id);
          if (existe) return prev.map((p) => (p.id === pago.id ? pago : p));
          return [pago, ...prev];
        });
      }}
    />
  );
}
