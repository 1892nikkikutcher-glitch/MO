"use client";

import { useMemo, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { saldoCashback, type CashbackConfig } from "@/lib/cashback";
import { FilaMovimientoCashback } from "./CashbackComponentes";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

/** Módulo Cashback: configuración del programa, cashback por aprobar, saldos por paciente y movimientos recientes. */
export default function Cashback() {
  const { miRol, cashbackConfig, setCashbackConfig, cashbackMovimientos, patients, irAExpediente } = usePatientData();
  const [form, setForm] = useState<{ activo: boolean; porcentaje: string; vigenciaMeses: string; transferible: boolean }>({
    activo: cashbackConfig.activo,
    porcentaje: String(cashbackConfig.porcentaje),
    vigenciaMeses: String(cashbackConfig.vigenciaMeses),
    transferible: cashbackConfig.transferible,
  });
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState("");

  const pendientes = useMemo(
    () => cashbackMovimientos.filter((m) => m.estado === "pendiente").sort((a, b) => a.creadoEn.localeCompare(b.creadoEn)),
    [cashbackMovimientos]
  );
  const recientes = useMemo(
    () =>
      cashbackMovimientos
        .filter((m) => m.estado !== "pendiente")
        .sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))
        .slice(0, 30),
    [cashbackMovimientos]
  );
  const saldos = useMemo(() => {
    const ids = new Set<string>();
    cashbackMovimientos.forEach((m) => {
      ids.add(m.patientId);
      if (m.destinoId) ids.add(m.destinoId);
    });
    return [...ids]
      .map((id) => ({
        id,
        nombre: patients.find((p) => p.id === id)?.name ?? cashbackMovimientos.find((m) => m.patientId === id)?.patientName ?? "",
        saldo: saldoCashback(cashbackMovimientos, id, cashbackConfig),
      }))
      .filter((s) => s.saldo.disponible > 0 || s.saldo.porAprobar > 0 || s.saldo.enTransferencia > 0)
      .sort((a, b) => b.saldo.disponible - a.saldo.disponible);
  }, [cashbackMovimientos, cashbackConfig, patients]);
  const totalDisponible = saldos.reduce((s, x) => s + x.saldo.disponible, 0);

  if (miRol !== "admin") {
    return <div className="rounded-2xl border border-edge/10 bg-surface p-10 text-center text-sm text-ink/50">El cashback lo administra el administrador de la clínica.</div>;
  }

  const cambiar = (cambios: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...cambios }));
    setGuardado(false);
  };

  const guardar = () => {
    const porcentaje = Number(form.porcentaje);
    const vigencia = Number(form.vigenciaMeses);
    if (!(porcentaje > 0 && porcentaje <= 100)) return setError("El porcentaje debe estar entre 0 y 100.");
    if (!(vigencia >= 0 && Number.isInteger(vigencia))) return setError("La vigencia son meses enteros (0 = no vence).");
    const nueva: CashbackConfig = { activo: form.activo, porcentaje, vigenciaMeses: vigencia, transferible: form.transferible };
    setCashbackConfig(nueva);
    setError("");
    setGuardado(true);
  };
  const ejemplo = (Number(form.porcentaje) || 0) * 10;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Programa de cashback</h3>
        <p className="mt-1 text-xs text-ink/40">
          Un porcentaje de lo que el paciente paga en sus tratamientos vuelve como saldo para su siguiente tratamiento. Cada cashback ganado te llega aquí para aprobarlo, rechazarlo o cambiar su
          monto antes de que el paciente pueda usarlo.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Porcentaje de retorno</label>
            <div className="flex items-center gap-2">
              <input type="number" min={0} max={100} step="0.5" value={form.porcentaje} onChange={(e) => cambiar({ porcentaje: e.target.value })} className={inputClass} />
              <span className="text-sm text-ink/60">%</span>
            </div>
            <p className="mt-1 text-[11px] text-ink/40">Por cada $1,000 pagados, {formatCurrency(ejemplo)} de cashback.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Vigencia del saldo (meses)</label>
            <input type="number" min={0} step="1" value={form.vigenciaMeses} onChange={(e) => cambiar({ vigenciaMeses: e.target.value })} className={inputClass} />
            <p className="mt-1 text-[11px] text-ink/40">Cuenta desde que ganó el cashback. 0 = no vence.</p>
          </div>
          <div className="space-y-3 pt-5 text-sm text-ink/70">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.activo} onChange={(e) => cambiar({ activo: e.target.checked })} className="h-4 w-4 rounded border-edge/30" />
              Programa activo
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.transferible} onChange={(e) => cambiar({ transferible: e.target.checked })} className="h-4 w-4 rounded border-edge/30" />
              Se puede transferir a otra persona
            </label>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-ink/40">
          Solo genera cashback lo pagado en tratamientos (no membresías), y lo pagado con cashback no genera más. Un cambio de porcentaje aplica a los pagos nuevos; el cashback ya generado conserva su monto.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={guardar} className="rounded-lg border border-accent/60 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/25">
            Guardar
          </button>
          {guardado && <span className="text-sm text-success">Guardado</span>}
          {error && <span className="text-sm text-danger">{error}</span>}
        </div>
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Por aprobar {pendientes.length > 0 && <span className="ml-1 rounded-full bg-warning/20 px-2 py-0.5 text-[11px] text-warning">{pendientes.length}</span>}
        </h3>
        {pendientes.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink/40">No hay cashback ni transferencias esperando tu decisión.</p>
        ) : (
          <ul className="mt-2">
            {pendientes.map((m) => (
              <FilaMovimientoCashback key={m.id} movimiento={m} mostrarPaciente />
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Saldos por paciente</h3>
          <span className="text-xs text-ink/50">
            Total disponible: <span className="font-semibold text-success">{formatCurrency(totalDisponible)}</span>
          </span>
        </div>
        {saldos.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink/40">Nadie tiene saldo de cashback todavía.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                  <th className="py-2 font-medium">Paciente</th>
                  <th className="py-2 text-right font-medium">Disponible</th>
                  <th className="py-2 text-right font-medium">Por aprobar</th>
                  <th className="py-2 text-right font-medium">Vence</th>
                </tr>
              </thead>
              <tbody>
                {saldos.map((s) => (
                  <tr key={s.id} className="border-b border-edge/5 last:border-0">
                    <td className="py-2">
                      <button onClick={() => irAExpediente(s.id, "Cashback")} className="text-left font-medium text-ink/80 underline decoration-ink/20 underline-offset-2 hover:text-accent">
                        {s.nombre || "Paciente"}
                      </button>
                    </td>
                    <td className="py-2 text-right font-semibold text-success">{formatCurrency(s.saldo.disponible)}</td>
                    <td className="py-2 text-right text-warning">{s.saldo.porAprobar + s.saldo.enTransferencia > 0 ? formatCurrency(s.saldo.porAprobar + s.saldo.enTransferencia) : "—"}</td>
                    <td className="py-2 text-right text-ink/50">{s.saldo.proximoAVencer ? s.saldo.proximoAVencer.fecha.split("-").reverse().join("/") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Movimientos recientes</h3>
        {recientes.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink/40">Todavía no hay movimientos.</p>
        ) : (
          <ul className="mt-2">
            {recientes.map((m) => (
              <FilaMovimientoCashback key={m.id} movimiento={m} mostrarPaciente />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
