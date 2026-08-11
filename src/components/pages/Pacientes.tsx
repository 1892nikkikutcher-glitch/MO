"use client";

import { useEffect, useState } from "react";
import Expediente from "./Expediente";
import { usePatientData } from "@/context/PatientDataContext";
import { formatEdad, type Patient } from "@/lib/patientData";

const avatarColors = ["#f59e0b", "#ec4899", "#3b82f6", "#22c55e", "#dc2626", "#a855f7"];

function calculateAge(birthDate: string) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatDate(birthDate: string) {
  if (!birthDate) return "Sin registrar";
  return new Date(birthDate).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return avatarColors[hash % avatarColors.length];
}

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function NuevoPacienteDialog({
  onClose,
  onGuardar,
}: {
  onClose: () => void;
  onGuardar: (data: { name: string; phone: string; birthDate: string }) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [telefono, setTelefono] = useState("");

  const puedeGuardar = nombre.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-[#0a0a0a] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Nuevo Paciente</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-ink/40">
          Solo lo esencial para agendar — el resto del expediente se completa en consulta.
        </p>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Nombre completo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. María Fernanda López"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Fecha de nacimiento</label>
            <input
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Teléfono</label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="55 1234 5678"
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
            onClick={() =>
              puedeGuardar &&
              onGuardar({ name: nombre.trim(), phone: telefono.trim(), birthDate: fechaNacimiento })
            }
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

function ExpedienteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 4h11l5 5v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM14 4v6h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Pacientes() {
  const { patients, addPatient, navegacionExpediente, consumirNavegacionExpediente } = usePatientData();
  const [selected, setSelected] = useState<Patient | null>(null);
  const [showNuevoPaciente, setShowNuevoPaciente] = useState(false);

  useEffect(() => {
    if (!navegacionExpediente) return;
    const patient = patients.find((p) => p.id === navegacionExpediente.patientId);
    if (patient) setSelected(patient);
  }, [navegacionExpediente, patients]);

  if (selected) {
    return (
      <Expediente
        patient={selected}
        avatarColor={avatarColor(selected.id)}
        initials={initials(selected.name)}
        formatDate={formatDate}
        calculateAge={calculateAge}
        initialTab={navegacionExpediente?.patientId === selected.id ? navegacionExpediente.tab : undefined}
        onTabApplied={consumirNavegacionExpediente}
        onBack={() => {
          setSelected(null);
          consumirNavegacionExpediente();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowNuevoPaciente(true)}
          className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          + Nuevo Paciente
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
            <th className="px-6 py-4 font-medium">Foto</th>
            <th className="px-6 py-4 font-medium">Nombre completo</th>
            <th className="px-6 py-4 font-medium">Celular</th>
            <th className="px-6 py-4 font-medium">Fecha de nacimiento</th>
            <th className="px-6 py-4 font-medium">Edad</th>
            <th className="px-6 py-4 text-right font-medium">Expediente</th>
          </tr>
        </thead>
        <tbody>
          {patients.map((p) => (
            <tr key={p.id} className="border-b border-edge/5 last:border-0 hover:bg-surface">
              <td className="px-6 py-4">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-black"
                  style={{ backgroundColor: avatarColor(p.id) }}
                >
                  {initials(p.name)}
                </div>
              </td>
              <td className="px-6 py-4">
                <button
                  onClick={() => setSelected(p)}
                  className="font-medium text-ink transition-colors hover:text-accent"
                >
                  {p.name}
                </button>
              </td>
              <td className="px-6 py-4 text-ink/70">{p.phone}</td>
              <td className="px-6 py-4 text-ink/70">{formatDate(p.birthDate)}</td>
              <td className="px-6 py-4 text-ink/70">
                {p.birthDate ? formatEdad(p.birthDate) : "—"}
              </td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => setSelected(p)}
                  title="Ver expediente"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-accent/70 transition-colors hover:bg-surface hover:text-accent"
                >
                  <ExpedienteIcon />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {showNuevoPaciente && (
        <NuevoPacienteDialog
          onClose={() => setShowNuevoPaciente(false)}
          onGuardar={(data) => {
            addPatient(data);
            setShowNuevoPaciente(false);
          }}
        />
      )}
    </div>
  );
}
