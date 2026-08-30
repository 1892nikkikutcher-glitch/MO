"use client";

/** Versión imprimible de una Comparativa de Rehabilitación — mismo patrón
 * que PresupuestoImpreso.tsx: oculta en pantalla, visible solo al imprimir
 * (`hidden ... print:block`), siempre fondo blanco/texto negro sin importar
 * el tema activo de la app. Reutiliza RadarComparativa en modoImpresion. */

import RadarComparativa, { type OpcionRadar } from "@/components/RadarComparativa";
import { usePatientData } from "@/context/PatientDataContext";
import { EJES_COMPARATIVA } from "./NuevaComparativaRehabilitacion";
import { formatCurrency, type SavedBudget } from "@/lib/patientData";
import { etiquetaTratamiento, type ComparativaRehabilitacion } from "@/lib/comparativaRehabilitacion";

const COLORES = ["#4f8a75", "#bd8a3d", "#7a4b8c", "#3f6fa8"];

export default function ComparativaImpresa({
  comparativa,
  presupuestos,
  pacienteNombre,
  fechaLarga,
}: {
  comparativa: ComparativaRehabilitacion;
  presupuestos: SavedBudget[];
  pacienteNombre: string;
  fechaLarga: string;
}) {
  const { perfilDoctor } = usePatientData();

  const filas = comparativa.opciones
    .map((op, i) => {
      const presupuesto = presupuestos.find((p) => p.id === op.presupuestoId);
      if (!presupuesto) return null;
      return { op, presupuesto, color: COLORES[i % COLORES.length] };
    })
    .filter((f): f is { op: ComparativaRehabilitacion["opciones"][number]; presupuesto: SavedBudget; color: string } => Boolean(f));

  const opcionesRadar: OpcionRadar[] = filas.map(({ op, presupuesto, color }) => ({
    id: presupuesto.id,
    color,
    etiqueta: etiquetaTratamiento(presupuesto),
    valores: [3, op.funcion, op.estetica, op.conservacionBiologica],
  }));

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
          <p className="text-xl font-bold">{comparativa.titulo.toUpperCase()}</p>
          <p className="text-xs">Comparativa de Rehabilitación</p>
        </div>
        <div className="w-16 shrink-0 text-right">
          {perfilDoctor.logoClinicaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={perfilDoctor.logoClinicaUrl} alt="" className="ml-auto h-16 w-16 object-contain" />
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-between text-sm">
        <p>Paciente: {pacienteNombre}</p>
        <p>{fechaLarga}</p>
      </div>

      <div className="mt-6 flex justify-center">
        <RadarComparativa ejes={EJES_COMPARATIVA} opciones={opcionesRadar} modoImpresion />
      </div>

      <div className="mt-6 space-y-4">
        {filas.map(({ op, presupuesto, color }) => (
          <div key={presupuesto.id} className="border-t-2 pt-3" style={{ borderColor: color }}>
            <div className="flex items-baseline justify-between">
              <p className="font-bold">{etiquetaTratamiento(presupuesto)}</p>
              <p className="font-bold">{formatCurrency(presupuesto.total)}</p>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-4 text-xs">
              {op.ventajas && (
                <div>
                  <p className="font-semibold">Ventajas</p>
                  <p className="text-black/70">{op.ventajas}</p>
                </div>
              )}
              {op.desventajas && (
                <div>
                  <p className="font-semibold">Desventajas</p>
                  <p className="text-black/70">{op.desventajas}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {perfilDoctor.direccionClinica && (
        <p className="mt-6 text-center text-xs">{perfilDoctor.direccionClinica}</p>
      )}
    </div>
  );
}
