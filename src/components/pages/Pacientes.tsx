"use client";

import { useEffect, useState } from "react";
import Expediente from "./Expediente";
import { usePatientData } from "@/context/PatientDataContext";
import type { Patient } from "@/lib/patientData";

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
  const index = Number(id) % avatarColors.length;
  return avatarColors[index];
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
  const { patients, navegacionExpediente, consumirNavegacionExpediente } = usePatientData();
  const [selected, setSelected] = useState<Patient | null>(null);

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
                {calculateAge(p.birthDate) !== null ? `${calculateAge(p.birthDate)} años` : "—"}
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
  );
}
