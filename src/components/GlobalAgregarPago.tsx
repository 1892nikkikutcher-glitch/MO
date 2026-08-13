"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { coincidePaciente, computeTratamientosPendientes, formatNombreConEdad } from "@/lib/patientData";
import { manejarCambioNombre } from "@/lib/textoNombre";
import { AgregarPagoDialog } from "./pages/Pagos";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

export default function GlobalAgregarPago({ onClose }: { onClose: () => void }) {
  const { patients, presupuestosPorPaciente, pagosPorPaciente, setPagosPaciente, addPatient } =
    usePatientData();
  const [patientId, setPatientId] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [mostrarNuevoPaciente, setMostrarNuevoPaciente] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [telefonoNuevo, setTelefonoNuevo] = useState("");
  const [fechaNacimientoNueva, setFechaNacimientoNueva] = useState("");

  if (!patientId) {
    const coincidencias =
      busqueda.trim().length > 0 ? patients.filter((p) => coincidePaciente(busqueda, p.name)) : [];

    if (mostrarNuevoPaciente) {
      const puedeGuardar = nombreNuevo.trim().length > 0 && telefonoNuevo.trim().length > 0;
      const guardarYCobrar = () => {
        if (!puedeGuardar) return;
        const nuevo = addPatient({
          name: nombreNuevo.trim(),
          phone: telefonoNuevo.trim(),
          birthDate: fechaNacimientoNueva || undefined,
        });
        setPatientId(nuevo.id);
      };

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Nuevo Paciente</h2>
              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-xs text-ink/40">
              Al guardar se abrirá directamente el formulario de pago para este paciente.
            </p>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Nombre completo</label>
                <input
                  type="text"
                  value={nombreNuevo}
                  onChange={(e) => manejarCambioNombre(e, setNombreNuevo)}
                  placeholder="Ej. María Fernanda López"
                  className={inputClass}
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Teléfono</label>
                <input
                  type="text"
                  value={telefonoNuevo}
                  onChange={(e) => setTelefonoNuevo(e.target.value)}
                  placeholder="10 dígitos"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">
                  Fecha de nacimiento (opcional)
                </label>
                <input
                  type="date"
                  value={fechaNacimientoNueva}
                  onChange={(e) => setFechaNacimientoNueva(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setMostrarNuevoPaciente(false)}
                className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
              >
                Atrás
              </button>
              <button
                onClick={guardarYCobrar}
                disabled={!puedeGuardar}
                className="flex-1 rounded-lg bg-gradient-to-r from-accent to-orange-500 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Guardar y cobrar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
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
          <div className="relative">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Busca por nombre o iniciales..."
              className={inputClass}
              autoFocus
            />
            {coincidencias.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-edge/10 bg-field shadow-card">
                {coincidencias.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPatientId(p.id)}
                    className="block w-full border-b border-edge/5 px-3 py-2 text-left text-sm text-ink/80 last:border-0 hover:bg-surface"
                  >
                    {formatNombreConEdad(p.name, p.birthDate)}
                  </button>
                ))}
              </div>
            )}
            {busqueda.trim().length > 0 && coincidencias.length === 0 && (
              <p className="mt-1 text-xs text-ink/30">Sin resultados.</p>
            )}
          </div>

          <p className="mt-2 text-xs text-ink/30">
            Al elegir un paciente se abrirá directamente el formulario de pago.
          </p>

          <div className="mt-6 space-y-2">
            {busqueda.trim().length > 0 && coincidencias.length === 0 && (
              <button
                onClick={() => {
                  setNombreNuevo(busqueda.trim());
                  setMostrarNuevoPaciente(true);
                }}
                className="w-full rounded-lg border border-accent/40 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
              >
                + Registrar nuevo paciente
              </button>
            )}
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
