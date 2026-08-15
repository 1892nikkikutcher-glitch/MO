"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { agruparLaboratoriosPendientes, parseFechaEntrega } from "@/lib/dashboardMetrics";
import LaboratoriosPendientesPanel from "./LaboratoriosPendientesPanel";

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Alerta = {
  key: string;
  emoji: string;
  texto: string;
  onClick: () => void;
};

/** Sección administrativa "Requieren Atención" — cada fila es una alerta
 * accionable que lleva directo al lugar donde se puede resolver. Solo
 * incluye alertas que se pueden calcular con datos reales; ver el resto de
 * la lista pedida (tratamientos sin próxima cita, control de ortodoncia
 * atrasado) en el mensaje de resumen — no hay dato confiable para esas
 * todavía. */
export default function AttentionAlerts() {
  const { puedeVerFinanzas, citas, saldosPendientes, presupuestosPendientesDetalle, laboratoriosPendientes, irAPagina } =
    usePatientData();
  const [mostrarLaboratorios, setMostrarLaboratorios] = useState(false);

  const hoy = new Date();
  const hoyISO = toIso(hoy);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);
  const mananaISO = toIso(manana);
  const hace7Dias = new Date(hoy);
  hace7Dias.setDate(hace7Dias.getDate() - 7);
  const hace7DiasISO = toIso(hace7Dias);

  const gruposLab = agruparLaboratoriosPendientes(Object.values(laboratoriosPendientes.porOrden));
  const enTresDias = new Date(hoy);
  enTresDias.setDate(enTresDias.getDate() + 3);
  const proximosATresDias = gruposLab.proximos.filter((e) => {
    const fecha = parseFechaEntrega(e.fechaEntrega);
    return fecha !== null && fecha <= enTresDias;
  });

  const saldosArr = Object.values(saldosPendientes.porPaciente);
  const saldoTotal = saldosArr.reduce((s, e) => s + (e.totalPresupuestado - e.totalPagado), 0);

  const presupuestosArr = Object.values(presupuestosPendientesDetalle.porPresupuesto);
  const presupuestosTotal = presupuestosArr.reduce((s, e) => s + e.total, 0);

  const citasMananaSinConfirmar = citas.filter((c) => c.fecha === mananaISO && c.estatus === "Agendada").length;

  const noAsistieronRecientes = citas.filter(
    (c) => c.estatus === "No Asistió" && c.fecha >= hace7DiasISO && c.fecha <= hoyISO
  ).length;

  const alertas: Alerta[] = [];

  if (puedeVerFinanzas && saldosArr.length > 0) {
    alertas.push({
      key: "saldo",
      emoji: "🔴",
      texto: `${saldosArr.length} paciente(s) tienen saldo pendiente — ${formatCurrency(saldoTotal)}`,
      onClick: () => irAPagina("reportes-saldos-pendientes"),
    });
  }

  if (puedeVerFinanzas && presupuestosArr.length > 0) {
    alertas.push({
      key: "presupuestos",
      emoji: "🟠",
      texto: `${presupuestosArr.length} presupuesto(s) esperan seguimiento — ${formatCurrency(presupuestosTotal)}`,
      onClick: () => irAPagina("reportes-presupuestos"),
    });
  }

  if (citasMananaSinConfirmar > 0) {
    alertas.push({
      key: "manana",
      emoji: "🟡",
      texto: `${citasMananaSinConfirmar} paciente(s) de mañana no han confirmado`,
      onClick: () => irAPagina("agenda"),
    });
  }

  if (gruposLab.vencidos.length > 0) {
    alertas.push({
      key: "lab-vencidos",
      emoji: "🔴",
      texto: `${gruposLab.vencidos.length} trabajo(s) de laboratorio están vencidos`,
      onClick: () => setMostrarLaboratorios(true),
    });
  }

  if (proximosATresDias.length + gruposLab.vencenHoy.length > 0) {
    alertas.push({
      key: "lab-proximos",
      emoji: "🟠",
      texto: `${proximosATresDias.length + gruposLab.vencenHoy.length} trabajo(s) de laboratorio vencen hoy o en los próximos 3 días`,
      onClick: () => setMostrarLaboratorios(true),
    });
  }

  if (noAsistieronRecientes > 0) {
    alertas.push({
      key: "no-show",
      emoji: "🟡",
      texto: `${noAsistieronRecientes} paciente(s) no asistieron esta última semana`,
      onClick: () => irAPagina("reportes-bitacora-citas"),
    });
  }

  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-6">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-ink/60">Requieren Atención</h2>
      <p className="mb-4 text-xs text-ink/40">
        Tratamientos sin próxima cita y control de ortodoncia atrasado no están aquí — el modelo de
        datos actual no tiene forma de calcularlos de manera confiable todavía.
      </p>

      {alertas.length === 0 ? (
        <p className="text-sm text-ink/40">Todo al día por ahora. 🎉</p>
      ) : (
        <div className="space-y-2">
          {alertas.map((a) => (
            <button
              key={a.key}
              onClick={a.onClick}
              className="flex w-full items-center gap-3 rounded-lg border border-edge/10 bg-inset px-4 py-3 text-left text-sm text-ink transition-colors hover:border-accent/40 hover:bg-surface2"
            >
              <span className="text-lg leading-none">{a.emoji}</span>
              <span>{a.texto}</span>
            </button>
          ))}
        </div>
      )}

      {mostrarLaboratorios && <LaboratoriosPendientesPanel onClose={() => setMostrarLaboratorios(false)} />}
    </div>
  );
}
