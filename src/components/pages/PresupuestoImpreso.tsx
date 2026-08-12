"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency, type LineItem } from "@/lib/patientData";

export default function PresupuestoImpreso({
  folio,
  fechaLarga,
  medico,
  pacienteNombre,
  pacienteCorreo,
  pacienteTelefono,
  diagnostico,
  items,
  total,
}: {
  folio: string;
  fechaLarga: string;
  medico: string;
  pacienteNombre: string;
  pacienteCorreo: string;
  pacienteTelefono: string;
  diagnostico: string;
  items: LineItem[];
  total: number;
}) {
  const { perfilDoctor } = usePatientData();

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
          <p className="text-xl font-bold">PLAN DE TRATAMIENTO</p>
        </div>
        <div className="w-16 shrink-0 text-right">
          {perfilDoctor.logoClinicaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={perfilDoctor.logoClinicaUrl} alt="" className="ml-auto h-16 w-16 object-contain" />
          ) : (
            <p className="text-xs">Folio: {folio}</p>
          )}
        </div>
      </div>
      {perfilDoctor.logoClinicaUrl && <p className="text-right text-xs">Folio: {folio}</p>}

      {perfilDoctor.direccionClinica && <p className="mt-2 text-xs">{perfilDoctor.direccionClinica}</p>}

      <div className="mt-4 flex justify-between text-sm">
        <div>
          <p>Paciente: {pacienteNombre}</p>
          {pacienteCorreo && <p>Correo electrónico: {pacienteCorreo}</p>}
          {pacienteTelefono && <p>Teléfono: {pacienteTelefono}</p>}
        </div>
        <div className="text-right">
          <p>{medico || perfilDoctor.nombre}</p>
          <p>{fechaLarga}</p>
        </div>
      </div>

      {diagnostico && (
        <p className="mt-3 text-sm">
          <span className="font-semibold">Diagnóstico y tratamiento:</span> {diagnostico}
        </p>
      )}

      <table className="mt-4 w-full text-left text-xs">
        <thead>
          <tr className="border-b-2 border-black">
            <th className="py-1.5 font-semibold">Tratamiento / Pieza dental</th>
            <th className="py-1.5 text-right font-semibold">P. Unitario</th>
            <th className="py-1.5 text-right font-semibold">Cant</th>
            <th className="py-1.5 text-right font-semibold">Subtotal</th>
            <th className="py-1.5 text-right font-semibold">Desc</th>
            <th className="py-1.5 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-black/20 align-top">
              <td className="py-1.5">
                {item.procedure}
                {item.teeth.length > 0 && (
                  <div className="text-[10px] text-black/60">
                    Piezas: {[...item.teeth].sort((a, b) => a - b).join(", ")}
                  </div>
                )}
              </td>
              <td className="py-1.5 text-right">{formatCurrency(item.precioUnitario ?? item.price)}</td>
              <td className="py-1.5 text-right">{item.cantidad ?? 1}</td>
              <td className="py-1.5 text-right">
                {formatCurrency((item.precioUnitario ?? item.price) * (item.cantidad ?? 1))}
              </td>
              <td className="py-1.5 text-right">{item.descuentoPct ? `${item.descuentoPct}%` : "—"}</td>
              <td className="py-1.5 text-right">{formatCurrency(item.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end border-t-2 border-black pt-2">
        <p className="text-base font-bold">TOTAL PRESUPUESTO&nbsp;&nbsp;{formatCurrency(total)}</p>
      </div>

      {perfilDoctor.direccionClinica && (
        <p className="mt-10 text-center text-[10px]">{perfilDoctor.direccionClinica}</p>
      )}
    </div>
  );
}
