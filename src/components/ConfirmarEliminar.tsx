"use client";

/** Diálogo de confirmación genérico para cualquier botón "Eliminar" que
 * antes borraba de inmediato sin avisar — úsalo en vez de borrar
 * directamente en el onClick. Guarda el registro a eliminar en un state
 * (ej. `algoAEliminar`), muestra este diálogo cuando no es null, y borra
 * de verdad solo en `onConfirm`. */
import { usePatientData } from "@/context/PatientDataContext";
import { MENSAJE_ROL_SIN_PERMISO_ELIMINAR } from "@/lib/permisosRol";

export default function ConfirmarEliminar({
  titulo,
  mensaje,
  confirmLabel = "Eliminar",
  onCancel,
  onConfirm,
}: {
  titulo: string;
  mensaje: React.ReactNode;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { puedeEliminar } = usePatientData();

  // El Cirujano dentista no elimina: en vez de pedir confirmación para algo que no puede hacer, se le explica.
  if (!puedeEliminar) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
          <h3 className="text-base font-semibold text-ink">No puedes eliminar esto</h3>
          <p className="mt-2 text-sm text-ink/70">{MENSAJE_ROL_SIN_PERMISO_ELIMINAR}</p>
          <button
            onClick={onCancel}
            className="mt-6 w-full rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
        <h3 className="text-base font-semibold text-ink">{titulo}</h3>
        <p className="mt-2 text-sm text-ink/70">{mensaje}</p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-danger py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
