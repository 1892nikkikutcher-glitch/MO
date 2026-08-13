"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import {
  diasParaVencer,
  estatusReal,
  usosDe,
  type MembershipPlan,
  type PatientMembership,
} from "@/lib/membresias";

const medicos = ["Dr. Nicolás Medina González", "Dra. Ana Paola Ríos Cervantes"];
const formasDePago = ["Efectivo", "Tarjeta de crédito", "Tarjeta de débito", "Transferencia", "Cheque"];

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function formatFechaCorta(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

function DatosPagoDialog({
  titulo,
  precio,
  onClose,
  onConfirmar,
}: {
  titulo: string;
  precio: number;
  onClose: () => void;
  onConfirmar: (datos: { medico: string; formaPago: string; facturar: boolean }) => void;
}) {
  const [medico, setMedico] = useState(medicos[0]);
  const [formaPago, setFormaPago] = useState(formasDePago[0]);
  const [facturar, setFacturar] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">{titulo}</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>
        <p className="mb-4 text-2xl font-bold text-accent">{formatCurrency(precio)}</p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Médico tratante</label>
            <select value={medico} onChange={(e) => setMedico(e.target.value)} className={inputClass}>
              {medicos.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Forma de pago</label>
            <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className={inputClass}>
              {formasDePago.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={facturar}
              onChange={(e) => setFacturar(e.target.checked)}
              className="h-4 w-4 rounded border-edge/30"
            />
            Activo para facturar
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
            onClick={() => onConfirmar({ medico, formaPago, facturar })}
            className="flex-1 rounded-lg bg-gradient-to-r from-accent to-orange-500 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Confirmar pago
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivarMembresiaDialog({
  planes,
  onClose,
  onActivar,
}: {
  planes: MembershipPlan[];
  onClose: () => void;
  onActivar: (plan: MembershipPlan, datosPago: { medico: string; formaPago: string; facturar: boolean }) => void;
}) {
  const { irAPagina } = usePatientData();
  const [planId, setPlanId] = useState(planes[0]?.id ?? "");
  const [mostrarPago, setMostrarPago] = useState(false);
  const plan = planes.find((p) => p.id === planId);

  if (mostrarPago && plan) {
    return (
      <DatosPagoDialog
        titulo={`Activar: ${plan.nombre}`}
        precio={plan.precio}
        onClose={() => setMostrarPago(false)}
        onConfirmar={(datosPago) => onActivar(plan, datosPago)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Activar membresía</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>
        {planes.length === 0 ? (
          <p className="text-sm text-ink/50">
            No hay membresías configuradas. Créalas en{" "}
            <button
              onClick={() => irAPagina("membresias")}
              className="font-semibold text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
            >
              Membresías
            </button>
            .
          </p>
        ) : (
          <>
            <label className="mb-1 block text-xs font-medium text-ink/60">Membresía</label>
            <select value={planId} onChange={(e) => setPlanId(e.target.value)} className={inputClass}>
              {planes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} — {formatCurrency(p.precio)}
                </option>
              ))}
            </select>
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
              >
                Cancelar
              </button>
              <button
                onClick={() => setMostrarPago(true)}
                className="flex-1 rounded-lg bg-gradient-to-r from-accent to-orange-500 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
              >
                Continuar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function UsarBeneficioDialog({
  membresia,
  onClose,
  onUsar,
}: {
  membresia: PatientMembership;
  onClose: () => void;
  onUsar: (beneficioId: string, profesional: string) => void;
}) {
  const disponibles = membresia.beneficios.filter(
    (b) => b.tipo === "uso" && (b.limite === null || usosDe(membresia, b.id) < b.limite)
  );
  const [beneficioId, setBeneficioId] = useState(disponibles[0]?.id ?? "");
  const [medico, setMedico] = useState(medicos[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Usar beneficio</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>
        {disponibles.length === 0 ? (
          <p className="text-sm text-ink/50">Esta membresía no tiene beneficios de uso disponibles.</p>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Beneficio</label>
                <select value={beneficioId} onChange={(e) => setBeneficioId(e.target.value)} className={inputClass}>
                  {disponibles.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nombre} ({usosDe(membresia, b.id)} de {b.limite ?? "∞"} usadas)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Profesional que atiende</label>
                <select value={medico} onChange={(e) => setMedico(e.target.value)} className={inputClass}>
                  {medicos.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
              >
                Cancelar
              </button>
              <button
                onClick={() => onUsar(beneficioId, medico)}
                className="flex-1 rounded-lg bg-gradient-to-r from-accent to-orange-500 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
              >
                Registrar uso
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function HistorialDialog({
  membresias,
  onClose,
}: {
  membresias: PatientMembership[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Historial de membresías</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>
        {membresias.length === 0 ? (
          <p className="text-sm text-ink/40">Sin membresías registradas.</p>
        ) : (
          <div className="space-y-3">
            {membresias.map((m) => (
              <div key={m.id} className="rounded-lg border border-edge/10 bg-surface p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">{m.planNombre}</span>
                  <span className="text-xs uppercase text-ink/40">{estatusReal(m)}</span>
                </div>
                <p className="text-xs text-ink/50">
                  {formatFechaCorta(m.fechaInicio)} → {formatFechaCorta(m.fechaFin)} ·{" "}
                  {formatCurrency(m.precio)}
                </p>
                {Object.entries(m.usos).some(([, usos]) => usos.length > 0) && (
                  <div className="mt-2 space-y-1">
                    {m.beneficios
                      .filter((b) => (m.usos[b.id]?.length ?? 0) > 0)
                      .map((b) => (
                        <p key={b.id} className="text-xs text-ink/60">
                          {b.nombre}: {usosDe(m, b.id)} uso(s) —{" "}
                          {m.usos[b.id].map((u) => formatFechaCorta(u.fecha)).join(", ")}
                        </p>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MembresiaTab({
  patientId,
  patientName,
}: {
  patientId: string;
  patientName: string;
}) {
  const { membershipPlanes, membresiasPorPaciente, activarMembresia, renovarMembresia, usarBeneficio } =
    usePatientData();
  const [showActivar, setShowActivar] = useState(false);
  const [showUsar, setShowUsar] = useState(false);
  const [showRenovar, setShowRenovar] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);

  const membresias = membresiasPorPaciente[patientId] ?? [];
  const activa = membresias.find((m) => estatusReal(m) === "activa");

  if (!activa) {
    return (
      <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center">
        <p className="mb-4 text-sm text-ink/50">
          {patientName} no tiene una membresía activa actualmente.
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setShowActivar(true)}
            className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
          >
            Activar membresía
          </button>
          {membresias.length > 0 && (
            <button
              onClick={() => setShowHistorial(true)}
              className="rounded-lg border border-edge/15 px-4 py-2.5 text-sm font-semibold text-ink/80 hover:bg-surface2"
            >
              Ver historial
            </button>
          )}
        </div>

        {showActivar && (
          <ActivarMembresiaDialog
            planes={membershipPlanes}
            onClose={() => setShowActivar(false)}
            onActivar={(plan, datosPago) => {
              activarMembresia(patientId, plan, datosPago);
              setShowActivar(false);
            }}
          />
        )}
        {showHistorial && (
          <HistorialDialog membresias={membresias} onClose={() => setShowHistorial(false)} />
        )}
      </div>
    );
  }

  const dias = diasParaVencer(activa.fechaFin);
  const porVencer = dias <= 30;

  return (
    <div className="space-y-4 rounded-2xl border border-accent/25 bg-surface p-6">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold text-ink">💎 Membresía activa</h3>
        {porVencer && (
          <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
            Vence en {dias} día{dias === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div>
        <p className="text-lg font-semibold text-accent">{activa.planNombre}</p>
        <p className="text-xs text-ink/50">
          Vigencia: {formatFechaCorta(activa.fechaInicio)} → {formatFechaCorta(activa.fechaFin)}
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink/40">Beneficios</p>
        {activa.beneficios.length === 0 && <p className="text-xs text-ink/30">Sin beneficios configurados</p>}
        {activa.beneficios.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between rounded-lg border border-edge/10 bg-inset px-3 py-2 text-sm"
          >
            <span className="text-ink/80">
              {b.tipo === "uso" ? "🦷" : "💰"} {b.nombre}
            </span>
            <span className="text-xs text-ink/50">
              {b.tipo === "uso"
                ? `${usosDe(activa, b.id)} de ${b.limite ?? "∞"} utilizadas`
                : `${b.descuentoPorcentaje ?? 0}%`}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          onClick={() => setShowUsar(true)}
          className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90"
        >
          Usar beneficio
        </button>
        <button
          onClick={() => setShowHistorial(true)}
          className="rounded-lg border border-edge/15 px-4 py-2 text-xs font-semibold text-ink/80 hover:bg-surface2"
        >
          Ver historial
        </button>
        <button
          onClick={() => setShowRenovar(true)}
          className="rounded-lg border border-accent/40 px-4 py-2 text-xs font-semibold text-accent hover:bg-accent/10"
        >
          Renovar
        </button>
      </div>

      {showUsar && (
        <UsarBeneficioDialog
          membresia={activa}
          onClose={() => setShowUsar(false)}
          onUsar={(beneficioId, profesional) => {
            usarBeneficio(patientId, activa.id, beneficioId, profesional);
            setShowUsar(false);
          }}
        />
      )}
      {showRenovar && (
        <DatosPagoDialog
          titulo={`Renovar: ${activa.planNombre}`}
          precio={activa.precio}
          onClose={() => setShowRenovar(false)}
          onConfirmar={(datosPago) => {
            renovarMembresia(patientId, activa, datosPago);
            setShowRenovar(false);
          }}
        />
      )}
      {showHistorial && (
        <HistorialDialog membresias={membresias} onClose={() => setShowHistorial(false)} />
      )}
    </div>
  );
}
