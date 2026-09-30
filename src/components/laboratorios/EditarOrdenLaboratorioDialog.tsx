"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { laboratorioEstatusOptions, type LaboratorioEstatus, type SolicitudLaboratorio } from "@/lib/patientData";
import { ENTREGA_OPCIONES, ETAPA_OPCIONES } from "@/lib/laboratorioDental";
import Odontograma from "@/components/pages/Odontograma";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

const chipClass = (activo: boolean) =>
  `rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
    activo
      ? "border-accent bg-accent/15 text-accent"
      : "border-edge/15 text-ink/50 hover:border-accent/40 hover:text-ink"
  }`;

/** Edita los detalles de una orden de trabajo dental YA enviada — laboratorio
 * y paciente quedan fijos (editarlos sería "mover" la orden, no corregirla;
 * para eso se crea una nueva). El guardado en sí lo decide quien llama
 * (onGuardar): desde Proveedores usa actualizarSolicitudLaboratorioDirecta
 * (el paciente puede no tener su Expediente cargado en esta sesión), desde
 * el Expediente usa el setLaboratoriosPaciente normal — este diálogo no
 * sabe ni le importa cuál. */
export default function EditarOrdenLaboratorioDialog({
  solicitud,
  nombreLaboratorio,
  onGuardar,
  onClose,
}: {
  solicitud: SolicitudLaboratorio;
  nombreLaboratorio: string;
  onGuardar: (cambios: Partial<Omit<SolicitudLaboratorio, "id">>) => void;
  onClose: () => void;
}) {
  const { recursos } = usePatientData();
  const medicosDisponibles = recursos.filter((r) => r.tipo === "medico").map((r) => r.nombre);

  const [numeroOrden, setNumeroOrden] = useState(solicitud.numeroOrden ?? "");
  const [medico, setMedico] = useState(solicitud.medico);
  const [fechaIngreso, setFechaIngreso] = useState(solicitud.fechaIngreso ?? "");
  const [fechaEntrega, setFechaEntrega] = useState(solicitud.fechaEntrega ?? "");
  const [trabajo, setTrabajo] = useState(solicitud.trabajo);
  const [dientes, setDientes] = useState<number[]>(solicitud.dientes);
  const [especificaciones, setEspecificaciones] = useState(solicitud.especificaciones ?? "");
  const [costo, setCosto] = useState(solicitud.costo ? String(solicitud.costo) : "");
  const [estatus, setEstatus] = useState<LaboratorioEstatus>(solicitud.estatus);
  const [entregaSeleccion, setEntregaSeleccion] = useState<string[]>(solicitud.entregaItems ?? []);
  const [entregaOtroTexto, setEntregaOtroTexto] = useState("");
  const [etapaSeleccion, setEtapaSeleccion] = useState<string[]>(solicitud.etapaItems ?? []);

  const toggleDiente = (tooth: number) =>
    setDientes((prev) => (prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth]));
  const toggleEntrega = (op: string) =>
    setEntregaSeleccion((prev) => (prev.includes(op) ? prev.filter((x) => x !== op) : [...prev, op]));
  const toggleEtapa = (op: string) =>
    setEtapaSeleccion((prev) => (prev.includes(op) ? prev.filter((x) => x !== op) : [...prev, op]));

  const puedeGuardar = trabajo.trim().length > 0 && medico !== "";

  const handleGuardar = () => {
    if (!puedeGuardar) return;
    const entregaFinal = entregaSeleccion.includes("Otro")
      ? [
          ...entregaSeleccion.filter((x) => x !== "Otro"),
          entregaOtroTexto.trim() ? `Otro (${entregaOtroTexto.trim()})` : "Otro",
        ]
      : entregaSeleccion;
    onGuardar({
      numeroOrden,
      medico,
      fechaIngreso,
      fechaEntrega,
      trabajo: trabajo.trim(),
      dientes,
      especificaciones,
      costo: Number(costo) || 0,
      estatus,
      entregaItems: entregaFinal,
      etapaItems: etapaSeleccion,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Editar Orden de Trabajo</h2>
            <p className="text-xs text-ink/40">Para {nombreLaboratorio}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">N° de orden</label>
              <input
                type="text"
                value={numeroOrden}
                onChange={(e) => setNumeroOrden(e.target.value)}
                placeholder="Opcional"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Médico solicitante</label>
              {medicosDisponibles.length > 0 ? (
                <select value={medico} onChange={(e) => setMedico(e.target.value)} className={inputClass}>
                  {medicosDisponibles.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                  No hay médicos configurados. Ve a Agenda → Recursos → + para agregar uno.
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Fecha de toma de impresión</label>
              <input
                type="text"
                value={fechaIngreso}
                onChange={(e) => setFechaIngreso(e.target.value)}
                placeholder="dd/mm/aaaa"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Fecha de colocación</label>
              <input
                type="text"
                value={fechaEntrega}
                onChange={(e) => setFechaEntrega(e.target.value)}
                placeholder="dd/mm/aaaa"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Trabajo a realizar</label>
            <textarea
              value={trabajo}
              onChange={(e) => setTrabajo(e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>

          <Odontograma selectedTeeth={dientes} onToggleTooth={toggleDiente} title="Órgano(s) dental(es) a trabajar" />

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Especificaciones</label>
            <textarea
              value={especificaciones}
              onChange={(e) => setEspecificaciones(e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Costo a pagar al laboratorio</label>
              <input
                type="number"
                min={0}
                value={costo}
                onChange={(e) => setCosto(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Estatus</label>
              <select
                value={estatus}
                onChange={(e) => setEstatus(e.target.value as LaboratorioEstatus)}
                className={inputClass}
              >
                {laboratorioEstatusOptions.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-ink/60">Se entrega junto con el trabajo</label>
            <div className="flex flex-wrap gap-2">
              {ENTREGA_OPCIONES.map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => toggleEntrega(op)}
                  className={chipClass(entregaSeleccion.includes(op))}
                >
                  {op}
                </button>
              ))}
            </div>
            {entregaSeleccion.includes("Otro") && (
              <input
                type="text"
                value={entregaOtroTexto}
                onChange={(e) => setEntregaOtroTexto(e.target.value)}
                placeholder="Especifica qué otro material se entrega"
                className={`${inputClass} mt-2`}
              />
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-ink/60">Etapa que se entrega o solicita</label>
            <div className="flex flex-wrap gap-2">
              {ETAPA_OPCIONES.map((op) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => toggleEtapa(op)}
                  className={chipClass(etapaSeleccion.includes(op))}
                >
                  {op}
                </button>
              ))}
            </div>
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
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  );
}
