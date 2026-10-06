"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { usePatientData } from "@/context/PatientDataContext";
import {
  agruparPorLote,
  esGrupoLote,
  etiquetaGrupoPapelera,
  singularDeTipo,
  tiposPorGrupo,
  type EntradaPapelera,
  type GrupoLote,
} from "@/lib/papelera";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

const POR_PAGINA = 100;

function fechaHora(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function Papelera() {
  const { clinicUid, puedeVerFinanzas, patients, restaurarDePapelera } = usePatientData();
  const [entradas, setEntradas] = useState<EntradaPapelera[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [limite, setLimite] = useState(POR_PAGINA);
  const [tipo, setTipo] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [verRestauradas, setVerRestauradas] = useState(false);
  const [abiertas, setAbiertas] = useState<Set<string>>(new Set());
  const [lotesAbiertos, setLotesAbiertos] = useState<Set<string>>(new Set());
  const [trabajando, setTrabajando] = useState<Set<string>>(new Set());
  const [mensajes, setMensajes] = useState<Record<string, { ok: boolean; texto: string }>>({});

  useEffect(() => {
    if (!clinicUid || !puedeVerFinanzas) return;
    setCargando(true);
    const q = query(collection(db, `users/${clinicUid}/papelera`), orderBy("eliminadoEl", "desc"), limit(limite));
    return onSnapshot(
      q,
      (snap) => {
        setEntradas(snap.docs.map((d) => ({ ...(d.data() as EntradaPapelera), id: d.id })));
        setErrorCarga("");
        setCargando(false);
      },
      (err) => {
        console.error("No se pudo leer la Papelera", err);
        setErrorCarga("No se pudo cargar la Papelera. Revisa tu conexión o tus permisos.");
        setCargando(false);
      }
    );
  }, [clinicUid, puedeVerFinanzas, limite]);

  const nombrePaciente = (id: string | null) => (id ? patients.find((p) => p.id === id)?.name ?? "" : "");

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return entradas.filter((e) => {
      if (!verRestauradas && e.restauradoEl) return false;
      if (tipo && e.tipo !== tipo) return false;
      if (!q) return true;
      return (
        e.etiqueta.toLowerCase().includes(q) ||
        singularDeTipo(e.tipo).toLowerCase().includes(q) ||
        nombrePaciente(e.pacienteId).toLowerCase().includes(q)
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entradas, tipo, busqueda, verRestauradas, patients]);

  const filas = useMemo(() => agruparPorLote(visibles), [visibles]);

  const alternar = (set: Set<string>, id: string) => {
    const copia = new Set(set);
    if (copia.has(id)) copia.delete(id);
    else copia.add(id);
    return copia;
  };

  const restaurar = async (e: EntradaPapelera) => {
    setTrabajando((p) => new Set(p).add(e.id));
    const r = await restaurarDePapelera(e);
    setMensajes((m) => ({ ...m, [e.id]: { ok: r.ok, texto: r.mensaje } }));
    setTrabajando((p) => {
      const c = new Set(p);
      c.delete(e.id);
      return c;
    });
    return r.ok;
  };

  const restaurarLote = async (g: GrupoLote) => {
    const pendientes = g.entradas.filter((e) => !e.restauradoEl);
    let bien = 0;
    for (const e of pendientes) {
      if (await restaurar(e)) bien++;
    }
    setMensajes((m) => ({
      ...m,
      [g.loteId]: { ok: bien === pendientes.length, texto: `${bien} de ${pendientes.length} restaurados.` },
    }));
  };

  if (!puedeVerFinanzas) {
    return (
      <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/50">
        Solo los administradores pueden ver la Papelera.
      </div>
    );
  }

  const tarjeta = (e: EntradaPapelera) => {
    const paciente = nombrePaciente(e.pacienteId);
    const msg = mensajes[e.id];
    const abierta = abiertas.has(e.id);
    const esFoto = e.tipo === "fotos" && typeof e.datos.url === "string";
    return (
      <div key={e.id} className="rounded-xl border border-edge/10 bg-inset p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 gap-3">
            {esFoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={String(e.datos.url)} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink/40">
                {singularDeTipo(e.tipo)}
                {paciente && <span className="normal-case tracking-normal"> · {paciente}</span>}
              </p>
              <p className="break-words text-sm font-medium text-ink">{e.etiqueta}</p>
              <p className="mt-0.5 text-xs text-ink/50">
                Eliminado el {fechaHora(e.eliminadoEl)}
                {e.eliminadoPorEmail && <> por {e.eliminadoPorEmail}</>}
              </p>
              {e.restauradoEl && (
                <p className="mt-0.5 text-xs text-success">
                  Restaurado el {fechaHora(e.restauradoEl)}
                  {e.restauradoPorEmail && <> por {e.restauradoPorEmail}</>}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => setAbiertas((s) => alternar(s, e.id))}
              className="rounded-lg border border-edge/15 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-surface"
            >
              {abierta ? "Ocultar" : "Ver detalle"}
            </button>
            {!e.restauradoEl && (
              <button
                onClick={() => restaurar(e)}
                disabled={trabajando.has(e.id)}
                className="rounded-lg border border-accent/60 bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/25 disabled:opacity-50"
              >
                {trabajando.has(e.id) ? "Restaurando…" : "Restaurar"}
              </button>
            )}
          </div>
        </div>
        {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-success" : "text-danger"}`}>{msg.texto}</p>}
        {abierta && (
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-surface p-3 text-[11px] leading-relaxed text-ink/70">
            {JSON.stringify(e.datos, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Papelera</h3>
        <p className="mt-1 text-xs text-ink/50">
          Todo lo que se elimina en MO se guarda aquí antes de borrarse del sistema, con quién lo eliminó y
          cuándo. Nada se borra de forma definitiva: puedes revisarlo con todo su detalle y restaurarlo.
          Las fotos eliminadas también conservan su archivo.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-edge/10 bg-surface p-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-ink/60">Tipo</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inputClass}>
            <option value="">Todos</option>
            {tiposPorGrupo().map(({ grupo, tipos }) => (
              <optgroup key={grupo} label={etiquetaGrupoPapelera[grupo]}>
                {tipos.map((t) => (
                  <option key={t.tipo} value={t.tipo}>
                    {t.singular}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-ink/60">Buscar</label>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Paciente, folio, concepto…"
            className={inputClass}
          />
        </div>
        <label className="flex items-center gap-2 text-xs text-ink/60 sm:col-span-3">
          <input type="checkbox" checked={verRestauradas} onChange={(e) => setVerRestauradas(e.target.checked)} />
          Mostrar también los que ya se restauraron
        </label>
      </div>

      {errorCarga && <p className="text-sm text-danger">{errorCarga}</p>}

      {cargando ? (
        <p className="text-sm text-ink/40">Cargando…</p>
      ) : filas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          {entradas.length === 0 ? "La papelera está vacía." : "Ningún elemento coincide con el filtro."}
        </div>
      ) : (
        <div className="space-y-3">
          {filas.map((fila) => {
            if (!esGrupoLote(fila)) return tarjeta(fila);
            const abierto = lotesAbiertos.has(fila.loteId);
            const pendientes = fila.entradas.filter((x) => !x.restauradoEl).length;
            const msg = mensajes[fila.loteId];
            return (
              <div key={fila.loteId} className="rounded-2xl border border-edge/10 bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {fila.tamano} registros eliminados juntos · {singularDeTipo(fila.entradas[0].tipo)}
                    </p>
                    <p className="text-xs text-ink/50">
                      {fechaHora(fila.entradas[0].eliminadoEl)}
                      {fila.entradas[0].eliminadoPorEmail && <> por {fila.entradas[0].eliminadoPorEmail}</>} ·{" "}
                      {pendientes} por restaurar
                      {fila.entradas.length < fila.tamano && " (se muestran solo los que coinciden con el filtro)"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLotesAbiertos((s) => alternar(s, fila.loteId))}
                      className="rounded-lg border border-edge/15 px-3 py-1.5 text-xs font-semibold text-ink/70 hover:bg-inset"
                    >
                      {abierto ? "Ocultar lista" : "Ver lista"}
                    </button>
                    {pendientes > 0 && (
                      <button
                        onClick={() => restaurarLote(fila)}
                        className="rounded-lg border border-accent/60 bg-accent/15 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/25"
                      >
                        Restaurar los {pendientes}
                      </button>
                    )}
                  </div>
                </div>
                {msg && <p className={`mt-2 text-xs ${msg.ok ? "text-success" : "text-danger"}`}>{msg.texto}</p>}
                {abierto && (
                  <div className="mt-3 space-y-2">
                    {fila.entradas.map((e) => tarjeta(e))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!cargando && entradas.length >= limite && (
        <button
          onClick={() => setLimite((l) => l + POR_PAGINA)}
          className="rounded-lg border border-edge/15 px-4 py-2 text-xs font-semibold text-ink/70 hover:bg-surface"
        >
          Mostrar más antiguos
        </button>
      )}
    </div>
  );
}
