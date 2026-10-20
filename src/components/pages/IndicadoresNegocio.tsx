"use client";

import { useMemo, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { usePrivacidad } from "@/context/PrivacidadContext";
import { formatCurrency } from "@/lib/patientData";
import { calcularIndicadores, diasDelMes, mesDesplazado } from "@/lib/indicadoresNegocio";
import { rentabilidadPorTratamiento } from "@/lib/rentabilidadTratamientos";
import { gastoCategoriaOptions, type GastoCategoria } from "@/lib/gastos";
import { balanceInicial, type BalanceConsultorio } from "@/lib/balanceConsultorio";
import { generarEstadosFinancierosPdf } from "@/lib/generarEstadosFinancierosPdf";
import { descargarBlob } from "@/lib/pdfDocumento";

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const pct = (n: number) => `${n < 0 ? "−" : ""}${Math.abs(Math.round(n * 100))}%`;
const pctConSigno = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(Math.round(n * 100))}%`;
const dias = (n: number) => `${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })} ${Math.round(n) === 1 ? "día" : "días"}`;
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

const CAMPOS_BALANCE: { clave: keyof BalanceConsultorio; titulo: string; ayuda: string }[] = [
  { clave: "efectivo", titulo: "Efectivo en caja y bancos", ayuda: "Lo que tienes hoy disponible." },
  { clave: "inventario", titulo: "Inventario de insumos", ayuda: "Materiales en existencia, a lo que costaron." },
  { clave: "otrosCirculantes", titulo: "Otros activos de corto plazo", ayuda: "Lo que se convierte en dinero en menos de un año (sin contar lo que te deben los pacientes: eso MO lo toma solo)." },
  { clave: "cuentasPorPagar", titulo: "Cuentas por pagar", ayuda: "Lo que debes a proveedores y laboratorios, a menos de un año." },
  { clave: "deudaCortoPlazo", titulo: "Deuda a corto plazo", ayuda: "Tarjetas, préstamos y otras deudas a menos de un año." },
  { clave: "deudaLargoPlazo", titulo: "Deuda a largo plazo", ayuda: "Créditos a más de un año." },
  { clave: "valorEquipo", titulo: "Valor del equipo y mobiliario", ayuda: "Opcional. Si lo dejas vacío, MO usa todo lo que has registrado como inversión." },
];

/** Lo que MO no puede saber solo: efectivo en bancos, deudas y lo que se debe a proveedores. Lo demás sale de los datos. */
function BalanceForm({ balance, onGuardar, editable }: { balance: BalanceConsultorio; onGuardar: (b: BalanceConsultorio) => void; editable: boolean }) {
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(CAMPOS_BALANCE.map((c) => [c.clave, balance[c.clave] ? String(balance[c.clave]) : ""]))
  );
  const [guardado, setGuardado] = useState(false);
  const guardar = () => {
    const num = (clave: string) => {
      const n = Number(valores[clave]);
      return Number.isFinite(n) && n > 0 ? n : 0;
    };
    onGuardar({
      efectivo: num("efectivo"),
      inventario: num("inventario"),
      otrosCirculantes: num("otrosCirculantes"),
      cuentasPorPagar: num("cuentasPorPagar"),
      deudaCortoPlazo: num("deudaCortoPlazo"),
      deudaLargoPlazo: num("deudaLargoPlazo"),
      valorEquipo: valores.valorEquipo.trim() === "" ? null : num("valorEquipo"),
      actualizadoEl: new Date().toISOString(),
    });
    setGuardado(true);
  };
  return (
    <details className="mt-3 rounded-xl border border-edge/10 bg-inset">
      <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold text-ink/70">
        Balance del consultorio · {balance.actualizadoEl ? `actualizado el ${new Date(balance.actualizadoEl).toLocaleDateString("es-MX")}` : "sin capturar"}
        <span className="ml-2 font-normal text-ink/40">lo que se tiene y lo que se debe, para el capital de trabajo y el endeudamiento</span>
      </summary>
      <div className="space-y-3 px-4 pb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CAMPOS_BALANCE.map((c) => (
            <label key={c.clave} className="block text-xs text-ink/60" title={c.ayuda}>
              {c.titulo}
              <input
                type="number"
                min={0}
                value={valores[c.clave]}
                disabled={!editable}
                onChange={(e) => {
                  setValores((v) => ({ ...v, [c.clave]: e.target.value }));
                  setGuardado(false);
                }}
                placeholder={c.clave === "valorEquipo" ? "Usar lo invertido" : "0"}
                className="mt-1 w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60 disabled:opacity-60"
              />
              <span className="mt-0.5 block text-[11px] text-ink/35">{c.ayuda}</span>
            </label>
          ))}
        </div>
        <p className="text-[11px] text-ink/40">
          Las cuentas por cobrar (lo que te deben los pacientes) y el equipo (lo registrado como inversión) los toma MO solo. Esto solo lo ve y edita el administrador.
        </p>
        {editable ? (
          <div className="flex items-center gap-3">
            <button onClick={guardar} className="rounded-lg border border-accent/60 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25">
              Guardar balance
            </button>
            {guardado && <span className="text-sm text-success">Balance guardado</span>}
          </div>
        ) : (
          <p className="text-[11px] text-warning">Solo el administrador puede cambiar el balance.</p>
        )}
      </div>
    </details>
  );
}

/** Indicadores empresariales del mes: lo que hay que mirar para saber si el consultorio es negocio sano. */
export default function IndicadoresNegocio() {
  const { puedeVerFinanzas, finanzas, gastos, presupuestoGastos, citas, recursos, sedes, patients, saldosPendientes, estadisticas, metas, procedimientos, balance, setBalance, miRol, clinicInfo, perfilDoctor } = usePatientData();
  const { oculto } = usePrivacidad();
  const hoy = hoyISO();
  const [mes, setMes] = useState(() => mesDesplazado(hoy, 0));
  const [verTodosTratamientos, setVerTodosTratamientos] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [errorPdf, setErrorPdf] = useState("");

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
        balance,
      }),
    [mes, hoy, finanzas, gastos, presupuestoGastos, citas, recursos, sedes, patients, saldosPendientes, estadisticas, metas, balance]
  );

  const tratamientos = useMemo(() => {
    const { primero, ultimo } = diasDelMes(mes);
    return rentabilidadPorTratamiento({ procedimientos, estructuraPorHora: ind.finanzas.costoEstructuraPorHora, citas, primero, ultimo });
  }, [mes, procedimientos, citas, ind.finanzas.costoEstructuraPorHora]);

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
  const descargarEstados = async () => {
    setGenerandoPdf(true);
    setErrorPdf("");
    try {
      const { blob, nombre } = await generarEstadosFinancierosPdf({
        indicadores: ind,
        etiquetaMes,
        clinicaNombre: clinicInfo?.nombre || "",
        direccion: perfilDoctor.direccionClinica,
        logoUrl: perfilDoctor.logoClinicaUrl,
        balance,
      });
      descargarBlob(blob, nombre);
    } catch {
      setErrorPdf("No se pudo generar el PDF. Intenta de nuevo.");
    } finally {
      setGenerandoPdf(false);
    }
  };

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
          <button
            onClick={descargarEstados}
            disabled={generandoPdf}
            title="Descargar en PDF el estado de resultados, flujo de efectivo, balance e indicadores de este mes"
            className="rounded-lg border border-edge/30 px-3.5 py-2 text-sm font-semibold text-ink/80 transition-colors hover:bg-field disabled:opacity-60"
          >
            {generandoPdf ? "Generando PDF…" : "Descargar estados financieros (PDF)"}
          </button>
        </div>
      </div>
      {errorPdf && <p className="text-sm text-danger">{errorPdf}</p>}

      <div className="space-y-5">
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">1 · Resultados del mes</h4>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tarjeta
              titulo="Ingresos por ventas"
              valor={$(f.ingresosNetos)}
              detalle={[
                f.variacionIngresos !== null ? `${pctConSigno(f.variacionIngresos)} vs mes anterior` : "Sin ingresos el mes anterior",
                f.proyeccionCierre !== null && f.ingresosNetos > 0 ? `Proyección al cierre: ${$(f.proyeccionCierre)}` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
              tono={f.variacionIngresos !== null ? (f.variacionIngresos >= 0 ? "ok" : "alerta") : undefined}
              ayuda="Cuánto genera el consultorio y si crece: cobros del mes menos devoluciones. La proyección repite el ritmo de los días transcurridos hasta fin de mes."
            />
            <Tarjeta
              titulo="Costos directos"
              valor={$(f.costos)}
              detalle={f.ingresosNetos > 0 ? `${pct(f.costos / f.ingresosNetos)} de los ingresos` : "Lo que cuesta dar el servicio"}
              ayuda="Lo que cuesta dar el servicio: insumos, laboratorio… (gastos marcados como costo en la pantalla de Gastos)."
            />
            <Tarjeta
              titulo="Margen bruto"
              valor={f.margenBruto !== null ? pct(f.margenBruto) : "—"}
              detalle={`Utilidad bruta ${$(f.utilidadBruta)} · (ventas − costos directos) ÷ ventas`}
              tono={f.utilidadBruta < 0 ? "malo" : undefined}
              ayuda="Cuánto queda después de cubrir el costo directo del servicio: (ventas − costos directos) ÷ ventas × 100."
            />
            <Tarjeta
              titulo="Gastos de operación"
              valor={$(f.gastosOperativos)}
              detalle={`Con los costos: fijos ${$(f.gastosFijos)} · variables ${$(f.gastosVariables)}`}
              ayuda="Lo que cuesta operar: renta, nómina, servicios, marketing… Fijos y variables suman costos más gastos de operación; la inversión, los impuestos y los intereses no entran."
            />
            <Tarjeta
              titulo="Utilidad operativa"
              valor={$(f.utilidad)}
              detalle={f.margen !== null ? `Margen operativo ${pct(f.margen)} · antes de intereses e impuestos` : "Sin ingresos para medir el margen"}
              tono={f.utilidad < 0 ? "malo" : f.margen !== null && f.margen < 0.15 ? "alerta" : f.margen !== null ? "ok" : undefined}
              ayuda="Si la operación es rentable antes de intereses e impuestos: utilidad bruta − gastos de operación. No resta la inversión."
            />
            <Tarjeta
              titulo="Impuestos e intereses"
              valor={$(f.financieros)}
              detalle={f.financieros > 0 ? "Lo que se paga al SAT y a los bancos" : "Regístralos en Gastos (categoría Impuestos e intereses)"}
              ayuda="Impuestos e intereses del mes, capturados en Gastos con la categoría Impuestos e intereses. Quedan debajo de la utilidad operativa."
            />
            <Tarjeta
              titulo="Utilidad neta"
              valor={$(f.utilidadNeta)}
              detalle="Utilidad operativa − impuestos e intereses"
              tono={f.utilidadNeta < 0 ? "malo" : undefined}
              ayuda="Lo que queda al final: utilidad operativa menos impuestos e intereses."
            />
            <Tarjeta
              titulo="Margen neto"
              valor={f.margenNeto !== null ? pct(f.margenNeto) : "—"}
              detalle="Qué parte de cada peso vendido es ganancia final"
              tono={f.margenNeto !== null ? (f.margenNeto < 0 ? "malo" : f.margenNeto < 0.1 ? "alerta" : "ok") : undefined}
              ayuda="Utilidad neta ÷ ventas × 100."
            />
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">2 · Efectivo y balance</h4>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tarjeta
              titulo="Flujo de efectivo"
              valor={$(f.flujoEfectivo)}
              detalle={`Entró ${$(f.entradasEfectivo)} · salió ${$(f.salidasEfectivo)}`}
              tono={f.flujoEfectivo < 0 ? "alerta" : "ok"}
              ayuda="Cuánto dinero entra y sale de verdad: cobros netos del mes menos todo lo que salió (costos, gastos, inversión, impuestos e intereses). Determina la capacidad de pagar."
            />
            <Tarjeta
              titulo="Capital de trabajo"
              valor={f.balance.capturado ? $(f.balance.capitalTrabajo) : "—"}
              detalle={
                f.balance.capturado
                  ? `Circulante ${$(f.balance.activoCirculante)} − pasivo ${$(f.balance.pasivoCirculante)}${f.balance.razonCirculante !== null ? ` · liquidez ${f.balance.razonCirculante.toFixed(1)}` : ""}`
                  : "Captura tu balance (abajo)"
              }
              tono={f.balance.capturado ? (f.balance.capitalTrabajo < 0 ? "malo" : "ok") : undefined}
              ayuda="Qué recursos de corto plazo quedan después de cubrir las obligaciones de corto plazo: activo circulante (efectivo, inventario, otros y lo que te deben los pacientes) − pasivo circulante (proveedores y deudas a menos de un año)."
            />
            <Tarjeta
              titulo="Endeudamiento"
              valor={f.balance.capturado && f.balance.endeudamiento !== null ? pct(f.balance.endeudamiento) : "—"}
              detalle={f.balance.capturado ? `Pasivos ${$(f.balance.pasivosTotales)} ÷ activos ${$(f.balance.activosTotales)}` : "Captura tu balance (abajo)"}
              tono={f.balance.capturado && f.balance.endeudamiento !== null ? (f.balance.endeudamiento > 0.6 ? "malo" : f.balance.endeudamiento > 0.4 ? "alerta" : "ok") : undefined}
              ayuda="Qué proporción de lo que tienes se financia con deuda y otras obligaciones: pasivos totales ÷ activos totales × 100. El equipo se toma de lo registrado como inversión, salvo que captures su valor."
            />
            <Tarjeta
              titulo="Inversión"
              valor={$(f.inversion)}
              detalle={`En el año: ${$(f.inversionDelAnio)} · acumulada: ${$(f.inversionAcumulada)}`}
              ayuda="Equipo, mobiliario, remodelación… Se compra una vez y rinde durante años, por eso no resta de la utilidad del mes (sí del efectivo)."
            />
          </div>
          <BalanceForm balance={balance} onGuardar={setBalance} editable={miRol === "admin"} />
        </div>

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">3 · Equilibrio y cobranza</h4>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
              ayuda="Cuánto necesitas vender para cubrir tus costos sin ganar ni perder: costos fijos ÷ margen de contribución, es decir fijos ÷ (1 − variables ÷ ingresos)."
            />
            <Tarjeta
              titulo="Cuentas por cobrar"
              valor={$(f.cuentasPorCobrar.total)}
              detalle={`${f.cuentasPorCobrar.pacientes} ${f.cuentasPorCobrar.pacientes === 1 ? "paciente debe" : "pacientes deben"} (a hoy)`}
              tono={f.cuentasPorCobrar.total > 0 ? "alerta" : undefined}
              ayuda="Cuánto te deben: lo presupuestado menos lo pagado de quien todavía debe. Sale de Saldos pendientes: refleja la realidad desde que se activó ese resumen."
            />
            <Tarjeta
              titulo="Días de cobranza"
              valor={f.diasDeCobranza !== null ? dias(f.diasDeCobranza) : "—"}
              detalle={f.diasDeCobranza !== null ? "Lo que te deben, en días de cobros" : "Sin cobros en los últimos 90 días"}
              tono={f.diasDeCobranza !== null ? (f.diasDeCobranza > 45 ? "malo" : f.diasDeCobranza > 20 ? "alerta" : "ok") : undefined}
              ayuda="Cuánto tardas en convertir lo que te deben en dinero: cuentas por cobrar ÷ cobros promedio por día de los últimos 90 días. Es una aproximación con tus cobros, no con ventas a crédito."
            />
            <Tarjeta
              titulo="Ticket promedio"
              valor={f.ticketPromedio !== null ? $(f.ticketPromedio) : "—"}
              detalle={`${f.pagos} ${f.pagos === 1 ? "pago" : "pagos"} en el mes`}
              ayuda="Cobros brutos del mes entre el número de pagos registrados."
            />
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">4 · Rentabilidad de la inversión y metas</h4>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tarjeta
              titulo="Rentabilidad de la inversión"
              valor={f.rentabilidadInversion ? pct(f.rentabilidadInversion.rendimiento) : "—"}
              detalle={
                f.rentabilidadInversion
                  ? `Utilidad neta de 12 meses ${$(f.rentabilidadInversion.utilidadNeta12m)} (${f.rentabilidadInversion.mesesConDatos} ${f.rentabilidadInversion.mesesConDatos === 1 ? "mes con datos" : "meses con datos"})`
                  : "Registra tu inversión en Gastos (categoría Inversión)"
              }
              tono={f.rentabilidadInversion ? (f.rentabilidadInversion.rendimiento < 0 ? "malo" : "ok") : undefined}
              ayuda="Qué rendimiento produce el capital invertido: utilidad neta de los últimos 12 meses ÷ inversión acumulada × 100. Con pocos meses de datos se queda corto."
            />
            <Tarjeta
              titulo="Recuperación de la inversión"
              valor={f.rentabilidadInversion?.mesesParaRecuperar != null ? `${f.rentabilidadInversion.mesesParaRecuperar.toFixed(1)} meses` : "—"}
              detalle={f.rentabilidadInversion ? `Inversión acumulada ${$(f.inversionAcumulada)}` : "Sin inversión registrada"}
              ayuda="En cuántos meses se recupera lo invertido con la utilidad neta mensual promedio de los últimos 12 meses."
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
        </div>

        {f.gastosPorCategoria.length > 0 && (
          <div className="mt-3 overflow-x-auto rounded-xl border border-edge/10">
            <table className="w-full min-w-[420px] text-left text-xs text-ink">
              <thead className="text-[11px] uppercase tracking-wide text-ink/40">
                <tr>
                  <th className="px-3 py-2 font-medium">Costos y gastos por categoría</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 text-right font-medium">Monto</th>
                  <th className="px-3 py-2 text-right font-medium">% de ingresos</th>
                </tr>
              </thead>
              <tbody>
                {f.gastosPorCategoria.map((g) => (
                  <tr key={g.categoria} className="border-t border-edge/10">
                    <td className="px-3 py-1.5">{g.categoria}</td>
                    <td className="px-3 py-1.5 text-ink/50">{g.clasificacion === "fijo" ? "Fijo" : g.clasificacion === "mixto" ? "Fijo y variable" : "Variable"}</td>
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
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">Horas trabajadas y costo por hora</h4>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tarjeta
            titulo="Horas trabajadas"
            valor={horas(o.horasAtendidas)}
            detalle={o.horasDisponibles > 0 ? `de ${horas(o.horasDisponibles)} disponibles en los bloques` : "Define los bloques de cada médico en la Agenda"}
            ayuda="Horas de citas atendidas dentro de los bloques de atención en el mes."
          />
          <Tarjeta
            titulo="Costo por hora trabajada"
            valor={f.costoPorHoraTrabajada !== null ? $(f.costoPorHoraTrabajada) : "—"}
            detalle={
              f.costoPorHoraTrabajada !== null
                ? `Estructura ${f.costoEstructuraPorHora !== null ? $(f.costoEstructuraPorHora) : "—"} + insumos y laboratorio`
                : "Sin horas trabajadas en el mes"
            }
            ayuda="Todos los gastos del mes entre las horas trabajadas. La estructura es lo mismo sin insumos ni laboratorio: lo que cuesta tener abierto el consultorio cada hora."
          />
          <Tarjeta
            titulo="Ingreso por hora"
            valor={o.ingresoPorHoraAtendida !== null ? $(o.ingresoPorHoraAtendida) : "—"}
            detalle={o.ingresoPorHoraAtendida !== null ? "Ingresos netos ÷ horas trabajadas" : "Sin horas trabajadas en el mes"}
            ayuda="Cuánto produce cada hora de atención: ingresos netos del mes entre las horas trabajadas."
          />
          <Tarjeta
            titulo="Utilidad por hora"
            valor={f.utilidadPorHora !== null ? $(f.utilidadPorHora) : "—"}
            detalle={
              f.utilidadPorHora !== null
                ? `${$(f.utilidad)} de utilidad del mes${f.costoPorHoraDisponible !== null ? ` · cada hora abierta cuesta ${$(f.costoPorHoraDisponible)}` : ""}`
                : "Sin horas trabajadas en el mes"
            }
            tono={f.utilidadPorHora !== null ? (f.utilidadPorHora < 0 ? "malo" : "ok") : undefined}
            ayuda="Utilidad del mes entre las horas trabajadas. 'Cada hora abierta cuesta' reparte los gastos entre todas las horas de los bloques, se hayan usado o no."
          />
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/40">Costo y utilidad por tratamiento</h4>
        {tratamientos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-edge/15 p-4 text-xs text-ink/50">
            Aún no hay procedimientos. Agrégalos en Administración → Procedimientos y costos.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-edge/10">
              <table className="w-full min-w-[820px] text-left text-xs text-ink">
                <thead className="text-[11px] uppercase tracking-wide text-ink/40">
                  <tr>
                    <th className="px-3 py-2 font-medium">Tratamiento</th>
                    <th className="px-3 py-2 text-right font-medium">Precio</th>
                    <th className="px-3 py-2 text-right font-medium">Comisión</th>
                    <th className="px-3 py-2 text-right font-medium">Insumos y lab.</th>
                    <th className="px-3 py-2 text-right font-medium">Tiempo</th>
                    <th className="px-3 py-2 text-right font-medium">Estructura</th>
                    <th className="px-3 py-2 text-right font-medium">Costo total</th>
                    <th className="px-3 py-2 text-right font-medium">Utilidad</th>
                    <th className="px-3 py-2 text-right font-medium">Margen</th>
                    <th className="px-3 py-2 text-right font-medium">Utilidad/hora</th>
                    <th className="px-3 py-2 text-right font-medium">Veces</th>
                  </tr>
                </thead>
                <tbody>
                  {(verTodosTratamientos ? tratamientos : tratamientos.slice(0, 12)).map((t) => (
                    <tr key={t.id} className={`border-t border-edge/10 ${t.sinPrecio ? "opacity-50" : ""}`}>
                      <td className="px-3 py-1.5">
                        {t.nombre}
                        {t.sinPrecio && <span className="ml-1.5 text-[10px] text-warning">sin precio</span>}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{$(t.precio)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{$(t.comision)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{$(t.insumos)}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{t.duracionMin} min</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{t.costoEstructura !== null ? $(t.costoEstructura) : "—"}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{t.costoTotal !== null ? $(t.costoTotal) : "—"}</td>
                      <td className={`px-3 py-1.5 text-right font-semibold tabular-nums ${t.sinPrecio || t.utilidad === null ? "" : t.utilidad < 0 ? "text-danger" : "text-success"}`}>
                        {t.sinPrecio ? "—" : t.utilidad !== null ? $(t.utilidad) : `${$(t.utilidadDirecta)} directa`}
                      </td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{!t.sinPrecio && t.margen !== null ? pct(t.margen) : "—"}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{!t.sinPrecio && t.utilidadPorHora !== null ? $(t.utilidadPorHora) : "—"}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{t.veces}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tratamientos.length > 12 && (
              <button onClick={() => setVerTodosTratamientos((v) => !v)} className="mt-2 text-xs font-semibold text-accent hover:underline">
                {verTodosTratamientos ? "Ver menos" : `Ver los ${tratamientos.length - 12} restantes`}
              </button>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-ink/40">
              Utilidad = precio − comisión del médico − insumos y laboratorio − la parte de la estructura del consultorio (renta, servicios, nómina y demás
              gastos, sin insumos ni laboratorio) que le toca por el tiempo que ocupa, al costo por hora del mes elegido.{" "}
              {f.costoEstructuraPorHora === null
                ? "Este mes no hubo horas trabajadas, así que solo se muestra la utilidad directa. "
                : ""}
              Si registras las comisiones de los médicos como gasto de Nómina, esa parte se cuenta dos veces. Los insumos y el laboratorio se capturan en cada
              procedimiento (Administración → Procedimientos y costos).
            </p>
          </>
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
