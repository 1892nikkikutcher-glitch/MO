"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { resumenPorMedico } from "@/lib/reportes";

export default function MedicosPacientes() {
  const { citas, recursos } = usePatientData();
  const resumen = resumenPorMedico(citas, recursos);

  if (resumen.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
        Aún no tienes médicos registrados en Agenda → Recursos.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-ink/40">Resumen de citas y pacientes atendidos por cada médico.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resumen.map(({ recurso, totalCitas, atendidas, canceladas, pacientesUnicos }) => (
          <div key={recurso.id} className="rounded-2xl border border-edge/10 bg-surface p-5">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: recurso.color }} />
              <p className="text-sm font-semibold text-ink">{recurso.nombre}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <p className="text-lg font-bold text-ink">{pacientesUnicos}</p>
                <p className="text-[11px] uppercase tracking-wide text-ink/40">Pacientes únicos</p>
              </div>
              <div>
                <p className="text-lg font-bold text-ink">{totalCitas}</p>
                <p className="text-[11px] uppercase tracking-wide text-ink/40">Citas totales</p>
              </div>
              <div>
                <p className="text-lg font-bold text-success">{atendidas}</p>
                <p className="text-[11px] uppercase tracking-wide text-ink/40">Atendidas</p>
              </div>
              <div>
                <p className="text-lg font-bold text-danger">{canceladas}</p>
                <p className="text-[11px] uppercase tracking-wide text-ink/40">Canceladas</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
