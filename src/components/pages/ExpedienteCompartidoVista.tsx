"use client";

/** Dos piezas de la función "compartir parte del expediente" de MO Conecta:
 *  - `ElegirSeccionesCompartir`: lo que el remitente marca al enviar, con la
 *    vista previa de lo que verá su colega.
 *  - `ExpedienteCompartidoVista`: lo que el colega (y el remitente) ven en la
 *    sala del caso — la foto fija tomada al enviar. */

import {
  descripcionSeccionCompartible,
  etiquetaSeccionCompartible,
  seccionesCompartibles,
  type ExpedienteCompartido,
  type SeccionCompartible,
} from "@/lib/expedienteCompartido";

const SIEMPRE_SE_COMPARTE = [
  "Nombre y edad del paciente",
  "Alergias y condiciones sistémicas",
  "Motivo, pregunta clínica y prioridad",
  "La información adicional que escribas",
];

export function ElegirSeccionesCompartir({
  valor,
  onChange,
  nombreColega,
}: {
  valor: SeccionCompartible[];
  onChange: (siguiente: SeccionCompartible[]) => void;
  nombreColega: string;
}) {
  const alternar = (s: SeccionCompartible) =>
    onChange(valor.includes(s) ? valor.filter((x) => x !== s) : [...valor, s]);

  return (
    <div className="space-y-3 rounded-lg border border-edge/10 bg-field p-3">
      <div>
        <p className="text-sm font-medium text-ink">¿Qué más del expediente quieres compartir?</p>
        <p className="mt-0.5 text-xs text-ink/50">
          Por defecto solo se comparte lo mínimo. Cada parte que marques es una foto fija de hoy: si el expediente
          cambia después, {nombreColega} no verá el cambio hasta que lo vuelvas a enviar.
        </p>
      </div>
      <div className="space-y-2">
        {seccionesCompartibles.map((s) => (
          <label key={s} className="flex cursor-pointer items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5" checked={valor.includes(s)} onChange={() => alternar(s)} />
            <span>
              <span className="text-ink/90">{etiquetaSeccionCompartible[s]}</span>
              <span className="block text-xs text-ink/50">{descripcionSeccionCompartible[s]}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="rounded-lg border border-accent/30 bg-accent/5 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent">Vista previa — lo que verá {nombreColega}</p>
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs text-ink/70">
          {SIEMPRE_SE_COMPARTE.map((t) => (
            <li key={t}>{t}</li>
          ))}
          {valor.map((s) => (
            <li key={s} className="font-medium text-ink/90">
              {etiquetaSeccionCompartible[s]}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-ink/50">
          Nunca se comparte: precios, pagos, teléfono ni dirección del paciente, INE ni foto de perfil.
        </p>
      </div>
    </div>
  );
}

function Bloque({ titulo, children, abierto = false }: { titulo: string; children: React.ReactNode; abierto?: boolean }) {
  return (
    <details open={abierto} className="rounded-xl border border-edge/10 bg-field">
      <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-medium text-ink">{titulo}</summary>
      <div className="border-t border-edge/10 px-4 py-3 text-sm text-ink/80">{children}</div>
    </details>
  );
}

function fechaLegible(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export default function ExpedienteCompartidoVista({
  expediente,
  cantidadFotos,
}: {
  expediente: ExpedienteCompartido;
  cantidadFotos: number;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-edge/10 bg-surface p-5">
      <div>
        <h3 className="text-sm font-semibold text-ink">Expediente compartido</h3>
        <p className="text-xs text-ink/50">
          Foto fija tomada el {new Date(expediente.generadoEl).toLocaleString("es-MX")} — es lo que existía al enviar el
          caso, no se actualiza solo.
        </p>
      </div>

      {expediente.historiaClinica && (
        <Bloque titulo={`Historia clínica (${expediente.historiaClinica.length} secciones)`}>
          {expediente.historiaClinica.length === 0 && <p className="text-ink/50">Sin respuestas registradas.</p>}
          <div className="space-y-3">
            {expediente.historiaClinica.map((sec) => (
              <div key={sec.titulo}>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{sec.titulo}</p>
                <dl className="mt-1 space-y-1">
                  {sec.items.map((it) => (
                    <div key={it.pregunta} className="flex flex-wrap gap-x-2">
                      <dt className="text-ink/50">{it.pregunta}:</dt>
                      <dd>{it.respuesta}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Bloque>
      )}

      {expediente.diagnosticos && (
        <Bloque titulo={`Diagnósticos y plan de tratamiento (${expediente.diagnosticos.length} + ${expediente.planTratamiento?.length ?? 0})`}>
          {expediente.diagnosticos.length === 0 && <p className="text-ink/50">Sin diagnósticos registrados.</p>}
          <ul className="space-y-1">
            {expediente.diagnosticos.map((d, i) => (
              <li key={i}>
                <span className="text-ink/50">{d.dientes}</span> · {d.diagnostico} <span className="text-ink/40">({d.estado})</span>
                {d.tratamientoSugerido && <span className="text-ink/60"> → {d.tratamientoSugerido}</span>}
              </li>
            ))}
          </ul>
          {expediente.planTratamiento && expediente.planTratamiento.length > 0 && (
            <>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-ink/50">Plan de tratamiento</p>
              <ul className="mt-1 space-y-1">
                {expediente.planTratamiento.map((p, i) => (
                  <li key={i}>
                    <span className="text-ink/50">{p.dientes}</span> · {p.tratamiento}{" "}
                    <span className="text-ink/40">
                      ({p.prioridad} · {p.destino})
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Bloque>
      )}

      {expediente.odontograma && (
        <Bloque titulo={`Odontograma (${expediente.odontograma.length} piezas con hallazgos)`}>
          {expediente.odontograma.length === 0 && <p className="text-ink/50">Sin hallazgos marcados.</p>}
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {expediente.odontograma.map((o) => (
              <li key={o.diente}>
                <span className="font-medium text-ink">OD {o.diente}</span>: {o.diagnosticos.join("; ")}
              </li>
            ))}
          </ul>
        </Bloque>
      )}

      {expediente.notas && (
        <Bloque titulo={`Notas de evolución recientes (${expediente.notas.length})`}>
          {expediente.notas.length === 0 && <p className="text-ink/50">No hay notas firmadas.</p>}
          <div className="space-y-3">
            {expediente.notas.map((n, i) => (
              <div key={i}>
                <p className="text-xs text-ink/50">
                  {fechaLegible(n.fecha)}
                  {n.medico && ` · ${n.medico}`}
                </p>
                <p className="mt-0.5 whitespace-pre-line">{n.texto}</p>
              </div>
            ))}
          </div>
        </Bloque>
      )}

      {expediente.citas && (
        <Bloque titulo={`Citas del paciente (${expediente.citas.length})`}>
          {expediente.citas.length === 0 && <p className="text-ink/50">Sin citas.</p>}
          <ul className="space-y-1">
            {expediente.citas.map((c, i) => (
              <li key={i}>
                <span className="font-medium text-ink">
                  {fechaLegible(c.fecha)} · {c.hora}
                </span>{" "}
                <span className="text-ink/50">({c.estatus})</span>
                {c.tratamientos.length > 0 && <span> — {c.tratamientos.join(", ")}</span>}
              </li>
            ))}
          </ul>
        </Bloque>
      )}

      {expediente.fotosArchivoIds && (
        <Bloque titulo={`Fotografías clínicas (${cantidadFotos})`}>
          <p>
            {cantidadFotos > 0
              ? "Las fotografías están en la sección «Archivos» de este caso, listas para descargar."
              : "No había fotografías clínicas para compartir."}
          </p>
        </Bloque>
      )}
    </div>
  );
}
