"use client";

import { buscarPlantillaPorCodigo, rolComercialLabel } from "@/lib/catalogoRecomendado";
import type { Procedimiento } from "@/lib/procedimientos";

const unidadFacturacionLabel: Record<string, string> = {
  tratamiento: "Por tratamiento",
  diente: "Por diente",
  cuadrante: "Por cuadrante",
  arcada: "Por arcada",
  cita: "Por cita",
};

/** Sección desplegable educativa por procedimiento — solo aparece si el
 * procedimiento viene del catálogo recomendado (`origenPlantillaId`). El
 * contenido se busca en vivo en la plantilla estática, no se guarda una
 * copia por clínica (ver src/lib/catalogoRecomendado.ts). Esta página ya
 * está protegida para solo-admin (Procedimientos.tsx), así que las
 * etiquetas comerciales aquí dentro nunca las ve un colaborador ni un
 * paciente. */
export default function GuiaConfiguracion({ procedimiento }: { procedimiento: Procedimiento }) {
  const plantilla = buscarPlantillaPorCodigo(procedimiento.origenPlantillaId);
  if (!plantilla) return null;

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-edge/10 bg-inset p-3 text-xs">
      <p className="text-ink/70">{plantilla.descripcionCorta}</p>

      <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
        <div>
          <p className="font-semibold uppercase tracking-wide text-ink/40">Para qué se utiliza</p>
          <p className="mt-0.5 text-ink/70">{plantilla.objetivoClinico}</p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wide text-ink/40">Forma habitual de cobro</p>
          <p className="mt-0.5 text-ink/70">
            {unidadFacturacionLabel[plantilla.unidadFacturacion] ?? plantilla.unidadFacturacion}
          </p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wide text-ink/40">Duración sugerida</p>
          <p className="mt-0.5 text-ink/70">{plantilla.duracionSugeridaTexto}</p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wide text-ink/40">Número probable de citas</p>
          <p className="mt-0.5 text-ink/70">{plantilla.visitasEstimadas}</p>
        </div>
      </div>

      {plantilla.variantes.length > 0 && (
        <div>
          <p className="font-semibold uppercase tracking-wide text-ink/40">Variantes que conviene configurar</p>
          <p className="mt-0.5 text-ink/70">{plantilla.variantes.join(" · ")}</p>
        </div>
      )}

      {plantilla.registrosClinicosRecomendados.length > 0 && (
        <div>
          <p className="font-semibold uppercase tracking-wide text-ink/40">Registros clínicos relacionados</p>
          <p className="mt-0.5 text-ink/70">{plantilla.registrosClinicosRecomendados.join(" · ")}</p>
        </div>
      )}

      {plantilla.tratamientosRelacionados.length > 0 && (
        <div>
          <p className="font-semibold uppercase tracking-wide text-ink/40">
            Tratamientos que suelen antecederlo o continuarlo
          </p>
          <p className="mt-0.5 text-ink/70">
            {plantilla.tratamientosRelacionados
              .map((codigo) => buscarPlantillaPorCodigo(codigo)?.nombre ?? codigo)
              .join(" · ")}
          </p>
          <p className="mt-1 text-[11px] italic text-ink/40">
            Solo orientativo — nunca sustituye el criterio clínico del odontólogo.
          </p>
        </div>
      )}

      {plantilla.seguimiento && (
        <div>
          <p className="font-semibold uppercase tracking-wide text-ink/40">Seguimiento</p>
          <p className="mt-0.5 text-ink/70">{plantilla.seguimiento}</p>
        </div>
      )}

      {plantilla.notaAdmin && (
        <div>
          <p className="font-semibold uppercase tracking-wide text-ink/40">Recomendación administrativa</p>
          <p className="mt-0.5 text-ink/70">{plantilla.notaAdmin}</p>
        </div>
      )}

      {plantilla.etiquetasComerciales.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-edge/10 pt-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-ink/40">
            Solo visible para ti:
          </span>
          {plantilla.etiquetasComerciales.map((tag) => (
            <span key={tag} className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
              {rolComercialLabel[tag]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
