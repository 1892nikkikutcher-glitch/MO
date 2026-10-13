"use client";

import { useMemo, useState } from "react";
import { buscarPacientes } from "@/lib/buscarPacientes";

export const MAX_PACIENTES_POR_ENVIO = 15;
const MAX_VISIBLES = 40;

/** Elegir uno o varios pacientes: buscador (sin acentos, y con los nombres que
 * la importación dejó con "?") y lista con casillas. Los elegidos quedan como
 * etiquetas arriba, así se ven aunque cambies la búsqueda. */
export default function SelectorPacientes({
  pacientes,
  seleccionados,
  onChange,
}: {
  pacientes: { id: string; name: string }[];
  seleccionados: string[];
  onChange: (ids: string[]) => void;
}) {
  const [busqueda, setBusqueda] = useState("");
  const resultados = useMemo(() => buscarPacientes(pacientes, busqueda), [pacientes, busqueda]);
  const visibles = resultados.slice(0, MAX_VISIBLES);
  const nombrePorId = useMemo(() => new Map(pacientes.map((p) => [p.id, p.name])), [pacientes]);
  const llegoAlMaximo = seleccionados.length >= MAX_PACIENTES_POR_ENVIO;

  const alternar = (id: string) =>
    onChange(
      seleccionados.includes(id)
        ? seleccionados.filter((x) => x !== id)
        : llegoAlMaximo
          ? seleccionados
          : [...seleccionados, id]
    );

  return (
    <div className="space-y-2">
      <input
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar paciente por nombre o apellido…"
        className="w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60"
      />

      {seleccionados.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {seleccionados.map((id) => (
            <span key={id} className="flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 py-0.5 pl-2.5 pr-1 text-xs text-ink">
              <span className="max-w-[180px] truncate">{nombrePorId.get(id) ?? id}</span>
              <button
                type="button"
                onClick={() => alternar(id)}
                aria-label={`Quitar a ${nombrePorId.get(id) ?? "paciente"}`}
                className="flex h-4 w-4 items-center justify-center rounded-full text-ink/50 hover:bg-edge/15 hover:text-ink"
              >
                ✕
              </button>
            </span>
          ))}
          <button type="button" onClick={() => onChange([])} className="ml-1 text-xs text-ink/50 hover:text-ink hover:underline">
            Quitar todos
          </button>
        </div>
      )}

      <div className="max-h-52 overflow-y-auto rounded-lg border border-edge/10">
        {visibles.length === 0 ? (
          <p className="px-3 py-3 text-sm text-ink/50">Ningún paciente coincide con «{busqueda.trim()}».</p>
        ) : (
          visibles.map((p) => {
            const activo = seleccionados.includes(p.id);
            const bloqueado = !activo && llegoAlMaximo;
            return (
              <label
                key={p.id}
                className={`flex cursor-pointer items-center gap-2.5 border-b border-edge/5 px-3 py-2 text-sm last:border-0 ${
                  activo ? "bg-accent/10 text-ink" : "text-ink/80 hover:bg-edge/5"
                } ${bloqueado ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <input type="checkbox" checked={activo} disabled={bloqueado} onChange={() => alternar(p.id)} />
                <span className="truncate">{p.name}</span>
              </label>
            );
          })
        )}
        {resultados.length > MAX_VISIBLES && (
          <p className="border-t border-edge/10 px-3 py-2 text-xs text-ink/50">
            Mostrando {MAX_VISIBLES} de {resultados.length}: escribe más del nombre para acotar.
          </p>
        )}
      </div>

      <p className="text-xs text-ink/50">
        {seleccionados.length === 0
          ? "Puedes elegir varios pacientes y enviarlos de una vez."
          : `${seleccionados.length} ${seleccionados.length === 1 ? "paciente elegido" : "pacientes elegidos"}${
              llegoAlMaximo ? ` (máximo ${MAX_PACIENTES_POR_ENVIO} por envío)` : ""
            }.`}
      </p>
    </div>
  );
}
