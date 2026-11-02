"use client";

import { useEffect, useMemo, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import {
  CONFIG_TIMBRADO_INICIAL,
  MOTIVOS_CANCELACION_SAT,
  TRATAMIENTOS_IVA,
  faltantesConfigTimbrado,
  type ConfigTimbrado,
  type TratamientoIva,
} from "@/lib/timbrado";
import { cancelarFacturaSatApi, descargarFacturaApi, estadoTimbradoApi, timbrarFacturaApi, type EstadoPac } from "@/lib/timbradoApi";
import { toISODate } from "@/lib/agendaHelpers";
import { exportarCsv } from "@/lib/exportCsv";
import { limpiarTelefono } from "@/lib/depositoDental";
import {
  DATOS_FISCALES_VACIOS,
  ENCABEZADOS_CSV_FACTURAS,
  REGIMENES_FISCALES,
  USOS_CFDI,
  etiquetaFolio,
  faltantesFiscales,
  filasCsvFacturas,
  filtrarFacturas,
  folioFiscalValido,
  folioRepetido,
  formaPagoDeGrupo,
  mensajeFacturaLista,
  mensajeSolicitarDatosFiscales,
  nombreRegimen,
  pagosPendientesDeFacturar,
  resumenFacturas,
  rfcValido,
  seriesUsadas,
  siguienteFolio,
  totalDePagos,
  type DatosFiscales,
  type Factura,
  type FiltroFacturas,
  type PagoPendienteDeFacturar,
} from "@/lib/facturacion";
import { formatCurrency } from "@/lib/patientData";
import { manejarCambioNombre } from "@/lib/textoNombre";
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
  if (!a || !m || !d) return iso;
  return `${d} ${MESES[m - 1]} ${a}`;
}

