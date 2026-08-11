"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink/60">{label}</label>
      {children}
    </div>
  );
}

export default function PerfilDoctor() {
  const { perfilDoctor, setPerfilDoctor } = usePatientData();
  const [form, setForm] = useState(perfilDoctor);
  const [guardado, setGuardado] = useState(false);

  const actualizar = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [campo]: e.target.value }));
    setGuardado(false);
  };

  const handleGuardar = () => {
    setPerfilDoctor(form);
    setGuardado(true);
  };

  return (
    <div className="max-w-2xl space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Perfil del Doctor</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre completo">
          <input type="text" value={form.nombre} onChange={actualizar("nombre")} className={inputClass} />
        </Field>
        <Field label="Cédula profesional">
          <input
            type="text"
            value={form.cedulaProfesional}
            onChange={actualizar("cedulaProfesional")}
            className={inputClass}
          />
        </Field>
        <Field label="Especialidad">
          <input
            type="text"
            value={form.especialidad}
            onChange={actualizar("especialidad")}
            placeholder="Ej. Ortodoncia, Odontología general..."
            className={inputClass}
          />
        </Field>
        <Field label="Correo">
          <input type="email" value={form.correo} onChange={actualizar("correo")} className={inputClass} />
        </Field>
        <Field label="Teléfono">
          <input type="text" value={form.telefono} onChange={actualizar("telefono")} className={inputClass} />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleGuardar}
          className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Guardar Cambios
        </button>
        {guardado && <span className="text-sm text-success">Perfil guardado</span>}
      </div>
    </div>
  );
}
