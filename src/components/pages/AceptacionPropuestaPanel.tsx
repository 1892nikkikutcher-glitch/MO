"use client";

import { useState } from "react";
import {
  formatCurrency,
  modalidadCobroLabel,
  modalidadCobroOptions,
  type ModalidadCobro,
  type SavedBudget,
} from "@/lib/patientData";
import { modalidadDe } from "@/lib/cuentaPaciente";

/** Registra qué autorizó el paciente de una propuesta: todo o solo una parte, y cuándo se cobra.
 * Aceptar no genera deuda por sí solo: los cargos nacen según la modalidad elegida (por defecto, al realizar
 * cada procedimiento). Lo no marcado queda pendiente para después, dentro de la misma propuesta. */
export default function AceptacionPropuestaPanel({
  presupuesto,
  esAlternativa,
  onConfirmar,
  onCancelar,
}: {
  presupuesto: SavedBudget;
  /** La propuesta es una de varias opciones excluyentes: al aceptarla, las demás quedan como "no elegida". */
  esAlternativa: boolean;
  onConfirmar: (itemIds: string[], modalidad: ModalidadCobro) => void;
  onCancelar: () => void;
}) {
  const yaAceptada = Boolean(presupuesto.aceptacion) || presupuesto.estado === "aceptado";
  const [marcados, setMarcados] = useState<Set<string>>(
    () => new Set(presupuesto.aceptacion ? presupuesto.aceptacion.itemIds : presupuesto.items.map((i) => i.id))
  );
  const [modalidad, setModalidad] = useState<ModalidadCobro>(() => (yaAceptada ? modalidadDe(presupuesto) : "al_realizar"));
  const total = presupuesto.items.filter((i) => marcados.has(i.id)).reduce((s, i) => s + i.price, 0);

  const alternar = (id: string) =>
    setMarcados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-accent/30 bg-accent/5 p-3 text-sm print:hidden">
      <p className="text-xs font-semibold text-ink/70">
        {yaAceptada ? "Lo que autorizó el paciente" : "¿Qué autorizó el paciente?"}
      </p>
      <div className="space-y-1">
        {presupuesto.items.map((item) => (
          <label key={item.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-1.5 py-1 hover:bg-surface">
            <span className="flex items-center gap-2 text-ink/80">
              <input
                type="checkbox"
                checked={marcados.has(item.id)}
                onChange={() => alternar(item.id)}
                className="accent-[color:var(--accent)]"
              />
              {item.procedure}
              {item.teeth.length > 0 && <span className="text-xs text-accent/80">OD {[...item.teeth].sort((a, b) => a - b).join(", ")}</span>}
            </span>
            <span className="text-xs text-ink/50">{formatCurrency(item.price)}</span>
          </label>
        ))}
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">¿Cuándo se cobra?</label>
        <select
          value={modalidad}
          onChange={(e) => setModalidad(e.target.value as ModalidadCobro)}
          className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
        >
          {modalidadCobroOptions.map((m) => (
            <option key={m} value={m}>
              {modalidadCobroLabel[m]}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-ink/50">
        Autorizado: <span className="font-semibold text-ink/70">{formatCurrency(total)}</span>. Aceptar no genera una deuda por sí solo:{" "}
        {modalidad === "al_realizar"
          ? "cada procedimiento se cobra cuando lo marques como terminado (o puedes recibir un anticipo antes)."
          : "todo lo autorizado queda por cobrar desde ahora."}
        {esAlternativa && !yaAceptada && " Las demás opciones de la comparativa quedarán como «no elegida»."}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => marcados.size > 0 && onConfirmar([...marcados], modalidad)}
          disabled={marcados.size === 0}
          className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2 text-xs font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {yaAceptada ? "Guardar lo autorizado" : "Registrar aceptación"}
        </button>
        <button
          onClick={onCancelar}
          className="rounded-lg border border-edge/15 px-4 py-2 text-xs font-semibold text-ink/60 hover:bg-surface"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
