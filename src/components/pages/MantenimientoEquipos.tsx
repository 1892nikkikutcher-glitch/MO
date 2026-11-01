"use client";

import { useMemo, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { toISODate } from "@/lib/agendaHelpers";
import { limpiarTelefono } from "@/lib/depositoDental";
import { puedeEliminarConRol, MENSAJE_ROL_SIN_PERMISO_ELIMINAR } from "@/lib/permisosRol";
import { manejarCambioNombre } from "@/lib/textoNombre";
import {
  aplicarRegistro,
  diasHasta,
  ESTADOS_EQUIPO,
  fallasAbiertas,
  garantiaVigente,
  mensajeAvisoIngeniero,
  OPCIONES_PERIODICIDAD,
  proximoMantenimiento,
  resolverFalla,
  resumenMantenimiento,
  situacionMantenimiento,
  TIPOS_REGISTRO_EQUIPO,
  ultimoServicio,
  type Equipo,
  type EstadoEquipo,
  type IngenieroBiomedico,
  type MotivoAviso,
  type RegistroEquipo,
  type SituacionMantenimiento,
  type TipoRegistroEquipo,
} from "@/lib/mantenimientoEquipos";
import ConfirmarEliminar from "@/components/ConfirmarEliminar";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";
const labelClass = "mb-1 block text-xs font-medium text-ink/60";
const botonPrimario =
  "rounded-lg border border-accent/60 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:opacity-40";
const botonSecundario =
  "rounded-lg border border-edge/15 px-4 py-2 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function fechaCorta(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  if (!a || !m || !d) return "";
  return `${d} ${MESES[m - 1]} ${a}`;
}

const estiloEstado: Record<EstadoEquipo, string> = {
  Operando: "bg-success/10 text-success",
  "Con falla": "bg-danger/10 text-danger",
  "En mantenimiento": "bg-accent/10 text-accent",
  "Fuera de servicio": "bg-edge/10 text-ink/50",
};

