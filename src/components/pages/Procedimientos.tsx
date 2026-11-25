"use client";

import { useEffect, useRef, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency, unidadCobroLabel, unidadCobroOptions, type UnidadCobro } from "@/lib/patientData";
import {
  especialidadesPredefinidas,
  ESPECIALIDAD_SIN_CLASIFICAR,
  esEspecialidadPredefinida,
  esSinClasificar,
  ramasDelCatalogo,
  normalizarNombreRama,
  validarNombreRama,
  renombrarRama,
  quitarRama,
  especialidadVigente,
  migrarEspecialidadesRenombradas,
  formatDuracion,
  esProcedimientoActivo,
  type Procedimiento,
} from "@/lib/procedimientos";
import ConfirmarEliminar from "@/components/ConfirmarEliminar";
import ImportarCatalogoDialog from "@/components/procedimientos/ImportarCatalogoDialog";
import ImportarListaPreciosDialog from "@/components/procedimientos/ImportarListaPreciosDialog";
import AjustarPreciosDialog from "@/components/procedimientos/AjustarPreciosDialog";
import { ajustePendiente, sumarDias, type ConfigAjustePrecios, type RegistroAjustePrecios } from "@/lib/ajustePreciosInflacion";
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
  especialidadInicial,
  ramasPropias,
  onClose,
  onGuardar,
}: {
  inicial: Procedimiento | null;
  /** Para un procedimiento nuevo: la rama desde la que se está agregando. */
  especialidadInicial?: string;
  /** Ramas que creó la clínica (se ofrecen junto a las base). */
  ramasPropias: string[];
  onClose: () => void;
  onGuardar: (data: Omit<Procedimiento, "id">) => void;
}) {
  const [form, setForm] = useState<Omit<Procedimiento, "id">>(
    inicial ?? { ...procedimientoVacio(), ...(especialidadInicial ? { especialidad: especialidadInicial } : {}) }
  );
  const esConocida = (e: string) => esEspecialidadPredefinida(e) || e === ESPECIALIDAD_SIN_CLASIFICAR || ramasPropias.includes(e);
  const [especialidadPersonalizada, setEspecialidadPersonalizada] = useState(
    inicial && !esConocida(inicial.especialidad) ? inicial.especialidad : ""
  );
  const usaOtra = !esConocida(form.especialidad);

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
                {ramasPropias.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
                <option value={ESPECIALIDAD_SIN_CLASIFICAR}>Sin clasificar (ubicar después)</option>
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
  const { miRol, procedimientos, setProcedimientos, leerUltimoAjustePrecios, leerConfigAjustePrecios, guardarConfigAjustePrecios, leerRamasPropias, guardarRamasPropias } =
    usePatientData();
  const [mostrarAjuste, setMostrarAjuste] = useState(false);
  // Ramas que la clínica creó (ej. «Prevención») y los formularios para crear, renombrar o quitar una.
  const [ramasPropias, setRamasPropias] = useState<string[]>([]);
  // Ramas base que cambiaron de nombre (Ortodoncia → Ortodoncia y Ortopedia…): lo guardado con el nombre anterior se pasa al actual.
  useEffect(() => {
    if (miRol !== "admin") return;
    if (procedimientos.some((p) => especialidadVigente(p.especialidad) !== p.especialidad)) {
      setProcedimientos((prev) => migrarEspecialidadesRenombradas(prev, new Date().toISOString()));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miRol, procedimientos]);
  const [creandoRama, setCreandoRama] = useState(false);
  const [nombreRamaNuevo, setNombreRamaNuevo] = useState("");
  const [renombrandoRama, setRenombrandoRama] = useState(false);
  const [nombreRenombre, setNombreRenombre] = useState("");
  const [quitandoRama, setQuitandoRama] = useState(false);
  const [errorRama, setErrorRama] = useState("");
  useEffect(() => {
    if (miRol !== "admin") return;
    let vivo = true;
    void leerRamasPropias().then((r) => {
      if (vivo) setRamasPropias(r);
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [miRol]);
  const [ramaAbierta, setRamaAbierta] = useState<string | null>(null);
  // Arrastrar un tratamiento a la tarjeta de su rama: cuál se arrastra, sobre qué tarjeta va y el aviso al soltarlo.
  const [arrastrandoId, setArrastrandoId] = useState<string | null>(null);
  const idArrastrado = useRef<string | null>(null); // la lógica del arrastre lee esto; el estado solo pinta
  const [sobreRama, setSobreRama] = useState<string | null>(null);
  const [avisoMovido, setAvisoMovido] = useState("");
  useEffect(() => {
    if (!avisoMovido) return;
    const t = setTimeout(() => setAvisoMovido(""), 4000);
    return () => clearTimeout(t);
  }, [avisoMovido]);
  const [especialidadNuevo, setEspecialidadNuevo] = useState<string | undefined>(undefined);
  const panelRama = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ramaAbierta) panelRama.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [ramaAbierta]);
  const [ultimoAjuste, setUltimoAjuste] = useState<RegistroAjustePrecios | null>(null);
  const [configAjuste, setConfigAjuste] = useState<ConfigAjustePrecios>({});
  const [ajusteEnAprobacion, setAjusteEnAprobacion] = useState(false);
  useEffect(() => {
    if (miRol !== "admin" || mostrarAjuste) return;
    let vivo = true;
    void leerUltimoAjustePrecios().then((r) => {
      if (vivo) setUltimoAjuste(r);
    });
    void leerConfigAjustePrecios().then((r) => {
      if (vivo) setConfigAjuste(r);
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

  const pendienteAjuste = ajustePendiente(configAjuste, ultimoAjuste, new Date());
  const ramas = ramasDelCatalogo(procedimientos, ramasPropias);
  const ramaActual = ramas.find((r) => r.nombre === ramaAbierta) ?? null;

  const cerrarFormulariosDeRama = () => {
    setCreandoRama(false);
    setRenombrandoRama(false);
    setQuitandoRama(false);
    setNombreRamaNuevo("");
    setErrorRama("");
  };

  const persistirRamas = async (lista: string[]) => {
    setRamasPropias(lista);
    try {
      await guardarRamasPropias(lista);
    } catch {
      setErrorRama("No se pudo guardar la rama. Revisa tu conexión e inténtalo de nuevo.");
    }
  };

  const crearRama = async () => {
    const error = validarNombreRama(nombreRamaNuevo, ramas.map((r) => r.nombre));
    if (error) return setErrorRama(error);
    const nombre = normalizarNombreRama(nombreRamaNuevo);
    await persistirRamas([...ramasPropias, nombre]);
    cerrarFormulariosDeRama();
    setRamaAbierta(nombre);
    setAvisoMovido(`Creaste la rama «${nombre}». Arrastra procedimientos hacia ella o agrega uno nuevo.`);
  };

  const renombrarRamaActual = async () => {
    if (!ramaActual) return;
    const error = validarNombreRama(nombreRenombre, ramas.map((r) => r.nombre), ramaActual.nombre);
    if (error) return setErrorRama(error);
    const nombre = normalizarNombreRama(nombreRenombre);
    if (nombre !== ramaActual.nombre) {
      const de = ramaActual.nombre;
      setProcedimientos((prev) => renombrarRama(prev, de, nombre, new Date().toISOString()));
      await persistirRamas([...ramasPropias.filter((r) => r !== de), nombre]);
      setRamaAbierta(nombre);
      setAvisoMovido(`La rama «${de}» ahora se llama «${nombre}».`);
    }
    cerrarFormulariosDeRama();
  };

  const quitarRamaActual = async () => {
    if (!ramaActual) return;
    const nombre = ramaActual.nombre;
    const cuantos = ramaActual.procedimientos.length;
    setProcedimientos((prev) => quitarRama(prev, nombre, new Date().toISOString()));
    await persistirRamas(ramasPropias.filter((r) => r !== nombre));
    cerrarFormulariosDeRama();
    setRamaAbierta(null);
    setAvisoMovido(
      cuantos > 0
        ? `Quitaste la rama «${nombre}». ${cuantos === 1 ? "Su procedimiento pasó" : `Sus ${cuantos} procedimientos pasaron`} a Sin clasificar.`
        : `Quitaste la rama «${nombre}».`
    );
  };

  const ubicarEn = (id: string, especialidad: string) => {
    setProcedimientos((prev) => prev.map((p) => (p.id === id ? { ...p, especialidad, actualizadoEl: new Date().toISOString() } : p)));
  };

  /** Pasa un tratamiento a otra rama (la misma en la que ya está no cambia nada) y avisa. */
  const moverARama = (id: string | null, rama: string) => {
    const p = procedimientos.find((x) => x.id === id);
    if (!p) return;
    const actual = esSinClasificar(p) ? ESPECIALIDAD_SIN_CLASIFICAR : especialidadVigente(p.especialidad);
    if (actual === rama) return;
    ubicarEn(p.id, rama);
    setAvisoMovido(`«${p.nombre}» pasó a ${rama}.`);
  };

  const terminarArrastre = () => {
    idArrastrado.current = null;
    setArrastrandoId(null);
    setSobreRama(null);
  };

  /** Controladores para que algo sea destino de un tratamiento arrastrado (tarjetas y franja flotante). */
  const destinoRama = (rama: string) => ({
    onDragEnter: (e: React.DragEvent) => {
      if (!idArrastrado.current) return;
      e.preventDefault();
    },
    onDragOver: (e: React.DragEvent) => {
      if (!idArrastrado.current) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setSobreRama((prev) => (prev === rama ? prev : rama));
    },
    onDragLeave: () => setSobreRama((prev) => (prev === rama ? null : prev)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      moverARama(idArrastrado.current ?? e.dataTransfer.getData("text/plain"), rama);
      terminarArrastre();
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink/40">
          Estos valores son la base para presupuestos, comisiones y duración de citas en otras
          áreas de la plataforma.
        </p>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <button
            onClick={() => {
              setAjusteEnAprobacion(false);
              setMostrarAjuste(true);
            }}
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
            onClick={() => {
              setEspecialidadNuevo(undefined);
              setEditando("nuevo");
            }}
            className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
            style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
          >
            + Agregar procedimiento
          </button>
        </div>
      </div>

      {pendienteAjuste?.tipo === "aprobacion" && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3">
          <p className="text-sm text-warning">
            <strong>Es momento de tu ajuste anual de precios.</strong>{" "}
            {pendienteAjuste.porcentaje !== null ? `Tu aumento anual es de ${pendienteAjuste.porcentaje}%. ` : ""}
            Revisa cómo quedarían y dame tu permiso: no se cambia nada hasta que lo apruebes.
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => {
                setAjusteEnAprobacion(true);
                setMostrarAjuste(true);
              }}
              className="rounded-lg border border-warning/50 bg-warning/10 px-3 py-1.5 text-xs font-semibold text-warning hover:bg-warning/20"
            >
              Revisar y aprobar
            </button>
            <button
              onClick={async () => {
                const posponerHasta = sumarDias(new Date(), 7);
                await guardarConfigAjustePrecios({ posponerHasta });
                setConfigAjuste((prev) => ({ ...prev, posponerHasta }));
              }}
              className="rounded-lg border border-warning/30 px-3 py-1.5 text-xs font-semibold text-warning/80 hover:bg-warning/10"
            >
              Recordármelo en 7 días
            </button>
          </div>
        </div>
      )}
      {pendienteAjuste?.tipo === "recordatorio" && ultimoAjuste && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3">
          <p className="text-sm text-warning">
            Ya pasó cerca de un año desde que subiste tus precios (
            {new Date(ultimoAjuste.fecha).toLocaleDateString("es-MX", { month: "long", year: "numeric" })}). Para mantener sanas tus finanzas, conviene
            ajustarlos{configAjuste.porcentajeAnual !== undefined ? ` (tu aumento anual es de ${configAjuste.porcentajeAnual}%)` : " a la inflación"}.
          </p>
          <button
            onClick={() => {
              setAjusteEnAprobacion(false);
              setMostrarAjuste(true);
            }}
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

      {procedimientos.length === 0 && (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          Aún no agregas procedimientos.
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-ink">Ramas de la odontología</h3>
          {!creandoRama && (
            <button
              onClick={() => {
                cerrarFormulariosDeRama();
                setCreandoRama(true);
              }}
              className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
            >
              + Nueva rama
            </button>
          )}
        </div>
        {creandoRama && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void crearRama();
            }}
            className="mt-3 rounded-2xl border border-accent/30 bg-surface p-4"
          >
            <label className="mb-1 block text-xs font-medium text-ink/60" htmlFor="nombre-rama-nueva">
              Nombre de la nueva rama
            </label>
            <div className="flex flex-wrap items-start gap-2">
              <input
                id="nombre-rama-nueva"
                autoFocus
                type="text"
                value={nombreRamaNuevo}
                onChange={(e) => {
                  setNombreRamaNuevo(e.target.value);
                  setErrorRama("");
                }}
                placeholder="Ej. Prevención"
                maxLength={60}
                className={`${inputClass} max-w-xs`}
              />
              <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
                Crear rama
              </button>
              <button type="button" onClick={cerrarFormulariosDeRama} className="rounded-lg border border-edge/15 px-4 py-2 text-sm text-ink/70 hover:bg-surface2">
                Cancelar
              </button>
            </div>
            {errorRama && (
              <p role="alert" className="mt-2 text-xs text-danger">
                {errorRama}
              </p>
            )}
          </form>
        )}
        <p className="mb-3 mt-1 text-xs text-ink/50">
          Toca una rama para ver sus procedimientos y costos. Para cambiar un procedimiento de rama, arrástralo desde la tabla y suéltalo sobre la tarjeta de su rama.
        </p>
        {avisoMovido && (
          <p role="status" className="mb-3 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success [[data-theme=light]_&]:text-[#047857]">
            {avisoMovido}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {ramas.map((r) => {
            const abierta = ramaAbierta === r.nombre;
            const vacia = r.procedimientos.length === 0;
            const porUbicar = r.sinClasificar && !vacia;
            return (
              // div con rol de botón (no <button>): Firefox no entrega los eventos de soltar sobre un <button>.
              <div
                key={r.nombre}
                role="button"
                tabIndex={0}
                aria-expanded={abierta}
                onClick={() => setRamaAbierta(abierta ? null : r.nombre)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setRamaAbierta(abierta ? null : r.nombre);
                  }
                }}
                {...destinoRama(r.nombre)}
                className={`cursor-pointer rounded-2xl border border-l-4 p-4 text-left transition-colors hover:bg-surface2 ${
                  sobreRama === r.nombre ? "border-accent bg-accent/15 ring-2 ring-accent/60" : abierta ? "brillo-tarjeta border-accent/60 bg-surface2" : "brillo-tarjeta border-edge/10 bg-surface"
                } border-l-accent ${vacia && !arrastrandoId ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-2xl font-bold leading-none text-ink">{r.procedimientos.length}</span>
                  <span className="text-xs text-ink/40" aria-hidden="true">
                    {abierta ? "▴" : "▾"}
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ink/70">{r.nombre}</p>
                {porUbicar ? (
                  <span className="mt-1 inline-block rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                    Por ubicar
                  </span>
                ) : (
                  <p className="mt-1 text-[11px] text-ink/40">
                    {r.desde === null ? (vacia ? "Sin procedimientos" : "Sin precio aún") : r.desde === r.hasta ? formatCurrency(r.desde) : `${formatCurrency(r.desde)} a ${formatCurrency(r.hasta ?? r.desde)}`}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mientras se arrastra, una franja siempre visible con todas las ramas: así no hay que acercar la fila a las tarjetas de arriba. */}
      {arrastrandoId && (
        <div className="fixed inset-x-3 top-3 z-50 rounded-2xl border border-accent/50 bg-modal-solid p-3 shadow-2xl lg:inset-x-24">
          <p className="mb-2 text-xs font-semibold text-accent">Suéltalo sobre la rama a la que pertenece:</p>
          <div className="flex flex-wrap gap-2">
            {ramas.map((r) => (
              <div
                key={r.nombre}
                {...destinoRama(r.nombre)}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
                  sobreRama === r.nombre ? "border-accent bg-accent/25 text-accent ring-2 ring-accent/60" : "border-edge/15 bg-surface text-ink/70"
                }`}
              >
                {r.nombre}
              </div>
            ))}
          </div>
        </div>
      )}

      {ramaActual && (
        <div ref={panelRama} className="scroll-mt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-accent">
              {ramaActual.nombre} · {ramaActual.procedimientos.length}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {ramaActual.propia && (
                <>
                  <button
                    onClick={() => {
                      cerrarFormulariosDeRama();
                      setNombreRenombre(ramaActual.nombre);
                      setRenombrandoRama(true);
                    }}
                    className="rounded-lg border border-edge/15 px-3 py-1.5 text-xs text-ink/70 hover:bg-surface2"
                  >
                    Renombrar rama
                  </button>
                  <button
                    onClick={() => {
                      cerrarFormulariosDeRama();
                      setQuitandoRama(true);
                    }}
                    className="rounded-lg border border-danger/30 px-3 py-1.5 text-xs text-danger hover:bg-danger/10"
                  >
                    Eliminar rama
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  setEspecialidadNuevo(ramaActual.nombre);
                  setEditando("nuevo");
                }}
                className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
              >
                + Agregar a {ramaActual.nombre}
              </button>
            </div>
          </div>
          {ramaActual.propia && renombrandoRama && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void renombrarRamaActual();
              }}
              className="mb-3 rounded-2xl border border-accent/30 bg-surface p-4"
            >
              <label className="mb-1 block text-xs font-medium text-ink/60" htmlFor="nombre-rama-renombre">
                Nuevo nombre de la rama (sus procedimientos se pasan con ella)
              </label>
              <div className="flex flex-wrap items-start gap-2">
                <input
                  id="nombre-rama-renombre"
                  autoFocus
                  type="text"
                  value={nombreRenombre}
                  onChange={(e) => {
                    setNombreRenombre(e.target.value);
                    setErrorRama("");
                  }}
                  maxLength={60}
                  className={`${inputClass} max-w-xs`}
                />
                <button type="submit" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black hover:opacity-90">
                  Guardar nombre
                </button>
                <button type="button" onClick={cerrarFormulariosDeRama} className="rounded-lg border border-edge/15 px-4 py-2 text-sm text-ink/70 hover:bg-surface2">
                  Cancelar
                </button>
              </div>
              {errorRama && (
                <p role="alert" className="mt-2 text-xs text-danger">
                  {errorRama}
                </p>
              )}
            </form>
          )}
          {ramaActual.propia && quitandoRama && (
            <div className="mb-3 rounded-2xl border border-danger/30 bg-surface p-4">
              <p className="text-sm text-ink">
                ¿Eliminar la rama «{ramaActual.nombre}»?{" "}
                {ramaActual.procedimientos.length > 0
                  ? `Sus ${ramaActual.procedimientos.length} procedimiento(s) no se borran: pasan a «Sin clasificar» para que los ubiques en otra rama.`
                  : "No tiene procedimientos."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => void quitarRamaActual()} className="rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
                  Sí, eliminar rama
                </button>
                <button onClick={cerrarFormulariosDeRama} className="rounded-lg border border-edge/15 px-4 py-2 text-sm text-ink/70 hover:bg-surface2">
                  Cancelar
                </button>
              </div>
              {errorRama && (
                <p role="alert" className="mt-2 text-xs text-danger">
                  {errorRama}
                </p>
              )}
            </div>
          )}
          {ramaActual.sinClasificar && (
            <p className="mb-2 text-xs text-ink/50">
              Aquí llegan los procedimientos que todavía no tienen rama (por ejemplo, los de una lista de precios con grupos propios). Elige en «Ubicar en» a qué rama
              pertenece cada uno y se pasa solo a su tarjeta.
            </p>
          )}
          {ramaActual.procedimientos.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-8 text-center text-sm text-ink/40">
              {ramaActual.sinClasificar ? "No hay nada por ubicar. Lo nuevo que no tenga rama llegará aquí." : "Esta rama todavía no tiene procedimientos."}
            </div>
          ) : (
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
                  {ramaActual.procedimientos.map((p) => {
                    const activo = esProcedimientoActivo(p);
                    const tieneGuia = Boolean(p.origenPlantillaId);
                    return (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", p.id);
                          e.dataTransfer.effectAllowed = "move";
                          idArrastrado.current = p.id;
                          // Se pinta en el siguiente ciclo: cambiar la pantalla dentro del dragstart puede cancelar el arrastre.
                          setTimeout(() => {
                            if (idArrastrado.current === p.id) setArrastrandoId(p.id);
                          }, 0);
                        }}
                        onDragEnd={terminarArrastre}
                        title="Arrástralo a la tarjeta de su rama para cambiarlo de lugar"
                        // Mientras se arrastra, la fila se pliega y deja su lugar libre (sigue en el documento: si se quita, el navegador pierde el arrastre).
                        style={arrastrandoId === p.id ? { height: 0, overflow: "hidden", padding: 0, opacity: 0 } : undefined}
                        className={`cursor-grab px-4 py-3 active:cursor-grabbing ${activo ? "" : "opacity-50"}`}
                      >
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
                            {/* Alternativa al arrastre (celular, tableta o teclado): el mismo cambio de rama con un selector. */}
                            <label className="flex basis-full items-center gap-2 text-xs font-normal text-ink/60">
                              {esSinClasificar(p) ? "Ubicar en:" : "Mover a:"}
                              <select
                                value=""
                                onChange={(e) => e.target.value && moverARama(p.id, e.target.value)}
                                aria-label={`${esSinClasificar(p) ? "Ubicar" : "Mover"} «${p.nombre}» en una rama`}
                                onDragStart={(e) => e.preventDefault()}
                                className="rounded-md border border-edge/10 bg-field px-2 py-1 text-xs text-ink outline-none focus:border-accent/60"
                              >
                                <option value="">Elige la rama…</option>
                                {ramas
                                  .filter((r) => r.nombre !== ramaActual.nombre)
                                  .map((r) => (
                                    <option key={r.nombre} value={r.nombre}>
                                      {r.nombre}
                                    </option>
                                  ))}
                              </select>
                              {esSinClasificar(p) && p.notasInternas?.startsWith("Grupo en la lista de precios:") && (
                                <span className="text-ink/40">({p.notasInternas.replace("Grupo en la lista de precios:", "venía en").trim()})</span>
                              )}
                            </label>

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
          )}
        </div>
      )}

      {editando && (
        <ProcedimientoDialog
          inicial={editando === "nuevo" ? null : editando}
          especialidadInicial={editando === "nuevo" ? especialidadNuevo : undefined}
          ramasPropias={ramas.filter((r) => r.propia).map((r) => r.nombre)}
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
      {mostrarAjuste && <AjustarPreciosDialog modoAprobacion={ajusteEnAprobacion} onClose={() => setMostrarAjuste(false)} />}
    </div>
  );
}
