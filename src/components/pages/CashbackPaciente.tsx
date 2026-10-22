"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { movimientosDePaciente } from "@/lib/cashback";
import { mensajeSaldoWhatsApp } from "@/lib/cashbackTextos";
import { FilaMovimientoCashback, TransferirCashbackDialog, fechaCorta } from "./CashbackComponentes";

/** Pestaña Cashback del expediente: lo que el paciente ha ganado, lo que puede usar y sus movimientos. */
export default function CashbackPaciente({ patientId, patientName }: { patientId: string; patientName: string }) {
  const { cashbackConfig, cashbackMovimientos, saldoCashbackDe, irAPagina, miRol, patients, clinicInfo } = usePatientData();
  const [transfiriendo, setTransfiriendo] = useState(false);

  if (miRol !== "admin") {
    return <div className="rounded-2xl border border-edge/10 bg-surface p-10 text-center text-sm text-ink/50">El Saldo Sonríe solo lo ve y lo administra el administrador de la clínica.</div>;
  }

  const saldo = saldoCashbackDe(patientId);
  const movimientos = movimientosDePaciente(cashbackMovimientos, patientId);
  const telefono = (patients.find((p) => p.id === patientId)?.phone ?? "").replace(/\D/g, "");
  const enviarSaldo = () => {
    const mensaje = mensajeSaldoWhatsApp({ paciente: patientName, clinica: clinicInfo?.nombre || "", saldo, config: cashbackConfig });
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Saldo Sonríe</h3>
        <button onClick={() => irAPagina("cashback")} className="text-xs font-semibold text-accent hover:underline">
          Ir al módulo Saldo Sonríe
        </button>
      </div>

      {!cashbackConfig.activo && (
        <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          El programa Saldo Sonríe está apagado, así que los pagos nuevos no generan saldo. Se activa en el módulo Saldo Sonríe; lo que ya se ganó sigue disponible.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-edge/10 bg-inset p-4">
          <div className="text-[11px] uppercase tracking-wide text-ink/40">Disponible</div>
          <div className="mt-1 text-xl font-bold text-success">{formatCurrency(saldo.disponible)}</div>
          <div className="mt-0.5 text-[11px] text-ink/50">
            {saldo.porLiberar > 0 ? `+ ${formatCurrency(saldo.porLiberar)} que se libera mañana · ` : ""}Se usa como forma de pago: Saldo Sonríe
          </div>
        </div>
        <div className="rounded-xl border border-edge/10 bg-inset p-4">
          <div className="text-[11px] uppercase tracking-wide text-ink/40">Por aprobar</div>
          <div className="mt-1 text-xl font-bold text-warning">{formatCurrency(saldo.porAprobar + saldo.enTransferencia)}</div>
          <div className="mt-0.5 text-[11px] text-ink/50">Ganado o transferido, esperando tu decisión</div>
        </div>
        <div className="rounded-xl border border-edge/10 bg-inset p-4">
          <div className="text-[11px] uppercase tracking-wide text-ink/40">Próximo a vencer</div>
          <div className="mt-1 text-xl font-bold text-ink">{saldo.proximoAVencer ? formatCurrency(saldo.proximoAVencer.monto) : "—"}</div>
          <div className="mt-0.5 text-[11px] text-ink/50">{saldo.proximoAVencer ? `El ${fechaCorta(saldo.proximoAVencer.fecha)}` : cashbackConfig.vigenciaMeses > 0 ? "Nada por vencer" : "Sin vigencia"}</div>
        </div>
        <div className="rounded-xl border border-edge/10 bg-inset p-4">
          <div className="text-[11px] uppercase tracking-wide text-ink/40">Vencido</div>
          <div className="mt-1 text-xl font-bold text-ink/60">{formatCurrency(saldo.vencido)}</div>
          <div className="mt-0.5 text-[11px] text-ink/50">Ya no se puede usar</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={enviarSaldo}
          disabled={!telefono}
          title={telefono ? "Mandarle su saldo, lo que puede cubrir y su vencimiento" : "El paciente no tiene teléfono registrado"}
          className="rounded-lg border border-success/50 bg-success/10 px-4 py-2 text-xs font-semibold text-success hover:bg-success/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Enviar su saldo por WhatsApp
        </button>
        {cashbackConfig.transferible && (
          <button
            onClick={() => setTransfiriendo(true)}
            disabled={saldo.disponible <= 0}
            className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Transferir a un conocido o familiar
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink/40">Movimientos</h4>
        {movimientos.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink/40">Todavía no hay movimientos de Saldo Sonríe para este paciente.</p>
        ) : (
          <ul>
            {movimientos.map((m) => (
              <FilaMovimientoCashback key={m.id} movimiento={m} desdePacienteId={patientId} />
            ))}
          </ul>
        )}
      </div>

      {transfiriendo && <TransferirCashbackDialog patientId={patientId} patientName={patientName} onClose={() => setTransfiriendo(false)} />}
    </div>
  );
}
