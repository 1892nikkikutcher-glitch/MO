"use client";

import { useMemo, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { saldoCashback, type CashbackConfig } from "@/lib/cashback";
import { mensajeSaldoWhatsApp, terminosCashback } from "@/lib/cashbackTextos";
import { FilaMovimientoCashback } from "./CashbackComponentes";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

const DIAS_AVISO_VENCIMIENTO = 60;

function diasHasta(iso: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - hoy.getTime()) / 86400000);
}

type FormConfig = { activo: boolean; porcentaje: string; vigenciaMeses: string; transferible: boolean; porcentajeMaxCanje: string; topeCanjePorVisita: string; saldoMaximo: string; liberarSiguienteDia: boolean };

/** Módulo Cashback: configuración del programa, saldo por aprobar, saldos por paciente, saldos por vencer y términos para el paciente. */
export default function Cashback() {
  const { miRol, cashbackConfig, setCashbackConfig, cashbackMovimientos, patients, irAExpediente, clinicInfo } = usePatientData();
  const [form, setForm] = useState<FormConfig>({
    activo: cashbackConfig.activo,
    porcentaje: String(cashbackConfig.porcentaje),
    vigenciaMeses: String(cashbackConfig.vigenciaMeses),
    transferible: cashbackConfig.transferible,
    porcentajeMaxCanje: String(cashbackConfig.porcentajeMaxCanje),
    topeCanjePorVisita: String(cashbackConfig.topeCanjePorVisita),
    saldoMaximo: String(cashbackConfig.saldoMaximo),
    liberarSiguienteDia: cashbackConfig.liberarSiguienteDia,
  });
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);

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
        telefono: patients.find((p) => p.id === id)?.phone ?? "",
        saldo: saldoCashback(cashbackMovimientos, id, cashbackConfig),
      }))
      .filter((s) => s.saldo.disponible > 0 || s.saldo.porLiberar > 0 || s.saldo.porAprobar > 0 || s.saldo.enTransferencia > 0)
      .sort((a, b) => b.saldo.disponible - a.saldo.disponible);
  }, [cashbackMovimientos, cashbackConfig, patients]);
  const totalDisponible = saldos.reduce((s, x) => s + x.saldo.disponible + x.saldo.porLiberar, 0);
  const totalPorAprobar = saldos.reduce((s, x) => s + x.saldo.porAprobar + x.saldo.enTransferencia, 0);
  const porVencer = useMemo(
    () =>
      saldos
        .filter((s) => s.saldo.proximoAVencer && diasHasta(s.saldo.proximoAVencer.fecha) <= DIAS_AVISO_VENCIMIENTO)
        .sort((a, b) => a.saldo.proximoAVencer!.fecha.localeCompare(b.saldo.proximoAVencer!.fecha)),
    [saldos]
  );
  const terminos = useMemo(() => terminosCashback(cashbackConfig), [cashbackConfig]);

  if (miRol !== "admin") {
    return <div className="rounded-2xl border border-edge/10 bg-surface p-10 text-center text-sm text-ink/50">El Cashback lo administra el administrador de la clínica.</div>;
  }

  const cambiar = (cambios: Partial<FormConfig>) => {
    setForm((f) => ({ ...f, ...cambios }));
    setGuardado(false);
  };

  const guardar = () => {
    const porcentaje = Number(form.porcentaje);
    const vigencia = Number(form.vigenciaMeses);
    const maxCanje = Number(form.porcentajeMaxCanje);
    const tope = Number(form.topeCanjePorVisita);
    const saldoMax = Number(form.saldoMaximo);
    if (!(porcentaje > 0 && porcentaje <= 100)) return setError("El porcentaje de retorno debe estar entre 0 y 100.");
    if (!(vigencia >= 0 && Number.isInteger(vigencia))) return setError("La vigencia son meses enteros (0 = no vence).");
    if (!(maxCanje >= 0 && maxCanje <= 100)) return setError("El porcentaje máximo por atención debe estar entre 0 y 100 (0 = sin límite).");
    if (!(tope >= 0) || !(saldoMax >= 0)) return setError("Los topes en pesos no pueden ser negativos (0 = sin límite).");
    const nueva: CashbackConfig = {
      activo: form.activo,
      porcentaje,
      vigenciaMeses: vigencia,
      transferible: form.transferible,
      porcentajeMaxCanje: maxCanje,
      topeCanjePorVisita: tope,
      saldoMaximo: saldoMax,
      liberarSiguienteDia: form.liberarSiguienteDia,
    };
    setCashbackConfig(nueva);
    setError("");
    setGuardado(true);
  };
  const ejemplo = (Number(form.porcentaje) || 0) * 10;

  const copiarTerminos = async () => {
    try {
      await navigator.clipboard.writeText(terminos.map((t, i) => `${i + 1}. ${t}`).join("\n"));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // sin permiso para el portapapeles: el texto queda a la vista
    }
  };

  const avisarVencimiento = (s: (typeof saldos)[number]) => {
    const numero = s.telefono.replace(/\D/g, "");
    if (!numero) return;
    const mensaje = mensajeSaldoWhatsApp({ paciente: s.nombre, clinica: clinicInfo?.nombre || "", saldo: s.saldo, config: cashbackConfig });
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Programa Cashback</h3>
        <p className="mt-1 text-xs text-ink/40">
          Un porcentaje de lo que el paciente paga en sus tratamientos vuelve como saldo para su siguiente tratamiento. Cada cashback ganado te llega aquí para aprobarlo, rechazarlo o cambiar su
          monto antes de que el paciente pueda usarlo.
        </p>

        <h4 className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wide text-ink/50">Cuánto gana el paciente</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Porcentaje de retorno</label>
            <div className="flex items-center gap-2">
              <input type="number" min={0} max={100} step="0.5" value={form.porcentaje} onChange={(e) => cambiar({ porcentaje: e.target.value })} className={inputClass} />
              <span className="text-sm text-ink/60">%</span>
            </div>
            <p className="mt-1 text-[11px] text-ink/40">Por cada $1,000 efectivamente pagados, {formatCurrency(ejemplo)} de Cashback.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Saldo máximo acumulable ($)</label>
            <input type="number" min={0} step="50" value={form.saldoMaximo} onChange={(e) => cambiar({ saldoMaximo: e.target.value })} className={inputClass} />
            <p className="mt-1 text-[11px] text-ink/40">Lo más que un paciente puede tener junto. 0 = sin tope.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Vigencia del saldo (meses)</label>
            <input type="number" min={0} step="1" value={form.vigenciaMeses} onChange={(e) => cambiar({ vigenciaMeses: e.target.value })} className={inputClass} />
            <p className="mt-1 text-[11px] text-ink/40">Cuenta desde que ganó el cashback. 0 = no vence.</p>
          </div>
        </div>

        <h4 className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wide text-ink/50">Cuánto puede usar</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Máximo del valor de la atención</label>
            <div className="flex items-center gap-2">
              <input type="number" min={0} max={100} step="1" value={form.porcentajeMaxCanje} onChange={(e) => cambiar({ porcentajeMaxCanje: e.target.value })} className={inputClass} />
              <span className="text-sm text-ink/60">%</span>
            </div>
            <p className="mt-1 text-[11px] text-ink/40">Evita pagar casi un tratamiento con saldo. 0 = sin límite.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Tope por visita ($)</label>
            <input type="number" min={0} step="50" value={form.topeCanjePorVisita} onChange={(e) => cambiar({ topeCanjePorVisita: e.target.value })} className={inputClass} />
            <p className="mt-1 text-[11px] text-ink/40">Se usa lo menor entre el saldo, el % de la atención y este tope. 0 = sin tope.</p>
          </div>
          <div className="space-y-3 pt-5 text-sm text-ink/70">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.liberarSiguienteDia} onChange={(e) => cambiar({ liberarSiguienteDia: e.target.checked })} className="h-4 w-4 rounded border-edge/30" />
              Disponible desde la siguiente visita
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.transferible} onChange={(e) => cambiar({ transferible: e.target.checked })} className="h-4 w-4 rounded border-edge/30" />
              Se puede transferir a otra persona
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.activo} onChange={(e) => cambiar({ activo: e.target.checked })} className="h-4 w-4 rounded border-edge/30" />
              Programa activo
            </label>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-ink/40">
          Genera cashback solo lo pagado en tratamientos (no membresías) y lo pagado con Cashback no genera más. Para promociones, cortesías o tarifas especiales, marca la casilla «Promoción, cortesía o tarifa especial» al
          registrar el pago. Si un tratamiento incluye laboratorio, cambia el monto al aprobarlo para que cuente solo los honorarios clínicos. Un cambio de reglas aplica a los pagos nuevos; el saldo ya
          generado conserva su monto.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={guardar} className="rounded-lg border border-accent/60 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/25">
            Guardar
          </button>
          {guardado && <span className="text-sm text-success">Guardado</span>}
          {error && <span className="text-sm text-danger">{error}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-edge/10 bg-inset p-4" title="Lo que la clínica debe en atenciones: guárdalo como una reserva aparte, no como dinero libre.">
          <div className="text-[11px] uppercase tracking-wide text-ink/40">Saldo pendiente de redimir</div>
          <div className="mt-1 text-xl font-bold text-success">{formatCurrency(totalDisponible)}</div>
          <div className="mt-0.5 text-[11px] text-ink/50">Reserva interna: no es ingreso libre</div>
        </div>
        <div className="rounded-xl border border-edge/10 bg-inset p-4">
          <div className="text-[11px] uppercase tracking-wide text-ink/40">Por aprobar</div>
          <div className="mt-1 text-xl font-bold text-warning">{formatCurrency(totalPorAprobar)}</div>
          <div className="mt-0.5 text-[11px] text-ink/50">{pendientes.length} {pendientes.length === 1 ? "movimiento" : "movimientos"} esperando tu decisión</div>
        </div>
        <div className="rounded-xl border border-edge/10 bg-inset p-4">
          <div className="text-[11px] uppercase tracking-wide text-ink/40">Pacientes con saldo</div>
          <div className="mt-1 text-xl font-bold text-ink">{saldos.filter((s) => s.saldo.disponible + s.saldo.porLiberar > 0).length}</div>
          <div className="mt-0.5 text-[11px] text-ink/50">{porVencer.length} con saldo por vencer en {DIAS_AVISO_VENCIMIENTO} días</div>
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

      {porVencer.length > 0 && (
        <div className="rounded-2xl border border-warning/30 bg-warning/5 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-warning">Saldos por vencer</h3>
          <p className="mt-1 text-xs text-ink/50">Pacientes con saldo que vence en los próximos {DIAS_AVISO_VENCIMIENTO} días. Avísales con tiempo (por ejemplo a los 60 y a los 15 días).</p>
          <ul className="mt-3 divide-y divide-edge/10">
            {porVencer.map((s) => {
              const p = s.saldo.proximoAVencer!;
              const dias = diasHasta(p.fecha);
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="text-ink/80">
                    {s.nombre} <span className="text-ink/50">· {formatCurrency(p.monto)} vence el {p.fecha.split("-").reverse().join("/")} ({dias <= 0 ? "hoy" : `en ${dias} ${dias === 1 ? "día" : "días"}`})</span>
                  </span>
                  <button
                    onClick={() => avisarVencimiento(s)}
                    disabled={!s.telefono}
                    className="rounded-full border border-success/40 px-3 py-1 text-xs font-semibold text-success hover:bg-success/10 disabled:opacity-40"
                  >
                    {s.telefono ? "Avisar por WhatsApp" : "Sin teléfono"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Saldos por paciente</h3>
          <span className="text-xs text-ink/50">
            Total: <span className="font-semibold text-success">{formatCurrency(totalDisponible)}</span>
          </span>
        </div>
        {saldos.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink/40">Nadie tiene Cashback todavía.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                  <th className="py-2 font-medium">Paciente</th>
                  <th className="py-2 text-right font-medium">Disponible</th>
                  <th className="py-2 text-right font-medium">Se libera mañana</th>
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
                    <td className="py-2 text-right text-ink/60">{s.saldo.porLiberar > 0 ? formatCurrency(s.saldo.porLiberar) : "—"}</td>
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

      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Términos para el paciente</h3>
          <button onClick={copiarTerminos} className="rounded-lg border border-edge/30 bg-field px-3 py-1.5 text-xs font-semibold text-ink/90 hover:bg-surface2">
            {copiado ? "¡Copiado!" : "Copiar términos"}
          </button>
        </div>
        <p className="mt-1 text-xs text-ink/40">Se arman con lo que configuraste arriba. Comunícalos desde el anuncio y agrega el programa al aviso de privacidad (manejas teléfono, historial y saldo).</p>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-ink/80">
          {terminos.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
