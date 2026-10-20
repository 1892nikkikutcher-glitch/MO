"use client";

import { useMemo, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { buscarPacientes } from "@/lib/buscarPacientes";
import {
  ajusteValido,
  ajustarMontoGenerado,
  aprobarMovimiento,
  crearTransferencia,
  etiquetaEstadoCashback,
  etiquetaTipoCashback,
  rechazarMovimiento,
  saldoCashback,
  validarTransferencia,
  type ErrorTransferencia,
  type EstadoMovimientoCashback,
  type MovimientoCashback,
} from "@/lib/cashback";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

const claseEstado: Record<EstadoMovimientoCashback, string> = {
  pendiente: "border-warning/40 bg-warning/10 text-warning",
  aprobado: "border-success/40 bg-success/10 text-success",
  rechazado: "border-danger/40 bg-danger/10 text-danger",
};

export function fechaCorta(iso: string) {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

export function ChipEstadoCashback({ estado }: { estado: EstadoMovimientoCashback }) {
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${claseEstado[estado]}`}>{etiquetaEstadoCashback[estado]}</span>;
}

/** Qué es el movimiento, dicho desde el paciente que se está mirando (o sin perspectiva en el listado general). */
export function descripcionMovimiento(m: MovimientoCashback, desdePacienteId?: string): string {
  if (m.tipo === "generado") {
    const base = m.baseMonto ? `${m.porcentaje ?? ""}% de ${formatCurrency(m.baseMonto)} pagados` : "Cashback";
    const cambiado = m.montoCalculado !== undefined && m.montoCalculado !== m.monto ? ` · el cálculo era ${formatCurrency(m.montoCalculado)}` : "";
    return `${base}${cambiado}`;
  }
  if (m.tipo === "canje") return "Se usó para pagar un tratamiento";
  if (desdePacienteId && m.destinoId === desdePacienteId) return `Recibido de ${m.patientName}`;
  return `Para ${m.destinoNombre ?? "otra persona"}`;
}

const numero = (texto: string) => {
  const n = Number(texto);
  return Number.isFinite(n) ? n : 0;
};

/** Un movimiento con lo que el administrador puede hacer: aprobar, rechazar o cambiar el monto. */
export function FilaMovimientoCashback({ movimiento: m, desdePacienteId, mostrarPaciente }: { movimiento: MovimientoCashback; desdePacienteId?: string; mostrarPaciente?: boolean }) {
  const { cashbackConfig, cashbackMovimientos, setCashbackMovimientos, userEmail } = usePatientData();
  const [editando, setEditando] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [montoTexto, setMontoTexto] = useState(String(m.monto));
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  const reemplazar = (nuevo: MovimientoCashback) => setCashbackMovimientos((prev) => prev.map((x) => (x.id === nuevo.id ? nuevo : x)));
  const ahora = () => new Date().toISOString();

  const aprobar = () => {
    const monto = m.tipo === "generado" ? numero(montoTexto) : m.monto;
    if (!(monto > 0)) return setError("El monto debe ser mayor a 0. Si no corresponde cashback, recházalo.");
    reemplazar(aprobarMovimiento(m, userEmail, ahora(), monto));
    setError("");
  };
  const rechazar = () => {
    reemplazar(rechazarMovimiento(m, userEmail, ahora(), motivo));
    setRechazando(false);
    setMotivo("");
  };
  const guardarAjuste = () => {
    const nuevo = ajustarMontoGenerado(m, numero(montoTexto));
    if (!ajusteValido(cashbackMovimientos, nuevo, cashbackConfig)) {
      return setError("Ese monto deja al paciente con menos de lo que ya usó o transfirió.");
    }
    reemplazar(nuevo);
    setEditando(false);
    setError("");
  };

  const signo = m.tipo === "generado" || (m.tipo === "transferencia" && desdePacienteId && m.destinoId === desdePacienteId) ? "+" : "−";
  const colorMonto = m.estado === "rechazado" ? "text-ink/40 line-through" : signo === "+" ? "text-success" : "text-ink/80";

  return (
    <li className="border-b border-edge/5 py-3 last:border-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {mostrarPaciente && <span className="text-sm font-medium text-ink/80">{m.patientName}</span>}
            <span className="text-xs text-ink/50">{etiquetaTipoCashback[m.tipo]}</span>
            <ChipEstadoCashback estado={m.estado} />
          </div>
          <div className="mt-0.5 text-xs text-ink/50">
            {fechaCorta(m.fecha)} · {descripcionMovimiento(m, desdePacienteId)}
            {m.nota ? ` · ${m.nota}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {m.estado === "pendiente" && m.tipo === "generado" ? (
            <span className="flex items-center gap-1 text-sm text-ink/60">
              $
              <input
                type="number"
                min={0}
                step="0.01"
                value={montoTexto}
                onChange={(e) => setMontoTexto(e.target.value)}
                aria-label="Monto de cashback"
                className="w-24 rounded-md border border-edge/10 bg-field px-1.5 py-1 text-right text-sm text-ink outline-none focus:border-accent/60"
              />
            </span>
          ) : editando ? (
            <span className="flex items-center gap-1 text-sm text-ink/60">
              $
              <input
                type="number"
                min={0}
                step="0.01"
                value={montoTexto}
                onChange={(e) => setMontoTexto(e.target.value)}
                aria-label="Nuevo monto"
                className="w-24 rounded-md border border-edge/10 bg-field px-1.5 py-1 text-right text-sm text-ink outline-none focus:border-accent/60"
              />
            </span>
          ) : (
            <span className={`text-sm font-semibold ${colorMonto}`}>
              {signo}
              {formatCurrency(m.monto)}
            </span>
          )}

          {m.estado === "pendiente" && !rechazando && (
            <>
              <button onClick={aprobar} className="rounded-lg border border-success/50 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/20">
                Aprobar
              </button>
              <button onClick={() => setRechazando(true)} className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10">
                Rechazar
              </button>
            </>
          )}
          {m.estado === "aprobado" && m.tipo === "generado" && !editando && (
            <button
              onClick={() => {
                setMontoTexto(String(m.monto));
                setEditando(true);
              }}
              title="Cambiar el monto de este cashback"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-edge/15 text-ink/50 hover:border-accent/50 hover:text-accent"
            >
              ✎
            </button>
          )}
          {editando && (
            <>
              <button onClick={guardarAjuste} className="rounded-lg border border-accent/60 bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/25">
                Guardar
              </button>
              <button
                onClick={() => {
                  setEditando(false);
                  setError("");
                }}
                className="rounded-lg border border-edge/15 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-surface"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      </div>
      {rechazando && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input type="text" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo (opcional)" className={`${inputClass} max-w-xs`} />
          <button onClick={rechazar} className="rounded-lg bg-danger px-3 py-1.5 text-xs font-semibold text-black hover:opacity-90">
            Confirmar rechazo
          </button>
          <button onClick={() => setRechazando(false)} className="rounded-lg border border-edge/15 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-surface">
            Cancelar
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </li>
  );
}

const textoErrorTransferencia: Record<ErrorTransferencia, string> = {
  apagada: "Las transferencias están desactivadas en la configuración.",
  "mismo-paciente": "Elige a otra persona: no se puede transferir a sí mismo.",
  "monto-invalido": "Escribe un monto mayor a 0.",
  "saldo-insuficiente": "El monto es mayor al saldo disponible.",
};

/** El paciente pasa parte de su saldo a un conocido o familiar (que ya debe estar registrado como paciente). */
export function TransferirCashbackDialog({ patientId, patientName, onClose }: { patientId: string; patientName: string; onClose: () => void }) {
  const { patients, cashbackConfig, cashbackMovimientos, setCashbackMovimientos } = usePatientData();
  const disponible = saldoCashback(cashbackMovimientos, patientId, cashbackConfig).disponible;
  const [busqueda, setBusqueda] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");
  const [error, setError] = useState("");

  const candidatos = useMemo(
    () => buscarPacientes(patients.filter((p) => p.id !== patientId && !p.fusionadoEnId), busqueda).slice(0, 8),
    [patients, patientId, busqueda]
  );
  const destino = patients.find((p) => p.id === destinoId);

  const enviar = () => {
    if (!destino) return setError("Elige a quién se lo vas a transferir.");
    const m = numero(monto);
    const fallo = validarTransferencia(cashbackMovimientos, patientId, destino.id, m, cashbackConfig);
    if (fallo) return setError(textoErrorTransferencia[fallo]);
    const t = crearTransferencia({ origenId: patientId, origenNombre: patientName, destinoId: destino.id, destinoNombre: destino.name, monto: m, nota, ahoraIso: new Date().toISOString() });
    setCashbackMovimientos((prev) => [t, ...prev]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Transferir cashback</h3>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink">
            ✕
          </button>
        </div>
        <p className="mb-4 text-xs text-ink/50">
          {patientName} tiene <span className="font-semibold text-success">{formatCurrency(disponible)}</span> disponibles. La persona que lo recibe debe estar registrada como paciente; el
          cashback le llega cuando lo apruebes.
        </p>
        <label className="mb-1 block text-xs font-medium text-ink/60">Para quién</label>
        {destino ? (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-ink">
            {destino.name}
            <button onClick={() => setDestinoId("")} className="text-xs text-ink/50 hover:text-ink">
              Cambiar
            </button>
          </div>
        ) : (
          <div className="mb-3">
            <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar paciente por nombre…" className={inputClass} />
            {busqueda.trim() && (
              <ul className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-edge/10 bg-inset">
                {candidatos.length === 0 && <li className="px-3 py-2 text-xs text-ink/40">Nadie con ese nombre. Primero regístralo como paciente.</li>}
                {candidatos.map((p) => (
                  <li key={p.id}>
                    <button onClick={() => setDestinoId(p.id)} className="w-full px-3 py-2 text-left text-sm text-ink/80 hover:bg-field">
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <label className="mb-1 block text-xs font-medium text-ink/60">Monto</label>
        <input type="number" min={0} value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" className={`${inputClass} mb-3`} />
        <label className="mb-1 block text-xs font-medium text-ink/60">Nota (opcional)</label>
        <input type="text" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej. Para su hijo" className={inputClass} />
        {error && <p className="mt-2 text-xs text-danger">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 hover:bg-surface">
            Cancelar
          </button>
          <button onClick={enviar} className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent hover:bg-accent/25">
            Pedir transferencia
          </button>
        </div>
      </div>
    </div>
  );
}
