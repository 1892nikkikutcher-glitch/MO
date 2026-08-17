"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { manejarCambioNombre } from "@/lib/textoNombre";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

export default function GlobalNuevoPaciente({ onClose }: { onClose: () => void }) {
  const { addPatient, sugerirNuevaCita } = usePatientData();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");

  const puedeGuardar = nombre.trim().length > 0 && telefono.trim().length > 0;

  const handleGuardar = () => {
    if (!puedeGuardar) return;
    const nuevo = addPatient({
      name: nombre.trim(),
      phone: telefono.trim(),
      birthDate: fechaNacimiento || undefined,
    });
    sugerirNuevaCita(nuevo.id, "Consulta de valoración");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
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
          Al guardar se abrirá la Agenda para agendar su primera cita — una consulta de
          valoración.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Nombre completo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => manejarCambioNombre(e, setNombre)}
              placeholder="Ej. María Fernanda López"
              className={inputClass}
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Teléfono</label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
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
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              className={inputClass}
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
            onClick={handleGuardar}
            disabled={!puedeGuardar}
            className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar y agendar
          </button>
        </div>
      </div>
    </div>
  );
}
