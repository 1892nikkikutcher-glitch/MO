"use client";

import { useState } from "react";
import Odontograma from "./Odontograma";
import ConfirmarEliminar from "@/components/ConfirmarEliminar";
import { usePatientData } from "@/context/PatientDataContext";
import {
  laboratorioTipoOptions,
  laboratorioEstatusOptions,
  type LaboratorioEstatus as Estatus,
  type SolicitudLaboratorio as Solicitud,
  type TipoLaboratorio,
} from "@/lib/patientData";

const medicos = ["Dr. Nicolás Medina González", "Dra. Ana Paola Ríos Cervantes"];
const estatusOptions = laboratorioEstatusOptions;

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function formatCurrency(value: number) {
  return `$${value.toLocaleString("es-MX")}`;
}

const trabajoLabel: Record<TipoLaboratorio, string> = {
  Dental: "Trabajo solicitado",
  Químico: "Estudio o análisis solicitado",
  Radiografía: "Estudio radiográfico solicitado",
};

const trabajoPlaceholder: Record<TipoLaboratorio, string> = {
  Dental: "Ej. Corona de zirconia OD 16",
  Químico: "Ej. Biopsia de tejido blando, cultivo bacteriano...",
  Radiografía: "Ej. Radiografía panorámica, periapical OD 36...",
};

const laboratorioPlaceholder: Record<TipoLaboratorio, string> = {
  Dental: "Ej. Laboratorio Dental Ortiz",
  Químico: "Ej. Laboratorio Clínico Central",
  Radiografía: "Ej. Centro de Radiología Dental",
};

