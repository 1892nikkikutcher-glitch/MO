"use client";

import { useMemo, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { usePrivacidad } from "@/context/PrivacidadContext";
import { formatCurrency } from "@/lib/patientData";
import { calcularIndicadores, mesDesplazado } from "@/lib/indicadoresNegocio";
import { gastoCategoriaOptions, type GastoCategoria } from "@/lib/gastos";

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const pctConSigno = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(Math.round(n * 100))}%`;
const horas = (n: number) => `${n.toLocaleString("es-MX", { maximumFractionDigits: 1 })} h`;

type Tono = "ok" | "alerta" | "malo";
const claseTono = (t?: Tono) => (t === "ok" ? "text-success" : t === "alerta" ? "text-warning" : t === "malo" ? "text-danger" : "text-ink");

function Tarjeta({ titulo, valor, detalle, tono, ayuda }: { titulo: string; valor: string; detalle?: string; tono?: Tono; ayuda: string }) {
  return (
    <div className="rounded-xl border border-edge/10 bg-inset p-4" title={ayuda}>
      <div className="text-[11px] uppercase tracking-wide text-ink/40">{titulo}</div>
      <div className={`mt-1 text-xl font-bold ${claseTono(tono)}`}>{valor}</div>
      {detalle && <div className="mt-0.5 text-[11px] leading-snug text-ink/50">{detalle}</div>}
    </div>
  );
}

/** Indicadores empresariales del mes: lo que hay que mirar para saber si el consultorio es negocio sano. */
export default function IndicadoresNegocio() {
  const { puedeVerFinanzas, finanzas, gastos, presupuestoGastos, citas, recursos, sedes, patients, saldosPendientes, estadisticas, metas } = usePatientData();
  const { oculto } = usePrivacidad();
  const hoy = hoyISO();
  const [mes, setMes] = useState(() => mesDesplazado(hoy, 0));

  const ind = useMemo(
    () =>
      calcularIndicadores({
        mes,
        hoyISO: hoy,
        finanzas,
        gastos,
        clasificacionPorCategoria: Object.fromEntries(
          gastoCategoriaOptions.map((c) => [c, presupuestoGastos.porCategoria?.[c]?.clasificacion])
        ) as Partial<Record<GastoCategoria, "fijo" | "variable">>,
        citas,
        recursos,
        sedes,
        pacientes: patients,
        saldos: Object.values(saldosPendientes.porPaciente ?? {}),
        presupuestosPorEstado: estadisticas.presupuestosPorEstado,
        metaMensual: metas.metaMensual,
      }),
    [mes, hoy, finanzas, gastos, presupuestoGastos, citas, recursos, sedes, patients, saldosPendientes, estadisticas, metas]
  );

  if (!puedeVerFinanzas) return null;

  const f = ind.finanzas;
  const o = ind.operacion;
  const $ = (n: number) => (oculto ? "••••••" : n < 0 ? `−${formatCurrency(-n)}` : formatCurrency(n));
  const etiquetaMes = (() => {
    const [a, m] = mes.split("-").map(Number);
    const texto = new Date(a, m - 1, 1).toLocaleDateString("es-MX", { month: "long", year: "numeric" });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  })();
  const esMesActual = mes === mesDesplazado(hoy, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Indicadores del negocio</h3>
          <p className="mt-1 text-xs text-ink/40">Lo que muestra si el consultorio es un negocio sano, mes por mes. Pasa el cursor sobre cada uno para ver cómo se calcula.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMes((m) => mesDesplazado(m, -1))}
            aria-label="Mes anterior"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-success/40 text-base text-success transition-colors hover:bg-success/10"
            style={{ boxShadow: "0 0 12px -2px rgb(var(--success-rgb) / 0.5)" }}
          >
            ‹
          </button>
          <span className="min-w-[9rem] text-center text-sm font-semibold text-ink">{etiquetaMes}</span>
          <button
            onClick={() => setMes((m) => mesDesplazado(m, 1))}
            disabled={esMesActual}
            aria-label="Mes siguiente"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-success/40 text-base text-success transition-colors hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-30"
            style={{ boxShadow: "0 0 12px -2px rgb(var(--success-rgb) / 0.5)" }}
          >
            ›
          </button>
          <button
            onClick={() => setMes(mesDesplazado(hoy, 0))}
            disabled={esMesActual}
            className="rounded-lg border border-accent/40 px-3.5 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-40"
          >
            Este mes
          </button>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">Finanzas</h4>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tarjeta
            titulo="Ingresos netos"
            valor={$(f.ingresosNetos)}
            detalle={[
              f.variacionIngresos !== null ? `${pctConSigno(f.variacionIngresos)} vs mes anterior` : "Sin ingresos el mes anterior",
              f.proyeccionCierre !== null && f.ingresosNetos > 0 ? `Proyección al cierre: ${$(f.proyeccionCierre)}` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
            tono={f.variacionIngresos !== null ? (f.variacionIngresos >= 0 ? "ok" : "alerta") : undefined}
            ayuda="Cobros del mes menos devoluciones. La proyección repite el ritmo de los días transcurridos hasta fin de mes."
          />
          <Tarjeta
            titulo="Gastos"
            valor={$(f.gastos)}
            detalle={`Fijos ${$(f.gastosFijos)} · variables ${$(f.gastosVariables)}`}
            ayuda="Todo lo capturado en Gastos este mes. Fijo o variable según lo que definiste en Administración → Presupuesto de gastos."
          />
          <Tarjeta
            titulo="Utilidad"
            valor={$(f.utilidad)}
            detalle={f.margen !== null ? `Margen ${pct(f.margen)} de los ingresos` : "Sin ingresos para medir el margen"}
            tono={f.utilidad < 0 ? "malo" : f.margen !== null && f.margen < 0.15 ? "alerta" : f.margen !== null ? "ok" : undefined}
            ayuda="Ingresos netos menos gastos. El margen es la utilidad entre los ingresos netos. Es una utilidad operativa: no incluye impuestos."
          />
          <Tarjeta
            titulo="Punto de equilibrio"
            valor={f.puntoEquilibrio ? $(f.puntoEquilibrio.ingresoNecesario) : "—"}
            detalle={
              f.puntoEquilibrio
                ? f.puntoEquilibrio.superado
                  ? "Ya cubriste tus gastos fijos este mes"
                  : `Te faltan ${$(f.puntoEquilibrio.faltan)} de ingresos`
                : "Necesita ingresos y gastos fijos del mes"
            }
            tono={f.puntoEquilibrio ? (f.puntoEquilibrio.superado ? "ok" : "alerta") : undefined}
            ayuda="Ingreso mensual con el que se cubren los gastos fijos, suponiendo que los gastos variables pesan lo mismo sobre el ingreso que este mes: fijos ÷ (1 − variables ÷ ingresos)."
          />
          <Tarjeta
            titulo="Ticket promedio"
            valor={f.ticketPromedio !== null ? $(f.ticketPromedio) : "—"}
            detalle={`${f.pagos} ${f.pagos === 1 ? "pago" : "pagos"} en el mes`}
            ayuda="Cobros brutos del mes entre el número de pagos registrados."
          />
          <Tarjeta
            titulo="Cuentas por cobrar"
            valor={$(f.cuentasPorCobrar.total)}
            detalle={`${f.cuentasPorCobrar.pacientes} ${f.cuentasPorCobrar.pacientes === 1 ? "paciente debe" : "pacientes deben"} (a hoy)`}
            tono={f.cuentasPorCobrar.total > 0 ? "alerta" : undefined}
            ayuda="Suma de lo presupuestado menos lo pagado de quien todavía debe. Sale de Saldos pendientes: refleja la realidad desde que se activó ese resumen."
          />
          <Tarjeta
            titulo="Meta del mes"
            valor={f.cumplimientoMeta !== null ? pct(f.cumplimientoMeta) : "Sin meta"}
            detalle={f.cumplimientoMeta !== null ? `de ${$(metas.metaMensual)}` : "Defínela en Administración → Metas"}
            tono={f.cumplimientoMeta !== null ? (f.cumplimientoMeta >= 1 ? "ok" : undefined) : undefined}
            ayuda="Ingresos netos del mes entre tu meta mensual."
          />
          <Tarjeta
            titulo="Dependencia de un médico"
            valor={f.concentracionMedico ? pct(f.concentracionMedico.porcentaje) : "—"}
            detalle={f.concentracionMedico ? `de lo cobrado lo generó ${f.concentracionMedico.nombre}` : "Sin cobros por médico este mes"}
            tono={f.concentracionMedico && f.concentracionMedico.porcentaje > 0.7 ? "alerta" : undefined}
            ayuda="Qué parte de los cobros del mes corresponde al médico que más cobró. Si es muy alta, el negocio depende de una sola persona."
          />
        </div>

        {f.gastosPorCategoria.length > 0 && (
          <div className="mt-3 overflow-x-auto rounded-xl border border-edge/10">
            <table className="w-full min-w-[420px] text-left text-xs text-ink">
              <thead className="text-[11px] uppercase tracking-wide text-ink/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Estructura de gastos</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 text-right font-medium">Monto</th>
                  <th className="px-3 py-2 text-right font-medium">% de ingresos</th>
                </tr>
              </thead>
              <tbody>
                {f.gastosPorCategoria.map((g) => (
                  <tr key={g.categoria} className="border-t border-edge/10">
                    <td className="px-3 py-1.5">{g.categoria}</td>
                    <td className="px-3 py-1.5 text-ink/50">{g.clasificacion === "fijo" ? "Fijo" : "Variable"}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{$(g.monto)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{g.porcentajeDeIngresos !== null ? pct(g.porcentajeDeIngresos) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">Administración y operación</h4>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tarjeta
            titulo="Citas del mes"
            valor={`${o.citasAgendadas}`}
            detalle={`${o.atendidas} atendidas`}
            ayuda="Citas con fecha en el mes, sin contar las reagendadas (esas se cuentan en su nueva fecha)."
          />
          <Tarjeta
            titulo="Cancelaciones e inasistencias"
            valor={o.tasaPerdida !== null ? pct(o.tasaPerdida) : "—"}
            detalle={`${o.canceladas} canceladas · ${o.noAsistio} no asistieron`}
            tono={o.tasaPerdida !== null ? (o.tasaPerdida > 0.2 ? "malo" : o.tasaPerdida > 0.1 ? "alerta" : "ok") : undefined}
            ayuda="Canceladas más no asistió, entre las citas del mes. Cada una es una hora de bloque que no produjo."
          />
          <Tarjeta
            titulo="Utilización de bloques"
            valor={o.utilizacionBloques !== null ? pct(o.utilizacionBloques) : "—"}
            detalle={o.utilizacionBloques !== null ? `${horas(o.horasAtendidas)} atendidas de ${horas(o.horasDisponibles)} disponibles` : "Define los bloques de cada médico en la Agenda"}
            tono={o.utilizacionBloques !== null ? (o.utilizacionBloques >= 0.7 ? "ok" : "alerta") : undefined}
            ayuda="Horas de citas atendidas dentro de los bloques entre las horas que abren esos bloques en el mes. Con el 70% o más se considera bien aprovechado."
          />
          <Tarjeta
            titulo="Ingreso por hora atendida"
            valor={o.ingresoPorHoraAtendida !== null ? $(o.ingresoPorHoraAtendida) : "—"}
            detalle={o.ingresoPorHoraAtendida !== null ? "Ingresos netos ÷ horas atendidas" : "Sin horas atendidas en bloques"}
            ayuda="Cuánto produce cada hora de atención: ingresos netos del mes entre las horas atendidas dentro de los bloques."
          />
          <Tarjeta
            titulo="Pacientes nuevos"
            valor={`${o.pacientesNuevos}`}
            detalle="Registrados en el mes"
            ayuda="Pacientes dados de alta con fecha en este mes."
          />
          <Tarjeta
            titulo="Pacientes activos"
            valor={`${o.pacientesActivos}`}
            detalle="Con una cita atendida en los últimos 12 meses"
            ayuda="Pacientes distintos con al menos una cita atendida en los 12 meses anteriores a hoy."
          />
          <Tarjeta
            titulo="Cierre de presupuestos"
            valor={o.presupuestos?.tasaCierre != null ? pct(o.presupuestos.tasaCierre) : "—"}
            detalle={o.presupuestos ? `${o.presupuestos.pendientes} pendientes por ${$(o.presupuestos.valorPendiente)}` : "Sin presupuestos"}
            ayuda="De los presupuestos ya resueltos (aceptados, rechazados o vencidos), qué parte se aceptó. Es un dato histórico, no del mes."
          />
        </div>
      </div>
    </div>
  );
}
