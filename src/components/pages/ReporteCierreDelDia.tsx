"use client";

import { useMemo, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { armarCierre, duracionLegible, fechaLargaConDia, siguienteDiaDeAtencion, textoDelCierre, type CitaDelCierre } from "@/lib/cierreDelDia";
import { sumarDias } from "@/lib/evaluacionSemanal";
import { formatFechaLarga, formatHora12, plantillaConUbicacion, renderPlantilla, ubicacionParaMensaje } from "@/lib/formatosWhatsapp";

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Tarjeta({ titulo, valor, detalle, tono }: { titulo: string; valor: string; detalle?: string; tono?: "ok" | "alerta" }) {
  return (
    <div className="rounded-xl border border-edge/10 bg-inset p-4">
      <div className="text-[11px] uppercase tracking-wide text-ink/40">{titulo}</div>
      <div className={`mt-1 text-xl font-bold ${tono === "ok" ? "text-success" : tono === "alerta" ? "text-warning" : "text-ink"}`}>{valor}</div>
      {detalle && <div className="mt-0.5 text-[11px] text-ink/50">{detalle}</div>}
    </div>
  );
}

export default function ReporteCierreDelDia() {
  const { citas, setCitas, recursos, sedes, patients, laboratoriosPendientes, saldosPendientes, clinicInfo, formatosWhatsapp } = usePatientData();
  const [fecha, setFecha] = useState(() => siguienteDiaDeAtencion(hoyISO(), recursos, citas));
  const [copiado, setCopiado] = useState(false);

  const cierre = useMemo(
    () =>
      armarCierre({
        fecha,
        recursos,
        sedes,
        citas,
        pacientes: patients,
        laboratorios: Object.values(laboratoriosPendientes.porOrden ?? {}),
        saldos: Object.values(saldosPendientes.porPaciente ?? {}),
      }),
    [fecha, recursos, sedes, citas, patients, laboratoriosPendientes, saldosPendientes]
  );
  const texto = useMemo(() => textoDelCierre(cierre, clinicInfo?.nombre), [cierre, clinicInfo?.nombre]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, CitaDelCierre[]>();
    for (const c of cierre.citas) {
      const clave = `${c.sedeNombre || "Sin sede"}|${c.medicoNombre || "Sin médico"}`;
      mapa.set(clave, [...(mapa.get(clave) ?? []), c]);
    }
    return [...mapa.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [cierre.citas]);

  const enviarCierre = () => window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sin permiso para el portapapeles: el texto queda a la vista para copiarlo a mano.
    }
  };

  /** Pide confirmación al paciente con la misma plantilla del diálogo de la cita (con sede y médico). */
  const pedirConfirmacion = (c: CitaDelCierre) => {
    const numero = c.telefono.replace(/\D/g, "");
    if (!numero) return;
    const original = citas.find((x) => x.id === c.id);
    const sede = sedes.find((s) => s.id === c.sedeId);
    const ubicacion = ubicacionParaMensaje({ sede: sede?.nombre, direccion: sede?.direccion, medico: c.medicoNombre });
    const mensaje = renderPlantilla(plantillaConUbicacion(formatosWhatsapp.confirmacionCita, ubicacion), {
      ubicacion,
      sede: sede?.nombre ?? "",
      medico: c.medicoNombre,
      clinica: clinicInfo?.nombre || "tu clínica",
      paciente: c.paciente,
      fecha: formatFechaLarga(cierre.fecha),
      hora: formatHora12(c.horaInicio),
      procedimiento: c.motivo || "su tratamiento",
      costo: original?.costo?.trim() || "por confirmar",
    });
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  const marcarConfirmada = (id: string) => setCitas((prev) => prev.map((c) => (c.id === id ? { ...c, estatus: "Confirmada" } : c)));

  const esDiaDeSiguiente = fecha === siguienteDiaDeAtencion(hoyISO(), recursos, citas);

  return (
    <div className="space-y-4">
      {/* Selector de día */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-edge/10 bg-surface p-4">
        <div>
          <div className="text-sm font-semibold text-ink">Citas del {fechaLargaConDia(cierre)}</div>
          <div className="text-[11px] text-ink/40">
            {esDiaDeSiguiente ? "Siguiente día de atención." : "Otro día; usa el botón para volver al siguiente día de atención."}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setFecha(sumarDias(fecha, -1))} aria-label="Día anterior" className="rounded-lg border border-edge/15 px-3 py-1.5 text-sm text-ink/70 hover:bg-field">
            ‹
          </button>
          <input type="date" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} className="rounded-lg border border-edge/10 bg-field px-3 py-1.5 text-sm text-ink outline-none" />
          <button onClick={() => setFecha(sumarDias(fecha, 1))} aria-label="Día siguiente" className="rounded-lg border border-edge/15 px-3 py-1.5 text-sm text-ink/70 hover:bg-field">
            ›
          </button>
          <button
            onClick={() => setFecha(siguienteDiaDeAtencion(hoyISO(), recursos, citas))}
            disabled={esDiaDeSiguiente}
            className="rounded-lg border border-edge/15 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-field disabled:opacity-40"
          >
            Siguiente día de atención
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tarjeta titulo="Citas" valor={`${cierre.citas.length}`} />
        <Tarjeta
          titulo="Confirmadas"
          valor={`${cierre.confirmadas}`}
          detalle={cierre.citas.length > 0 ? `de ${cierre.citas.length}` : undefined}
          tono={cierre.citas.length > 0 && cierre.porConfirmar === 0 ? "ok" : undefined}
        />
        <Tarjeta titulo="Por confirmar" valor={`${cierre.porConfirmar}`} tono={cierre.porConfirmar > 0 ? "alerta" : undefined} />
        <Tarjeta titulo="Espacios disponibles" valor={duracionLegible(cierre.minutosLibres)} detalle={cierre.espacios.length > 0 ? `${cierre.espacios.length} huecos` : "Sin huecos"} />
      </div>

      {/* Citas por sede y médico */}
      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/50">Citas</h3>
        {grupos.length === 0 ? (
          <p className="text-xs text-ink/50">No hay citas agendadas para este día.</p>
        ) : (
          <div className="space-y-4">
            {grupos.map(([clave, lista]) => {
              const [sede, medico] = clave.split("|");
              return (
                <div key={clave}>
                  <div className="mb-1 text-xs font-semibold text-ink">
                    📍 {sede} <span className="font-normal text-ink/50">— {medico} · {lista.length} {lista.length === 1 ? "cita" : "citas"}</span>
                  </div>
                  <div className="divide-y divide-edge/10 rounded-lg border border-edge/10">
                    {lista.map((c) => (
                      <div key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs">
                        <span className="w-24 shrink-0 font-semibold tabular-nums text-ink">
                          {c.horaInicio}–{c.horaFin}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="font-medium text-ink">{c.paciente}</span>
                          {c.motivo && <span className="text-ink/50"> · {c.motivo}</span>}
                          <span className="text-ink/40"> · {c.duracionMin} min</span>
                          {c.telefono ? <span className="text-ink/40"> · {c.telefono}</span> : <span className="text-warning"> · sin teléfono</span>}
                        </span>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                            c.confirmada ? "border-success/40 bg-success/10 text-success" : "border-warning/40 bg-warning/10 text-warning"
                          }`}
                        >
                          {c.confirmada ? c.estatus : "Por confirmar"}
                        </span>
                        {!c.confirmada && (
                          <span className="flex shrink-0 gap-1.5">
                            {c.telefono && (
                              <button onClick={() => pedirConfirmacion(c)} className="rounded-full border border-success/40 px-2.5 py-0.5 text-[11px] font-semibold text-success hover:bg-success/10">
                                Pedir confirmación
                              </button>
                            )}
                            <button onClick={() => marcarConfirmada(c.id)} className="rounded-full border border-edge/20 px-2.5 py-0.5 text-[11px] font-semibold text-ink/70 hover:bg-field">
                              Marcar confirmada
                            </button>
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Espacios disponibles */}
      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/50">Espacios disponibles</h3>
        {cierre.espacios.length === 0 ? (
          <p className="text-xs text-ink/50">Ningún bloque deja espacios libres este día (o los médicos no tienen bloques definidos).</p>
        ) : (
          <ul className="space-y-1 text-xs text-ink">
            {cierre.espacios.map((e, i) => (
              <li key={i} className="flex flex-wrap gap-x-2">
                <span className="font-semibold tabular-nums">
                  {e.inicio}–{e.fin}
                </span>
                <span className="text-ink/60">
                  {e.sedeNombre ? `${e.sedeNombre} · ` : ""}
                  {e.medicoNombre} · {duracionLegible(e.minutos)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pendientes */}
      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/50">Material, autorizaciones y pendientes</h3>
        {cierre.pendientes.length === 0 ? (
          <p className="text-xs text-ink/50">{cierre.citas.length > 0 ? "Nada pendiente por resolver para estas citas." : "Sin citas, sin pendientes."}</p>
        ) : (
          <ul className="space-y-1.5 text-xs text-ink">
            {cierre.pendientes.map((p, i) => (
              <li key={i}>
                <span className="font-semibold">{p.paciente}:</span> <span className="text-ink/70">{p.texto}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-ink/40">
          Laboratorio y saldos salen de los resúmenes que MO lleva desde que se activaron: lo anterior puede no aparecer.
        </p>
      </div>

      {/* Texto para mandar */}
      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/50">Mensaje del cierre</h3>
          <div className="flex gap-2">
            <button onClick={copiar} className="rounded-lg border border-edge/15 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-field">
              {copiado ? "¡Copiado!" : "Copiar texto"}
            </button>
            <button onClick={enviarCierre} className="rounded-lg border border-success/40 px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/10">
              Enviar por WhatsApp
            </button>
          </div>
        </div>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-inset p-3 text-xs leading-relaxed text-ink/80">{texto}</pre>
      </div>
    </div>
  );
}
