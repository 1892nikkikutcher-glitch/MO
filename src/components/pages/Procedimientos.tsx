"use client";

import { useEffect, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency, unidadCobroLabel, unidadCobroOptions, type UnidadCobro } from "@/lib/patientData";
import {
  especialidadesPredefinidas,
  agruparPorEspecialidad,
  formatDuracion,
  esProcedimientoActivo,
  type Procedimiento,
} from "@/lib/procedimientos";
import ConfirmarEliminar from "@/components/ConfirmarEliminar";
import ImportarCatalogoDialog from "@/components/procedimientos/ImportarCatalogoDialog";
import ImportarListaPreciosDialog from "@/components/procedimientos/ImportarListaPreciosDialog";
import AjustarPreciosDialog from "@/components/procedimientos/AjustarPreciosDialog";
import { tocaAjusteAnual, type RegistroAjustePrecios } from "@/lib/ajustePreciosInflacion";
import GuiaConfiguracion from "@/components/procedimientos/GuiaConfiguracion";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function procedimientoVacio(): Omit<Procedimiento, "id"> {
  return {
    nombre: "",
    especialidad: especialidadesPredefinidas[0],
    costoPaciente: 0,
    costoOdontologo: 0,
    duracionMinutos: 30,
    activo: true,
  };
}

