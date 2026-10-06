"use client";

/** Dos piezas de la función "compartir parte del expediente" de MO Conecta:
 *  - `ElegirSeccionesCompartir`: lo que el remitente marca al enviar, con la
 *    vista previa de lo que verá su colega.
 *  - `ExpedienteCompartidoVista`: lo que el colega (y el remitente) ven en la
 *    sala del caso — la foto fija tomada al enviar. */

import { useMemo, useState } from "react";
import {
  mesInicial,
  semanasDelMes,
  tonoDeEstatus,
  type CitaCompartida,
  type TonoEstatus,
} from "@/lib/calendarioCitasCompartidas";
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

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

const colorPunto: Record<TonoEstatus, string> = {
  exito: "bg-success",
  peligro: "bg-danger",
  aviso: "bg-warning",
  neutro: "bg-info",
};

/** Calendario mensual de las citas compartidas: cada día con cita lleva un
 * punto del color de su estatus; al tocar un día se ven las citas de ese día. */
function CalendarioCitas({ citas }: { citas: CitaCompartida[] }) {
  const hoy = new Date();
  const hoyISO = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  const [{ anio, mes0 }, setMes] = useState(() => mesInicial(citas, hoyISO));
  const semanas = useMemo(() => semanasDelMes(anio, mes0, citas), [anio, mes0, citas]);
  const [elegido, setElegido] = useState<string | null>(null);
  const diaElegido = semanas.flat().find((d) => d?.fecha === elegido) ?? null;
  const citasDelMes = semanas.flat().reduce((n, d) => n + (d?.citas.length ?? 0), 0);

  const mover = (delta: number) => {
    const f = new Date(anio, mes0 + delta, 1);
    setMes({ anio: f.getFullYear(), mes0: f.getMonth() });
    setElegido(null);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => mover(-1)} aria-label="Mes anterior" className="rounded-lg px-2 py-1 text-ink/60 hover:bg-edge/10">
          ‹
        </button>
        <p className="text-sm font-semibold capitalize text-ink">
          {MESES[mes0]} {anio}
          <span className="ml-2 text-xs font-normal normal-case text-ink/40">
            {citasDelMes === 0 ? "sin citas" : citasDelMes === 1 ? "1 cita" : `${citasDelMes} citas`}
          </span>
        </p>
        <button type="button" onClick={() => mover(1)} aria-label="Mes siguiente" className="rounded-lg px-2 py-1 text-ink/60 hover:bg-edge/10">
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-ink/40">
        {DIAS_SEMANA.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {semanas.flat().map((d, i) =>
          d === null ? (
            <span key={i} />
          ) : (
            <button
              key={d.fecha}
              type="button"
              disabled={d.citas.length === 0}
              onClick={() => setElegido(d.fecha === elegido ? null : d.fecha)}
              className={`flex h-11 flex-col items-center justify-center rounded-lg text-xs ${
                d.fecha === elegido
                  ? "bg-accent/20 font-semibold text-ink ring-1 ring-accent"
                  : d.citas.length > 0
                    ? "bg-edge/10 font-medium text-ink hover:bg-edge/20"
                    : "text-ink/40"
              } ${d.fecha === hoyISO ? "underline underline-offset-2" : ""}`}
            >
              {d.dia}
              <span className="mt-0.5 flex h-1.5 gap-0.5">
                {d.citas.slice(0, 3).map((c, j) => (
                  <span key={j} className={`h-1.5 w-1.5 rounded-full ${colorPunto[tonoDeEstatus(c.estatus)]}`} />
                ))}
              </span>
            </button>
          )
        )}
      </div>
      <div className="mt-3 space-y-1.5">
        {diaElegido ? (
          diaElegido.citas.map((c, i) => (
            <p key={i}>
              <span className="font-medium text-ink">
                {fechaLegible(c.fecha)} · {c.hora}
              </span>{" "}
              <span className="text-ink/50">({c.estatus})</span>
              {c.tratamientos.length > 0 && <span> — {c.tratamientos.join(", ")}</span>}
            </p>
          ))
        ) : (
          <p className="text-xs text-ink/40">Toca un día marcado para ver su cita.</p>
        )}
      </div>
    </div>
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
        <Bloque titulo={`Odontograma (${expediente.odontograma.length} ${expediente.odontograma.length === 1 ? "pieza con hallazgos" : "piezas con hallazgos"})`}>
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
          {expediente.citas.length === 0 ? <p className="text-ink/50">Sin citas.</p> : <CalendarioCitas citas={expediente.citas} />}
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
