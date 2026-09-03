"use client";

/** Nota rápida para una cita que no se atendió (Cancelada, Reagendada, No
 * Asistió) — alternativa al formulario guiado de 6 secciones de
 * `RegistrarAtencionHoy.tsx`, que no aplica cuando nunca hubo atención
 * clínica que documentar. Ver `RegistrarAtencionHoy.tsx` para cuándo se
 * muestra este componente en vez del formulario completo. */

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import type { CitaAgenda } from "@/lib/patientData";
import {
  motivoNotaAdministrativaLabel,
  motivosNotaAdministrativa,
  notaAdministrativaInicial,
  type MotivoNotaAdministrativa,
} from "@/lib/notasEvolucion";
import { botonPrimario, Chip, inputClass, labelClass } from "./NotaUI";

function motivoSugeridoPorEstatus(estatus: CitaAgenda["estatus"]): MotivoNotaAdministrativa | null {
  switch (estatus) {
    case "No Asistió":
      return "no_asistio";
    case "Cancelada":
      return "cancela_paciente";
    case "Reagendada":
      return "reagenda_paciente";
    default:
      return null;
  }
}

export default function NotaAdministrativaRapida({
  patientId,
  citaId,
  cita,
  onGuardado,
  onQuiereNotaCompleta,
}: {
  patientId: string;
  citaId: string;
  cita: CitaAgenda;
  onGuardado: () => void;
  onQuiereNotaCompleta: () => void;
}) {
  const { miUid, patients, crearNotaAdministrativa } = usePatientData();
  const paciente = patients.find((p) => p.id === patientId);
  const [motivo, setMotivo] = useState<MotivoNotaAdministrativa | null>(motivoSugeridoPorEstatus(cita.estatus));
  const [notaLibre, setNotaLibre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const puedeGuardar = motivo !== null && (motivo !== "otro" || notaLibre.trim().length > 0);

  const guardar = async () => {
    if (!motivo || !puedeGuardar) return;
    setGuardando(true);
    setError("");
    try {
      await crearNotaAdministrativa(
        patientId,
        notaAdministrativaInicial({
          patientId,
          pacienteNombreSnapshot: paciente?.name ?? "",
          citaId,
          motivo,
          notaLibre: notaLibre.trim() || undefined,
          registradoPorUid: miUid,
        })
      );
      onGuardado();
    } catch (err) {
      console.error("No se pudo guardar la nota administrativa", err);
      setError("No se pudo guardar la nota. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-5">
      <h3 className="text-sm font-semibold text-ink">Esta cita no se atendió</h3>
      <p className="mt-1 text-xs text-ink/50">
        Estatus actual: {cita.estatus}. En vez del formulario clínico completo, registra un motivo breve.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {motivosNotaAdministrativa.map((m) => (
          <Chip key={m} seleccionado={motivo === m} onClick={() => setMotivo(m)}>
            {motivoNotaAdministrativaLabel[m]}
          </Chip>
        ))}
      </div>

      <div className="mt-4">
        <label className={labelClass}>
          {motivo === "otro" ? "Describe brevemente el motivo" : "Nota adicional (opcional)"}
        </label>
        <textarea
          value={notaLibre}
          onChange={(e) => setNotaLibre(e.target.value)}
          rows={2}
          className={inputClass}
          placeholder={motivo === "otro" ? "Ej. Paciente se comunicó por WhatsApp para avisar…" : ""}
        />
      </div>

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button onClick={guardar} disabled={!puedeGuardar || guardando} className={botonPrimario}>
          {guardando ? "Guardando…" : "Guardar nota"}
        </button>
        <button
          type="button"
          onClick={onQuiereNotaCompleta}
          className="text-xs font-medium text-ink/40 hover:text-accent"
        >
          Necesito registrar una nota clínica completa en su lugar →
        </button>
      </div>
    </div>
  );
}
