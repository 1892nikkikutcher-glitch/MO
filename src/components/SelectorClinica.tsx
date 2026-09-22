"use client";

import type { MembresiaConClinica } from "@/lib/patientData";

/** Selector de clínica activa — se muestra en dos contextos distintos con
 * el mismo componente: (1) forzado al iniciar sesión, cuando el uid
 * pertenece a varias clínicas y ninguna quedó recordada todavía (sin
 * `onCancelar`, con `onCerrarSesion` como única salida); (2) opcional en
 * cualquier momento vía "Cambiar de clínica" en el header (con
 * `onCancelar`, sin necesidad de `onCerrarSesion`). */
export default function SelectorClinica({
  clinicas,
  onSeleccionar,
  onCancelar,
  onCerrarSesion,
}: {
  clinicas: MembresiaConClinica[];
  onSeleccionar: (clinicId: string) => void;
  onCancelar?: () => void;
  onCerrarSesion?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
        <h3 className="text-base font-semibold text-ink">Selecciona una clínica</h3>
        <p className="mt-1 text-sm text-ink/60">
          Perteneces a más de una clínica. Elige con cuál quieres trabajar ahora.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {clinicas.map((c) => (
            <button
              key={c.clinicId}
              onClick={() => onSeleccionar(c.clinicId)}
              className="w-full rounded-lg border border-edge/15 px-3.5 py-2.5 text-left transition-colors hover:border-accent/60 hover:bg-accent/10"
            >
              <div className="text-sm font-semibold text-ink">{c.nombreClinica}</div>
              <div className="mt-0.5 text-xs text-ink/50">
                {c.role === "admin" ? "Administrador" : "Colaborador"}
                {c.nombre ? ` · ${c.nombre}` : ""}
              </div>
            </button>
          ))}
        </div>

        {(onCancelar || onCerrarSesion) && (
          <div className="mt-5 flex gap-3 border-t border-edge/10 pt-4">
            {onCancelar && (
              <button
                onClick={onCancelar}
                className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
              >
                Cancelar
              </button>
            )}
            {onCerrarSesion && (
              <button
                onClick={onCerrarSesion}
                className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
              >
                Cerrar sesión
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
