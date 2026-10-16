"use client";

import { useState } from "react";
import { inputClass } from "@/lib/agendaHelpers";
import type { Sede } from "@/lib/sedesBloques";

/** Alta, edición y baja de las sedes (consultorios físicos) de la clínica. Una sede que algún médico usa
 * en sus bloques no se puede quitar hasta cambiar esos bloques. */
export default function SedesDialog({
  sedes,
  sedesEnUso,
  onSave,
  onClose,
}: {
  sedes: Sede[];
  /** Ids de sede que algún bloque de algún médico todavía usa. */
  sedesEnUso: Set<string>;
  onSave: (lista: Sede[]) => void;
  onClose: () => void;
}) {
  const [lista, setLista] = useState<Sede[]>(() => sedes.map((s) => ({ ...s })));

  const cambiar = (id: string, campo: "nombre" | "direccion", valor: string) =>
    setLista((prev) => prev.map((s) => (s.id === id ? { ...s, [campo]: valor } : s)));

  const agregar = () => setLista((prev) => [...prev, { id: `sede${Date.now()}`, nombre: "", direccion: "" }]);

  const nombresRepetidos = new Set(
    lista.map((s) => s.nombre.trim().toLowerCase()).filter((n, i, todos) => n && todos.indexOf(n) !== i)
  );
  const hayVacias = lista.some((s) => s.nombre.trim() === "");
  const puedeGuardar = !hayVacias && nombresRepetidos.size === 0;

  const guardar = () => {
    if (!puedeGuardar) return;
    // Nunca `direccion: undefined`: Firestore no acepta ese valor; si está vacía se omite la llave.
    onSave(
      lista.map((s) => {
        const direccion = (s.direccion ?? "").trim();
        return direccion ? { id: s.id, nombre: s.nombre.trim(), direccion } : { id: s.id, nombre: s.nombre.trim() };
      })
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Sedes</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-6 w-6 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-ink/40">
          Los consultorios donde atiendes (por ejemplo, Juan Corrales y EMSA). Después, en cada médico, defines en qué días y horas
          atiende en cada sede.
        </p>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {lista.length === 0 && <p className="rounded-lg border border-edge/10 p-3 text-xs text-ink/50">Todavía no hay sedes.</p>}
          {lista.map((s) => {
            const enUso = sedesEnUso.has(s.id);
            const repetida = s.nombre.trim() !== "" && nombresRepetidos.has(s.nombre.trim().toLowerCase());
            return (
              <div key={s.id} className="space-y-2 rounded-lg border border-edge/10 p-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={s.nombre}
                    onChange={(e) => cambiar(s.id, "nombre", e.target.value)}
                    placeholder="Nombre. Ej. Juan Corrales"
                    className={inputClass}
                  />
                  <button
                    onClick={() => setLista((prev) => prev.filter((x) => x.id !== s.id))}
                    disabled={enUso}
                    title={enUso ? "Algún médico tiene bloques en esta sede; cámbialos primero." : "Quitar sede"}
                    className="shrink-0 px-1 text-ink/40 transition-colors hover:text-danger disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-ink/40"
                  >
                    ✕
                  </button>
                </div>
                <input
                  type="text"
                  value={s.direccion ?? ""}
                  onChange={(e) => cambiar(s.id, "direccion", e.target.value)}
                  placeholder="Dirección o referencia (se manda en el recordatorio)"
                  className={inputClass}
                />
                {repetida && <p className="text-[11px] text-danger">Ya hay otra sede con este nombre.</p>}
                {enUso && <p className="text-[11px] text-ink/40">En uso por los bloques de algún médico.</p>}
              </div>
            );
          })}
        </div>

        <button
          onClick={agregar}
          className="mt-3 rounded-lg border border-dashed border-accent/40 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
        >
          + Agregar sede
        </button>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-edge/15 py-2 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={!puedeGuardar}
            className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