function Modal({ titulo, onClose, children, ancho = "max-w-md" }: { titulo: string; onClose: () => void; children: React.ReactNode; ancho?: string }) {
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

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
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

function abrirWhatsApp(telefono: string, texto: string) {
  window.open(`https://wa.me/${limpiarTelefono(telefono)}?text=${encodeURIComponent(texto)}`, "_blank");
}

// ---------------------------------------------------------------- Datos fiscales del paciente

function DatosFiscalesDialog({
  paciente,
  inicial,
  onClose,
  onGuardar,
}: {
  paciente: string;
  inicial: DatosFiscales | undefined;
  onClose: () => void;
  onGuardar: (d: DatosFiscales) => void;
}) {
  const [form, setForm] = useState<DatosFiscales>({ ...DATOS_FISCALES_VACIOS, ...inicial });
  const set = <K extends keyof DatosFiscales>(k: K, v: DatosFiscales[K]) => setForm((p) => ({ ...p, [k]: v }));
  const rfcMalo = form.rfc.trim().length > 0 && !rfcValido(form.rfc);
  const cpMalo = form.codigoPostal.trim().length > 0 && !/^\d{5}$/.test(form.codigoPostal.trim());
  const puedeGuardar = !rfcMalo && !cpMalo;

  return (
    <Modal titulo={`Datos fiscales — ${paciente}`} onClose={onClose}>
      <p className="mb-4 text-xs text-ink/40">Están en la Constancia de Situación Fiscal del paciente. Se guardan en su expediente y se usan en cada factura.</p>
      <div className="space-y-4">
        <div>
          <label className={labelClass}>RFC</label>
          <input
            type="text"
            value={form.rfc}
            onChange={(e) => set("rfc", e.target.value.toUpperCase().replace(/\s/g, ""))}
            maxLength={13}
            placeholder="Ej. LOPA800101ABC"
            className={inputClass}
          />
          {rfcMalo && <p className="mt-1 text-[11px] text-danger">El RFC no tiene el formato correcto (12 o 13 caracteres).</p>}
        </div>
        <div>
          <label className={labelClass}>Nombre o razón social</label>
          <input type="text" value={form.razonSocial} onChange={(e) => manejarCambioNombre(e, (v) => set("razonSocial", v))} placeholder="Como aparece en su constancia" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Régimen fiscal</label>
          <select value={form.regimenFiscal} onChange={(e) => set("regimenFiscal", e.target.value)} className={inputClass}>
            <option value="">Elige…</option>
            {REGIMENES_FISCALES.map((r) => (
              <option key={r.clave} value={r.clave}>
                {r.clave} · {r.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>C.P. fiscal</label>
            <input type="text" inputMode="numeric" value={form.codigoPostal} onChange={(e) => set("codigoPostal", e.target.value.replace(/\D/g, "").slice(0, 5))} className={inputClass} />
            {cpMalo && <p className="mt-1 text-[11px] text-danger">Son 5 dígitos.</p>}
          </div>
          <div>
            <label className={labelClass}>Uso de CFDI</label>
            <select value={form.usoCfdi} onChange={(e) => set("usoCfdi", e.target.value)} className={inputClass}>
              {USOS_CFDI.map((u) => (
                <option key={u.clave} value={u.clave}>
                  {u.clave} · {u.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Correo para la factura</label>
          <input type="email" value={form.correo} onChange={(e) => set("correo", e.target.value)} className={inputClass} />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className={botonSecundario}>
          Cancelar
        </button>
        <button onClick={() => puedeGuardar && onGuardar({ ...form, rfc: form.rfc.trim(), razonSocial: form.razonSocial.trim(), correo: form.correo.trim() })} disabled={!puedeGuardar} className={botonPrimario}>
          Guardar
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- Registrar / editar factura

type FormFactura = { serie: string; folio: string; uuid: string; fecha: string; notas: string };

function FacturaDialog({
  titulo,
  resumen,
  inicial,
  facturas,
  ignorarId,
  onClose,
  onGuardar,
}: {
  titulo: string;
  resumen: { paciente: string; rfc: string; total: number; pagos: number };
  inicial: FormFactura;
  facturas: Factura[];
  ignorarId?: string;
  onClose: () => void;
  onGuardar: (f: FormFactura) => void;
}) {
  const [form, setForm] = useState<FormFactura>(inicial);
  const set = <K extends keyof FormFactura>(k: K, v: FormFactura[K]) => setForm((p) => ({ ...p, [k]: v }));
  const repetido = folioRepetido(facturas, form.serie, form.folio, ignorarId);
  const uuidMalo = form.uuid.trim().length > 0 && !folioFiscalValido(form.uuid);
  const puedeGuardar = form.folio.trim().length > 0 && form.fecha.length > 0 && !repetido && !uuidMalo;

  return (
    <Modal titulo={titulo} onClose={onClose}>
      <div className="mb-4 rounded-xl border border-edge/10 bg-surface p-3 text-xs text-ink/70">
        <p className="font-semibold text-ink">{resumen.paciente}</p>
        <p>
          RFC {resumen.rfc} · {resumen.pagos} pago(s) · <span className="font-semibold text-ink">{formatCurrency(resumen.total)}</span>
        </p>
      </div>
      <p className="mb-4 text-xs text-ink/40">
        Registra aquí la factura que ya emitiste en tu sistema de facturación (o con tu contador) para que el cobro quede ligado a ella.
      </p>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Serie</label>
            <input type="text" value={form.serie} onChange={(e) => set("serie", e.target.value.toUpperCase())} placeholder="A" className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Folio</label>
            <input type="text" value={form.folio} onChange={(e) => set("folio", e.target.value)} className={inputClass} />
            {repetido && <p className="mt-1 text-[11px] text-danger">Ya existe una factura vigente con ese folio.</p>}
          </div>
        </div>
        <div>
          <label className={labelClass}>Folio fiscal (UUID) — opcional</label>
          <input type="text" value={form.uuid} onChange={(e) => set("uuid", e.target.value.trim())} placeholder="00000000-0000-0000-0000-000000000000" className={inputClass} />
          {uuidMalo && <p className="mt-1 text-[11px] text-danger">El folio fiscal debe tener el formato 8-4-4-4-12.</p>}
        </div>
        <div>
          <label className={labelClass}>Fecha de la factura</label>
          <input type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} className={inputClass} />
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
        <button onClick={() => puedeGuardar && onGuardar({ ...form, folio: form.folio.trim(), serie: form.serie.trim() })} disabled={!puedeGuardar} className={botonPrimario}>
          Guardar factura
        </button>
      </div>
    </Modal>
  );
}

function CancelarFacturaDialog({ factura, onClose, onConfirmar }: { factura: Factura; onClose: () => void; onConfirmar: (motivo: string) => void }) {
  const [motivo, setMotivo] = useState("");
  return (
    <Modal titulo={`Cancelar factura ${etiquetaFolio(factura)}`} onClose={onClose}>
      <p className="mb-4 text-xs text-ink/50">
        Esto solo marca la factura como cancelada en MO y regresa sus pagos a «Por facturar». La cancelación ante el SAT se hace en tu sistema de facturación.
      </p>
      <label className={labelClass}>Motivo</label>
      <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} placeholder="Ej. Error en el RFC, se refactura" className={inputClass} />
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className={botonSecundario}>
          Volver
        </button>
        <button
          onClick={() => motivo.trim() && onConfirmar(motivo.trim())}
          disabled={!motivo.trim()}
          className="rounded-lg border border-danger/50 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger transition-opacity hover:bg-danger/20 disabled:opacity-40"
        >
          Cancelar factura
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- Timbrado con el PAC

function ConfigTimbradoDialog({ rfc, inicial, onClose, onGuardar }: { rfc: string; inicial: ConfigTimbrado | undefined; onClose: () => void; onGuardar: (c: ConfigTimbrado) => void }) {
  const [form, setForm] = useState<ConfigTimbrado>({ ...CONFIG_TIMBRADO_INICIAL, ...inicial });
  const set = <K extends keyof ConfigTimbrado>(k: K, v: ConfigTimbrado[K]) => setForm((p) => ({ ...p, [k]: v }));
  const cpMalo = form.codigoPostal.length > 0 && !/^\d{5}$/.test(form.codigoPostal);
  const claveMala = form.claveProdServ.length > 0 && !/^\d{8}$/.test(form.claveProdServ);
  const puedeGuardar = !cpMalo && !claveMala;

  return (
    <Modal titulo="Ajustes de timbrado" onClose={onClose} ancho="max-w-lg">
      <p className="mb-4 text-xs text-ink/50">
        Son los datos del consultorio como emisor de la factura. Cópialos tal cual de tu Constancia de Situación Fiscal y confirma con tu contador la clave y el tratamiento del IVA.
      </p>
      <div className="space-y-4">
        <div>
          <label className={labelClass}>RFC del consultorio</label>
          <p className={`rounded-lg border border-edge/10 bg-inset px-3 py-2 text-sm ${rfc ? "text-ink" : "text-danger"}`}>{rfc || "Falta: captúralo en Administración → Consultorio"}</p>
        </div>
        <div>
          <label className={labelClass}>Razón social (sin «S.A. de C.V.» ni régimen)</label>
          <input type="text" value={form.razonSocial} onChange={(e) => set("razonSocial", e.target.value)} placeholder="Como aparece en tu constancia" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Régimen fiscal</label>
          <select value={form.regimenFiscal} onChange={(e) => set("regimenFiscal", e.target.value)} className={inputClass}>
            <option value="">Elige…</option>
            {REGIMENES_FISCALES.map((r) => (
              <option key={r.clave} value={r.clave}>
                {r.clave} · {r.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>C.P. fiscal (lugar de expedición)</label>
            <input type="text" inputMode="numeric" value={form.codigoPostal} onChange={(e) => set("codigoPostal", e.target.value.replace(/\D/g, "").slice(0, 5))} className={inputClass} />
            {cpMalo && <p className="mt-1 text-[11px] text-danger">Son 5 dígitos.</p>}
          </div>
          <div>
            <label className={labelClass}>Clave de producto o servicio</label>
            <input type="text" inputMode="numeric" value={form.claveProdServ} onChange={(e) => set("claveProdServ", e.target.value.replace(/\D/g, "").slice(0, 8))} className={inputClass} />
            {claveMala ? <p className="mt-1 text-[11px] text-danger">Son 8 dígitos.</p> : <p className="mt-1 text-[11px] text-ink/40">Sugerida: 85122001 (Dentistas).</p>}
          </div>
        </div>
        <div>
          <label className={labelClass}>IVA en los conceptos</label>
          <select value={form.tratamientoIva} onChange={(e) => set("tratamientoIva", e.target.value as TratamientoIva)} className={inputClass}>
            {TRATAMIENTOS_IVA.map((t) => (
              <option key={t.clave} value={t.clave}>
                {t.nombre}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-ink/40">{TRATAMIENTOS_IVA.find((t) => t.clave === form.tratamientoIva)?.ayuda}</p>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} className={botonSecundario}>
          Cancelar
        </button>
        <button onClick={() => puedeGuardar && onGuardar({ ...form, razonSocial: form.razonSocial.trim() })} disabled={!puedeGuardar} className={botonPrimario}>
          Guardar
        </button>
      </div>
    </Modal>
  );
}

function TimbrarDialog({
  resumen,
  inicial,
  facturas,
  ambiente,
  onClose,
  onTimbrar,
}: {
  resumen: { paciente: string; rfc: string; total: number; pagos: number };
  inicial: { serie: string; folio: string };
  facturas: Factura[];
  ambiente: "sandbox" | "produccion" | null;
  onClose: () => void;
  onTimbrar: (f: { serie: string; folio: string; notas: string }) => Promise<void>;
}) {
  const [form, setForm] = useState({ ...inicial, notas: "" });
  const [timbrando, setTimbrando] = useState(false);
  const [fallo, setFallo] = useState("");
  const repetido = folioRepetido(facturas, form.serie, form.folio);

  const timbrar = async () => {
    setTimbrando(true);
    setFallo("");
    try {
      await onTimbrar({ serie: form.serie.trim(), folio: form.folio.trim(), notas: form.notas.trim() });
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "No se pudo timbrar la factura.");
      setTimbrando(false);
    }
  };

  return (
    <Modal titulo="Timbrar factura" onClose={timbrando ? () => {} : onClose}>
      <div className="mb-4 rounded-xl border border-edge/10 bg-surface p-3 text-xs text-ink/70">
        <p className="font-semibold text-ink">{resumen.paciente}</p>
        <p>
          RFC {resumen.rfc} · {resumen.pagos} pago(s) · <span className="font-semibold text-ink">{formatCurrency(resumen.total)}</span>
        </p>
      </div>
      {ambiente === "sandbox" ? (
        <p className="mb-4 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-ink/70">Modo de pruebas: esta factura no tiene validez fiscal.</p>
      ) : (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-ink/70">
          Se timbrará ante el SAT y no se puede deshacer; para anularla hay que cancelarla ante el SAT.
        </p>
      )}
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelClass}>Serie</label>
            <input type="text" value={form.serie} onChange={(e) => setForm((p) => ({ ...p, serie: e.target.value.toUpperCase() }))} placeholder="A" className={inputClass} disabled={timbrando} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Folio</label>
            <input type="text" value={form.folio} onChange={(e) => setForm((p) => ({ ...p, folio: e.target.value }))} className={inputClass} disabled={timbrando} />
            {repetido && <p className="mt-1 text-[11px] text-danger">Ya existe una factura vigente con ese folio.</p>}
          </div>
        </div>
        <div>
          <label className={labelClass}>Notas (solo para ti, no van en la factura)</label>
          <textarea value={form.notas} onChange={(e) => setForm((p) => ({ ...p, notas: e.target.value }))} rows={2} className={inputClass} disabled={timbrando} />
        </div>
      </div>
      {fallo && <p className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">{fallo}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} disabled={timbrando} className={botonSecundario}>
          Cancelar
        </button>
        <button onClick={timbrar} disabled={timbrando || repetido} className={botonPrimario}>
          {timbrando ? "Timbrando…" : "Timbrar ante el SAT"}
        </button>
      </div>
    </Modal>
  );
}

function CancelarSatDialog({ factura, onClose, onCancelar }: { factura: Factura; onClose: () => void; onCancelar: (motivo: string, uuidSustitucion: string) => Promise<void> }) {
  const [motivo, setMotivo] = useState("02");
  const [uuid, setUuid] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [fallo, setFallo] = useState("");
  const requiereUuid = motivo === "01";
  const puede = !cancelando && (!requiereUuid || folioFiscalValido(uuid));

  const cancelar = async () => {
    setCancelando(true);
    setFallo("");
    try {
      await onCancelar(motivo, uuid.trim());
    } catch (e) {
      setFallo(e instanceof Error ? e.message : "No se pudo cancelar la factura.");
      setCancelando(false);
    }
  };

  return (
    <Modal titulo={`Cancelar factura ${etiquetaFolio(factura)}`} onClose={cancelando ? () => {} : onClose}>
      <p className="mb-4 text-xs text-ink/50">
        Se cancela ante el SAT. Si el SAT la cancela al momento, los pagos regresan a «Por facturar»; si el cliente debe aceptar la cancelación, queda como pendiente.
      </p>
      <label className={labelClass}>Motivo de cancelación (SAT)</label>
      <select value={motivo} onChange={(e) => setMotivo(e.target.value)} className={inputClass} disabled={cancelando}>
        {MOTIVOS_CANCELACION_SAT.map((m) => (
          <option key={m.clave} value={m.clave}>
            {m.nombre}
          </option>
        ))}
      </select>
      <p className="mt-1 text-[11px] text-ink/40">{MOTIVOS_CANCELACION_SAT.find((m) => m.clave === motivo)?.ayuda}</p>
      {requiereUuid && (
        <div className="mt-4">
          <label className={labelClass}>Folio fiscal (UUID) de la factura que la sustituye</label>
          <input type="text" value={uuid} onChange={(e) => setUuid(e.target.value.trim())} placeholder="00000000-0000-0000-0000-000000000000" className={inputClass} disabled={cancelando} />
        </div>
      )}
      {fallo && <p className="mt-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">{fallo}</p>}
      <div className="mt-6 flex justify-end gap-3">
        <button onClick={onClose} disabled={cancelando} className={botonSecundario}>
          Volver
        </button>
        <button
          onClick={cancelar}
          disabled={!puede}
          className="rounded-lg border border-danger/50 bg-danger/10 px-4 py-2 text-sm font-semibold text-danger transition-opacity hover:bg-danger/20 disabled:opacity-40"
        >
          {cancelando ? "Cancelando…" : "Cancelar ante el SAT"}
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- Página

type GrupoPaciente = { patientId: string; patientName: string; pagos: PagoPendienteDeFacturar[] };

export default function Facturacion() {
  const { pagosRealizados, facturas, setFacturas, patients, updatePatient, clinicInfo, setClinicInfo, clinicUid, puedeVerFinanzas, userEmail } = usePatientData();

  const hoy = new Date();
  const pendientes = useMemo(() => pagosPendientesDeFacturar(pagosRealizados, facturas, new Date()), [pagosRealizados, facturas]);
  const grupos = useMemo<GrupoPaciente[]>(() => {
    const mapa = new Map<string, GrupoPaciente>();
    for (const p of pendientes) {
      const g = mapa.get(p.registro.patientId) ?? { patientId: p.registro.patientId, patientName: p.registro.patientName, pagos: [] };
      g.pagos.push(p);
      mapa.set(p.registro.patientId, g);
    }
    return [...mapa.values()].sort((a, b) => (a.pagos[0]?.fechaISO ?? "").localeCompare(b.pagos[0]?.fechaISO ?? ""));
  }, [pendientes]);

  const [pestana, setPestana] = useState<"por-facturar" | "emitidas">(pendientes.length > 0 || facturas.length === 0 ? "por-facturar" : "emitidas");
  const [desmarcados, setDesmarcados] = useState<Set<string>>(new Set());
  const [fiscalDe, setFiscalDe] = useState<string | null>(null);
  const [facturando, setFacturando] = useState<{ grupo: GrupoPaciente; pagos: PagoPendienteDeFacturar[] } | null>(null);
  const [editando, setEditando] = useState<Factura | null>(null);
  const [cancelando, setCancelando] = useState<Factura | null>(null);
  const [eliminando, setEliminando] = useState<Factura | null>(null);
  const [aviso, setAviso] = useState("");
  const [pacEstado, setPacEstado] = useState<EstadoPac>({ disponible: false, ambiente: null });
  const [ajustando, setAjustando] = useState(false);
  const [timbrando, setTimbrando] = useState<{ grupo: GrupoPaciente; pagos: PagoPendienteDeFacturar[] } | null>(null);
  const [cancelandoSat, setCancelandoSat] = useState<Factura | null>(null);
  const [descargando, setDescargando] = useState("");
  const [falloDescarga, setFalloDescarga] = useState("");
  const [filtro, setFiltro] = useState<FiltroFacturas>({ texto: "", desde: "", hasta: "", serie: "", estado: "todas" });

  useEffect(() => {
    if (puedeVerFinanzas) estadoTimbradoApi().then(setPacEstado);
  }, [puedeVerFinanzas]);

  if (!puedeVerFinanzas) {
    return <div className="rounded-2xl border border-edge/10 bg-surface p-10 text-center text-sm text-ink/50">No tienes permiso para ver información financiera.</div>;
  }

  const paciente = (id: string) => patients.find((p) => p.id === id);
  const totalPendiente = totalDePagos(pendientes.map((p) => p.registro));
  const resumen = resumenFacturas(facturas);
  const filtradas = filtrarFacturas(facturas, filtro);
  const resumenFiltradas = resumenFacturas(filtradas);
  const series = seriesUsadas(facturas);

  const alternarPago = (id: string) =>
    setDesmarcados((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const seleccionados = (g: GrupoPaciente) => g.pagos.filter((p) => !desmarcados.has(p.registro.id));

  const serieSugerida = [...facturas].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)).find((f) => f.serie)?.serie ?? "";

  const guardarFactura = (f: FormFactura) => {
    if (!facturando) return;
    const { grupo, pagos } = facturando;
    const fiscal = paciente(grupo.patientId)?.datosFiscales;
    if (!fiscal) return;
    const nueva: Factura = {
      id: `fac${Date.now()}`,
      patientId: grupo.patientId,
      patientName: grupo.patientName,
      pagoIds: pagos.map((p) => p.registro.id),
      rfc: fiscal.rfc,
      razonSocial: fiscal.razonSocial,
      regimenFiscal: fiscal.regimenFiscal,
      codigoPostal: fiscal.codigoPostal,
      usoCfdi: fiscal.usoCfdi,
      serie: f.serie,
      folio: f.folio,
      uuid: f.uuid,
      fecha: f.fecha,
      total: totalDePagos(pagos.map((p) => p.registro)),
      formaPago: formaPagoDeGrupo(pagos.map((p) => p.registro)),
      estado: "emitida",
      notas: f.notas,
      registradaPor: userEmail,
      creadoEn: new Date().toISOString(),
    };
    setFacturas((prev) => [nueva, ...prev]);
    setFacturando(null);
    setAviso(`Factura ${etiquetaFolio(nueva)} registrada. Los pagos ya no aparecen en «Por facturar».`);
  };

  const guardarEdicion = (f: FormFactura) => {
    if (!editando) return;
    setFacturas((prev) => prev.map((x) => (x.id === editando.id ? { ...x, ...f } : x)));
    setEditando(null);
  };

  const cancelar = (motivo: string) => {
    if (!cancelando) return;
    setFacturas((prev) => prev.map((x) => (x.id === cancelando.id ? { ...x, estado: "cancelada", canceladaEn: new Date().toISOString(), motivoCancelacion: motivo } : x)));
    setAviso(`Factura ${etiquetaFolio(cancelando)} cancelada. Sus pagos volvieron a «Por facturar».`);
    setCancelando(null);
  };

  const faltaConfig = faltantesConfigTimbrado(clinicInfo?.rfc, clinicInfo?.timbrado);
  const puedeTimbrar = pacEstado.disponible && faltaConfig.length === 0;

  const timbrar = async (f: { serie: string; folio: string; notas: string }) => {
    if (!timbrando || !clinicUid) return;
    const { grupo, pagos } = timbrando;
    const nueva = await timbrarFacturaApi({
      clinicaId: clinicUid,
      facturaId: `fac${Date.now()}`,
      patientId: grupo.patientId,
      pagoIds: pagos.map((p) => p.registro.id),
      ...f,
    });
    setTimbrando(null);
    setFalloDescarga("");
    setAviso(`Factura ${etiquetaFolio(nueva)} timbrada ante el SAT (folio fiscal ${nueva.uuid}). Ya puedes descargar su PDF y XML en «Facturas emitidas».`);
  };

  const cancelarSat = async (motivo: string, uuidSustitucion: string) => {
    if (!cancelandoSat || !clinicUid) return;
    const r = await cancelarFacturaSatApi({ clinicaId: clinicUid, facturaId: cancelandoSat.id, motivo, uuidSustitucion });
    setFalloDescarga("");
    setAviso(
      r.estado === "canceled"
        ? `Factura ${etiquetaFolio(cancelandoSat)} cancelada ante el SAT. Sus pagos volvieron a «Por facturar».`
        : `El SAT pidió que el cliente acepte la cancelación de la factura ${etiquetaFolio(cancelandoSat)}: queda como «Cancelación pendiente».`
    );
    setCancelandoSat(null);
  };

  const descargar = async (f: Factura, formato: "pdf" | "xml") => {
    if (!clinicUid) return;
    setDescargando(`${f.id}-${formato}`);
    setFalloDescarga("");
    try {
      await descargarFacturaApi(clinicUid, f.id, formato, `factura-${etiquetaFolio(f).replace(/[^A-Za-z0-9_-]/g, "")}`);
    } catch (e) {
      setFalloDescarga(e instanceof Error ? e.message : "No se pudo descargar el archivo.");
    } finally {
      setDescargando("");
    }
  };

  const pacienteFiscal = fiscalDe ? paciente(fiscalDe) : undefined;
  const clinicaSinRfc = !clinicInfo?.rfc?.trim();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="max-w-3xl text-xs text-ink/40">
          Lleva el control de a quién le falta factura y de las facturas que ya emitiste. Marca «Activo para facturar» al cobrar y aquí aparece el pago; cuando emitas la factura en tu sistema
          (o con tu contador), regístrala y el cobro queda ligado a ella.
        </p>
        {clinicaSinRfc && (
          <p className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-ink/70">
            Falta el RFC del consultorio. Captúralo en Administración → Consultorio para tenerlo a la mano al facturar.
          </p>
        )}
        {pacEstado.disponible ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-edge/10 bg-surface px-3 py-2 text-xs text-ink/70">
            <span>
              Timbrado ante el SAT activo{pacEstado.ambiente === "sandbox" ? " en modo de pruebas (las facturas no tienen validez fiscal)" : ""}.
              {faltaConfig.length > 0 && <span className="text-warning"> Falta: {faltaConfig.join(", ")}.</span>}
            </span>
            <button onClick={() => setAjustando(true)} className="rounded-lg border border-edge/15 px-2.5 py-1 text-xs font-semibold text-ink/80 hover:bg-surface2">
              Ajustes de timbrado
            </button>
          </div>
        ) : (
          <p className="max-w-3xl text-xs text-ink/40">Para timbrar desde MO hay que contratar un PAC y poner sus credenciales en Vercel; mientras tanto puedes registrar a mano tus facturas.</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-edge/10 bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wide text-ink/40">Por facturar</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${pendientes.length ? "text-accent" : "text-ink"}`}>{formatCurrency(totalPendiente)}</p>
          <p className="text-xs text-ink/40">
            {pendientes.length} pago(s) de {grupos.length} paciente(s)
          </p>
        </div>
        <div className="rounded-2xl border border-edge/10 bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wide text-ink/40">Facturado</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{formatCurrency(resumen.totalFacturado)}</p>
          <p className="text-xs text-ink/40">{resumen.emitidas} factura(s) vigente(s)</p>
        </div>
        <div className="rounded-2xl border border-edge/10 bg-surface p-4">
          <p className="text-[11px] uppercase tracking-wide text-ink/40">Canceladas</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-ink">{resumen.canceladas}</p>
          <p className="text-xs text-ink/40">{formatCurrency(resumen.totalCancelado)}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["por-facturar", "emitidas"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPestana(p)}
            aria-pressed={pestana === p}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              pestana === p ? "border-accent/60 bg-accent/15 text-accent" : "border-edge/15 text-ink/70 hover:bg-surface"
            }`}
          >
            {p === "por-facturar" ? `Por facturar (${pendientes.length})` : `Facturas emitidas (${facturas.length})`}
          </button>
        ))}
      </div>

      {aviso && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-success/30 bg-success/5 p-3 text-xs text-ink/80">
          <span>{aviso}</span>
          <button onClick={() => setAviso("")} className="text-ink/40 hover:text-ink" aria-label="Cerrar aviso">
            ✕
          </button>
        </div>
      )}

      {falloDescarga && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
          <span>{falloDescarga}</span>
          <button onClick={() => setFalloDescarga("")} className="text-danger/60 hover:text-danger" aria-label="Cerrar aviso">
            ✕
          </button>
        </div>
      )}

      {pestana === "por-facturar" ? (
        grupos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
            No hay pagos pendientes de facturar. Cuando cobres con «Activo para facturar» aparecerán aquí.
            <p className="mt-2 text-xs">Solo se ven los pagos registrados desde el 22 de septiembre de 2026.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {grupos.map((g) => {
              const pac = paciente(g.patientId);
              const faltan = faltantesFiscales(pac?.datosFiscales);
              const elegidos = seleccionados(g);
              const masAntiguo = Math.max(...g.pagos.map((p) => p.dias));
              return (
                <div key={g.patientId} className="rounded-2xl border border-edge/10 bg-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-ink">{g.patientName}</p>
                      <p className="text-xs text-ink/50">
                        {g.pagos.length} pago(s) · el más antiguo de hace {masAntiguo} día(s)
                      </p>
                    </div>
                    {faltan.length === 0 ? (
                      <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">
                        {pac?.datosFiscales?.rfc} · {nombreRegimen(pac?.datosFiscales?.regimenFiscal ?? "").split(" · ")[0]}
                      </span>
                    ) : (
                      <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-[11px] font-semibold text-warning">Faltan datos fiscales</span>
                    )}
                  </div>

                  <ul className="mt-3 divide-y divide-edge/10 rounded-xl border border-edge/10 bg-inset">
                    {g.pagos.map((p) => (
                      <li key={p.registro.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-xs text-ink/80">
                          <input
                            type="checkbox"
                            checked={!desmarcados.has(p.registro.id)}
                            onChange={() => alternarPago(p.registro.id)}
                            className="h-4 w-4 rounded border-edge/30 accent-accent"
                          />
                          <span className="w-24 shrink-0 text-ink/50">{p.fechaISO ? fechaCorta(p.fechaISO) : p.registro.pago.fecha}</span>
                          <span className="min-w-0 flex-1 truncate">
                            {p.registro.pago.lineas.map((l) => l.label).filter(Boolean).join(", ") || p.registro.pago.formaPago}
                          </span>
                          <span className="shrink-0 text-ink/40">{p.registro.pago.formaPago}</span>
                          <span className="w-24 shrink-0 text-right font-semibold tabular-nums text-ink">{formatCurrency(p.registro.pago.total)}</span>
                        </label>
                      </li>
                    ))}
                  </ul>

                  {faltan.length > 0 && <p className="mt-2 text-[11px] text-ink/50">Falta: {faltan.join(", ")}.</p>}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="mr-auto text-xs text-ink/50">
                      Seleccionado: <span className="font-semibold text-ink">{formatCurrency(totalDePagos(elegidos.map((e) => e.registro)))}</span>
                    </span>
                    {faltan.length > 0 && pac?.phone && (
                      <button
                        onClick={() => abrirWhatsApp(pac.phone, mensajeSolicitarDatosFiscales({ clinica: clinicInfo?.nombre ?? "", paciente: g.patientName, faltan }))}
                        className="flex items-center gap-1.5 rounded-lg border border-success/40 px-2.5 py-1 text-xs font-semibold text-success hover:bg-success/10"
                      >
                        <WhatsAppIcon />
                        Pedir datos
                      </button>
                    )}
                    <button onClick={() => setFiscalDe(g.patientId)} className="rounded-lg border border-edge/15 px-2.5 py-1 text-xs text-ink/70 hover:bg-surface2" disabled={!pac}>
                      {faltan.length === 0 ? "Datos fiscales" : "Capturar datos fiscales"}
                    </button>
                    {pacEstado.disponible && (
                      <button
                        onClick={() => setTimbrando({ grupo: g, pagos: elegidos })}
                        disabled={!puedeTimbrar || faltan.length > 0 || elegidos.length === 0}
                        title={
                          !puedeTimbrar ? "Completa los ajustes de timbrado" : faltan.length > 0 ? "Primero captura los datos fiscales" : elegidos.length === 0 ? "Elige al menos un pago" : ""
                        }
                        className={botonPrimario}
                      >
                        Timbrar factura
                      </button>
                    )}
                    <button
                      onClick={() => setFacturando({ grupo: g, pagos: elegidos })}
                      disabled={faltan.length > 0 || elegidos.length === 0}
                      title={faltan.length > 0 ? "Primero captura los datos fiscales" : elegidos.length === 0 ? "Elige al menos un pago" : ""}
                      className={pacEstado.disponible ? botonSecundario : botonPrimario}
                    >
                      {pacEstado.disponible ? "Registrar a mano" : "Registrar factura"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="col-span-2">
              <label className={labelClass}>Buscar</label>
              <input type="search" value={filtro.texto} onChange={(e) => setFiltro((p) => ({ ...p, texto: e.target.value }))} placeholder="Factura, paciente, RFC o folio fiscal" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Desde</label>
              <input type="date" value={filtro.desde} onChange={(e) => setFiltro((p) => ({ ...p, desde: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Hasta</label>
              <input type="date" value={filtro.hasta} onChange={(e) => setFiltro((p) => ({ ...p, hasta: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Estado</label>
              <select value={filtro.estado} onChange={(e) => setFiltro((p) => ({ ...p, estado: e.target.value as FiltroFacturas["estado"] }))} className={inputClass}>
                <option value="todas">Todas</option>
                <option value="emitida">Vigentes</option>
                <option value="cancelada">Canceladas</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {series.length > 0 && (
                <select value={filtro.serie} onChange={(e) => setFiltro((p) => ({ ...p, serie: e.target.value }))} aria-label="Serie" className="rounded-lg border border-edge/10 bg-field px-3 py-1.5 text-xs text-ink">
                  <option value="">Todas las series</option>
                  {series.map((s) => (
                    <option key={s} value={s}>
                      Serie {s}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-ink/50">
                {filtradas.length} factura(s) · Total facturado: <span className="font-semibold text-ink">{formatCurrency(resumenFiltradas.totalFacturado)}</span>
              </p>
            </div>
            <button
              onClick={() => exportarCsv(`facturas-${toISODate(hoy)}.csv`, ENCABEZADOS_CSV_FACTURAS, filasCsvFacturas(filtradas))}
              disabled={filtradas.length === 0}
              className={botonSecundario}
            >
              Descargar Excel (.csv)
            </button>
          </div>

          {filtradas.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
              {facturas.length === 0 ? "Todavía no has registrado facturas." : "Ninguna factura coincide con la búsqueda."}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-edge/10 text-[11px] uppercase tracking-wide text-ink/40">
                    <th className="px-4 py-3 font-medium">Serie / Folio</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Paciente</th>
                    <th className="px-4 py-3 font-medium">RFC</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((f) => {
                    const pac = paciente(f.patientId);
                    return (
                      <tr key={f.id} className="border-b border-edge/5 last:border-0">
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-ink">{etiquetaFolio(f)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-ink/60">{fechaCorta(f.fecha)}</td>
                        <td className="px-4 py-3 text-ink">
                          {f.patientName}
                          {f.razonSocial && f.razonSocial !== f.patientName && <span className="block text-[11px] text-ink/40">{f.razonSocial}</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-ink/60">{f.rfc}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-ink">{formatCurrency(f.total)}</td>
                        <td className="px-4 py-3">
                          {f.estado === "cancelada" ? (
                            <span className="rounded-full bg-danger/10 px-2.5 py-0.5 text-[11px] font-semibold text-danger" title={f.motivoCancelacion}>
                              Cancelada
                            </span>
                          ) : f.cancelacionPendiente ? (
                            <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-[11px] font-semibold text-warning" title="El cliente debe aceptar la cancelación en el SAT">
                              Cancelación pendiente
                            </span>
                          ) : (
                            <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">{f.timbrada ? "Timbrada" : "Vigente"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {f.estado !== "cancelada" && pac?.phone && (
                              <button
                                onClick={() => abrirWhatsApp(pac.phone, mensajeFacturaLista({ clinica: clinicInfo?.nombre ?? "", factura: f }))}
                                aria-label={`Avisar a ${f.patientName} que su factura está lista`}
                                className="flex items-center gap-1 rounded-lg border border-success/40 px-2 py-1 text-xs font-semibold text-success hover:bg-success/10"
                              >
                                <WhatsAppIcon />
                              </button>
                            )}
                            {f.timbrada &&
                              f.cfdiId &&
                              (["pdf", "xml"] as const).map((fmt) => (
                                <button
                                  key={fmt}
                                  onClick={() => descargar(f, fmt)}
                                  disabled={descargando === `${f.id}-${fmt}`}
                                  className="rounded-lg border border-edge/15 px-2 py-1 text-xs uppercase text-ink/70 hover:bg-surface2 disabled:opacity-40"
                                >
                                  {descargando === `${f.id}-${fmt}` ? "…" : fmt}
                                </button>
                              ))}
                            {!f.timbrada && (
                              <button onClick={() => setEditando(f)} className="rounded-lg border border-edge/15 px-2 py-1 text-xs text-ink/70 hover:bg-surface2">
                                Editar
                              </button>
                            )}
                            {f.estado !== "cancelada" ? (
                              <button onClick={() => (f.timbrada ? setCancelandoSat(f) : setCancelando(f))} className="rounded-lg border border-danger/30 px-2 py-1 text-xs text-danger hover:bg-danger/10">
                                Cancelar
                              </button>
                            ) : (
                              <button onClick={() => setEliminando(f)} className="rounded-lg border border-danger/30 px-2 py-1 text-xs text-danger hover:bg-danger/10">
                                Eliminar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {fiscalDe && pacienteFiscal && (
        <DatosFiscalesDialog
          paciente={pacienteFiscal.name}
          inicial={pacienteFiscal.datosFiscales}
          onClose={() => setFiscalDe(null)}
          onGuardar={(d) => {
            updatePatient(pacienteFiscal.id, { datosFiscales: d });
            setFiscalDe(null);
          }}
        />
      )}

      {facturando && (
        <FacturaDialog
          titulo="Registrar factura"
          resumen={{
            paciente: facturando.grupo.patientName,
            rfc: paciente(facturando.grupo.patientId)?.datosFiscales?.rfc ?? "",
            total: totalDePagos(facturando.pagos.map((p) => p.registro)),
            pagos: facturando.pagos.length,
          }}
          inicial={{ serie: serieSugerida, folio: siguienteFolio(facturas, serieSugerida), uuid: "", fecha: toISODate(new Date()), notas: "" }}
          facturas={facturas}
          onClose={() => setFacturando(null)}
          onGuardar={guardarFactura}
        />
      )}

      {editando && (
        <FacturaDialog
          titulo={`Editar factura ${etiquetaFolio(editando)}`}
          resumen={{ paciente: editando.patientName, rfc: editando.rfc, total: editando.total, pagos: editando.pagoIds.length }}
          inicial={{ serie: editando.serie, folio: editando.folio, uuid: editando.uuid, fecha: editando.fecha, notas: editando.notas }}
          facturas={facturas}
          ignorarId={editando.id}
          onClose={() => setEditando(null)}
          onGuardar={guardarEdicion}
        />
      )}

      {ajustando && (
        <ConfigTimbradoDialog
          rfc={clinicInfo?.rfc ?? ""}
          inicial={clinicInfo?.timbrado}
          onClose={() => setAjustando(false)}
          onGuardar={(c) => {
            setClinicInfo((prev) => ({ ...prev, timbrado: c }));
            setAjustando(false);
          }}
        />
      )}

      {timbrando && (
        <TimbrarDialog
          resumen={{
            paciente: timbrando.grupo.patientName,
            rfc: paciente(timbrando.grupo.patientId)?.datosFiscales?.rfc ?? "",
            total: totalDePagos(timbrando.pagos.map((p) => p.registro)),
            pagos: timbrando.pagos.length,
          }}
          inicial={{ serie: serieSugerida, folio: siguienteFolio(facturas, serieSugerida) }}
          facturas={facturas}
          ambiente={pacEstado.ambiente}
          onClose={() => setTimbrando(null)}
          onTimbrar={timbrar}
        />
      )}

      {cancelandoSat && <CancelarSatDialog factura={cancelandoSat} onClose={() => setCancelandoSat(null)} onCancelar={cancelarSat} />}

      {cancelando && <CancelarFacturaDialog factura={cancelando} onClose={() => setCancelando(null)} onConfirmar={cancelar} />}

      {eliminando && (
        <ConfirmarEliminar
          titulo="¿Eliminar esta factura?"
          mensaje={`Vas a quitar la factura cancelada ${etiquetaFolio(eliminando)} del registro. Quedará guardada en la Papelera.`}
          onCancel={() => setEliminando(null)}
          onConfirm={() => {
            setFacturas((prev) => prev.filter((x) => x.id !== eliminando.id));
            setEliminando(null);
          }}
        />
      )}
    </div>
  );
}
