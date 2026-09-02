"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { presupuestosPorEstadoInicial } from "@/lib/metas";
import { sumarPresupuestosEnRango, type RangoPeriodo } from "@/lib/dashboardMetrics";
import DashboardMetricCard from "./DashboardMetricCard";
import LaboratoriosPendientesPanel from "./LaboratoriosPendientesPanel";
import PresupuestosPendientesPanel from "./PresupuestosPendientesPanel";

/** Fila 3 del Dashboard Principal — Ventas: qué tanto se está presupuestando,
 * qué tanto de eso se acepta, y qué trabajo de laboratorio sigue pendiente.
 *
 * "Presupuestado (periodo)" SÍ reacciona a `rango` (cuántos presupuestos se
 * CREARON en ese rango, y su valor) — pero Aceptados/Pendientes/Conversión/
 * Laboratorios Pendientes siguen siendo históricos/estado-actual: no existe
 * (todavía) un registro de CUÁNDO un presupuesto cambió a "aceptado", así
 * que esas cifras no se pueden filtrar por periodo sin inventar una fecha —
 * mismo alcance que Saldo Pendiente en la Fila 1.
 *
 * "Pendiente" se calcula por resta (total histórico menos lo ya resuelto)
 * en vez de leerse directo del rollup por estado: el campo `estado` es
 * nuevo, así que ningún presupuesto creado antes de este cambio quedó
 * contado ahí — leerlo directo mostraría $0 pendiente aunque hubiera
 * presupuestos reales sin resolver. Restar sí es correcto de inmediato,
 * porque el total histórico (`totalPresupuestado`/`presupuestosPorMes`) ya
 * existía antes y sí es completo. */
export default function BudgetMetrics({ rango }: { rango: RangoPeriodo }) {
  const { puedeVerFinanzas, estadisticas, laboratoriosPendientes } = usePatientData();
  const presupuestadoPeriodo = sumarPresupuestosEnRango(estadisticas.presupuestosPorFecha, rango.desdeISO, rango.hastaISO);
  const [mostrarLaboratorios, setMostrarLaboratorios] = useState(false);
  const [mostrarPresupuestos, setMostrarPresupuestos] = useState(false);

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
              label={`Presupuestado (${rango.label})`}
              value={formatCurrency(presupuestadoPeriodo.valor)}
              color="#ffb020"
              sensible
              tooltip={`${presupuestadoPeriodo.cantidad} presupuesto(s) creado(s) en este periodo.`}
            />
            <DashboardMetricCard
              label="Valor Presupuestado (histórico)"
              value={formatCurrency(estadisticas.totalPresupuestado)}
              color="#ffb020"
              sensible
              tooltip="Suma histórica de TODOS los presupuestos creados desde siempre — no del periodo seleccionado arriba."
            />
            <DashboardMetricCard
              label="Presupuestos Aceptados"
              value={formatCurrency(porEstado.aceptado.valor)}
              color="#2ee67a"
              sensible
              tooltip="Valor de los presupuestos marcados como Aceptado."
            />
            <DashboardMetricCard
              label="Presupuestos Pendientes"
              value={formatCurrency(valorPendiente)}
              color="#3aa8ff"
              sensible
              onClick={() => setMostrarPresupuestos(true)}
              tooltip={`${cantidadPendiente} presupuesto(s) sin marcar como Aceptado, Rechazado o Expirado — aún sin respuesta del paciente. Ver detalle por paciente.`}
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
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2 transition-all"
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
      {mostrarPresupuestos && <PresupuestosPendientesPanel onClose={() => setMostrarPresupuestos(false)} />}
    </>
  );
}
