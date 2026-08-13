"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import {
  tipoFaltanteOptions,
  urgenciaFaltanteOptions,
  estadoCaducidad,
  limpiarTelefono,
  buildMensajeDeposito,
  buildMensajeRecordatorio,
  urgenciaDe,
  type Deposito,
  type ArticuloFaltante,
  type ArticuloCaducidad,
  type TipoFaltante,
  type UrgenciaFaltante,
} from "@/lib/depositoDental";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function CardShell({ title, subtitle, action, children }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-ink/40">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

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

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6h14Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AgregarDepositoDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: Omit<Deposito, "id">) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");

  const puedeGuardar = nombre.trim().length > 0 && telefono.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Agregar Depósito</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Depósito Dental del Centro"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Dirección</label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Calle, número, colonia"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Teléfono (WhatsApp)
            </label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej. 7221234567"
              className={inputClass}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-edge/15 px-4 py-2 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Cancelar
          </button>
          <button
            onClick={() =>
              puedeGuardar &&
              onAdd({ nombre: nombre.trim(), direccion: direccion.trim(), telefono: telefono.trim() })
            }
            disabled={!puedeGuardar}
            className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-5 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function AgregarFaltanteDialog({
  depositos,
  onClose,
  onAdd,
}: {
  depositos: Deposito[];
  onClose: () => void;
  onAdd: (data: Omit<ArticuloFaltante, "id" | "creadoEn" | "surtido">) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoFaltante>(tipoFaltanteOptions[0]);
  const [cantidad, setCantidad] = useState("");
  const [urgencia, setUrgencia] = useState<UrgenciaFaltante>("Media");
  const [depositoId, setDepositoId] = useState("");

  const puedeGuardar = nombre.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Agregar Faltante</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Artículo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Guantes talla M"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Tipo</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoFaltante)}
                className={inputClass}
              >
                {tipoFaltanteOptions.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Cantidad</label>
              <input
                type="text"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="Ej. 2 cajas"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Urgencia de compra
            </label>
            <select
              value={urgencia}
              onChange={(e) => setUrgencia(e.target.value as UrgenciaFaltante)}
              className={inputClass}
            >
              {urgenciaFaltanteOptions.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Depósito (opcional)
            </label>
            <select
              value={depositoId}
              onChange={(e) => setDepositoId(e.target.value)}
              className={inputClass}
            >
              <option value="">Sin asignar</option>
              {depositos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-edge/15 px-4 py-2 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Cancelar
          </button>
          <button
            onClick={() =>
              puedeGuardar &&
              onAdd({ nombre: nombre.trim(), tipo, cantidad: cantidad.trim(), urgencia, depositoId })
            }
            disabled={!puedeGuardar}
            className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-5 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function AgregarCaducidadDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: Omit<ArticuloCaducidad, "id" | "creadoEn">) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [lote, setLote] = useState("");
  const [fechaCaducidad, setFechaCaducidad] = useState("");

  const puedeGuardar = nombre.trim().length > 0 && fechaCaducidad.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Agregar Producto</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Cemento o medicamento
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Cemento de ionómero de vidrio"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Lote (opcional)</label>
            <input
              type="text"
              value={lote}
              onChange={(e) => setLote(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Fecha de caducidad
            </label>
            <input
              type="date"
              value={fechaCaducidad}
              onChange={(e) => setFechaCaducidad(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-edge/15 px-4 py-2 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Cancelar
          </button>
          <button
            onClick={() =>
              puedeGuardar && onAdd({ nombre: nombre.trim(), lote: lote.trim(), fechaCaducidad })
            }
            disabled={!puedeGuardar}
            className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-5 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

const urgenciaEstilos: Record<UrgenciaFaltante, string> = {
  Alta: "bg-danger/10 text-danger",
  Media: "bg-accent/10 text-accent",
  Baja: "bg-success/10 text-success",
};

const estadoCaducidadEstilos: Record<string, string> = {
  vigente: "bg-success/10 text-success",
  "por-vencer": "bg-accent/10 text-accent",
  caducado: "bg-danger/10 text-danger",
};

const estadoCaducidadLabel: Record<string, string> = {
  vigente: "Vigente",
  "por-vencer": "Por vencer",
  caducado: "Caducado",
};

export default function DepositoDental() {
  const {
    depositos,
    setDepositos,
    articulosFaltantes,
    setArticulosFaltantes,
    articulosCaducidad,
    setArticulosCaducidad,
    clinicInfo,
    perfilDoctor,
  } = usePatientData();

  const [showDeposito, setShowDeposito] = useState(false);
  const [showFaltante, setShowFaltante] = useState(false);
  const [showCaducidad, setShowCaducidad] = useState(false);

  const clinicaNombre = clinicInfo?.nombre || perfilDoctor.nombre || "";

  const enviarWhatsAppDeposito = (deposito: Deposito) => {
    const pendientes = articulosFaltantes.filter(
      (a) => !a.surtido && (a.depositoId === deposito.id || !a.depositoId)
    );
    const texto = buildMensajeDeposito(clinicaNombre, pendientes);
    window.open(
      `https://wa.me/${limpiarTelefono(deposito.telefono)}?text=${encodeURIComponent(texto)}`,
      "_blank"
    );
  };

  const enviarRecordatorio = () => {
    const pendientes = articulosFaltantes.filter((a) => !a.surtido);
    const texto = buildMensajeRecordatorio(pendientes);
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <CardShell
        title="Depósitos Dentales"
        subtitle="Proveedores con los que surtes instrumental, material y equipo."
        action={
          <button
            onClick={() => setShowDeposito(true)}
            className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
          >
            + Agregar Depósito
          </button>
        }
      >
        {depositos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-edge/15 p-8 text-center text-sm text-ink/30">
            Aún no hay depósitos registrados.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {depositos.map((d) => (
              <div key={d.id} className="rounded-xl border border-edge/10 bg-inset p-4">
                <p className="text-sm font-semibold text-ink">{d.nombre}</p>
                <p className="mt-1 text-xs text-ink/50">{d.direccion || "Sin dirección"}</p>
                <p className="text-xs text-ink/50">{d.telefono}</p>
                <div className="mt-3 flex items-center gap-2 border-t border-edge/10 pt-3">
                  <button
                    onClick={() => enviarWhatsAppDeposito(d)}
                    className="flex items-center gap-1.5 rounded-lg border border-success/30 px-2.5 py-1.5 text-xs font-semibold text-success/80 transition-colors hover:border-success hover:text-success"
                  >
                    <WhatsAppIcon />
                    Pedir / Cotizar
                  </button>
                  <button
                    onClick={() => setDepositos((prev) => prev.filter((x) => x.id !== d.id))}
                    title="Eliminar"
                    className="ml-auto flex h-7 w-7 items-center justify-center rounded-full border border-danger/20 text-danger/50 transition-colors hover:border-danger/60 hover:text-danger"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardShell>

      <CardShell
        title="Faltantes por Surtir"
        subtitle="Instrumental, material o equipo que necesitas reponer."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={enviarRecordatorio}
              className="flex items-center gap-1.5 rounded-lg border border-success/30 px-3 py-2 text-xs font-semibold text-success/80 transition-colors hover:border-success hover:text-success"
            >
              <WhatsAppIcon />
              Enviar Recordatorio
            </button>
            <button
              onClick={() => setShowFaltante(true)}
              className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
            >
              + Agregar Faltante
            </button>
          </div>
        }
      >
        {articulosFaltantes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-edge/15 p-8 text-center text-sm text-ink/30">
            No hay artículos faltantes registrados.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-edge/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                  <th className="px-4 py-3 font-medium">Artículo</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Cantidad</th>
                  <th className="px-4 py-3 font-medium">Urgencia</th>
                  <th className="px-4 py-3 font-medium">Depósito</th>
                  <th className="px-4 py-3 font-medium">Estatus</th>
                  <th className="px-4 py-3 text-right font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {articulosFaltantes.map((a) => (
                  <tr key={a.id} className="border-b border-edge/5 last:border-0">
                    <td className="px-4 py-3 text-ink/80">{a.nombre}</td>
                    <td className="px-4 py-3 text-ink/60">{a.tipo}</td>
                    <td className="px-4 py-3 text-ink/60">{a.cantidad || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${urgenciaEstilos[urgenciaDe(a)]}`}
                      >
                        {urgenciaDe(a)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink/60">
                      {depositos.find((d) => d.id === a.depositoId)?.nombre ?? "Sin asignar"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          setArticulosFaltantes((prev) =>
                            prev.map((x) => (x.id === a.id ? { ...x, surtido: !x.surtido } : x))
                          )
                        }
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                          a.surtido ? "bg-success/10 text-success" : "bg-accent/10 text-accent"
                        }`}
                      >
                        {a.surtido ? "Surtido" : "Pendiente"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() =>
                          setArticulosFaltantes((prev) => prev.filter((x) => x.id !== a.id))
                        }
                        title="Eliminar"
                        className="ml-auto flex h-7 w-7 items-center justify-center rounded-full border border-danger/20 text-danger/50 transition-colors hover:border-danger/60 hover:text-danger"
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardShell>

      <CardShell
        title="Control de Caducidades"
        subtitle="Fechas de caducidad de cementos y medicamentos, para cambiarlos a tiempo."
        action={
          <button
            onClick={() => setShowCaducidad(true)}
            className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
          >
            + Agregar Producto
          </button>
        }
      >
        {articulosCaducidad.length === 0 ? (
          <div className="rounded-xl border border-dashed border-edge/15 p-8 text-center text-sm text-ink/30">
            No hay productos con fecha de caducidad registrada.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-edge/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                  <th className="px-4 py-3 font-medium">Producto</th>
                  <th className="px-4 py-3 font-medium">Lote</th>
                  <th className="px-4 py-3 font-medium">Fecha de caducidad</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 text-right font-medium">Acción</th>
                </tr>
              </thead>
              <tbody>
                {[...articulosCaducidad]
                  .sort((a, b) => a.fechaCaducidad.localeCompare(b.fechaCaducidad))
                  .map((a) => {
                    const estado = estadoCaducidad(a.fechaCaducidad);
                    return (
                      <tr key={a.id} className="border-b border-edge/5 last:border-0">
                        <td className="px-4 py-3 text-ink/80">{a.nombre}</td>
                        <td className="px-4 py-3 text-ink/60">{a.lote || "—"}</td>
                        <td className="px-4 py-3 text-ink/60">{a.fechaCaducidad}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${estadoCaducidadEstilos[estado]}`}
                          >
                            {estadoCaducidadLabel[estado]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() =>
                              setArticulosCaducidad((prev) => prev.filter((x) => x.id !== a.id))
                            }
                            title="Eliminar"
                            className="ml-auto flex h-7 w-7 items-center justify-center rounded-full border border-danger/20 text-danger/50 transition-colors hover:border-danger/60 hover:text-danger"
                          >
                            <TrashIcon />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </CardShell>

      {showDeposito && (
        <AgregarDepositoDialog
          onClose={() => setShowDeposito(false)}
          onAdd={(data) => {
            const nuevo: Deposito = { id: `d${Date.now()}`, ...data };
            setDepositos((prev) => [nuevo, ...prev]);
            setShowDeposito(false);
          }}
        />
      )}

      {showFaltante && (
        <AgregarFaltanteDialog
          depositos={depositos}
          onClose={() => setShowFaltante(false)}
          onAdd={(data) => {
            const nuevo: ArticuloFaltante = {
              id: `f${Date.now()}`,
              creadoEn: new Date().toISOString(),
              surtido: false,
              ...data,
            };
            setArticulosFaltantes((prev) => [nuevo, ...prev]);
            setShowFaltante(false);
          }}
        />
      )}

      {showCaducidad && (
        <AgregarCaducidadDialog
          onClose={() => setShowCaducidad(false)}
          onAdd={(data) => {
            const nuevo: ArticuloCaducidad = {
              id: `c${Date.now()}`,
              creadoEn: new Date().toISOString(),
              ...data,
            };
            setArticulosCaducidad((prev) => [nuevo, ...prev]);
            setShowCaducidad(false);
          }}
        />
      )}
    </div>
  );
}