function ProcedimientoDialog({
  inicial,
  onClose,
  onGuardar,
}: {
  inicial: Procedimiento | null;
  onClose: () => void;
  onGuardar: (data: Omit<Procedimiento, "id">) => void;
}) {
  const [form, setForm] = useState<Omit<Procedimiento, "id">>(inicial ?? procedimientoVacio());
  const [especialidadPersonalizada, setEspecialidadPersonalizada] = useState(
    inicial && !(especialidadesPredefinidas as readonly string[]).includes(inicial.especialidad)
      ? inicial.especialidad
      : ""
  );
  const usaOtra = !(especialidadesPredefinidas as readonly string[]).includes(form.especialidad);

  const puedeGuardar =
    form.nombre.trim().length > 0 && (!usaOtra || especialidadPersonalizada.trim().length > 0);

  const guardar = () => {
    onGuardar({
      ...form,
      nombre: form.nombre.trim(),
      especialidad: usaOtra ? especialidadPersonalizada.trim() : form.especialidad,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">
            {inicial ? "Editar procedimiento" : "Agregar procedimiento"}
          </h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Nombre del procedimiento</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej. Limpieza dental (profilaxis)"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Especialidad</label>
              <select
                value={usaOtra ? "__otra__" : form.especialidad}
                onChange={(e) => {
                  if (e.target.value === "__otra__") {
                    setForm((prev) => ({ ...prev, especialidad: especialidadPersonalizada || "" }));
                  } else {
                    setForm((prev) => ({ ...prev, especialidad: e.target.value }));
                  }
                }}
                className={inputClass}
              >
                {especialidadesPredefinidas.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
                <option value="__otra__">Otra especialidad...</option>
              </select>
            </div>
            {usaOtra && (
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">¿Cuál?</label>
                <input
                  type="text"
                  value={especialidadPersonalizada}
                  onChange={(e) => setEspecialidadPersonalizada(e.target.value)}
                  placeholder="Ej. Odontología del deporte"
                  className={inputClass}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Costo al paciente</label>
              <input
                type="number"
                min={0}
                value={form.costoPaciente}
                onChange={(e) => setForm((prev) => ({ ...prev, costoPaciente: Number(e.target.value) || 0 }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Costo al odontólogo</label>
              <input
                type="number"
                min={0}
                value={form.costoOdontologo}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, costoOdontologo: Number(e.target.value) || 0, costoSinConfigurar: false }))
                }
                className={inputClass}
                title="Lo que le corresponde al odontólogo por este procedimiento (comisión)"
              />
              {form.costoSinConfigurar && (
                <p className="mt-1 text-[11px] text-warning">Sin configurar: se agregó al presupuestar. Captúralo para calcular la comisión.</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Tiempo estimado (min)</label>
              <input
                type="number"
                min={5}
                step={5}
                value={form.duracionMinutos}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, duracionMinutos: Number(e.target.value) || 5 }))
                }
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">¿Cómo se cobra?</label>
            <select
              value={form.unidadCobro ?? "diente"}
              onChange={(e) => setForm((prev) => ({ ...prev, unidadCobro: e.target.value as UnidadCobro }))}
              className={inputClass}
            >
              {unidadCobroOptions.map((u) => (
                <option key={u} value={u}>
                  {unidadCobroLabel[u]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-ink/40">
              El costo al paciente es por esta unidad. En un paquete o procedimiento completo el precio es fijo, sin importar cuántos dientes cubra.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Costo de insumos y laboratorio</label>
            <input
              type="number"
              min={0}
              value={form.costoInterno ?? 0}
              onChange={(e) => setForm((prev) => ({ ...prev, costoInterno: Number(e.target.value) || 0 }))}
              className={inputClass}
            />
            <p className="mt-1 text-[11px] text-ink/40">
              Lo que cuestan los materiales y el laboratorio cada vez que se hace. Con esto y la comisión, Contabilidad y finanzas calcula cuánto
              deja cada tratamiento.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={form.activo !== false}
              onChange={(e) => setForm((prev) => ({ ...prev, activo: e.target.checked }))}
              className="accent-[color:var(--accent)]"
            />
            Procedimiento activo (visible al armar presupuestos)
          </label>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={!puedeGuardar}
            className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Procedimientos() {
  const { miRol, procedimientos, setProcedimientos, leerUltimoAjustePrecios } = usePatientData();
  const [mostrarAjuste, setMostrarAjuste] = useState(false);
  const [ultimoAjuste, setUltimoAjuste] = useState<RegistroAjustePrecios | null>(null);
  useEffect(() => {
    if (miRol !== "admin" || mostrarAjuste) return;
    let vivo = true;
    void leerUltimoAjustePrecios().then((r) => {
      if (vivo) setUltimoAjuste(r);
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miRol, mostrarAjuste]);
  const [editando, setEditando] = useState<Procedimiento | "nuevo" | null>(null);
  const [procedimientoAEliminar, setProcedimientoAEliminar] = useState<Procedimiento | null>(null);
  const [mostrarImportar, setMostrarImportar] = useState(false);
  const [mostrarListaPrecios, setMostrarListaPrecios] = useState(false);
  const [guiaAbiertaId, setGuiaAbiertaId] = useState<string | null>(null);

  if (miRol !== "admin") {
    return (
      <div className="rounded-2xl border border-edge/10 bg-surface p-10 text-center text-sm text-ink/50">
        Solo el dueño de la clínica puede configurar los procedimientos.
      </div>
    );
  }

  const guardarProcedimiento = (data: Omit<Procedimiento, "id">) => {
    if (editando && editando !== "nuevo") {
      setProcedimientos((prev) =>
        prev.map((p) =>
          p.id === editando.id ? { ...p, ...data, actualizadoEl: new Date().toISOString() } : p
        )
      );
    } else {
      const ahora = new Date().toISOString();
      const nuevo: Procedimiento = { id: `proc${Date.now()}`, ...data, creadoEl: ahora, actualizadoEl: ahora };
      setProcedimientos((prev) => [...prev, nuevo]);
    }
    setEditando(null);
  };

  const eliminarProcedimiento = (id: string) => {
    setProcedimientos((prev) => prev.filter((p) => p.id !== id));
  };

  const alternarActivo = (id: string) => {
    setProcedimientos((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, activo: !esProcedimientoActivo(p), actualizadoEl: new Date().toISOString() }
          : p
      )
    );
  };

  const grupos = agruparPorEspecialidad(procedimientos);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink/40">
          Estos valores son la base para presupuestos, comisiones y duración de citas en otras
          áreas de la plataforma.
        </p>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <button
            onClick={() => setMostrarAjuste(true)}
            title="Sube de una vez el precio de todos tus tratamientos con un porcentaje, por ejemplo la inflación anual"
            className="rounded-lg border border-accent/40 px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
          >
            Ajustar por inflación
          </button>
          <button
            onClick={() => setMostrarListaPrecios(true)}
            title="Sube tu lista de precios en Excel o Word y se cargan los tratamientos con su precio"
            className="rounded-lg border border-accent/40 px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
          >
            Agregar documento
          </button>
          <button
            onClick={() => setEditando("nuevo")}
            className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
            style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
          >
            + Agregar procedimiento
          </button>
        </div>
      </div>

      {tocaAjusteAnual(ultimoAjuste, new Date()) && ultimoAjuste && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3">
          <p className="text-sm text-warning">
            Ya pasó cerca de un año desde que subiste tus precios (
            {new Date(ultimoAjuste.fecha).toLocaleDateString("es-MX", { month: "long", year: "numeric" })}). Para mantener sanas tus finanzas, conviene
            ajustarlos a la inflación.
          </p>
          <button
            onClick={() => setMostrarAjuste(true)}
            className="shrink-0 rounded-lg border border-warning/50 px-3 py-1.5 text-xs font-semibold text-warning hover:bg-warning/10"
          >
            Ajustar ahora
          </button>
        </div>
      )}

      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <h3 className="text-sm font-semibold text-ink">Catálogo recomendado</h3>
        <p className="mt-1 text-xs text-ink/50">
          Agrega los tratamientos más utilizados en los consultorios dentales de México. Puedes
          modificar nombres, precios, duraciones y variantes de acuerdo con tu forma de trabajar.
        </p>
        <button
          onClick={() => setMostrarImportar(true)}
          className="mt-3 rounded-lg border border-accent/40 px-4 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
        >
          Cargar catálogo recomendado
        </button>
      </div>

      {grupos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          Aún no agregas procedimientos.
        </div>
      ) : (
        <div className="space-y-6">
          {grupos.map((grupo) => (
            <div key={grupo.especialidad}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
                {grupo.especialidad}
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
                <div className="min-w-[880px]">
                <div className="grid grid-cols-[minmax(0,1fr)_120px_130px_100px_230px] gap-3 border-b border-edge/10 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink/40">
                  <span>Procedimiento</span>
                  <span>Costo paciente</span>
                  <span>Costo odontólogo</span>
                  <span>Tiempo</span>
                  <span className="text-right">Acción</span>
                </div>
                <div className="divide-y divide-edge/5">
                  {grupo.procedimientos.map((p) => {
                    const activo = esProcedimientoActivo(p);
                    const tieneGuia = Boolean(p.origenPlantillaId);
                    return (
                      <div key={p.id} className={`px-4 py-3 ${activo ? "" : "opacity-50"}`}>
                        <div className="grid grid-cols-[minmax(0,1fr)_120px_130px_100px_230px] items-center gap-3">
                          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-ink">
                            {p.nombre}
                            {!activo && (
                              <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink/40">
                                Inactivo
                              </span>
                            )}
                            {tieneGuia && (
                              <button
                                onClick={() => setGuiaAbiertaId(guiaAbiertaId === p.id ? null : p.id)}
                                className="text-[10px] font-semibold uppercase tracking-wide text-accent/70 hover:text-accent"
                              >
                                {guiaAbiertaId === p.id ? "Ocultar guía ▴" : "Guía ▾"}
                              </button>
                            )}
                          </span>
                          <span className="text-sm text-ink/70">{formatCurrency(p.costoPaciente)}</span>
                          <span className="text-sm text-ink/70">{p.costoSinConfigurar ? <span className="text-warning">Sin configurar</span> : formatCurrency(p.costoOdontologo)}</span>
                          <span className="text-sm text-ink/70">{formatDuracion(p.duracionMinutos)}</span>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditando(p)}
                              className="rounded-lg border border-edge/15 px-2.5 py-1 text-xs text-ink/70 hover:bg-surface2"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => alternarActivo(p.id)}
                              className="rounded-lg border border-edge/15 px-2.5 py-1 text-xs text-ink/70 hover:bg-surface2"
                            >
                              {activo ? "Desactivar" : "Activar"}
                            </button>
                            <button
                              onClick={() => setProcedimientoAEliminar(p)}
                              className="rounded-lg border border-danger/30 px-2.5 py-1 text-xs text-danger hover:bg-danger/10"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                        {tieneGuia && guiaAbiertaId === p.id && <GuiaConfiguracion procedimiento={p} />}
                      </div>
                    );
                  })}
                </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editando && (
        <ProcedimientoDialog
          inicial={editando === "nuevo" ? null : editando}
          onClose={() => setEditando(null)}
          onGuardar={guardarProcedimiento}
        />
      )}

      {procedimientoAEliminar && (
        <ConfirmarEliminar
          titulo="¿Eliminar este procedimiento?"
          mensaje={`Vas a eliminar "${procedimientoAEliminar.nombre}" del catálogo. Quedará guardado en la Papelera por si necesitas recuperarlo.`}
          onCancel={() => setProcedimientoAEliminar(null)}
          onConfirm={() => {
            eliminarProcedimiento(procedimientoAEliminar.id);
            setProcedimientoAEliminar(null);
          }}
        />
      )}

      {mostrarImportar && <ImportarCatalogoDialog onClose={() => setMostrarImportar(false)} />}
      {mostrarListaPrecios && <ImportarListaPreciosDialog onClose={() => setMostrarListaPrecios(false)} />}
      {mostrarAjuste && <AjustarPreciosDialog onClose={() => setMostrarAjuste(false)} />}
    </div>
  );
}
