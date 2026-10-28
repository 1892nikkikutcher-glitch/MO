"use client";

import { useMemo, useState } from "react";
import EstrellasPaciente from "@/components/EstrellasPaciente";
import { usePatientData } from "@/context/PatientDataContext";
import { mensajeProponerCita, pacientesPorProponerCita } from "@/lib/pacientesPorProponer";

const TRATAMIENTO_PREVENCION = "Revisión y limpieza (prevención)";
const VISIBLES_AL_INICIO = 5;

function textoTiempo(meses: number, vencida: boolean): string {
  if (meses <= 0) return vencida ? "Su prevención ya toca" : "Su prevención toca pronto";
  return `Última visita hace ${meses} ${meses === 1 ? "mes" : "meses"}`;
}

/** Tarjeta del Inicio: a quién ya le toca volver (prevención de los 6 meses) y todavía no tiene próxima
 * cita, con las fechas que le acomodan según su horario preferente. Un toque abre la cita ya llenada o el
 * WhatsApp ya redactado. */
export default function PacientesPorProponerCita() {
  const { patients, citas, clinicInfo, sugerirNuevaCita } = usePatientData();
  const [verTodos, setVerTodos] = useState(false);
  const lista = useMemo(() => pacientesPorProponerCita(patients, citas), [patients, citas]);
  if (lista.length === 0) return null;
  const visibles = verTodos ? lista : lista.slice(0, VISIBLES_AL_INICIO);

  const whatsapp = (nombre: string, telefono: string | undefined, propuesta?: { fecha: string; hora: string; etiqueta: string }) => {
    const texto = mensajeProponerCita({ nombrePaciente: nombre, clinica: clinicInfo?.nombre, propuesta });
    const numero = telefono?.replace(/\D/g, "");
    window.open(`https://wa.me${numero ? `/${numero}` : "/"}?text=${encodeURIComponent(texto)}`, "_blank");
  };

  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Pacientes por proponer cita</h3>
        <p className="text-xs text-ink/40">Les toca su prevención y no tienen próxima cita</p>
      </div>

      <div className="divide-y divide-edge/10">
        {visibles.map((item) => {
          const citasDelPaciente = citas.filter((c) => c.patientId === item.paciente.id);
          return (
            <div key={item.paciente.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <div className="flex min-w-0 items-center gap-2">
                  <EstrellasPaciente citas={citasDelPaciente} manual={item.paciente.calificacionManual} />
                  <span className="truncate font-medium text-ink">{item.paciente.name}</span>
                </div>
                <span className={`text-xs ${item.vencida ? "text-warning" : "text-ink/50"}`}>
                  {textoTiempo(item.mesesDesdeUltima, item.vencida)}
                </span>
              </div>

              {item.horario ? (
                <p className="text-xs text-ink/60">
                  <span className="font-semibold uppercase tracking-wide text-ink/40">Prefiere: </span>
                  {item.horario}
                </p>
              ) : (
                <p className="text-xs text-ink/40">Sin horario preferente capturado.</p>
              )}

              <div className="flex flex-wrap items-center gap-1.5">
                {item.propuestas.map((pr) => (
                  <button
                    key={pr.fecha}
                    type="button"
                    onClick={() => sugerirNuevaCita(item.paciente.id, TRATAMIENTO_PREVENCION, { fecha: pr.fecha, horaInicio: pr.hora })}
                    title="Abre la cita ya llenada con esta fecha y hora"
                    className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
                  >
                    {pr.etiqueta}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => sugerirNuevaCita(item.paciente.id, TRATAMIENTO_PREVENCION)}
                  className="rounded-full border border-edge/15 px-2.5 py-1 text-xs font-semibold text-ink/70 transition-colors hover:bg-field"
                >
                  {item.propuestas.length > 0 ? "Otra fecha…" : "Agendar"}
                </button>
                <button
                  type="button"
                  onClick={() => whatsapp(item.paciente.name, item.paciente.phone, item.propuestas[0])}
                  title={item.propuestas[0] ? "WhatsApp con la primera fecha propuesta" : "WhatsApp para preguntarle cuándo le acomoda"}
                  className="ml-auto rounded-full border border-success/40 px-2.5 py-1 text-xs font-semibold text-success transition-colors hover:bg-success/10"
                >
                  WhatsApp
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {lista.length > VISIBLES_AL_INICIO && (
        <button type="button" onClick={() => setVerTodos((v) => !v)} className="mt-3 text-xs font-semibold text-accent hover:underline">
          {verTodos ? "Ver menos" : `Ver ${lista.length - VISIBLES_AL_INICIO} más`}
        </button>
      )}
    </div>
  );
}
