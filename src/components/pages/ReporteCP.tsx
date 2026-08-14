"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { formatNombreConEdad } from "@/lib/patientData";

export default function ReporteCP() {
  const { patients, irAExpediente } = usePatientData();

  const conCP = patients.filter((p) => p.codigoPostal?.trim());
  const sinCP = patients.length - conCP.length;

  const porCP = new Map<string, typeof patients>();
  conCP.forEach((p) => {
    const cp = p.codigoPostal!.trim();
    porCP.set(cp, [...(porCP.get(cp) ?? []), p]);
  });
  const ordenado = Array.from(porCP.entries()).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Pacientes por Código Postal
        </h3>
        <p className="mt-1 text-xs text-ink/40">
          {conCP.length} de {patients.length} pacientes tienen código postal registrado
          {sinCP > 0 && ` (${sinCP} sin registrar — captúralo en Datos del Paciente)`}.
        </p>
      </div>

      {ordenado.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          Aún no hay pacientes con código postal registrado.
        </div>
      ) : (
        <div className="space-y-3">
          {ordenado.map(([cp, lista]) => (
            <details key={cp} className="rounded-2xl border border-edge/10 bg-surface p-4 open:pb-2">
              <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-ink">
                <span>C.P. {cp}</span>
                <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                  {lista.length} {lista.length === 1 ? "paciente" : "pacientes"}
                </span>
              </summary>
              <div className="mt-3 space-y-1">
                {lista.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => irAExpediente(p.id)}
                    className="block w-full rounded-lg px-3 py-1.5 text-left text-sm text-ink/70 transition-colors hover:bg-inset hover:text-accent"
                  >
                    {formatNombreConEdad(p.name, p.birthDate)}
                  </button>
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
