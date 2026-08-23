"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency, type SavedBudget } from "@/lib/patientData";

/** Versión imprimible de TODO el historial de presupuestos de un paciente —
 * a diferencia de PresupuestoImpreso (un folio a la vez), esta junta todos
 * los tratamientos que se le han presupuestado con un total general, para
 * tener de un vistazo todo lo que se le ha planeado/realizado con el tiempo. */
export default function PresupuestoTotalImpreso({
  presupuestos,
  fechaLarga,
  pacienteNombre,
  pacienteCorreo,
  pacienteTelefono,
}: {
  presupuestos: SavedBudget[];
  fechaLarga: string;
  pacienteNombre: string;
  pacienteCorreo: string;
  pacienteTelefono: string;
}) {
  const { perfilDoctor } = usePatientData();
  const granTotal = presupuestos.reduce((sum, p) => sum + p.total, 0);

  return (
    <div className="hidden border-4 border-black bg-white p-8 text-black print:block">
      <div className="flex items-start justify-between">
        <div className="w-16 shrink-0">
          {perfilDoctor.logoEscuelaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={perfilDoctor.logoEscuelaUrl} alt="" className="h-16 w-16 object-contain" />
          )}
        </div>
        <div className="flex-1 text-center">
          <p className="text-xl font-bold">PLAN DE TRATAMIENTO COMPLETO</p>
        </div>
        <div className="w-16 shrink-0 text-right">
          {perfilDoctor.logoClinicaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={perfilDoctor.logoClinicaUrl} alt="" className="ml-auto h-16 w-16 object-contain" />
          )}
        </div>
      </div>

      {perfilDoctor.direccionClinica && <p className="mt-2 text-xs">{perfilDoctor.direccionClinica}</p>}

      <div className="mt-4 flex justify-between text-sm">
        <div>
          <p>Paciente: {pacienteNombre}</p>
          <p>Correo electrónico: {pacienteCorreo || "Sin registro"}</p>
          <p>Teléfono: {pacienteTelefono || "Sin registro"}</p>
        </div>
        <div className="text-right">
          <p>{fechaLarga}</p>
        </div>
      </div>

      {presupuestos.map((p) => (
        <div key={p.id} className="mt-5" style={{ breakInside: "avoid" }}>
          <div className="flex items-baseline justify-between border-b-2 border-black pb-1">
            <p className="text-sm font-bold">
              Folio #{p.folio} — {p.fecha}
            </p>
            {p.diagnostico && <p className="max-w-[60%] text-right text-[10px]">{p.diagnostico}</p>}
          </div>
          <table className="mt-1.5 w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/40">
                <th className="py-1 font-semibold">Tratamiento / Pieza dental</th>
                <th className="py-1 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {p.items.map((item) => (
                <tr key={item.id} className="border-b border-black/10">
                  <td className="py-1">
                    {item.procedure}
                    {item.teeth.length > 0 && (
                      <span className="text-[10px] text-black/60">
                        {" "}
                        — Piezas: {[...item.teeth].sort((a, b) => a - b).join(", ")}
                      </span>
                    )}
                    {item.note && <span className="text-[10px] text-black/60"> ({item.note})</span>}
                  </td>
                  <td className="py-1 text-right">{formatCurrency(item.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-1 flex justify-end">
            <p className="text-xs font-semibold">
              Subtotal folio #{p.folio}: {formatCurrency(p.total)}
            </p>
          </div>
        </div>
      ))}

      <div className="mt-6 flex justify-end border-t-2 border-black pt-2">
        <p className="text-base font-bold">TOTAL GENERAL&nbsp;&nbsp;{formatCurrency(granTotal)}</p>
      </div>

      {perfilDoctor.direccionClinica && (
        <p className="mt-10 text-center text-[10px]">{perfilDoctor.direccionClinica}</p>
      )}
    </div>
  );
}