const estiloTipo: Record<TipoRegistroEquipo, string> = {
  "Mantenimiento preventivo": "bg-success/10 text-success",
  "Mantenimiento correctivo": "bg-accent/10 text-accent",
  Calibración: "bg-accent/10 text-accent",
  "Falla reportada": "bg-danger/10 text-danger",
  Otro: "bg-edge/10 text-ink/50",
};

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 21l1.4-4.2A8.5 8.5 0 1 1 8.3 20.5L3 21ZM8.5 8.3c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .5.3.2.4.6 1.4.7 1.5.1.1.1.3 0 .4-.1.2-.2.3-.3.4-.2.2-.3.3-.1.6.7 1.1 1.4 1.7 2.5 2.3.2.1.3.1.4-.1.2-.2.5-.6.7-.8.1-.2.3-.2.5-.1.5.2 1.3.6 1.5.7.2.1.3.1.4.3.1.2.1.9-.2 1.4-.3.5-1.1.9-1.6 1-.5 0-1.1.1-3.4-.9-2.4-1.1-3.9-3.5-4.1-3.7-.1-.2-1-1.3-1-2.5s.6-1.7.8-2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Modal({ titulo, onClose, children, ancho = "max-w-sm" }: { titulo: string; onClose: () => void; children: React.ReactNode; ancho?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
      <div className={`my-8 w-full ${ancho} rounded-2xl border border-edge/10 bg-modal p-6`}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">{titulo}</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Equipo

type FormEquipo = Omit<Equipo, "id" | "creadoEn">;

function equipoVacio(): FormEquipo {
  return {
    nombre: "",
    marca: "",
    modelo: "",
    numeroSerie: "",
    ubicacion: "",
    fechaCompra: "",
    proveedor: "",
    costo: "",
    garantiaHasta: "",
    estado: "Operando",
    periodicidadMeses: 6,
    ingenieroId: "",
    notas: "",
  };
}

function EquipoDialog({
  inicial,
  ingenieros,
  onClose,
  onGuardar,
}: {
  inicial: Equipo | null;
  ingenieros: IngenieroBiomedico[];
  onClose: () => void;
  onGuardar: (data: FormEquipo) => void;
}) {
  const [form, setForm] = useState<FormEquipo>(() => {
    if (!inicial) return equipoVacio();
    const { id: _id, creadoEn: _creadoEn, ...resto } = inicial;
    return { ...equipoVacio(), ...resto };
  });
  const set = <K extends keyof FormEquipo>(k: K, v: FormEquipo[K]) => setForm((p) => ({ ...p, [k]: v }));
  const puedeGuardar = form.nombre.trim().length > 0;

  return (
    <Modal titulo={inicial ? "Editar equipo" : "Nuevo equipo"} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Equipo</label>
          <input type="text" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Ej. Autoclave, Compresor, Rayos X" className={inputClass} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Marca</label>
            <input type="text" value={form.marca} onChange={(e) => set("marca", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Modelo</label>
            <input type="text" value={form.modelo} onChange={(e) => set("modelo", e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Número de serie</label>
            <input type="text" value={form.numeroSerie} onChange={(e) => set("numeroSerie", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Ubicación</label>
            <input type="text" value={form.ubicacion} onChange={(e) => set("ubicacion", e.target.value)} placeholder="Ej. Sillón 1" className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Fecha de compra</label>
            <input type="date" value={form.fechaCompra} onChange={(e) => set("fechaCompra", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Garantía hasta</label>
            <input type="date" value={form.garantiaHasta} onChange={(e) => set("garantiaHasta", e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Proveedor</label>
            <input type="text" value={form.proveedor} onChange={(e) => set("proveedor", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Costo</label>
            <input type="text" value={form.costo} onChange={(e) => set("costo", e.target.value)} placeholder="Ej. $85,000" className={inputClass} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Mantenimiento</label>
            <select value={form.periodicidadMeses} onChange={(e) => set("periodicidadMeses", Number(e.target.value))} className={inputClass}>
              {OPCIONES_PERIODICIDAD.map((o) => (
                <option key={o.meses} value={o.meses}>
                  {o.etiqueta}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Estado</label>
            <select value={form.estado} onChange={(e) => set("estado", e.target.value as EstadoEquipo)} className={inputClass}>
              {ESTADOS_EQUIPO.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Ingeniero biomédico</label>
          <select value={form.ingenieroId} onChange={(e) => set("ingenieroId", e.target.value)} className={inputClass}>
            <option value="">Sin asignar</option>
            {ingenieros.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nombre}
                {i.empresa ? ` — ${i.empresa}` : ""}
              </option>
            ))}
          </select>
          {ingenieros.length === 0 && <p className="mt-1 text-[11px] text-ink/40">Primero registra a tu ingeniero en «Ingenieros biomédicos».</p>}
        </div>
        <div>
          <label className={labelClass}>Notas</label>
          <textarea value={form.notas} onChange={(e) => set("notas", e.target.value)} rows={2} className={inputClass} />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className={botonSecundario}>
          Cancelar
        </button>
        <button onClick={() => puedeGuardar && onGuardar({ ...form, nombre: form.nombre.trim() })} disabled={!puedeGuardar} className={botonPrimario}>
          Guardar
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- Registro de bitácora

type FormRegistro = { tipo: TipoRegistroEquipo; fecha: string; descripcion: string; responsable: string; costo: string };

function RegistroDialog({
  equipo,
  tipoInicial,
  responsableInicial,
  onClose,
  onGuardar,
}: {
  equipo: Equipo;
  tipoInicial: TipoRegistroEquipo;
  responsableInicial: string;
  onClose: () => void;
  onGuardar: (data: FormRegistro) => void;
}) {
  const [form, setForm] = useState<FormRegistro>({ tipo: tipoInicial, fecha: toISODate(new Date()), descripcion: "", responsable: responsableInicial, costo: "" });
  const esFalla = form.tipo === "Falla reportada";
  const puedeGuardar = form.fecha.length > 0 && (!esFalla || form.descripcion.trim().length > 0);

  return (
    <Modal titulo={`${esFalla ? "Reportar falla" : "Registrar en la bitácora"} — ${equipo.nombre}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Tipo</label>
            <select value={form.tipo} onChange={(e) => setForm((p) => ({ ...p, tipo: e.target.value as TipoRegistroEquipo }))} className={inputClass}>
              {TIPOS_REGISTRO_EQUIPO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Fecha</label>
            <input type="date" value={form.fecha} onChange={(e) => setForm((p) => ({ ...p, fecha: e.target.value }))} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>{esFalla ? "¿Qué le pasa al equipo?" : "Qué se hizo"}</label>
          <textarea
            value={form.descripcion}
            onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
            rows={3}
            placeholder={esFalla ? "Ej. No llega a presión, hace ruido, se apaga solo…" : "Ej. Cambio de empaques y limpieza de cámara"}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>{esFalla ? "Quién la reporta" : "Quién dio el servicio"}</label>
            <input type="text" value={form.responsable} onChange={(e) => manejarCambioNombre(e, (v) => setForm((p) => ({ ...p, responsable: v })))} className={inputClass} />
          </div>
          {!esFalla && (
            <div>
              <label className={labelClass}>Costo</label>
              <input type="text" value={form.costo} onChange={(e) => setForm((p) => ({ ...p, costo: e.target.value }))} placeholder="Ej. $1,200" className={inputClass} />
            </div>
          )}
        </div>
        {esFalla && <p className="text-xs text-ink/40">El equipo quedará como «Con falla» y saldrá en Requieren Atención hasta que se registre su reparación.</p>}
        {(form.tipo === "Mantenimiento preventivo" || form.tipo === "Mantenimiento correctivo") && (
          <p className="text-xs text-ink/40">Si el equipo tenía una falla abierta, se marcará como resuelta y volverá a «Operando».</p>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className={botonSecundario}>
          Cancelar
        </button>
        <button onClick={() => puedeGuardar && onGuardar({ ...form, descripcion: form.descripcion.trim(), responsable: form.responsable.trim(), costo: esFalla ? "" : form.costo.trim() })} disabled={!puedeGuardar} className={botonPrimario}>
          Guardar
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- Bitácora de un equipo

function BitacoraDialog({
  equipo,
  registros,
  puedeEliminar,
  onClose,
  onRegistrar,
  onResolver,
  onEliminar,
}: {
  equipo: Equipo;
  registros: RegistroEquipo[];
  puedeEliminar: boolean;
  onClose: () => void;
  onRegistrar: () => void;
  onResolver: (id: string) => void;
  onEliminar: (r: RegistroEquipo) => void;
}) {
  const ordenados = [...registros].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn));
  return (
    <Modal titulo={`Bitácora — ${equipo.nombre}`} onClose={onClose} ancho="max-w-lg">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs text-ink/40">
          {ordenados.length === 0 ? "Todavía no hay registros." : `${ordenados.length} registro(s), del más reciente al más antiguo.`}
        </p>
        <button onClick={onRegistrar} className={botonPrimario}>
          + Registrar
        </button>
      </div>
      <div className="space-y-3">
        {ordenados.map((r) => (
          <div key={r.id} className="rounded-xl border border-edge/10 bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${estiloTipo[r.tipo]}`}>{r.tipo}</span>
              <span className="text-xs text-ink/50">{fechaCorta(r.fecha)}</span>
            </div>
            {r.descripcion && <p className="mt-2 text-sm text-ink/80">{r.descripcion}</p>}
            <p className="mt-1 text-xs text-ink/40">
              {[r.responsable && `${r.tipo === "Falla reportada" ? "Reportó" : "Hizo"}: ${r.responsable}`, r.costo && `Costo: ${r.costo}`, r.registradoPor && `Capturó ${r.registradoPor}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {r.tipo === "Falla reportada" && (
              <div className="mt-2 flex items-center gap-2">
                {r.resuelta ? (
                  <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">Resuelta</span>
                ) : (
                  <button onClick={() => onResolver(r.id)} className="rounded-lg border border-success/40 px-2.5 py-1 text-xs font-semibold text-success hover:bg-success/10">
                    Marcar como resuelta
                  </button>
                )}
              </div>
            )}
            {puedeEliminar && (
              <button onClick={() => onEliminar(r)} className="mt-2 text-xs text-danger/80 hover:text-danger">
                Eliminar registro
              </button>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- Ingenieros

type FormIngeniero = Omit<IngenieroBiomedico, "id">;
const ingenieroVacio = (): FormIngeniero => ({ nombre: "", empresa: "", telefono: "", correo: "", notas: "" });

function IngenierosDialog({
  ingenieros,
  puedeEliminar,
  onClose,
  onGuardar,
  onEliminar,
}: {
  ingenieros: IngenieroBiomedico[];
  puedeEliminar: boolean;
  onClose: () => void;
  onGuardar: (id: string | null, data: FormIngeniero) => void;
  onEliminar: (i: IngenieroBiomedico) => void;
}) {
  const [editandoId, setEditandoId] = useState<string | "nuevo" | null>(ingenieros.length === 0 ? "nuevo" : null);
  const [form, setForm] = useState<FormIngeniero>(ingenieroVacio());
  const puedeGuardar = form.nombre.trim().length > 0;

  const abrir = (i: IngenieroBiomedico | null) => {
    setForm(i ? { nombre: i.nombre, empresa: i.empresa, telefono: i.telefono, correo: i.correo, notas: i.notas } : ingenieroVacio());
    setEditandoId(i ? i.id : "nuevo");
  };

  return (
    <Modal titulo="Ingenieros biomédicos" onClose={onClose}>
      {editandoId === null ? (
        <>
          <div className="space-y-3">
            {ingenieros.map((i) => (
              <div key={i.id} className="rounded-xl border border-edge/10 bg-surface p-4">
                <p className="text-sm font-semibold text-ink">{i.nombre}</p>
                {i.empresa && <p className="text-xs text-ink/50">{i.empresa}</p>}
                {i.telefono && <p className="mt-1 text-xs text-ink/50">{i.telefono}</p>}
                {i.correo && <p className="text-xs text-ink/50">{i.correo}</p>}
                {i.notas && <p className="mt-1 text-xs text-ink/40">{i.notas}</p>}
                <div className="mt-3 flex gap-2">
                  <button onClick={() => abrir(i)} className="rounded-lg border border-edge/15 px-2.5 py-1 text-xs text-ink/70 hover:bg-surface2">
                    Editar
                  </button>
                  {puedeEliminar && (
                    <button onClick={() => onEliminar(i)} className="rounded-lg border border-danger/30 px-2.5 py-1 text-xs text-danger hover:bg-danger/10">
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-3">
            <button onClick={onClose} className={botonSecundario}>
              Cerrar
            </button>
            <button onClick={() => abrir(null)} className={botonPrimario}>
              + Nuevo ingeniero
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Nombre</label>
              <input type="text" value={form.nombre} onChange={(e) => manejarCambioNombre(e, (v) => setForm((p) => ({ ...p, nombre: v })))} placeholder="Ej. Ing. Laura Pérez" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Empresa</label>
              <input type="text" value={form.empresa} onChange={(e) => setForm((p) => ({ ...p, empresa: e.target.value }))} placeholder="Ej. Servicio Biomédico del Centro" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Teléfono</label>
                <input type="text" value={form.telefono} onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))} placeholder="Para WhatsApp" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Correo</label>
                <input type="email" value={form.correo} onChange={(e) => setForm((p) => ({ ...p, correo: e.target.value }))} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Notas</label>
              <textarea value={form.notas} onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))} rows={2} placeholder="Horarios, zonas que cubre, costo de visita…" className={inputClass} />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={() => (ingenieros.length === 0 ? onClose() : setEditandoId(null))} className={botonSecundario}>
              Cancelar
            </button>
            <button
              onClick={() => {
                if (!puedeGuardar) return;
                onGuardar(editandoId === "nuevo" ? null : editandoId, { ...form, nombre: form.nombre.trim() });
                setEditandoId(null);
              }}
              disabled={!puedeGuardar}
              className={botonPrimario}
            >
              Guardar
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------- Página

function ChipMantenimiento({ situacion, proximo, hoy }: { situacion: SituacionMantenimiento; proximo: string; hoy: Date }) {
  if (situacion === "sin-programa") return <span className="text-xs text-ink/40">Sin programa de mantenimiento</span>;
  const dias = diasHasta(proximo, hoy) ?? 0;
  const estilo = situacion === "vencido" ? "bg-danger/10 text-danger" : situacion === "proximo" ? "bg-accent/10 text-accent" : "bg-success/10 text-success";
  const texto =
    situacion === "vencido"
      ? `Mantenimiento vencido hace ${Math.abs(dias)} día(s)`
      : dias === 0
        ? "Mantenimiento hoy"
        : `Próximo mantenimiento en ${dias} día(s)`;
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${estilo}`} title={fechaCorta(proximo)}>
      {texto}
    </span>
  );
}

export default function MantenimientoEquipos() {
  const {
    equipos,
    setEquipos,
    registrosEquipos,
    setRegistrosEquipos,
    ingenierosBiomedicos,
    setIngenierosBiomedicos,
    clinicInfo,
    miRol,
    userEmail,
  } = usePatientData();

  const [pestana, setPestana] = useState<"equipos" | "bitacora">("equipos");
  const [editando, setEditando] = useState<Equipo | "nuevo" | null>(null);
  const [equipoAEliminar, setEquipoAEliminar] = useState<Equipo | null>(null);
  const [bitacoraDe, setBitacoraDe] = useState<string | null>(null);
  const [registrando, setRegistrando] = useState<{ equipoId: string; tipo: TipoRegistroEquipo } | null>(null);
  const [registroAEliminar, setRegistroAEliminar] = useState<RegistroEquipo | null>(null);
  const [verIngenieros, setVerIngenieros] = useState(false);
  const [ingenieroAEliminar, setIngenieroAEliminar] = useState<IngenieroBiomedico | null>(null);
  const [aviso, setAviso] = useState("");

  const hoy = new Date();
  const puedeEliminar = puedeEliminarConRol(miRol);
  const resumen = useMemo(() => resumenMantenimiento(equipos, registrosEquipos, new Date()), [equipos, registrosEquipos]);

  const equiposOrdenados = useMemo(() => {
    const peso = (e: Equipo) => {
      const idsFalla = new Set(resumen.conFalla.map((x) => x.id));
      if (idsFalla.has(e.id)) return 0;
      if (resumen.vencidos.some((x) => x.id === e.id)) return 1;
      if (resumen.proximos.some((x) => x.id === e.id)) return 2;
      return e.estado === "Fuera de servicio" ? 4 : 3;
    };
    return [...equipos].sort((a, b) => peso(a) - peso(b) || a.nombre.localeCompare(b.nombre, "es"));
  }, [equipos, resumen]);

  const equipoPorId = (id: string) => equipos.find((e) => e.id === id);
  const ingenieroDe = (e: Equipo) => ingenierosBiomedicos.find((i) => i.id === e.ingenieroId);

  const guardarEquipo = (data: Omit<Equipo, "id" | "creadoEn">) => {
    if (editando && editando !== "nuevo") {
      setEquipos((prev) => prev.map((e) => (e.id === editando.id ? { ...e, ...data } : e)));
    } else {
      const nuevo: Equipo = { id: `eq${Date.now()}`, creadoEn: new Date().toISOString(), ...data };
      setEquipos((prev) => [nuevo, ...prev]);
    }
    setEditando(null);
  };

  const eliminarEquipo = (e: Equipo) => {
    setEquipos((prev) => prev.filter((x) => x.id !== e.id));
    setRegistrosEquipos((prev) => prev.filter((r) => r.equipoId !== e.id));
    setEquipoAEliminar(null);
    if (bitacoraDe === e.id) setBitacoraDe(null);
  };

  const guardarRegistro = (equipo: Equipo, data: { tipo: TipoRegistroEquipo; fecha: string; descripcion: string; responsable: string; costo: string }) => {
    const nuevo: RegistroEquipo = {
      id: `reg${Date.now()}`,
      equipoId: equipo.id,
      ...data,
      resuelta: false,
      registradoPor: userEmail,
      creadoEn: new Date().toISOString(),
    };
    const r = aplicarRegistro(equipo, registrosEquipos, nuevo);
    setRegistrosEquipos(() => r.registros);
    if (r.equipo !== equipo) setEquipos((prev) => prev.map((e) => (e.id === equipo.id ? r.equipo : e)));
    setRegistrando(null);
  };

  const resolver = (equipo: Equipo, registroId: string) => {
    const r = resolverFalla(equipo, registrosEquipos, registroId);
    setRegistrosEquipos(() => r.registros);
    if (r.equipo !== equipo) setEquipos((prev) => prev.map((e) => (e.id === equipo.id ? r.equipo : e)));
  };

  const avisarIngeniero = (equipo: Equipo, motivo: MotivoAviso) => {
    const ing = ingenieroDe(equipo);
    const texto = mensajeAvisoIngeniero({ clinica: clinicInfo?.nombre ?? "", equipo, registros: registrosEquipos, motivo, ingeniero: ing });
    const telefono = ing?.telefono ? limpiarTelefono(ing.telefono) : "";
    setAviso(telefono ? "" : `${equipo.nombre} no tiene un ingeniero con teléfono asignado: elige a quién enviarle el mensaje en WhatsApp o asígnalo en «Editar».`);
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`, "_blank");
  };

  const guardarIngeniero = (id: string | null, data: Omit<IngenieroBiomedico, "id">) => {
    if (id) setIngenierosBiomedicos((prev) => prev.map((i) => (i.id === id ? { id, ...data } : i)));
    else {
      // El id se crea fuera del updater: React lo ejecuta dos veces en desarrollo y saldrían dos registros.
      const nuevo: IngenieroBiomedico = { id: `ing${Date.now()}`, ...data };
      setIngenierosBiomedicos((prev) => [nuevo, ...prev]);
    }
  };

  const equipoBitacora = bitacoraDe ? equipoPorId(bitacoraDe) : undefined;
  const equipoRegistrando = registrando ? equipoPorId(registrando.equipoId) : undefined;
  const bitacoraGeneral = [...registrosEquipos].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-xs text-ink/40">
          Inventario de tus equipos con su bitácora de mantenimientos y fallas. Cuando algo falla o le toca servicio, avisa al ingeniero biomédico
          por WhatsApp con los datos del equipo ya escritos.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setVerIngenieros(true)} className="rounded-lg border border-edge/15 px-4 py-2 text-xs font-semibold text-ink/80 transition-colors hover:bg-surface">
            Ingenieros biomédicos ({ingenierosBiomedicos.length})
          </button>
          <button
            onClick={() => setEditando("nuevo")}
            className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
            style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
          >
            + Nuevo equipo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { etiqueta: "Equipos", valor: equipos.length, tono: "text-ink" },
          { etiqueta: "Con falla", valor: resumen.conFalla.length, tono: resumen.conFalla.length ? "text-danger" : "text-ink" },
          { etiqueta: "Mantenimiento vencido", valor: resumen.vencidos.length, tono: resumen.vencidos.length ? "text-danger" : "text-ink" },
          { etiqueta: "Próximos (15 días)", valor: resumen.proximos.length, tono: resumen.proximos.length ? "text-accent" : "text-ink" },
        ].map((t) => (
          <div key={t.etiqueta} className="rounded-2xl border border-edge/10 bg-surface p-4">
            <p className="text-[11px] uppercase tracking-wide text-ink/40">{t.etiqueta}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${t.tono}`}>{t.valor}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        {(["equipos", "bitacora"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPestana(p)}
            aria-pressed={pestana === p}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              pestana === p ? "border-accent/60 bg-accent/15 text-accent" : "border-edge/15 text-ink/70 hover:bg-surface"
            }`}
          >
            {p === "equipos" ? "Equipos" : "Bitácora general"}
          </button>
        ))}
      </div>

      {aviso && <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs text-ink/70">{aviso}</div>}

      {pestana === "equipos" ? (
        equipos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
            Aún no hay equipos registrados. Agrega tu autoclave, compresor, rayos X o sillones con «+ Nuevo equipo».
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {equiposOrdenados.map((e) => {
              const situacion = situacionMantenimiento(e, registrosEquipos, hoy);
              const proximo = proximoMantenimiento(e, registrosEquipos);
              const ultimo = ultimoServicio(e.id, registrosEquipos);
              const abiertas = fallasAbiertas(e.id, registrosEquipos);
              const ing = ingenieroDe(e);
              const motivo: MotivoAviso = e.estado === "Con falla" || abiertas.length > 0 ? "falla" : "mantenimiento";
              return (
                <div key={e.id} className="flex flex-col rounded-2xl border border-edge/10 bg-surface p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-ink">{e.nombre}</p>
                      {(e.marca || e.modelo) && <p className="text-xs text-ink/50">{[e.marca, e.modelo].filter(Boolean).join(" ")}</p>}
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${estiloEstado[e.estado]}`}>{e.estado}</span>
                  </div>

                  <div className="mt-3 space-y-0.5 text-xs text-ink/60">
                    {e.ubicacion && (
                      <p>
                        <span className="text-ink/40">Ubicación: </span>
                        {e.ubicacion}
                      </p>
                    )}
                    {e.numeroSerie && (
                      <p>
                        <span className="text-ink/40">Serie: </span>
                        {e.numeroSerie}
                      </p>
                    )}
                    {e.fechaCompra && (
                      <p>
                        <span className="text-ink/40">Comprado: </span>
                        {fechaCorta(e.fechaCompra)}
                        {e.costo ? ` · ${e.costo}` : ""}
                      </p>
                    )}
                    {e.garantiaHasta && (
                      <p>
                        <span className="text-ink/40">Garantía: </span>
                        {garantiaVigente(e, hoy) ? `vigente hasta ${fechaCorta(e.garantiaHasta)}` : `venció el ${fechaCorta(e.garantiaHasta)}`}
                      </p>
                    )}
                    <p>
                      <span className="text-ink/40">Último servicio: </span>
                      {ultimo ? fechaCorta(ultimo) : "sin registro"}
                    </p>
                    <p>
                      <span className="text-ink/40">Ingeniero: </span>
                      {ing ? ing.nombre : "sin asignar"}
                    </p>
                  </div>

                  <div className="my-3 flex flex-wrap items-center gap-2">
                    {abiertas.length > 0 && (
                      <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-[11px] font-semibold text-danger">{abiertas.length} falla(s) abierta(s)</span>
                    )}
                    {e.estado !== "Fuera de servicio" && <ChipMantenimiento situacion={situacion} proximo={proximo} hoy={hoy} />}
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-edge/10 pt-3">
                    <button onClick={() => setBitacoraDe(e.id)} className="rounded-lg border border-accent/40 px-2.5 py-1 text-xs font-semibold text-accent hover:bg-accent/10">
                      Bitácora
                    </button>
                    <button onClick={() => setRegistrando({ equipoId: e.id, tipo: "Falla reportada" })} className="rounded-lg border border-danger/40 px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger/10">
                      Reportar falla
                    </button>
                    <button onClick={() => avisarIngeniero(e, motivo)} className="flex items-center gap-1.5 rounded-lg border border-success/40 px-2.5 py-1 text-xs font-semibold text-success hover:bg-success/10">
                      <WhatsAppIcon />
                      Avisar al ingeniero
                    </button>
                    <button onClick={() => setEditando(e)} className="rounded-lg border border-edge/15 px-2.5 py-1 text-xs text-ink/70 hover:bg-surface2">
                      Editar
                    </button>
                    {puedeEliminar && (
                      <button onClick={() => setEquipoAEliminar(e)} className="rounded-lg border border-danger/30 px-2.5 py-1 text-xs text-danger hover:bg-danger/10">
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : bitacoraGeneral.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          La bitácora se llena sola cuando reportas una falla o registras un mantenimiento.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-edge/10 text-[11px] uppercase tracking-wide text-ink/40">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Equipo</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Detalle</th>
                <th className="px-4 py-3 font-medium">Costo</th>
              </tr>
            </thead>
            <tbody>
              {bitacoraGeneral.map((r) => (
                <tr key={r.id} className="border-b border-edge/5 last:border-0">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-ink/60">{fechaCorta(r.fecha)}</td>
                  <td className="px-4 py-3 text-ink">{equipoPorId(r.equipoId)?.nombre ?? "(equipo eliminado)"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${estiloTipo[r.tipo]}`}>{r.tipo}</span>
                    {r.tipo === "Falla reportada" && r.resuelta && <span className="ml-1 text-[11px] text-success">resuelta</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink/70">
                    {r.descripcion || "—"}
                    {r.responsable && <span className="text-ink/40"> · {r.responsable}</span>}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-ink/60">{r.costo || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editando && <EquipoDialog inicial={editando === "nuevo" ? null : editando} ingenieros={ingenierosBiomedicos} onClose={() => setEditando(null)} onGuardar={guardarEquipo} />}

      {equipoBitacora && (
        <BitacoraDialog
          equipo={equipoBitacora}
          registros={registrosEquipos.filter((r) => r.equipoId === equipoBitacora.id)}
          puedeEliminar={puedeEliminar}
          onClose={() => setBitacoraDe(null)}
          onRegistrar={() => setRegistrando({ equipoId: equipoBitacora.id, tipo: "Mantenimiento preventivo" })}
          onResolver={(id) => resolver(equipoBitacora, id)}
          onEliminar={setRegistroAEliminar}
        />
      )}

      {registrando && equipoRegistrando && (
        <RegistroDialog
          equipo={equipoRegistrando}
          tipoInicial={registrando.tipo}
          responsableInicial={registrando.tipo === "Falla reportada" ? "" : (ingenieroDe(equipoRegistrando)?.nombre ?? "")}
          onClose={() => setRegistrando(null)}
          onGuardar={(data) => guardarRegistro(equipoRegistrando, data)}
        />
      )}

      {verIngenieros && (
        <IngenierosDialog
          ingenieros={ingenierosBiomedicos}
          puedeEliminar={puedeEliminar}
          onClose={() => setVerIngenieros(false)}
          onGuardar={guardarIngeniero}
          onEliminar={setIngenieroAEliminar}
        />
      )}

      {equipoAEliminar && (
        <ConfirmarEliminar
          titulo="¿Eliminar este equipo?"
          mensaje={`Vas a eliminar "${equipoAEliminar.nombre}" y todo su historial de mantenimientos y fallas. Quedará guardado en la Papelera por si necesitas recuperarlo.`}
          onCancel={() => setEquipoAEliminar(null)}
          onConfirm={() => eliminarEquipo(equipoAEliminar)}
        />
      )}

      {registroAEliminar && (
        <ConfirmarEliminar
          titulo="¿Eliminar este registro?"
          mensaje={`Vas a quitar "${registroAEliminar.tipo}" del ${fechaCorta(registroAEliminar.fecha)} de la bitácora. Quedará guardado en la Papelera.`}
          onCancel={() => setRegistroAEliminar(null)}
          onConfirm={() => {
            setRegistrosEquipos((prev) => prev.filter((r) => r.id !== registroAEliminar.id));
            setRegistroAEliminar(null);
          }}
        />
      )}

      {ingenieroAEliminar && (
        <ConfirmarEliminar
          titulo="¿Eliminar este ingeniero?"
          mensaje={`Vas a eliminar a "${ingenieroAEliminar.nombre}". Los equipos que lo tenían asignado quedarán sin ingeniero. Quedará guardado en la Papelera.`}
          onCancel={() => setIngenieroAEliminar(null)}
          onConfirm={() => {
            const id = ingenieroAEliminar.id;
            setIngenierosBiomedicos((prev) => prev.filter((i) => i.id !== id));
            setEquipos((prev) => prev.map((e) => (e.ingenieroId === id ? { ...e, ingenieroId: "" } : e)));
            setIngenieroAEliminar(null);
          }}
        />
      )}

      {!puedeEliminar && <p className="text-[11px] text-ink/30">{MENSAJE_ROL_SIN_PERMISO_ELIMINAR}</p>}
    </div>
  );
}
