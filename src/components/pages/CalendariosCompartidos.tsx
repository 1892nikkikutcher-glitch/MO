"use client";

/** Calendario compartido entre colegas de MO Conecta — solo horarios ocupados
 * y libres, en vivo:
 *  - `CompartirCalendarioDialog`: desde Agenda → Recursos, el dueño elige con
 *    qué colega compartir un médico o unidad (y puede avisarle por WhatsApp).
 *  - `CalendariosCompartidosTab`: en MO Conecta, lo que comparten contigo
 *    (vista semanal que se actualiza sola) y lo que tú compartes. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { useMoConecta } from "@/context/MoConectaContext";
import { compartirCalendarioApi, dejarDeCompartirCalendarioApi, ocupacionCalendarioApi } from "@/lib/conectaApi";
import { useCalendariosCompartidos } from "@/lib/useCalendariosCompartidos";
import type { CalendarioCompartidoDoc, OcupacionDeCalendario } from "@/lib/calendarioOcupacion";
import { leerContactosLocales, normalizarNombre, telefonoLocal } from "@/lib/contactosColegas";
import { DIAS_SEMANA, MESES_ABR, addDays, getMonday, timeToMinutes, toISODate } from "@/lib/agendaHelpers";
import type { Recurso } from "@/lib/patientData";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";
const botonPrimario =
  "rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
const botonSecundario =
  "rounded-lg border border-edge/10 bg-surface px-4 py-2 text-sm text-ink/70 transition-colors hover:text-ink";

function avisarPorWhatsApp(nombreColega: string, recursoNombre: string, numero: string) {
  const mensaje =
    `Hola ${nombreColega.split(" ")[0] || ""}, te compartí mi calendario de «${recursoNombre}» en MO Conecta ` +
    `(solo ves horarios ocupados y libres, no datos de pacientes). Entra a MO → MO Conecta → Calendarios para verlo.`;
  const digitos = telefonoLocal(numero);
  const destino = digitos ? `https://wa.me/52${digitos}` : "https://wa.me/";
  window.open(`${destino}?text=${encodeURIComponent(mensaje)}`, "_blank");
}

export function CompartirCalendarioDialog({
  recurso,
  onClose,
  onCambio,
}: {
  recurso: Recurso;
  onClose: () => void;
  onCambio?: () => void;
}) {
  const { clinicUid } = usePatientData();
  const { directorio, uid } = useMoConecta();
  const { mios, refrescar } = useCalendariosCompartidos();
  const [busqueda, setBusqueda] = useState("");
  const [elegido, setElegido] = useState<{ uid: string; nombreCompleto: string } | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recienCompartido, setRecienCompartido] = useState<{ nombre: string } | null>(null);
  const [numero, setNumero] = useState("");

  const yaCompartidos = mios.filter((c) => c.recursoId === recurso.id);
  const idsYaCompartidos = new Set(yaCompartidos.map((c) => c.destinatarioUid));
  const colegas = directorio
    .filter((p) => p.uid !== uid && !idsYaCompartidos.has(p.uid))
    .filter((p) => !busqueda.trim() || normalizarNombre(p.nombreCompleto).includes(normalizarNombre(busqueda)));

  async function compartir() {
    if (!elegido || !clinicUid) return;
    setTrabajando(true);
    setError(null);
    try {
      await compartirCalendarioApi({ clinicaId: clinicUid, recursoId: recurso.id, destinatarioUid: elegido.uid });
      // El número se busca en los colegas que ya invitaste desde este dispositivo.
      const guardado = leerContactosLocales().find((c) => normalizarNombre(c.nombre) === normalizarNombre(elegido.nombreCompleto));
      setNumero(guardado?.whatsapp ?? "");
      setRecienCompartido({ nombre: elegido.nombreCompleto });
      setElegido(null);
      await refrescar();
      onCambio?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo compartir el calendario.");
    } finally {
      setTrabajando(false);
    }
  }

  async function dejar(c: CalendarioCompartidoDoc) {
    if (!window.confirm(`¿Dejar de compartir «${recurso.nombre}» con ${c.destinatarioNombre}? Dejará de verlo de inmediato.`)) return;
    setTrabajando(true);
    setError(null);
    try {
      await dejarDeCompartirCalendarioApi(c.id);
      await refrescar();
      onCambio?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo dejar de compartir.");
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Compartir calendario</h3>
          <button onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink">
            ✕
          </button>
        </div>
        <p className="mb-1 text-sm font-medium text-ink">{recurso.nombre}</p>
        <p className="mb-4 text-xs text-ink/50">
          Tu colega verá <strong>solo los horarios ocupados y libres</strong>, nunca nombres de pacientes ni tratamientos. Se
          actualiza en vivo y puedes dejar de compartir cuando quieras.
        </p>

        {recienCompartido && (
          <div className="mb-4 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
            <p>Listo: compartido con {recienCompartido.nombre}.</p>
            <p className="mt-1 text-xs text-ink/60">MO no le avisa solo — mándale el aviso por WhatsApp:</p>
            <div className="mt-2 flex gap-2">
              <input
                className={inputClass}
                type="tel"
                value={numero}
                onChange={(e) => setNumero(e.target.value)}
                placeholder="WhatsApp (10 dígitos), opcional"
              />
              <button onClick={() => avisarPorWhatsApp(recienCompartido.nombre, recurso.nombre, numero)} className={botonSecundario}>
                Avisar
              </button>
            </div>
          </div>
        )}

        {yaCompartidos.length > 0 && (
          <div className="mb-4">
            <p className="mb-1 text-xs font-medium text-ink/60">Ya lo ven</p>
            <ul className="divide-y divide-edge/5 rounded-lg border border-edge/10">
              {yaCompartidos.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-ink/80">
                  <span className="truncate">{c.destinatarioNombre}</span>
                  <button onClick={() => dejar(c)} disabled={trabajando} className="shrink-0 text-xs text-danger hover:underline disabled:opacity-50">
                    Dejar de compartir
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mb-1 text-xs font-medium text-ink/60">Compartir con</p>
        <input
          className={inputClass}
          placeholder="Buscar colega…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto">
          {colegas.map((p) => (
            <button
              key={p.uid}
              onClick={() => setElegido({ uid: p.uid, nombreCompleto: p.nombreCompleto })}
              className={`flex w-full items-center justify-between gap-3 rounded-lg border p-2.5 text-left text-sm transition-colors ${
                elegido?.uid === p.uid ? "border-accent bg-accent/10 text-ink" : "border-edge/10 text-ink/80 hover:border-accent/40"
              }`}
            >
              <span className="truncate">{p.nombreCompleto}</span>
              {elegido?.uid === p.uid && <span className="text-xs text-accent">elegido</span>}
            </button>
          ))}
          {colegas.length === 0 && (
            <p className="py-2 text-xs text-ink/50">
              {directorio.filter((p) => p.uid !== uid).length === 0
                ? "Todavía no hay colegas con perfil en MO Conecta. Invítalo desde MO Conecta → Invitar odontólogo."
                : "Ningún colega coincide (o ya lo comparte contigo)."}
            </p>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className={botonSecundario}>
            Cerrar
          </button>
          <button onClick={compartir} disabled={!elegido || trabajando} className={botonPrimario}>
            {trabajando ? "Compartiendo…" : elegido ? `Compartir con ${elegido.nombreCompleto.split(" ")[0]}` : "Compartir"}
          </button>
        </div>
      </div>
    </div>
  );
}

const PX_POR_MIN = 0.7;

/** Semana (lunes a domingo) con los horarios ocupados en gris; lo vacío está libre. */
function VistaSemanal({ calendario, onVolver }: { calendario: CalendarioCompartidoDoc; onVolver: () => void }) {
  const [lunes, setLunes] = useState(() => getMonday(new Date()));
  const [datos, setDatos] = useState<OcupacionDeCalendario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actualizado, setActualizado] = useState<Date | null>(null);
  const desde = toISODate(lunes);
  const hasta = toISODate(addDays(lunes, 6));

  const cargar = useCallback(async () => {
    try {
      setDatos(await ocupacionCalendarioApi(calendario.id, desde, hasta));
      setActualizado(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer el calendario.");
    }
  }, [calendario.id, desde, hasta]);

  // En vivo: se lee al abrir, al cambiar de semana y cada 30 segundos.
  useEffect(() => {
    void cargar();
    const t = setInterval(() => void cargar(), 30_000);
    return () => clearInterval(t);
  }, [cargar]);

  const inicioMin = useMemo(() => {
    const a = datos?.horario ? timeToMinutes(datos.horario.apertura) : 8 * 60;
    const primera = datos?.bloques.length ? Math.min(...datos.bloques.map((b) => timeToMinutes(b.inicio))) : a;
    return Math.floor(Math.min(a, primera) / 60) * 60;
  }, [datos]);
  const finMin = useMemo(() => {
    const c = datos?.horario ? timeToMinutes(datos.horario.cierre) : 20 * 60;
    const ultima = datos?.bloques.length ? Math.max(...datos.bloques.map((b) => timeToMinutes(b.fin))) : c;
    return Math.ceil(Math.max(c, ultima) / 60) * 60;
  }, [datos]);
  const alto = (finMin - inicioMin) * PX_POR_MIN;
  const horas = Array.from({ length: (finMin - inicioMin) / 60 + 1 }, (_, i) => inicioMin / 60 + i);
  const hoy = toISODate(new Date());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onVolver} className="text-sm text-ink/60 hover:text-ink">
          ← Volver a calendarios
        </button>
        <p className="text-xs text-ink/40">
          {actualizado ? `Actualizado a las ${actualizado.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} · se actualiza solo` : "Cargando…"}
        </p>
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-4">
        <h3 className="text-base font-semibold text-ink">{calendario.recursoNombre}</h3>
        <p className="text-xs text-ink/50">
          Compartido por {calendario.remitenteNombre} · solo horarios ocupados y libres
        </p>

        <div className="mt-3 flex items-center justify-between">
          <button onClick={() => setLunes((l) => addDays(l, -7))} className={botonSecundario} aria-label="Semana anterior">
            ‹
          </button>
          <p className="text-sm font-medium text-ink">
            {lunes.getDate()} {MESES_ABR[lunes.getMonth()]} – {addDays(lunes, 6).getDate()} {MESES_ABR[addDays(lunes, 6).getMonth()]}
          </p>
          <button onClick={() => setLunes((l) => addDays(l, 7))} className={botonSecundario} aria-label="Semana siguiente">
            ›
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-3 overflow-x-auto">
          <div className="grid min-w-[560px] grid-cols-[36px_repeat(7,1fr)] gap-px">
            <div />
            {Array.from({ length: 7 }, (_, i) => {
              const d = addDays(lunes, i);
              const esHoy = toISODate(d) === hoy;
              return (
                <div key={i} className={`pb-1 text-center text-[11px] ${esHoy ? "font-semibold text-accent" : "text-ink/50"}`}>
                  {DIAS_SEMANA[i]} {d.getDate()}
                </div>
              );
            })}
            <div className="relative" style={{ height: alto }}>
              {horas.map((h) => (
                <span key={h} className="absolute right-1 -translate-y-1/2 text-[10px] text-ink/40" style={{ top: (h * 60 - inicioMin) * PX_POR_MIN }}>
                  {String(h).padStart(2, "0")}:00
                </span>
              ))}
            </div>
            {Array.from({ length: 7 }, (_, i) => {
              const fecha = toISODate(addDays(lunes, i));
              const delDia = datos?.bloques.filter((b) => b.fecha === fecha) ?? [];
              const h = datos?.horario;
              return (
                <div key={i} className="relative rounded-md bg-field" style={{ height: alto }}>
                  {horas.slice(1, -1).map((hr) => (
                    <div key={hr} className="absolute inset-x-0 border-t border-edge/5" style={{ top: (hr * 60 - inicioMin) * PX_POR_MIN }} />
                  ))}
                  {h?.comidaInicio && h?.comidaFin && (
                    <div
                      title="Hora de comida"
                      className="absolute inset-x-0 bg-ink/5"
                      style={{
                        top: (timeToMinutes(h.comidaInicio) - inicioMin) * PX_POR_MIN,
                        height: (timeToMinutes(h.comidaFin) - timeToMinutes(h.comidaInicio)) * PX_POR_MIN,
                      }}
                    />
                  )}
                  {delDia.map((b, j) => (
                    <div
                      key={j}
                      title={`Ocupado ${b.inicio} – ${b.fin}`}
                      className="absolute inset-x-0.5 overflow-hidden rounded bg-ink/25 px-1 text-[10px] leading-tight text-ink/70"
                      style={{
                        top: (timeToMinutes(b.inicio) - inicioMin) * PX_POR_MIN,
                        height: Math.max(12, (timeToMinutes(b.fin) - timeToMinutes(b.inicio)) * PX_POR_MIN),
                      }}
                    >
                      Ocupado
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-[11px] text-ink/50">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-field ring-1 ring-edge/10" /> Libre
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-ink/25" /> Ocupado
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-ink/5 ring-1 ring-edge/10" /> Comida
          </span>
        </div>
      </div>
    </div>
  );
}

export function CalendariosCompartidosTab() {
  const { conmigo, mios, cargando, refrescar } = useCalendariosCompartidos();
  const [abierto, setAbierto] = useState<string | null>(null);
  const seleccionado = [...conmigo, ...mios].find((c) => c.id === abierto) ?? null;

  if (seleccionado) return <VistaSemanal calendario={seleccionado} onVolver={() => setAbierto(null)} />;

  async function dejar(c: CalendarioCompartidoDoc, aMi: boolean) {
    const pregunta = aMi
      ? `¿Dejar de ver el calendario de «${c.recursoNombre}» de ${c.remitenteNombre}?`
      : `¿Dejar de compartir «${c.recursoNombre}» con ${c.destinatarioNombre}? Dejará de verlo de inmediato.`;
    if (!window.confirm(pregunta)) return;
    try {
      await dejarDeCompartirCalendarioApi(c.id);
    } catch (err) {
      console.error("No se pudo dejar de compartir", err);
    }
    await refrescar();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <h3 className="mb-1 text-sm font-semibold text-ink">Calendarios que comparten contigo</h3>
        <p className="mb-3 text-xs text-ink/50">Ves solo horarios ocupados y libres, actualizados en vivo.</p>
        {cargando ? (
          <p className="text-sm text-ink/50">Cargando…</p>
        ) : conmigo.length === 0 ? (
          <p className="text-sm text-ink/50">Nadie ha compartido un calendario contigo todavía.</p>
        ) : (
          <div className="space-y-2">
            {conmigo.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-edge/10 p-3">
                <button onClick={() => setAbierto(c.id)} className="min-w-0 text-left">
                  <p className="truncate text-sm font-medium text-ink">{c.recursoNombre}</p>
                  <p className="truncate text-xs text-ink/50">de {c.remitenteNombre}</p>
                </button>
                <div className="flex shrink-0 items-center gap-3">
                  <button onClick={() => setAbierto(c.id)} className="text-xs text-accent hover:underline">
                    Ver
                  </button>
                  <button onClick={() => dejar(c, true)} className="text-xs text-ink/40 hover:text-danger hover:underline">
                    Quitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <h3 className="mb-1 text-sm font-semibold text-ink">Calendarios que tú compartes</h3>
        <p className="mb-3 text-xs text-ink/50">Para compartir uno nuevo, ve a Agenda → Recursos y toca «Compartir».</p>
        {mios.length === 0 ? (
          <p className="text-sm text-ink/50">No estás compartiendo ningún calendario.</p>
        ) : (
          <div className="space-y-2">
            {mios.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-edge/10 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{c.recursoNombre}</p>
                  <p className="truncate text-xs text-ink/50">con {c.destinatarioNombre}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button onClick={() => setAbierto(c.id)} className="text-xs text-accent hover:underline">
                    Ver lo que ve
                  </button>
                  <button onClick={() => dejar(c, false)} className="text-xs text-danger hover:underline">
                    Dejar de compartir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
