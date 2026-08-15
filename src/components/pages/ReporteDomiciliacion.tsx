"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency, formatNombreConEdad } from "@/lib/patientData";
import type { Domiciliacion } from "@/lib/domiciliacion";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

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

function AgregarDomiciliacionDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (data: Omit<Domiciliacion, "id" | "creadoEn" | "activo">) => void;
}) {
  const { patients } = usePatientData();
  const [patientId, setPatientId] = useState("");
  const [banco, setBanco] = useState("");
  const [ultimosDigitos, setUltimosDigitos] = useState("");
  const [monto, setMonto] = useState("");
  const [diaCobro, setDiaCobro] = useState("1");
  const [notas, setNotas] = useState("");

  const puedeGuardar = patientId && banco.trim().length > 0 && Number(monto) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Agregar Domiciliación</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-ink/40">
          Solo para llevar el control de quién tiene un cargo recurrente activo — nunca captures
          aquí el número de tarjeta completo.
        </p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Paciente</label>
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className={inputClass}>
              <option value="">Selecciona un paciente...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatNombreConEdad(p.name, p.birthDate)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Banco</label>
              <input
                type="text"
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                placeholder="Ej. BBVA"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">
                Últimos 4 dígitos
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={ultimosDigitos}
                onChange={(e) => setUltimosDigitos(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="Opcional"
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Monto</label>
              <input
                type="number"
                min={0}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Día de cobro</label>
              <input
                type="number"
                min={1}
                max={28}
                value={diaCobro}
                onChange={(e) => setDiaCobro(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Notas (opcional)</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!puedeGuardar) return;
              const patient = patients.find((p) => p.id === patientId)!;
              onSave({
                patientId,
                patientName: patient.name,
                banco: banco.trim(),
                ultimosDigitos,
                monto: Number(monto),
                diaCobro: Number(diaCobro),
                notas: notas.trim(),
              });
            }}
            disabled={!puedeGuardar}
            className="flex-1 rounded-lg bg-gradient-to-r from-accent to-orange-500 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReporteDomiciliacion() {
  const { domiciliaciones, setDomiciliaciones, irAExpediente } = usePatientData();
  const [showDialog, setShowDialog] = useState(false);

  const ordenados = [...domiciliaciones].sort((a, b) => a.diaCobro - b.diaCobro);
  const totalMensual = domiciliaciones.filter((d) => d.activo).reduce((s, d) => s + d.monto, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            Domiciliación Bancaria
          </h3>
          <p className="mt-1 text-xs text-ink/40">
            Registro de pacientes con cargo recurrente activo — solo para control, no procesa
            pagos reales.
          </p>
        </div>
        <button
          onClick={() => setShowDialog(true)}
          className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
          style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
        >
          + Agregar Domiciliación
        </button>
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <div className="text-2xl font-bold text-accent">{formatCurrency(totalMensual)}</div>
        <div className="mt-1 text-xs uppercase tracking-wide text-ink/40">
          Total mensual esperado (
          {(() => {
            const n = domiciliaciones.filter((d) => d.activo).length;
            return `${n} ${n === 1 ? "activa" : "activas"}`;
          })()}
          )
        </div>
      </div>

      {ordenados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          No hay domiciliaciones registradas.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                <th className="px-6 py-3 font-medium">Día</th>
                <th className="px-6 py-3 font-medium">Paciente</th>
                <th className="px-6 py-3 font-medium">Banco</th>
                <th className="px-6 py-3 text-right font-medium">Monto</th>
                <th className="px-6 py-3 font-medium">Estatus</th>
                <th className="px-6 py-3 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((d) => (
                <tr key={d.id} className="border-b border-edge/5 last:border-0">
                  <td className="px-6 py-3 text-ink/60">Día {d.diaCobro}</td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => irAExpediente(d.patientId)}
                      className="font-medium text-ink underline decoration-ink/20 underline-offset-2 hover:text-accent hover:decoration-accent/50"
                    >
                      {d.patientName}
                    </button>
                  </td>
                  <td className="px-6 py-3 text-ink/70">
                    {d.banco}
                    {d.ultimosDigitos && <span className="text-ink/40"> ••{d.ultimosDigitos}</span>}
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-ink">
                    {formatCurrency(d.monto)}
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() =>
                        setDomiciliaciones((prev) =>
                          prev.map((x) => (x.id === d.id ? { ...x, activo: !x.activo } : x))
                        )
                      }
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                        d.activo ? "bg-success/10 text-success" : "bg-surface2 text-ink/40"
                      }`}
                    >
                      {d.activo ? "Activa" : "Inactiva"}
                    </button>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => setDomiciliaciones((prev) => prev.filter((x) => x.id !== d.id))}
                      title="Eliminar"
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

      {showDialog && (
        <AgregarDomiciliacionDialog
          onClose={() => setShowDialog(false)}
          onSave={(data) => {
            const nueva: Domiciliacion = {
              id: `dom${Date.now()}`,
              activo: true,
              creadoEn: new Date().toISOString(),
              ...data,
            };
            setDomiciliaciones((prev) => [nueva, ...prev]);
            setShowDialog(false);
          }}
        />
      )}
    </div>
  );
}
