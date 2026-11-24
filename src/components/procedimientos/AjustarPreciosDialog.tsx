"use client";

import { useEffect, useMemo, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import {
  calcularAjustePrecios,
  mesesDesdeAjuste,
  pasosDeRedondeo,
  PORCENTAJE_MAXIMO,
  porcentajeValido,
  type CambioPrecio,
  type RegistroAjustePrecios,
} from "@/lib/ajustePreciosInflacion";

const inputClass = "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

type Paso = "configurar" | "guardando" | "resultado";

export default function AjustarPreciosDialog({ onClose }: { onClose: () => void }) {
  const { procedimientos, aplicarAjustePrecios, leerUltimoAjustePrecios, leerPorcentajeAnualPrecios, guardarPorcentajeAnualPrecios } = usePatientData();
  const [paso, setPaso] = useState<Paso>("configurar");
  const [porcentajeTexto, setPorcentajeTexto] = useState("");
  const [paso$, setPaso$] = useState(10);
  const [incluirCostos, setIncluirCostos] = useState(false);
  const [especialidad, setEspecialidad] = useState("");
  const [error, setError] = useState("");
  const [ultimo, setUltimo] = useState<RegistroAjustePrecios | null>(null);
  const [aplicado, setAplicado] = useState<{ cambios: CambioPrecio[]; porcentaje: number; registroPrevio: RegistroAjustePrecios | null } | null>(null);
  const [deshecho, setDeshecho] = useState(false);
  const [anualGuardado, setAnualGuardado] = useState<number | null>(null);
  const [recordarAnual, setRecordarAnual] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    let vivo = true;
    void leerUltimoAjustePrecios().then((r) => {
      if (vivo) setUltimo(r);
    });
    void leerPorcentajeAnualPrecios().then((r) => {
      if (!vivo) return;
      setAnualGuardado(r);
      // Su aumento anual ya viene escrito: solo revisa la vista previa y aplica.
      if (r !== null) setPorcentajeTexto((prev) => (prev === "" ? String(r) : prev));
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const porcentaje = Number(porcentajeTexto.replace(",", "."));
  const valido = porcentajeTexto.trim() !== "" && porcentajeValido(porcentaje);
  const especialidades = useMemo(
    () => [...new Set(procedimientos.filter((p) => p.costoPaciente > 0).map((p) => p.especialidad))].sort((a, b) => a.localeCompare(b)),
    [procedimientos]
  );
  const cambios = useMemo(
    () => (valido ? calcularAjustePrecios(procedimientos, { porcentaje, paso: paso$, incluirCostos, especialidad: especialidad || undefined }) : []),
    [valido, porcentaje, paso$, incluirCostos, especialidad, procedimientos]
  );
  const conPrecio = procedimientos.filter((p) => p.costoPaciente > 0 && (!especialidad || p.especialidad === especialidad)).length;
  const sinPrecio = procedimientos.filter((p) => !(p.costoPaciente > 0) && (!especialidad || p.especialidad === especialidad)).length;

  const distintoDelAnual = valido && anualGuardado !== porcentaje;

  const guardarSoloAnual = async () => {
    setError("");
    setAviso("");
    try {
      await guardarPorcentajeAnualPrecios(porcentaje);
      setAnualGuardado(porcentaje);
      setRecordarAnual(false);
      setAviso(`Listo: tu aumento anual quedó en ${porcentaje}%. Te lo propondré cada vez que toque ajustar.`);
    } catch {
      setError("No se pudo guardar tu aumento anual. Revisa tu conexión e inténtalo de nuevo.");
    }
  };

  const aplicar = async () => {
    setError("");
    setAviso("");
    setPaso("guardando");
    const registro: RegistroAjustePrecios = { fecha: new Date().toISOString(), porcentaje, cantidad: cambios.length };
    try {
      await aplicarAjustePrecios(
        cambios.map((c) => ({ id: c.id, campos: c.campos })),
        registro
      );
      if (recordarAnual && distintoDelAnual) {
        try {
          await guardarPorcentajeAnualPrecios(porcentaje);
          setAnualGuardado(porcentaje);
        } catch {
          /* los precios ya se guardaron; el porcentaje anual se puede fijar después */
        }
      }
      setAplicado({ cambios, porcentaje, registroPrevio: ultimo });
      setUltimo(registro);
      setPaso("resultado");
    } catch {
      setError("No se pudieron guardar los precios. Revisa tu conexión e inténtalo de nuevo; si algunos ya se cambiaron, puedes volver a abrir esta ventana.");
      setPaso("configurar");
    }
  };

  const deshacer = async () => {
    if (!aplicado) return;
    setError("");
    try {
      await aplicarAjustePrecios(
        aplicado.cambios.map((c) => ({ id: c.id, campos: c.anteriores })),
        aplicado.registroPrevio
      );
      setUltimo(aplicado.registroPrevio);
      setDeshecho(true);
    } catch {
      setError("No se pudo deshacer. Revisa tu conexión e inténtalo de nuevo.");
    }
  };

  const meses = mesesDesdeAjuste(ultimo, new Date());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-edge/10 bg-modal p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Ajustar precios por inflación</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>

        {paso === "resultado" && aplicado ? (
          <div className="space-y-4">
            {deshecho ? (
              <div className="rounded-lg border border-edge/15 bg-surface p-4 text-sm text-ink/80">
                Listo: los {aplicado.cambios.length} tratamiento(s) regresaron a los precios que tenían antes.
              </div>
            ) : (
              <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
                Se subió <strong>{aplicado.porcentaje}%</strong> el precio de <strong>{aplicado.cambios.length}</strong> tratamiento(s).
              </div>
            )}
            {!deshecho && (
              <p className="text-xs text-ink/50">
                Los presupuestos que ya hiciste conservan el precio con el que se hicieron; los nuevos usan el precio actualizado. Si fue un error,
                puedes deshacerlo ahora mismo.
              </p>
            )}
            {error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}
            <div className="flex gap-2">
              {!deshecho && (
                <button
                  onClick={deshacer}
                  className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 hover:bg-surface"
                >
                  Deshacer este ajuste
                </button>
              )}
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent hover:bg-accent/25"
              >
                Listo
              </button>
            </div>
          </div>
        ) : paso === "guardando" ? (
          <p className="py-10 text-center text-sm text-ink/50">Actualizando los precios…</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <p className="text-sm text-ink/70">
              Sube de un jalón el precio de tus tratamientos con el porcentaje que tú elijas, por ejemplo la inflación del año. Antes de guardar ves
              cómo queda cada uno.
            </p>
            {ultimo && meses !== null && (
              <p className="rounded-lg border border-edge/10 bg-surface px-3 py-2 text-xs text-ink/60">
                Último ajuste: {new Date(ultimo.fecha).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })} (+{ultimo.porcentaje}
                %, {ultimo.cantidad} tratamiento(s)){meses >= 1 ? ` — hace ${meses} mes(es)` : ""}.
              </p>
            )}
            {error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}
            {aviso && <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">{aviso}</p>}

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="ajuste-porcentaje" className="mb-1 block text-xs font-medium text-ink/60">
                  Porcentaje a subir
                </label>
                <div className="relative">
                  <input
                    id="ajuste-porcentaje"
                    type="text"
                    inputMode="decimal"
                    value={porcentajeTexto}
                    onChange={(e) => {
                      setPorcentajeTexto(e.target.value.replace(/[^0-9.,]/g, ""));
                      setAviso("");
                    }}
                    placeholder="Ej. 4.5"
                    className={`${inputClass} pr-8`}
                    autoFocus
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink/40">%</span>
                </div>
              </div>
              <div>
                <label htmlFor="ajuste-redondeo" className="mb-1 block text-xs font-medium text-ink/60">
                  Redondear precios
                </label>
                <select id="ajuste-redondeo" value={paso$} onChange={(e) => setPaso$(Number(e.target.value))} className={inputClass}>
                  {pasosDeRedondeo.map((p) => (
                    <option key={p.valor} value={p.valor}>
                      {p.texto}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="ajuste-especialidad" className="mb-1 block text-xs font-medium text-ink/60">
                  Qué tratamientos
                </label>
                <select id="ajuste-especialidad" value={especialidad} onChange={(e) => setEspecialidad(e.target.value)} className={inputClass}>
                  <option value="">Todos ({procedimientos.filter((p) => p.costoPaciente > 0).length})</option>
                  {especialidades.map((e) => (
                    <option key={e} value={e}>
                      Solo {e}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/60">
              <span>
                Mi aumento anual:{" "}
                <strong className="text-ink">{anualGuardado !== null ? `${anualGuardado}%` : "aún no lo defines"}</strong>
              </span>
              {distintoDelAnual && (
                <>
                  <label className="flex cursor-pointer items-center gap-1.5">
                    <input type="checkbox" checked={recordarAnual} onChange={(e) => setRecordarAnual(e.target.checked)} className="accent-[color:var(--accent)]" />
                    Dejar {porcentaje}% como mi aumento anual al aplicar
                  </label>
                  <button onClick={guardarSoloAnual} className="font-semibold text-accent hover:underline">
                    Solo guardarlo, sin aplicar
                  </button>
                </>
              )}
            </div>

            <label className="flex cursor-pointer items-start gap-2 text-xs text-ink/70">
              <input
                type="checkbox"
                checked={incluirCostos}
                onChange={(e) => setIncluirCostos(e.target.checked)}
                className="mt-0.5 accent-[color:var(--accent)]"
              />
              <span>
                Subir también el costo al odontólogo y el costo interno (solo los que ya tienes capturados). Si no lo marcas, solo cambia lo que paga el
                paciente.
              </span>
            </label>

            {porcentajeTexto.trim() !== "" && !valido && (
              <p className="text-xs text-danger">Escribe un porcentaje mayor a 0 y hasta {PORCENTAJE_MAXIMO}.</p>
            )}

            <div className="min-h-[120px] flex-1 overflow-y-auto rounded-lg border border-edge/10">
              {!valido ? (
                <p className="p-6 text-center text-xs text-ink/40">Escribe el porcentaje para ver cómo quedarían tus precios.</p>
              ) : cambios.length === 0 ? (
                <p className="p-6 text-center text-xs text-ink/40">Con ese porcentaje y redondeo ningún precio cambia.</p>
              ) : (
                <ul className="divide-y divide-edge/5">
                  {cambios.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{c.nombre}</p>
                        <p className="truncate text-xs text-ink/40">{c.especialidad}</p>
                      </div>
                      <div className="shrink-0 text-right tabular-nums">
                        <span className="mr-2 text-xs text-ink/40 line-through">{formatCurrency(c.costoPaciente)}</span>
                        <span className="font-semibold text-ink">{formatCurrency(c.nuevoCostoPaciente)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {sinPrecio > 0 && valido && (
              <p className="text-xs text-ink/40">
                {sinPrecio} tratamiento(s) con precio en $0 no se tocan (de {conPrecio + sinPrecio} en total).
              </p>
            )}

            <div className="flex gap-2 border-t border-edge/10 pt-3">
              <button onClick={onClose} className="rounded-lg border border-edge/15 px-4 py-2.5 text-sm font-semibold text-ink/80 hover:bg-surface">
                Cancelar
              </button>
              <button
                onClick={aplicar}
                disabled={cambios.length === 0}
                className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {cambios.length === 0 ? "Aplicar ajuste" : `Subir ${porcentajeTexto.replace(",", ".")}% a ${cambios.length} tratamiento(s)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
