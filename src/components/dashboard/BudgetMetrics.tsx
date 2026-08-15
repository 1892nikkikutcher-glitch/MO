"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { presupuestosPorEstadoInicial } from "@/lib/metas";
import DashboardMetricCard from "./DashboardMetricCard";
import LaboratoriosPendientesPanel from "./LaboratoriosPendientesPanel";

/** Fila 3 del Dashboard Principal — Ventas: qué tanto se está presupuestando,
 * qué tanto de eso se acepta, y qué trabajo de laboratorio sigue pendiente.
 * Los montos ($) son históricos (desde que existe cada rollup), no de un
 * periodo — mismo alcance que Saldo Pendiente en la Fila 1.
 *
 * "Pendiente" se calcula por resta (total histórico menos lo ya resuelto)
 * en vez de leerse directo del rollup por estado: el campo `estado` es
 * nuevo, así que ningún presupuesto creado antes de este cambio quedó
 * contado ahí — leerlo directo mostraría $0 pendiente aunque hubiera
 * presupuestos reales sin resolver. Restar sí es correcto de inmediato,
 * porque el total histórico (`totalPresupuestado`/`presupuestosPorMes`) ya
 * existía antes y sí es completo. */
export default function BudgetMetrics() {
  const { puedeVerFinanzas, estadisticas, laboratoriosPendientes } = usePatientData();
  const [mostrarLaboratorios, setMostrarLaboratorios] = useState(false);

  const porEstado = estadisticas.presupuestosPorEstado ?? presupuestosPorEstadoInicial;
  const cantidadHistorica = Object.values(estadisticas.presupuestosPorMes).reduce((s, n) => s + n, 0);
  const cantidadResueltos = porEstado.aceptado.cantidad + porEstado.rechazado.cantidad + porEstado.expirado.cantidad;
  const cantidadPendiente = Math.max(0, cantidadHistorica - cantidadResueltos);
  const valorResuelto = porEstado.aceptado.valor + porEstado.rechazado.valor + porEstado.expirado.valor;
  const valorPendiente = Math.max(0, estadisticas.totalPresupuestado - valorResuelto);

  const conversionPct = cantidadHistorica > 0 ? Math.round((porEstado.aceptado.cantidad / cantidadHistorica) * 100) : 0;

  // El conteo mostrado usa el rollup viejo (laboratoriosPendientesCount),
  // completo desde antes de esta etapa — el detalle clicable (porOrden) es
  // nuevo y solo refleja órdenes tocadas desde que existe, así que puede
  // mostrar menos órdenes de las que dice el conteo hasta que se vayan
  // actualizando con el uso normal.
  const totalLaboratoriosPendientes = estadisticas.laboratoriosPendientesCount;
  const totalConDetalle = Object.values(laboratoriosPendientes.porOrden).length;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {puedeVerFinanzas && (
          <>
            <DashboardMetricCard
              label="Valor Presupuestado"
              value={formatCurrency(estadisticas.totalPresupuestado)}
              color="#ffb020"
              tooltip="Suma histórica de todos los presupuestos creados."
            />
            <DashboardMetricCard
              label="Presupuestos Aceptados"
              value={formatCurrency(porEstado.aceptado.valor)}
              color="#2ee67a"
              tooltip="Valor de los presupuestos marcados como Aceptado."
            />
            <DashboardMetricCard
              label="Presupuestos Pendientes"
              value={formatCurrency(valorPendiente)}
              color="#3aa8ff"
              tooltip={`${cantidadPendiente} presupuesto(s) sin marcar como Aceptado, Rechazado o Expirado — aún sin respuesta del paciente.`}
            />
          </>
        )}

        <DashboardMetricCard
          label="Conversión de Presupuestos"
          value={cantidadHistorica > 0 ? `${conversionPct}%` : "—"}
          color="#b84dff"
          tooltip={
            cantidadHistorica > 0
              ? `${porEstado.aceptado.cantidad} aceptados de ${cantidadHistorica} presupuestos creados.`
              : "Aún no hay presupuestos para calcularlo."
          }
        >
          {cantidadHistorica > 0 && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-inset">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-orange-500 transition-all"
                style={{ width: `${conversionPct}%` }}
              />
            </div>
          )}
        </DashboardMetricCard>

        <DashboardMetricCard
          label="Laboratorios Pendientes"
          value={String(totalLaboratoriosPendientes)}
          color="#ff3d9a"
          onClick={() => setMostrarLaboratorios(true)}
          tooltip={
            totalConDetalle < totalLaboratoriosPendientes
              ? `Ver detalle agrupado por vencidos, vencen hoy y próximos. Por ahora el detalle solo tiene ${totalConDetalle} de ${totalLaboratoriosPendientes} — se completa conforme se editan.`
              : "Ver detalle agrupado por vencidos, vencen hoy y próximos"
          }
        />
      </div>

      {mostrarLaboratorios && <LaboratoriosPendientesPanel onClose={() => setMostrarLaboratorios(false)} />}
    </>
  );
}
