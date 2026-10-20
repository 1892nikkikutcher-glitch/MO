"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import {
  calcularFijosYVariables,
  calcularGastosPorCategoria,
  calcularSobresGasto,
  clasificacionDeGasto,
  gastoCategoriaOptions,
  type ClasificacionGasto,
  type GastoCategoria,
  type Gasto,
  type SobreGasto,
} from "@/lib/gastos";
import { formatCurrency } from "@/lib/patientData";
import { inicioMes, sumarRango } from "@/lib/metas";
import ConfirmarEliminar from "@/components/ConfirmarEliminar";

function colorBarraSobre(sobre: SobreGasto): string {
  if (sobre.sinConfigurar) return "bg-ink/10";
  if (sobre.porcentajeUsado >= 100) return "bg-danger";
  if (sobre.porcentajeUsado >= 80) return "bg-warning";
  return "bg-gradient-to-r from-accent to-accent-2";
}

function FilaSobre({ sobre }: { sobre: SobreGasto }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium text-ink">{sobre.categoria}</span>
        <span className="text-ink/50">
          {sobre.sinConfigurar
            ? `${formatCurrency(sobre.gastado)} · sin presupuesto definido`
            : `${formatCurrency(sobre.gastado)} / ${formatCurrency(sobre.limite)} · ${sobre.porcentajeUsado}%`}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-inset">
        <div
          className={`h-full rounded-full transition-all ${colorBarraSobre(sobre)}`}
          style={{ width: `${sobre.sinConfigurar ? 0 : sobre.porcentajeUsado}%` }}
        />
      </div>
      {!sobre.sinConfigurar && sobre.restante < 0 && (
        <p className="mt-1 text-[11px] font-semibold text-danger">Excedido por {formatCurrency(Math.abs(sobre.restante))}</p>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

function todayIso() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(
    hoy.getDate()
  ).padStart(2, "0")}`;
}

function formatFecha(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function Gastos() {
  const { gastos, setGastos, finanzas, puedeVerFinanzas, presupuestoGastos } = usePatientData();
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState<GastoCategoria>(gastoCategoriaOptions[0]);
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(todayIso());
  const [gastoAEliminar, setGastoAEliminar] = useState<Gasto | null>(null);
  // El tipo (fijo o variable) arranca como el de la categoría; si la persona lo cambia a mano, ya no se mueve solo.
  const [tipoManual, setTipoManual] = useState<ClasificacionGasto | null>(null);
  const tipoDeCategoria = (c: GastoCategoria): ClasificacionGasto => clasificacionDeGasto({ categoria: c }, presupuestoGastos.porCategoria);
  const tipo = tipoManual ?? tipoDeCategoria(categoria);

  const puedeGuardar = concepto.trim().length > 0 && Number(monto) > 0;

  const agregarGasto = () => {
    if (!puedeGuardar) return;
    setGastos((prev) => [
      { id: `${Date.now()}`, concepto: concepto.trim(), categoria, monto: Number(monto), fecha, clasificacion: tipo },
      ...prev,
    ]);
    setConcepto("");
    setMonto("");
    setTipoManual(null);
    setCategoria(gastoCategoriaOptions[0]);
    setFecha(todayIso());
  };

  /** Cambia un gasto ya registrado de fijo a variable (o al revés). */
  const alternarTipo = (g: Gasto) => {
    const nuevo: ClasificacionGasto = clasificacionDeGasto(g, presupuestoGastos.porCategoria) === "fijo" ? "variable" : "fijo";
    setGastos((prev) => prev.map((x) => (x.id === g.id ? { ...x, clasificacion: nuevo } : x)));
  };

  const eliminarGasto = (id: string) => {
    setGastos((prev) => prev.filter((g) => g.id !== id));
  };

  const gastosOrdenados = [...gastos].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  const hoy = new Date();
  const inicioDelMes = inicioMes(hoy);
  const gastosDelMes = gastos
    .filter((g) => {
      const d = new Date(`${g.fecha}T00:00:00`);
      return d >= inicioDelMes && d <= hoy;
    })
    .reduce((sum, g) => sum + g.monto, 0);
  const ingresosDelMes = sumarRango(finanzas.porFecha, inicioDelMes, hoy);
  const utilidadDelMes = ingresosDelMes - gastosDelMes;

  const { fijos: gastosFijosDelMes, variables: gastosVariablesDelMes } = calcularFijosYVariables(gastos, presupuestoGastos.porCategoria, inicioDelMes, hoy);
  const parte = (n: number) => (gastosDelMes > 0 ? `${Math.round((n / gastosDelMes) * 100)}% de los gastos` : "Sin gastos este mes");
  const gastosPorCategoria = calcularGastosPorCategoria(gastos, inicioDelMes, hoy);
  const sobres = calcularSobresGasto(presupuestoGastos.porCategoria, gastosPorCategoria, ingresosDelMes);
  const sobresFijos = sobres.filter((s) => s.clasificacion === "fijo");
  const sobresVariables = sobres.filter((s) => s.clasificacion === "variable");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          className="rounded-xl border border-edge/10 bg-surface p-4"
          style={{ boxShadow: "inset 3px 0 0 0 #dc2626" }}
        >
          <div className="text-xl font-bold text-ink">{formatCurrency(gastosDelMes)}</div>
          <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">Gastos del Mes</div>
        </div>
        {puedeVerFinanzas && (
          <>
            <div
              className="rounded-xl border border-edge/10 bg-surface p-4"
              style={{ boxShadow: "inset 3px 0 0 0 #22c55e" }}
            >
              <div className="text-xl font-bold text-ink">{formatCurrency(ingresosDelMes)}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">Ingresos del Mes</div>
            </div>
            <div
              className="rounded-xl border border-edge/10 bg-surface p-4"
              style={{ boxShadow: `inset 3px 0 0 0 ${utilidadDelMes >= 0 ? "#3b82f6" : "#dc2626"}` }}
            >
              <div className="text-xl font-bold text-ink">{utilidadDelMes < 0 ? `−${formatCurrency(-utilidadDelMes)}` : formatCurrency(utilidadDelMes)}</div>
              <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">Utilidad del Mes</div>
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-edge/10 bg-surface p-4" style={{ boxShadow: "inset 3px 0 0 0 #f59e0b" }}>
          <div className="text-xl font-bold text-ink">{formatCurrency(gastosFijosDelMes)}</div>
          <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">Gastos Fijos del Mes</div>
          <div className="mt-0.5 text-[11px] text-ink/50">{parte(gastosFijosDelMes)} · se pagan aunque no haya pacientes</div>
        </div>
        <div className="rounded-xl border border-edge/10 bg-surface p-4" style={{ boxShadow: "inset 3px 0 0 0 #8b5cf6" }}>
          <div className="text-xl font-bold text-ink">{formatCurrency(gastosVariablesDelMes)}</div>
          <div className="mt-1 text-[11px] uppercase tracking-wide text-ink/40">Gastos Variables del Mes</div>
          <div className="mt-0.5 text-[11px] text-ink/50">{parte(gastosVariablesDelMes)} · cambian según lo que se trabaja</div>
        </div>
      </div>

      {puedeVerFinanzas && (
        <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Sobres de Gasto</h3>
            <p className="text-xs text-ink/40">
              Cuánto llevas gastado de cada categoría este mes, según el presupuesto que definiste en
              Administración → Presupuesto de Gastos.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-ink/40">Gastos Fijos</h4>
              {sobresFijos.map((s) => (
                <FilaSobre key={s.categoria} sobre={s} />
              ))}
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-ink/40">Gastos Variables</h4>
              {sobresVariables.map((s) => (
                <FilaSobre key={s.categoria} sobre={s} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3 rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Registrar Gasto</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="text"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Concepto (ej. Guantes de látex)"
            className={inputClass}
          />
          <select
            value={categoria}
            onChange={(e) => {
              setCategoria(e.target.value as GastoCategoria);
              setTipoManual(null); // al cambiar de categoría, el tipo vuelve al de esa categoría
            }}
            className={inputClass}
          >
            {gastoCategoriaOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={tipo}
            onChange={(e) => setTipoManual(e.target.value as ClasificacionGasto)}
            aria-label="Tipo de gasto"
            title="Fijo: se paga aunque no haya pacientes (renta, nómina…). Variable: cambia según lo que se trabaja (insumos, laboratorio…)."
            className={inputClass}
          >
            <option value="fijo">Gasto fijo</option>
            <option value="variable">Gasto variable</option>
          </select>
          <input
            type="number"
            min={0}
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Monto"
            className={inputClass}
          />
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
        </div>
        <button
          onClick={agregarGasto}
          disabled={!puedeGuardar}
          className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
        >
          + Agregar Gasto
        </button>
      </div>

      {gastosOrdenados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          No hay gastos registrados
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                <th className="px-6 py-3 font-medium">Fecha</th>
                <th className="px-6 py-3 font-medium">Concepto</th>
                <th className="px-6 py-3 font-medium">Categoría</th>
                <th className="px-6 py-3 font-medium">Tipo</th>
                <th className="px-6 py-3 text-right font-medium">Monto</th>
                <th className="px-6 py-3 text-right font-medium">Quitar</th>
              </tr>
            </thead>
            <tbody>
              {gastosOrdenados.map((g) => (
                <tr key={g.id} className="border-b border-edge/5 last:border-0">
                  <td className="px-6 py-3 whitespace-nowrap text-ink/70">{formatFecha(g.fecha)}</td>
                  <td className="px-6 py-3 text-ink">{g.concepto}</td>
                  <td className="px-6 py-3">
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
                      {g.categoria}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    {(() => {
                      const t = clasificacionDeGasto(g, presupuestoGastos.porCategoria);
                      return (
                        <button
                          onClick={() => alternarTipo(g)}
                          title={`Es un gasto ${t === "fijo" ? "fijo" : "variable"}. Toca para cambiarlo a ${t === "fijo" ? "variable" : "fijo"}.`}
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                            t === "fijo" ? "border-warning/40 bg-warning/10 text-warning hover:bg-warning/20" : "border-info/40 bg-info/10 text-info hover:bg-info/20"
                          }`}
                        >
                          {t === "fijo" ? "Fijo" : "Variable"}
                        </button>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-danger">
                    {formatCurrency(g.monto)}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => setGastoAEliminar(g)}
                      className="text-xs font-semibold text-danger hover:text-danger"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {gastoAEliminar && (
        <ConfirmarEliminar
          titulo="¿Eliminar este gasto?"
          mensaje={`Vas a eliminar "${gastoAEliminar.concepto}" por ${formatCurrency(gastoAEliminar.monto)}. Quedará guardado en la Papelera por si necesitas recuperarlo.`}
          onCancel={() => setGastoAEliminar(null)}
          onConfirm={() => {
            eliminarGasto(gastoAEliminar.id);
            setGastoAEliminar(null);
          }}
        />
      )}
    </div>
  );
}
