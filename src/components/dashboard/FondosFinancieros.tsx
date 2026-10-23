"use client";

import { useEffect, useRef, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { usePrivacidad } from "@/context/PrivacidadContext";
import { formatCurrency } from "@/lib/patientData";
import { cobradoEnRango, cobradoTotal, type ResultadoRecalculo } from "@/lib/finanzasRecalculo";
import type { FinanzasConfig } from "@/lib/metas";
import {
  GRUPOS_EFECTIVO,
  GRUPOS_ELECTRONICO,
  calcularAsignacionFondos,
  desglosePorMedicoCompleto,
  navegarVistaFondos,
  rangoVistaFondos,
  sumarRangoPorFormaPago,
  sumarRangoPorMedico,
  totalCobrado,
  tituloTotalFondos,
  type GrupoConMonto,
  type VistaFondos,
} from "@/lib/fondosFinancieros";

const OPCIONES_VISTA: { id: VistaFondos; label: string }[] = [
  { id: "dia", label: "Día" },
  { id: "semana", label: "Semana" },
  { id: "quincena1", label: "Quincena 1–15" },
  { id: "quincena2", label: "Quincena 16–fin" },
  { id: "mes", label: "Mes" },
];

/** Marco naranja fosforescente que separa la regla de sobres del resto de
 * Finanzas — mucho más marcado que el `neonShadow` de una sola franja que
 * ya usan las tarjetas KPI, a propósito: este bloque es una regla fija que
 * el usuario definió aparte, no un KPI más entre los demás. */
const MARCO_FOSFORESCENTE = {
  border: "1.5px solid rgba(255, 140, 0, 0.7)",
  boxShadow: "0 0 26px -4px rgba(255, 140, 0, 0.55), inset 0 0 30px -12px rgba(255, 140, 0, 0.25)",
};

function FilaFondo({ fondo, oculto }: { fondo: { label: string; porcentaje: number; monto: number }; oculto: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-ink/70">
        {fondo.label} <span className="text-ink/40">· {fondo.porcentaje}%</span>
      </span>
      <span className={`shrink-0 font-semibold text-ink ${oculto ? "blur-[6px] select-none" : ""}`}>
        {oculto ? "••••••" : formatCurrency(fondo.monto)}
      </span>
    </div>
  );
}

function GrupoFondosBlock({ grupo, oculto }: { grupo: GrupoConMonto; oculto: boolean }) {
  return (
    <div>
      {grupo.titulo && (
        <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-accent">
          <span>
            {grupo.titulo} · {grupo.porcentajeGrupo}%
          </span>
          <span className={oculto ? "blur-[6px] select-none" : ""}>
            {oculto ? "••••••" : formatCurrency(grupo.montoGrupo)}
          </span>
        </div>
      )}
      <div className="divide-y divide-edge/5">
        {grupo.fondos.map((f) => (
          <FilaFondo key={f.label} fondo={f} oculto={oculto} />
        ))}
      </div>
    </div>
  );
}

function CanalFondos({
  nombre,
  ingresoCanal,
  grupos,
  oculto,
  rangoLabel,
}: {
  nombre: string;
  ingresoCanal: number;
  grupos: GrupoConMonto[];
  oculto: boolean;
  rangoLabel: string;
}) {
  return (
    <div className="rounded-xl border border-edge/10 bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-3 border-b border-edge/10 pb-3">
        <h3 className="text-sm font-semibold text-ink">{nombre}</h3>
        <div className="text-right">
          <div className={`text-base font-bold text-ink ${oculto ? "blur-[6px] select-none" : ""}`}>
            {oculto ? "••••••" : formatCurrency(ingresoCanal)}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-ink/40">{rangoLabel}</div>
        </div>
      </div>
      <div className="space-y-4">
        {grupos.map((g) => (
          <GrupoFondosBlock key={g.titulo ?? "unico"} grupo={g} oculto={oculto} />
        ))}
      </div>
    </div>
  );
}

/** "¿No cuadra?": compara el resumen de cobros guardado contra los pagos reales
 * de todos los expedientes y, si hay diferencia, permite corregir el resumen. */
function RevisarContraPagos({
  desde,
  hasta,
  periodo,
  onClose,
}: {
  desde: Date;
  hasta: Date;
  periodo: string;
  onClose: () => void;
}) {
  const { revisarFinanzasContraPagos, aplicarFinanzasRecalculadas } = usePatientData();
  const [progreso, setProgreso] = useState<{ hechos: number; total: number } | null>(null);
  const [resultado, setResultado] = useState<(ResultadoRecalculo & { actual: FinanzasConfig }) | null>(null);
  const [error, setError] = useState("");
  const [aplicando, setAplicando] = useState(false);
  const [aplicado, setAplicado] = useState(false);
  const iniciado = useRef(false);

  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    revisarFinanzasContraPagos((hechos, total) => setProgreso({ hechos, total }))
      .then(setResultado)
      .catch((e) => {
        console.error("No se pudo revisar el resumen de cobros", e);
        setError("No se pudo revisar. Revisa tu conexión e intenta de nuevo.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardadoPeriodo = resultado ? cobradoEnRango(resultado.actual, desde, hasta) : 0;
  const realPeriodo = resultado ? cobradoEnRango(resultado.nuevo, desde, hasta) : 0;
  const guardadoTotal = resultado ? cobradoTotal(resultado.actual) : 0;
  const realTotal = resultado ? cobradoTotal(resultado.nuevo) : 0;
  const cuadra = resultado
    ? JSON.stringify(resultado.actual.porFechaYFormaPago ?? {}) === JSON.stringify(resultado.nuevo.porFechaYFormaPago) &&
      JSON.stringify(resultado.actual.porFechaMedicoYFormaPago ?? {}) === JSON.stringify(resultado.nuevo.porFechaMedicoYFormaPago ?? {}) &&
      guardadoTotal === realTotal
    : false;

  async function corregir() {
    if (!resultado) return;
    if (!window.confirm("Se reemplazarán las cifras del resumen de cobros por las de los pagos reales. El dinero de los pagos no cambia. ¿Continuar?")) return;
    setAplicando(true);
    try {
      await aplicarFinanzasRecalculadas(resultado.nuevo);
      setAplicado(true);
    } catch (e) {
      console.error(e);
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setAplicando(false);
    }
  }

  const fila = (titulo: string, guardado: number, real: number) => (
    <div className="grid grid-cols-3 gap-2 border-b border-edge/5 py-2 text-sm last:border-0">
      <span className="text-ink/70">{titulo}</span>
      <span className="text-right text-ink">{formatCurrency(guardado)}</span>
      <span className={`text-right font-semibold ${guardado === real ? "text-ink" : "text-warning"}`}>{formatCurrency(real)}</span>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
        <h3 className="mb-1 text-base font-semibold text-ink">Revisar contra los pagos reales</h3>
        <p className="mb-4 text-xs text-ink/50">
          Este cuadro suma los cobros que se fueron guardando al registrar cada pago. Aquí se compara contra lo que de
          verdad hay en los pagos de todos los expedientes.
        </p>

        {error && <p className="mb-3 text-sm text-danger">{error}</p>}
        {!resultado && !error && (
          <p className="text-sm text-ink/60">
            Revisando los pagos… {progreso ? `${progreso.hechos} de ${progreso.total} expedientes` : ""}
          </p>
        )}

        {resultado && (
          <>
            <div className="grid grid-cols-3 gap-2 border-b border-edge/10 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink/40">
              <span />
              <span className="text-right">Resumen guardado</span>
              <span className="text-right">Pagos reales</span>
            </div>
            {fila(periodo, guardadoPeriodo, realPeriodo)}
            {fila("Todo el historial", guardadoTotal, realTotal)}
            <p className="mt-3 text-xs text-ink/50">
              Se leyeron {resultado.pagosLeidos} pagos.
              {resultado.sinFechaValida > 0 &&
                ` ${resultado.sinFechaValida} tienen una fecha que MO no entiende y no entran en ningún periodo; revísalos en el expediente del paciente.`}
            </p>

            {aplicado ? (
              <p className="mt-4 text-sm text-success">Listo: el resumen ya coincide con los pagos reales.</p>
            ) : cuadra ? (
              <p className="mt-4 text-sm text-success">Todo cuadra: el resumen coincide con los pagos reales.</p>
            ) : (
              <div className="mt-4 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-ink/80">
                <p>
                  El resumen no coincide con los pagos reales (diferencia en el historial: {formatCurrency(realTotal - guardadoTotal)}).
                  Si los pagos están bien, corrige el resumen.
                </p>
                <button
                  onClick={corregir}
                  disabled={aplicando}
                  className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {aplicando ? "Corrigiendo…" : "Corregir el resumen"}
                </button>
              </div>
            )}
          </>
        )}

        <div className="mt-5 flex justify-end">
          <button onClick={onClose} className="rounded-lg border border-edge/10 bg-surface px-4 py-2 text-sm text-ink/70 hover:text-ink">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

/** Regla de sobres del consultorio: separa lo que entra por Efectivo de lo
 * que entra Electrónico (tarjeta/transferencia/cheque) y reparte cada
 * canal entre fondos fijos, en pesos reales de la vista elegida (Quincena
 * 1/2 o Mes) — siempre relativo al mes actual, independiente del selector
 * de periodo general de Inicio.tsx (que no tiene noción de quincena). Los
 * porcentajes son fijos (definidos por el usuario), no editables desde
 * aquí todavía. */
export default function FondosFinancieros() {
  const { puedeVerFinanzas, finanzas, recursos } = usePatientData();
  const { oculto } = usePrivacidad();
  const [vista, setVista] = useState<VistaFondos>("mes");
  // Ancla independiente de "hoy": las flechas la mueven, pero
  // rangoVistaFondos sigue recibiendo la hora real por separado para saber
  // qué tanto de un periodo ya "pasó" (ver su comentario). Cambiar de tipo
  // de vista (Día/Semana/...) siempre vuelve al periodo actual de ese tipo
  // — mismo criterio que el selector de periodo del Dashboard Principal.
  const [ancla, setAncla] = useState<Date>(() => new Date());
  const [revisando, setRevisando] = useState(false);
  // Doctor elegido ("" = todos): el reparto de sobres se ve de toda la clínica o solo de lo que cobró ese doctor.
  const [medicoSel, setMedicoSel] = useState("");

  if (!puedeVerFinanzas) return null;

  const rangoActivo = rangoVistaFondos(vista, ancla);
  const ingresos = sumarRangoPorFormaPago(finanzas.porFechaYFormaPago, rangoActivo.desde, rangoActivo.hasta);

  // Lo mismo, pero por doctor: los registrados en la Agenda (aunque no hayan cobrado) y cualquier nombre que haya cobrado.
  const porMedico = sumarRangoPorMedico(finanzas.porFechaMedicoYFormaPago ?? {}, rangoActivo.desde, rangoActivo.hasta);
  const desgloseCompleto = desglosePorMedicoCompleto(porMedico, ingresos);
  const totalClinica = totalCobrado(ingresos);
  const medicosRegistrados = recursos.filter((r) => r.tipo === "medico");
  const doctores = [
    ...porMedico,
    ...medicosRegistrados.filter((r) => !porMedico.some((m) => m.medico === r.nombre)).map((r) => ({ medico: r.nombre, efectivo: 0, electronico: 0 })),
  ];
  // Opciones del selector: todos los médicos y especialistas registrados (con su especialidad) y, aparte, cualquier nombre que cobró sin estar registrado.
  const opcionesDoctor = [
    ...medicosRegistrados.map((r) => ({ nombre: r.nombre, detalle: [r.especialidad, r.consultaExterna ? "consulta externa" : ""].filter(Boolean).join(" · "), registrado: true })),
    ...porMedico.filter((m) => !medicosRegistrados.some((r) => r.nombre === m.medico)).map((m) => ({ nombre: m.medico, detalle: "", registrado: false })),
  ].sort((a, b) => a.nombre.localeCompare(b.nombre));
  const doctorElegido = medicoSel ? opcionesDoctor.find((d) => d.nombre === medicoSel) : undefined;

  // Lo que se reparte: todo el consultorio, o solo lo que cobró el doctor elegido.
  const ingresosVista = doctorElegido ? (porMedico.find((m) => m.medico === doctorElegido.nombre) ?? { medico: doctorElegido.nombre, efectivo: 0, electronico: 0 }) : ingresos;
  const gruposElectronico = calcularAsignacionFondos(GRUPOS_ELECTRONICO, ingresosVista.electronico);
  const gruposEfectivo = calcularAsignacionFondos(GRUPOS_EFECTIVO, ingresosVista.efectivo);
  const tituloTotal = doctorElegido
    ? `Ingreso de ${doctorElegido.nombre} · ${tituloTotalFondos(vista, rangoActivo, ancla).replace(/^Total de(l| la)? /, "")}`
    : tituloTotalFondos(vista, rangoActivo, ancla);

  return (
    <div className="rounded-2xl bg-surface p-6" style={MARCO_FOSFORESCENTE}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: "#ff8c00", boxShadow: "0 0 8px #ff8c00" }}
          />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink">Fondos · Regla de Sobres</h2>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setAncla((prev) => navegarVistaFondos(vista, prev, -1))}
              title="Periodo anterior"
              aria-label="Periodo anterior"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-success/40 text-sm text-success transition-colors hover:bg-success/10"
              style={{ boxShadow: "0 0 12px -2px rgb(var(--success-rgb) / 0.5)" }}
            >
              ‹
            </button>
            <button
              onClick={() => setAncla(new Date())}
              title="Volver a hoy"
              className="shrink-0 rounded-lg border border-edge/15 px-2.5 py-1 text-[11px] font-semibold text-ink/60 transition-colors hover:bg-surface hover:text-ink"
            >
              Hoy
            </button>
            <button
              onClick={() => setAncla((prev) => navegarVistaFondos(vista, prev, 1))}
              title="Periodo siguiente"
              aria-label="Periodo siguiente"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-success/40 text-sm text-success transition-colors hover:bg-success/10"
              style={{ boxShadow: "0 0 12px -2px rgb(var(--success-rgb) / 0.5)" }}
            >
              ›
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
          {OPCIONES_VISTA.map((op) => (
            <button
              key={op.id}
              onClick={() => {
                setVista(op.id);
                setAncla(new Date());
              }}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                vista === op.id
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-edge/10 bg-surface text-ink/50 hover:text-ink/80"
              }`}
            >
              {op.label}
            </button>
          ))}
          </div>
        </div>
      </div>
      <div className="mb-5">
        <span className="text-xs text-ink/40">
          Reparto fijo de {rangoActivo.label} entre fondos, según cómo pagó el paciente.{" "}
          <button onClick={() => setRevisando(true)} className="text-accent hover:underline">
            ¿No cuadra? Revisar contra los pagos reales
          </button>
        </span>
      </div>

      {/* Quién: todo el consultorio o un doctor en particular (médicos y especialistas registrados en la Agenda). */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-ink/50">Ver</span>
        <button
          onClick={() => setMedicoSel("")}
          className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            !doctorElegido ? "border-accent bg-accent/15 text-accent" : "border-edge/10 bg-surface text-ink/50 hover:text-ink/80"
          }`}
        >
          Todos
        </button>
        {opcionesDoctor.map((d) => (
          <button
            key={d.nombre}
            onClick={() => setMedicoSel(d.nombre)}
            title={d.registrado ? d.detalle || "Médico registrado" : "Cobró en este periodo con un nombre que no está en Agenda → Recursos"}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              doctorElegido?.nombre === d.nombre ? "border-accent bg-accent/15 text-accent" : "border-edge/10 bg-surface text-ink/50 hover:text-ink/80"
            }`}
          >
            {d.nombre}
            {d.detalle && <span className="ml-1 font-normal opacity-70">· {d.detalle}</span>}
            {!d.registrado && <span className="ml-1 font-normal opacity-70">· sin registrar</span>}
          </button>
        ))}
      </div>

      {doctorElegido && !desgloseCompleto && (
        <div className="mb-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-ink/80">
          El desglose por doctor está incompleto en este periodo, así que lo de {doctorElegido.nombre} puede quedar corto.{" "}
          <button onClick={() => setRevisando(true)} className="font-semibold text-accent hover:underline">
            Completarlo con los pagos reales
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-col items-center rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-center">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-ink/60">
          {tituloTotal}
        </span>
        <span className={`text-3xl font-bold text-ink ${oculto ? "blur-[8px] select-none" : ""}`}>
          {oculto ? "••••••" : formatCurrency(totalCobrado(ingresosVista))}
        </span>
        {doctorElegido && totalClinica > 0 && (
          <span className="mt-0.5 text-[11px] text-ink/50">{Math.round((totalCobrado(ingresosVista) / totalClinica) * 100)}% del total de la clínica</span>
        )}
      </div>

      {revisando && (
        <RevisarContraPagos desde={rangoActivo.desde} hasta={rangoActivo.hasta} periodo={rangoActivo.label} onClose={() => setRevisando(false)} />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CanalFondos
          nombre="Electrónico"
          ingresoCanal={ingresosVista.electronico}
          grupos={gruposElectronico}
          oculto={oculto}
          rangoLabel={rangoActivo.label}
        />
        <CanalFondos
          nombre="Efectivo"
          ingresoCanal={ingresosVista.efectivo}
          grupos={gruposEfectivo}
          oculto={oculto}
          rangoLabel={rangoActivo.label}
        />
      </div>

      {!doctorElegido && (
      <div className="mt-8">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink">Por doctor · {rangoActivo.label}</h3>
          <span className="text-[11px] text-ink/50">Cada doctor con su propio reparto de sobres, según lo que cobró.</span>
        </div>

        {!desgloseCompleto && (
          <div className="my-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-ink/80">
            El desglose por doctor está incompleto en este periodo: los cobros de antes de esta función no traen el detalle de quién cobró y por qué canal.{" "}
            <button onClick={() => setRevisando(true)} className="font-semibold text-accent hover:underline">
              Completarlo con los pagos reales
            </button>
          </div>
        )}

        {doctores.length > 0 && (
          <div className="mt-3 overflow-x-auto rounded-xl border border-edge/10 bg-inset">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-edge/10 text-[11px] uppercase tracking-wide text-ink/50">
                  <th className="px-4 py-2 font-medium">Doctor</th>
                  <th className="px-4 py-2 text-right font-medium">Electrónico</th>
                  <th className="px-4 py-2 text-right font-medium">Efectivo</th>
                  <th className="px-4 py-2 text-right font-medium">Total</th>
                  <th className="px-4 py-2 text-right font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {doctores.map((d) => {
                  const total = Math.round((d.efectivo + d.electronico) * 100) / 100;
                  const dinero = (n: number) => (oculto ? "••••••" : formatCurrency(n));
                  return (
                    <tr key={d.medico} className="border-b border-edge/5 last:border-0">
                      <td className="px-4 py-2 font-medium text-ink">{d.medico}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-ink/80">{dinero(d.electronico)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-ink/80">{dinero(d.efectivo)}</td>
                      <td className="px-4 py-2 text-right font-semibold tabular-nums text-ink">{dinero(total)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-ink/60">{totalClinica > 0 ? Math.round((total / totalClinica) * 100) : 0}%</td>
                    </tr>
                  );
                })}
                <tr className="border-t border-edge/20 font-semibold">
                  <td className="px-4 py-2 text-ink">Total de la clínica</td>
                  <td className="px-4 py-2 text-right tabular-nums text-ink">{oculto ? "••••••" : formatCurrency(ingresos.electronico)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-ink">{oculto ? "••••••" : formatCurrency(ingresos.efectivo)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-ink">{oculto ? "••••••" : formatCurrency(totalClinica)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {doctores.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink/40">Todavía no hay médicos registrados ni cobros en este periodo.</p>
        ) : (
          <div className="mt-3 space-y-5">
            {doctores.map((d) => {
              const total = Math.round((d.efectivo + d.electronico) * 100) / 100;
              const parte = totalClinica > 0 ? Math.round((total / totalClinica) * 100) : 0;
              return (
                <div key={d.medico} className="rounded-xl border border-edge/10 bg-inset p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-base font-semibold text-ink">{d.medico}</div>
                      <div className="text-[11px] text-ink/50">{parte}% del total de la clínica</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink/50">Ingreso del doctor</div>
                      <div className={`text-2xl font-bold text-ink ${oculto ? "blur-[8px] select-none" : ""}`}>{oculto ? "••••••" : formatCurrency(total)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <CanalFondos nombre="Electrónico" ingresoCanal={d.electronico} grupos={calcularAsignacionFondos(GRUPOS_ELECTRONICO, d.electronico)} oculto={oculto} rangoLabel={rangoActivo.label} />
                    <CanalFondos nombre="Efectivo" ingresoCanal={d.efectivo} grupos={calcularAsignacionFondos(GRUPOS_EFECTIVO, d.efectivo)} oculto={oculto} rangoLabel={rangoActivo.label} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {desgloseCompleto && doctores.length > 0 && (
          <p className="mt-3 text-[11px] text-ink/40">La suma de los doctores es igual al total de arriba ({oculto ? "••••••" : formatCurrency(totalClinica)}).</p>
        )}
      </div>
      )}
    </div>
  );
}