function todayFormatted() {
  return new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const tipoLabel: Record<TipoLaboratorio, string> = {
  Dental: "Laboratorio Dental",
  Químico: "Laboratorio Químico",
  Radiografía: "Radiografía",
};

const tipoColor: Record<TipoLaboratorio, string> = {
  Dental: "bg-info/10 text-info",
  Químico: "bg-pink-400/10 text-pink-400",
  Radiografía: "bg-accent/10 text-accent",
};

const estatusColor: Record<Estatus, string> = {
  Enviado: "bg-accent/10 text-accent",
  "En proceso": "bg-info/10 text-info",
  Recibido: "bg-success/10 text-success",
};

function NuevaSolicitudDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (solicitud: Solicitud) => void;
}) {
  const [tipo, setTipo] = useState<TipoLaboratorio>("Dental");
  const [laboratorio, setLaboratorio] = useState("");
  const [medico, setMedico] = useState(medicos[0]);
  const [trabajo, setTrabajo] = useState("");
  const [dientes, setDientes] = useState<number[]>([]);
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [costo, setCosto] = useState("");
  const [estatus, setEstatus] = useState<Estatus>("Enviado");

  const toggleDiente = (tooth: number) => {
    setDientes((prev) => (prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth]));
  };

  const puedeGuardar = laboratorio.trim().length > 0 && trabajo.trim().length > 0;

  const handleGuardar = () => {
    if (!puedeGuardar) return;
    onSave({
      id: `${Date.now()}`,
      tipo,
      laboratorio: laboratorio.trim(),
      medico,
      trabajo: trabajo.trim(),
      dientes,
      fechaEnvio: todayFormatted(),
      fechaEntrega,
      costo: Number(costo) || 0,
      estatus,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Nueva Solicitud</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Tipo de laboratorio
            </label>
            <div className="flex gap-2">
              {laboratorioTipoOptions.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`flex-1 rounded-lg border py-2 text-sm font-semibold transition-colors ${
                    tipo === t
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-edge/15 text-ink/50 hover:border-accent/40 hover:text-ink"
                  }`}
                >
                  {tipoLabel[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Laboratorio</label>
              <input
                type="text"
                value={laboratorio}
                onChange={(e) => setLaboratorio(e.target.value)}
                placeholder={laboratorioPlaceholder[tipo]}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Médico solicitante</label>
              <select value={medico} onChange={(e) => setMedico(e.target.value)} className={inputClass}>
                {medicos.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">{trabajoLabel[tipo]}</label>
            <textarea
              value={trabajo}
              onChange={(e) => setTrabajo(e.target.value)}
              placeholder={trabajoPlaceholder[tipo]}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>

          {tipo === "Dental" && (
            <Odontograma
              selectedTeeth={dientes}
              onToggleTooth={toggleDiente}
              title="Órganos dentales relacionados"
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">
                Fecha estimada de entrega
              </label>
              <input
                type="text"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                placeholder="dd/mm/aaaa"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Costo</label>
              <input
                type="number"
                min={0}
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Estatus</label>
            <select
              value={estatus}
              onChange={(e) => setEstatus(e.target.value as Estatus)}
              className={inputClass}
            >
              {estatusOptions.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Cerrar
          </button>
          <button
            onClick={handleGuardar}
            disabled={!puedeGuardar}
            className="flex-1 rounded-lg bg-gradient-to-r from-accent to-accent-2 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Laboratorios({ patientId }: { patientId: string }) {
  const { laboratoriosPorPaciente, setLaboratoriosPaciente } = usePatientData();
  const [showDialog, setShowDialog] = useState(false);
  const [solicitudAEliminar, setSolicitudAEliminar] = useState<Solicitud | null>(null);
  const solicitudes = laboratoriosPorPaciente[patientId] ?? [];

  const cambiarEstatus = (id: string, estatus: Estatus) => {
    setLaboratoriosPaciente(patientId, (prev) =>
      prev.map((s) => (s.id === id ? { ...s, estatus } : s))
    );
  };

  const eliminarSolicitud = (id: string) => {
    setLaboratoriosPaciente(patientId, (prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Laboratorios</h3>
        <button
          onClick={() => setShowDialog(true)}
          className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
          style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
        >
          + Nueva Solicitud
        </button>
      </div>

      {solicitudes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          No hay solicitudes de laboratorio registradas
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                <th className="px-6 py-3 font-medium">Tipo</th>
                <th className="px-6 py-3 font-medium">Laboratorio</th>
                <th className="px-6 py-3 font-medium">Trabajo solicitado</th>
                <th className="px-6 py-3 font-medium">Médico</th>
                <th className="px-6 py-3 font-medium">Envío</th>
                <th className="px-6 py-3 font-medium">Entrega estimada</th>
                <th className="px-6 py-3 font-medium">Estatus</th>
                <th className="px-6 py-3 text-right font-medium">Costo</th>
                <th className="px-6 py-3 text-right font-medium">Quitar</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((s) => (
                <tr key={s.id} className="border-b border-edge/5 last:border-0">
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tipoColor[s.tipo]}`}
                    >
                      {s.tipo}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-ink/80">{s.laboratorio}</td>
                  <td className="px-6 py-3 text-ink/70">
                    {s.trabajo}
                    {s.dientes.length > 0 && (
                      <span className="ml-1 text-xs text-ink/40">
                        (OD {[...s.dientes].sort((a, b) => a - b).join(", ")})
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-ink/70">{s.medico}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-ink/70">{s.fechaEnvio}</td>
                  <td className="px-6 py-3 whitespace-nowrap text-ink/70">{s.fechaEntrega || "—"}</td>
                  <td className="px-6 py-3">
                    <select
                      value={s.estatus}
                      onChange={(e) => cambiarEstatus(s.id, e.target.value as Estatus)}
                      className={`rounded-full border-0 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide outline-none ${estatusColor[s.estatus]}`}
                    >
                      {estatusOptions.map((op) => (
                        <option key={op} value={op}>
                          {op}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-accent">
                    {formatCurrency(s.costo)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => setSolicitudAEliminar(s)}
                      className="text-xs font-semibold text-danger hover:text-danger"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showDialog && (
        <NuevaSolicitudDialog
          onClose={() => setShowDialog(false)}
          onSave={(solicitud) => {
            setLaboratoriosPaciente(patientId, (prev) => [solicitud, ...prev]);
            setShowDialog(false);
          }}
        />
      )}

      {solicitudAEliminar && (
        <ConfirmarEliminar
          titulo="¿Eliminar esta solicitud de laboratorio?"
          mensaje={`Vas a eliminar la solicitud de "${solicitudAEliminar.trabajo}" con ${solicitudAEliminar.laboratorio}. Esta acción no se puede deshacer.`}
          onCancel={() => setSolicitudAEliminar(null)}
          onConfirm={() => {
            eliminarSolicitud(solicitudAEliminar.id);
            setSolicitudAEliminar(null);
          }}
        />
      )}
    </div>
  );
}
