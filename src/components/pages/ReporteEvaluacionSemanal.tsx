"use client";

import { useMemo, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import {
  CATEGORIAS_COSTO_DIRECTO,
  TOLERANCIA_PUNTUALIDAD_MIN,
  cobrosPorOperador,
  comisionesEstimadas,
  costosDeLaSemana,
  diasDeLaSemana,
  lunesDe,
  resumenSemana,
  sumarDias,
  veredictoDeBloques,
} from "@/lib/evaluacionSemanal";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function corta(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const hrs = (n: number) => `${n.toLocaleString("es-MX", { maximumFractionDigits: 1 })} h`;

function Tarjeta({ titulo, valor, detalle, tono }: { titulo: string; valor: string; detalle?: string; tono?: "ok" | "alerta" }) {
  return (
    <div className="rounded-xl border border-edge/10 bg-inset p-4">
      <div className="text-[11px] uppercase tracking-wide text-ink/40">{titulo}</div>
      <div className={`mt-1 text-xl font-bold ${tono === "ok" ? "text-success" : tono === "alerta" ? "text-warning" : "text-ink"}`}>{valor}</div>
      {detalle && <div className="mt-0.5 text-[11px] text-ink/50">{detalle}</div>}
    </div>
  );
}

export default function ReporteEvaluacionSemanal() {
  const { miRol, citas, recursos, sedes, finanzas, pagosRealizados, gastos, colaboradoresActivos, userEmail } = usePatientData();
  const [lunes, setLunes] = useState(() => lunesDe(hoyISO()));

  const datos = useMemo(() => {
    const resumen = resumenSemana({ lunes, recursos, sedes, citas });
    const cobros = cobrosPorOperador(pagosRealizados, lunes);
    const costos = costosDeLaSemana(gastos, lunes);
    const dias = diasDeLaSemana(lunes);
    const brutos = dias.reduce((acc, d) => acc + (finanzas.porFecha[d] ?? 0), 0);
    const devoluciones = dias.reduce((acc, d) => acc + (finanzas.devolucionesPorFecha?.[d] ?? 0), 0);
    const comisiones = comisionesEstimadas(finanzas.porFechaYMedico, recursos, lunes);
    const veredicto = veredictoDeBloques({ hoyISO: hoyISO(), recursos, sedes, citas });
    return { resumen, cobros, costos, brutos, devoluciones, comisiones, veredicto };
  }, [lunes, recursos, sedes, citas, pagosRealizados, gastos, finanzas]);

  if (miRol !== "admin") {
    return (
      <div className="rounded-2xl border border-edge/10 bg-surface p-10 text-center text-sm text-ink/50">
        Solo el dueño de la clínica puede ver la evaluación semanal.
      </div>
    );
  }

  const { resumen, cobros, costos, brutos, devoluciones, comisiones, veredicto } = datos;
  const t = resumen.totales;
  const netos = brutos - devoluciones;
  const sinOperador = Math.max(0, Math.round((brutos - cobros.totalRegistrado) * 100) / 100);
  const costoDirectoTotal = costos.totalDirectos + comisiones;
  const margenDirecto = netos - costoDirectoTotal;
  const esSemanaActual = lunes === lunesDe(hoyISO());
  const nombreOperador = (correo: string) => {
    if (correo === "sin operador") return "Sin operador registrado";
    if (correo === (userEmail ?? "").toLowerCase()) return "Tú (dueño)";
    const m = colaboradoresActivos.find((c) => (c.correo ?? "").toLowerCase() === correo);
    return m?.nombre || correo;
  };
  const tasaPuntual = resumen.puntualidad.conLlegada > 0 ? resumen.puntualidad.puntuales / resumen.puntualidad.conLlegada : null;

  const veredictoTexto =
    veredicto.estado === "consistente"
      ? { titulo: "Los bloques actuales se ocupan de manera consistente", detalle: "Ya hay base para evaluar abrir más.", clase: "border-success/40 bg-success/10 text-success" }
      : veredicto.estado === "todavia_no"
        ? { titulo: "Todavía no abras más bloques", detalle: "Alguno de los actuales no llegó al mínimo en las últimas semanas.", clase: "border-warning/40 bg-warning/10 text-warning" }
        : { titulo: "Aún no hay bloques que evaluar", detalle: "Define los bloques de cada médico en la Agenda.", clase: "border-edge/20 bg-inset text-ink/60" };

  return (
    <div className="space-y-4">
      {/* Veredicto */}
      <div className={`rounded-2xl border p-5 ${veredictoTexto.clase}`}>
        <div className="text-base font-semibold">{veredictoTexto.titulo}</div>
        <p className="mt-0.5 text-xs text-ink/70">
          {veredictoTexto.detalle} Se pide que las horas atendidas lleguen al {pct(veredicto.umbral)} de las disponibles en cada una de las
          últimas {veredicto.semanas} semanas completas.
        </p>
        {veredicto.filas.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs text-ink">
              <thead className="text-[11px] uppercase tracking-wide text-ink/40">
                <tr>
                  <th className="py-1 pr-3 font-medium">Médico · sede</th>
                  {veredicto.filas[0].porSemana.map((s) => (
                    <th key={s.lunes} className="py-1 pr-3 text-right font-medium">
                      Sem. {corta(s.lunes)}
                    </th>
                  ))}
                  <th className="py-1 text-right font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {veredicto.filas.map((f) => (
                  <tr key={f.clave} className="border-t border-edge/10">
                    <td className="py-1.5 pr-3">
                      {f.medicoNombre} · {f.sedeNombre}
                    </td>
                    {f.porSemana.map((s) => (
                      <td key={s.lunes} className={`py-1.5 pr-3 text-right tabular-nums ${s.ocupacion >= veredicto.umbral ? "text-success" : "text-warning"}`}>
                        {pct(s.ocupacion)}
                      </td>
                    ))}
                    <td className={`py-1.5 text-right font-semibold ${f.consistente ? "text-success" : "text-warning"}`}>
                      {f.consistente ? "Consistente" : "Todavía no"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-[11px] text-ink/50">
          Se calcula con los bloques que tienen hoy: si cambias un bloque, las semanas pasadas se recalculan con ese cambio.
        </p>
      </div>

      {/* Selector de semana */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-edge/10 bg-surface p-4">
        <div>
          <div className="text-sm font-semibold text-ink">
            Semana del {corta(lunes)} al {corta(sumarDias(lunes, 6))}
          </div>
          <div className="text-[11px] text-ink/40">{esSemanaActual ? "En curso: las citas por venir cuentan como agendadas, no como atendidas." : "Semana completa."}</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setLunes(sumarDias(lunes, -7))} aria-label="Semana anterior" className="rounded-lg border border-edge/15 px-3 py-1.5 text-sm text-ink/70 hover:bg-field">
            ‹
          </button>
          <button onClick={() => setLunes(lunesDe(hoyISO()))} disabled={esSemanaActual} className="rounded-lg border border-edge/15 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-field disabled:opacity-40">
            Esta semana
          </button>
          <button onClick={() => setLunes(sumarDias(lunes, 7))} aria-label="Semana siguiente" className="rounded-lg border border-edge/15 px-3 py-1.5 text-sm text-ink/70 hover:bg-field">
            ›
          </button>
        </div>
      </div>

      {/* Las seis medidas */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Tarjeta titulo="Horas disponibles" valor={hrs(t.horasDisponibles)} detalle="Lo que abren los bloques" />
        <Tarjeta
          titulo="Horas atendidas"
          valor={hrs(t.horasAtendidas)}
          detalle={t.horasDisponibles > 0 ? `${pct(resumen.ocupacionEfectiva)} de las disponibles · agendadas ${pct(resumen.ocupacionAgendada)}` : "Sin bloques esta semana"}
          tono={t.horasDisponibles > 0 ? (resumen.ocupacionEfectiva >= veredicto.umbral ? "ok" : "alerta") : undefined}
        />
        <Tarjeta
          titulo="Cancelaciones"
          valor={`${t.canceladas + t.noAsistio}`}
          detalle={`${t.canceladas} canceladas (${t.canceladasTarde} fuera de tiempo) · ${t.noAsistio} no asistieron · ${pct(resumen.tasaPerdida)} de las citas`}
        />
        <Tarjeta
          titulo="Puntualidad del paciente"
          valor={tasaPuntual === null ? "Sin dato" : pct(tasaPuntual)}
          detalle={
            tasaPuntual === null
              ? "Nadie tiene hora de llegada capturada"
              : `${resumen.puntualidad.puntuales} de ${resumen.puntualidad.conLlegada} llegaron a tiempo (hasta ${TOLERANCIA_PUNTUALIDAD_MIN} min)`
          }
          tono={tasaPuntual === null ? undefined : tasaPuntual >= 0.8 ? "ok" : "alerta"}
        />
        <Tarjeta titulo="Cobros netos" valor={formatCurrency(netos)} detalle={`${formatCurrency(brutos)} cobrados − ${formatCurrency(devoluciones)} devueltos`} />
        <Tarjeta
          titulo="Costos directos"
          valor={formatCurrency(costoDirectoTotal)}
          detalle={`Insumos y laboratorio ${formatCurrency(costos.totalDirectos)} + comisiones estimadas ${formatCurrency(comisiones)}`}
        />
      </div>

      {/* Por médico y sede */}
      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/50">Por médico y sede</h3>
        {resumen.filas.length === 0 ? (
          <p className="text-xs text-ink/50">Ningún médico tiene bloques esta semana.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs text-ink">
              <thead className="text-[11px] uppercase tracking-wide text-ink/40">
                <tr>
                  <th className="py-1 pr-3 font-medium">Médico · sede</th>
                  <th className="py-1 pr-3 text-right font-medium">Disponibles</th>
                  <th className="py-1 pr-3 text-right font-medium">Agendadas</th>
                  <th className="py-1 pr-3 text-right font-medium">Atendidas</th>
                  <th className="py-1 pr-3 text-right font-medium">Ocupación</th>
                  <th className="py-1 pr-3 text-right font-medium">Cancel.</th>
                  <th className="py-1 text-right font-medium">No asistió</th>
                </tr>
              </thead>
              <tbody>
                {resumen.filas.map((f) => {
                  const ocup = f.horasDisponibles > 0 ? f.horasAtendidas / f.horasDisponibles : 0;
                  return (
                    <tr key={f.clave} className="border-t border-edge/10">
                      <td className="py-1.5 pr-3">
                        {f.medicoNombre} · {f.sedeNombre}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{hrs(f.horasDisponibles)}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{hrs(f.horasAgendadas)}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{hrs(f.horasAtendidas)}</td>
                      <td className={`py-1.5 pr-3 text-right font-semibold tabular-nums ${ocup >= veredicto.umbral ? "text-success" : "text-warning"}`}>{pct(ocup)}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{f.canceladas}</td>
                      <td className="py-1.5 text-right tabular-nums">{f.noAsistio}</td>
                    </tr>
                  );
                })}
                <tr className="border-t border-edge/20 font-semibold">
                  <td className="py-1.5 pr-3">Total</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{hrs(t.horasDisponibles)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{hrs(t.horasAgendadas)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{hrs(t.horasAtendidas)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{pct(resumen.ocupacionEfectiva)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{t.canceladas}</td>
                  <td className="py-1.5 text-right tabular-nums">{t.noAsistio}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        {(resumen.fueraDeBloque.horas > 0 || resumen.citasSinBloques > 0) && (
          <p className="mt-3 text-[11px] text-warning">
            {resumen.fueraDeBloque.horas > 0 && `${hrs(resumen.fueraDeBloque.horas)} de citas cayeron fuera de los bloques (no cuentan en la ocupación). `}
            {resumen.citasSinBloques > 0 && `${resumen.citasSinBloques} citas son de médicos que todavía no tienen bloques.`}
          </p>
        )}
        {t.horasNoAsistio + t.horasCanceladas > 0 && (
          <p className="mt-1 text-[11px] text-ink/50">
            Horas de bloque que se perdieron: {hrs(t.horasNoAsistio)} por inasistencias y {hrs(t.horasCanceladas)} por cancelaciones.
          </p>
        )}
        {resumen.puntualidad.sinDato > 0 && (
          <p className="mt-1 text-[11px] text-ink/50">
            {resumen.puntualidad.sinDato} citas atendidas no tienen hora de llegada (se captura al marcar &quot;En espera&quot;); sin ese dato no entran en
            la puntualidad.
            {resumen.puntualidad.tarde > 0 && ` Los que llegaron tarde se retrasaron ${resumen.puntualidad.minutosPromedioTarde} min en promedio.`}
          </p>
        )}
      </div>

      {/* Cobros por operador */}
      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/50">Cobros por operador</h3>
        {cobros.porOperador.length === 0 && sinOperador === 0 ? (
          <p className="text-xs text-ink/50">No hay cobros esta semana.</p>
        ) : (
          <table className="w-full text-left text-xs text-ink">
            <tbody>
              {cobros.porOperador.map((o) => (
                <tr key={o.operador} className="border-t border-edge/10 first:border-t-0">
                  <td className="py-1.5 pr-3">{nombreOperador(o.operador)}</td>
                  <td className="py-1.5 pr-3 text-right text-ink/50">{o.pagos} {o.pagos === 1 ? "pago" : "pagos"}</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums">{formatCurrency(o.total)}</td>
                </tr>
              ))}
              {sinOperador > 0 && (
                <tr className="border-t border-edge/10">
                  <td className="py-1.5 pr-3 text-ink/60">Sin registro de operador</td>
                  <td className="py-1.5 pr-3 text-right text-ink/40">—</td>
                  <td className="py-1.5 text-right font-semibold tabular-nums text-ink/60">{formatCurrency(sinOperador)}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        {sinOperador > 0 && (
          <p className="mt-2 text-[11px] text-ink/50">
            La bitácora que guarda quién cobró empezó a llenarse el día que se activó; los cobros anteriores o que no quedaron en ella aparecen aquí.
          </p>
        )}
      </div>

      {/* Costos */}
      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/50">Costos directos y margen</h3>
        <table className="w-full text-left text-xs text-ink">
          <tbody>
            {costos.directos.map((c) => (
              <tr key={c.categoria} className="border-t border-edge/10 first:border-t-0">
                <td className="py-1.5 pr-3">{c.categoria}</td>
                <td className="py-1.5 text-right tabular-nums">{formatCurrency(c.monto)}</td>
              </tr>
            ))}
            {costos.directos.length === 0 && (
              <tr>
                <td className="py-1.5 pr-3 text-ink/50">Sin gastos de {CATEGORIAS_COSTO_DIRECTO.join(" ni ").toLowerCase()} esta semana</td>
                <td className="py-1.5 text-right tabular-nums">{formatCurrency(0)}</td>
              </tr>
            )}
            <tr className="border-t border-edge/10">
              <td className="py-1.5 pr-3">Comisiones de médicos (estimadas con su %)</td>
              <td className="py-1.5 text-right tabular-nums">{formatCurrency(comisiones)}</td>
            </tr>
            <tr className="border-t border-edge/20 font-semibold">
              <td className="py-1.5 pr-3">Costos directos</td>
              <td className="py-1.5 text-right tabular-nums">{formatCurrency(costoDirectoTotal)}</td>
            </tr>
            <tr className="font-semibold">
              <td className="py-1.5 pr-3">Margen directo (cobros netos − costos directos)</td>
              <td className={`py-1.5 text-right tabular-nums ${margenDirecto >= 0 ? "text-success" : "text-danger"}`}>{formatCurrency(margenDirecto)}</td>
            </tr>
            {t.horasAtendidas > 0 && (
              <tr className="text-ink/60">
                <td className="py-1.5 pr-3">Por hora atendida: cobros / costo directo</td>
                <td className="py-1.5 text-right tabular-nums">
                  {formatCurrency(netos / t.horasAtendidas)} / {formatCurrency(costoDirectoTotal / t.horasAtendidas)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-ink/50">
          Se toman como costo directo los gastos marcados como costo en la pantalla de Gastos (por defecto, {CATEGORIAS_COSTO_DIRECTO.join(" y ").toLowerCase()}) y la comisión de los médicos. Renta, nómina, servicios y marketing
          {costos.totalIndirectos > 0 ? ` (${formatCurrency(costos.totalIndirectos)} esta semana)` : ""} son indirectos y no entran. Los gastos no llevan sede, así que este
          bloque es de toda la clínica.
          {costos.inversion > 0 ? ` Además se invirtieron ${formatCurrency(costos.inversion)} esta semana (equipo, remodelación…): no es costo ni gasto, así que no entra en el margen.` : ""}
        </p>
      </div>
    </div>
  );
}
