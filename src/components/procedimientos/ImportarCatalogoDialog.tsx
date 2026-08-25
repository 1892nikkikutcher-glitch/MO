"use client";

import { useMemo, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { catalogoRecomendado, serviciosComplementarios } from "@/lib/catalogoRecomendado";
import {
  clasificarPlantillas,
  crearProcedimientoDesdeTemplate,
  idDesdeCodigo,
  type Candidato,
} from "@/lib/importarCatalogoRecomendado";
import type { Procedimiento } from "@/lib/procedimientos";

const clasificacionBadge: Record<Candidato["clasificacion"], { texto: string; clase: string }> = {
  nuevo: { texto: "Nuevo", clase: "bg-success/10 text-success" },
  ya_existe: { texto: "Ya existe", clase: "bg-ink/10 text-ink/50" },
  posible_duplicado: { texto: "Posible duplicado", clase: "bg-warning/10 text-warning" },
};

function ListaCandidatos({
  candidatos,
  seleccion,
  onToggle,
}: {
  candidatos: Candidato[];
  seleccion: Set<string>;
  onToggle: (codigo: string) => void;
}) {
  return (
    <div className="space-y-2">
      {candidatos.map((c) => {
        const badge = clasificacionBadge[c.clasificacion];
        const bloqueado = c.clasificacion === "ya_existe";
        return (
          <label
            key={c.plantilla.codigo}
            className={`flex items-start gap-3 rounded-lg border border-edge/10 p-3 text-sm ${
              bloqueado ? "opacity-50" : "cursor-pointer hover:bg-surface"
            }`}
          >
            <input
              type="checkbox"
              className="mt-0.5 accent-[color:var(--accent)]"
              checked={seleccion.has(c.plantilla.codigo)}
              disabled={bloqueado}
              onChange={() => onToggle(c.plantilla.codigo)}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">{c.plantilla.nombre}</span>
                <span className="rounded bg-ink/5 px-1.5 py-0.5 text-[10px] font-semibold text-ink/40">
                  {c.plantilla.codigo}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.clase}`}>
                  {badge.texto}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-ink/50">{c.plantilla.descripcionCorta}</p>
              {c.clasificacion === "posible_duplicado" && c.coincidenciaNombre && (
                <p className="mt-1 text-xs text-warning">
                  Se parece a &quot;{c.coincidenciaNombre}&quot;, que ya tienes en tu catálogo — revisa antes de
                  importar para no duplicarlo.
                </p>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}

export default function ImportarCatalogoDialog({ onClose }: { onClose: () => void }) {
  const { procedimientos, importarCatalogoProcedimientos } = usePatientData();
  const [pestana, setPestana] = useState<"principal" | "complementario">("principal");
  const [paso, setPaso] = useState<"revisar" | "confirmar" | "importando" | "resultado">("revisar");
  const [resultado, setResultado] = useState<{ agregados: number; omitidos: number; posiblesDuplicados: number } | null>(
    null
  );

  const candidatosPrincipales = useMemo(
    () => clasificarPlantillas(catalogoRecomendado, procedimientos),
    [procedimientos]
  );
  const candidatosComplementarios = useMemo(
    () => clasificarPlantillas(serviciosComplementarios, procedimientos),
    [procedimientos]
  );
  const candidatosActivos = pestana === "principal" ? candidatosPrincipales : candidatosComplementarios;

  // Preseleccionados solo los "nuevo" de los 20 principales — los posibles
  // duplicados y los servicios complementarios arrancan sin marcar, el
  // admin decide si los quiere incluir.
  const [seleccion, setSeleccion] = useState<Set<string>>(
    () =>
      new Set(
        candidatosPrincipales.filter((c) => c.clasificacion === "nuevo").map((c) => c.plantilla.codigo)
      )
  );

  const toggle = (codigo: string) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(codigo)) next.delete(codigo);
      else next.add(codigo);
      return next;
    });
  };

  const todosLosCandidatos = [...candidatosPrincipales, ...candidatosComplementarios];
  const aImportar = todosLosCandidatos.filter(
    (c) => c.clasificacion !== "ya_existe" && seleccion.has(c.plantilla.codigo)
  );

  const confirmarImportacion = async () => {
    setPaso("importando");
    const ahora = new Date().toISOString();
    const nuevos: Procedimiento[] = aImportar.map((c) => {
      const id = idDesdeCodigo(c.plantilla.codigo);
      return { id, ...crearProcedimientoDesdeTemplate(c.plantilla, ahora) };
    });
    await importarCatalogoProcedimientos(nuevos);
    setResultado({
      agregados: nuevos.length,
      omitidos: todosLosCandidatos.filter((c) => c.clasificacion === "ya_existe").length,
      posiblesDuplicados: todosLosCandidatos.filter((c) => c.clasificacion === "posible_duplicado").length,
    });
    setPaso("resultado");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Cargar catálogo recomendado</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>

        {paso === "resultado" && resultado ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
              Se agregaron <strong>{resultado.agregados}</strong> tratamiento(s) a tu catálogo, sin precio — configúralos
              cuando quieras desde la lista.
            </div>
            <p className="text-xs text-ink/50">
              {resultado.omitidos} ya estaban en tu catálogo (se omitieron) · {resultado.posiblesDuplicados} se
              marcaron como posible duplicado de algo que ya tenías.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent hover:bg-accent/25"
            >
              Cerrar
            </button>
          </div>
        ) : paso === "confirmar" ? (
          <div className="space-y-4">
            <p className="text-sm text-ink/70">
              Vas a agregar <strong className="text-ink">{aImportar.length}</strong> tratamiento(s) a tu catálogo,
              todos sin precio. No se va a duplicar ni modificar nada de lo que ya tienes.
            </p>
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border border-edge/10 p-2 text-sm">
              {aImportar.map((c) => (
                <div key={c.plantilla.codigo} className="text-ink/80">
                  {c.plantilla.nombre}
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPaso("revisar")}
                className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 hover:bg-surface"
              >
                Volver
              </button>
              <button
                onClick={confirmarImportacion}
                className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent hover:bg-accent/25"
              >
                Sí, importar
              </button>
            </div>
          </div>
        ) : paso === "importando" ? (
          <p className="py-8 text-center text-sm text-ink/50">Importando…</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            <p className="text-xs text-ink/50">
              Agrega los tratamientos más utilizados en los consultorios dentales de México. Puedes modificar
              nombres, precios, duraciones y variantes de acuerdo con tu forma de trabajar.
            </p>

            <div className="flex rounded-lg border border-edge/10 p-0.5">
              <button
                onClick={() => setPestana("principal")}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  pestana === "principal" ? "bg-accent/15 text-accent" : "text-ink/50"
                }`}
              >
                Catálogo recomendado (20)
              </button>
              <button
                onClick={() => setPestana("complementario")}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  pestana === "complementario" ? "bg-accent/15 text-accent" : "text-ink/50"
                }`}
              >
                Servicios complementarios (10)
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              <ListaCandidatos candidatos={candidatosActivos} seleccion={seleccion} onToggle={toggle} />
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-edge/10 pt-4">
              <span className="text-xs text-ink/40">{aImportar.length} seleccionado(s) en total</span>
              <button
                onClick={() => setPaso("confirmar")}
                disabled={aImportar.length === 0}
                className="rounded-lg border border-accent/60 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continuar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
