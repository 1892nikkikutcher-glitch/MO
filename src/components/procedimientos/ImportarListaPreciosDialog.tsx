"use client";

import { useRef, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { esEspecialidadPredefinida } from "@/lib/procedimientos";
import {
  clasificarListaPrecios,
  leerListaPrecios,
  procedimientoDesdeFila,
  type ClasificacionPrecio,
  type ItemListaPrecios,
} from "@/lib/importarListaPrecios";

const TAMAÑO_MAXIMO = 5 * 1024 * 1024;

const etiqueta: Record<ClasificacionPrecio, { texto: string; clase: string }> = {
  nuevo: { texto: "Nuevo", clase: "bg-success/10 text-success" },
  igual: { texto: "Ya lo tienes", clase: "bg-ink/10 text-ink/50" },
  cambia_precio: { texto: "Cambia el precio", clase: "bg-accent/15 text-accent" },
  posible_duplicado: { texto: "Posible duplicado", clase: "bg-warning/10 text-warning" },
};

type Paso = "archivo" | "revisar" | "guardando" | "resultado";

export default function ImportarListaPreciosDialog({ onClose }: { onClose: () => void }) {
  const { procedimientos, importarListaPrecios } = usePatientData();
  const inputArchivo = useRef<HTMLInputElement>(null);
  const [paso, setPaso] = useState<Paso>("archivo");
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState("");
  const [nombreArchivo, setNombreArchivo] = useState("");
  const [items, setItems] = useState<ItemListaPrecios[]>([]);
  const [avisos, setAvisos] = useState<string[]>([]);
  const [seleccion, setSeleccion] = useState<Set<number>>(new Set());
  const [resultado, setResultado] = useState({ agregados: 0, actualizados: 0 });

  const elegirArchivo = async (archivo: File | undefined) => {
    if (!archivo) return;
    setError("");
    if (archivo.size > TAMAÑO_MAXIMO) {
      setError("El archivo pesa más de 5 MB. Sube solo la hoja o la tabla con la lista de precios.");
      return;
    }
    setLeyendo(true);
    try {
      const lectura = leerListaPrecios(await archivo.arrayBuffer(), archivo.name);
      const clasificados = clasificarListaPrecios(lectura.filas, procedimientos);
      setItems(clasificados);
      setAvisos(lectura.avisos);
      setNombreArchivo(archivo.name);
      // Lo nuevo viene marcado; lo que cambia un precio o se parece a algo que ya tienes lo decide quien importa.
      setSeleccion(new Set(clasificados.flatMap((it, i) => (it.clasificacion === "nuevo" ? [i] : []))));
      setPaso("revisar");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo leer el archivo.");
    } finally {
      setLeyendo(false);
    }
  };

  const alternar = (i: number) =>
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const marcados = items.map((it, i) => ({ it, i })).filter(({ it, i }) => seleccion.has(i) && it.clasificacion !== "igual");
  const aAgregar = marcados.filter(({ it }) => it.clasificacion === "nuevo" || it.clasificacion === "posible_duplicado");
  const aActualizar = marcados.filter(({ it }) => it.clasificacion === "cambia_precio");

  const importar = async () => {
    setPaso("guardando");
    const ahoraIso = new Date().toISOString();
    const base = Date.now();
    const nuevos = aAgregar.map(({ it }, n) => procedimientoDesdeFila(it.fila, `proc${base}_${n}`, ahoraIso));
    // Si el documento repite un tratamiento que ya existe (en otra especialidad), el precio se actualiza una sola vez.
    const cambios = new Map<string, number>();
    for (const { it } of aActualizar) if (it.existente && !cambios.has(it.existente.id)) cambios.set(it.existente.id, it.fila.precio);
    try {
      await importarListaPrecios(
        nuevos,
        [...cambios].map(([id, costoPaciente]) => ({ id, costoPaciente }))
      );
      setResultado({ agregados: nuevos.length, actualizados: cambios.size });
      setPaso("resultado");
    } catch {
      setError("No se pudo guardar la lista. Revisa tu conexión e inténtalo de nuevo; lo que ya tenías no se modificó.");
      setPaso("revisar");
    }
  };

  const cuentas = {
    nuevos: items.filter((it) => it.clasificacion === "nuevo").length,
    cambian: items.filter((it) => it.clasificacion === "cambia_precio").length,
    iguales: items.filter((it) => it.clasificacion === "igual").length,
    parecidos: items.filter((it) => it.clasificacion === "posible_duplicado").length,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-2xl border border-edge/10 bg-modal p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Agregar documento de lista de precios</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>

        {paso === "resultado" ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-success/30 bg-success/10 p-4 text-sm text-success">
              {resultado.agregados > 0 && (
                <p>
                  Se agregaron <strong>{resultado.agregados}</strong> tratamiento(s) a tu catálogo con su precio.
                </p>
              )}
              {resultado.actualizados > 0 && (
                <p>
                  Se actualizó el precio de <strong>{resultado.actualizados}</strong> tratamiento(s) que ya tenías.
                </p>
              )}
            </div>
            <p className="text-xs text-ink/50">
              Los tratamientos nuevos quedaron con el costo al odontólogo sin configurar y con la duración que traía tu archivo (30 minutos si no
              la traía): ajústalos desde la lista cuando quieras. Los que venían en un grupo que no es una especialidad (por ejemplo «Promociones del mes») quedaron en la
              tarjeta «Sin clasificar», para que los ubiques en su rama. Los presupuestos que ya hiciste conservan el precio con el que se hicieron.
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent hover:bg-accent/25"
            >
              Listo
            </button>
          </div>
        ) : paso === "guardando" ? (
          <p className="py-10 text-center text-sm text-ink/50">Guardando tu lista de precios…</p>
        ) : paso === "revisar" ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <p className="text-sm text-ink/70">
              Encontré <strong className="text-ink">{items.length}</strong> tratamiento(s) con precio en «{nombreArchivo}». Revisa y elige qué
              importar.
            </p>
            {avisos.length > 0 && (
              <ul className="space-y-0.5 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                {avisos.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            )}
            {error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}

            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {items.map((it, i) => {
                const badge = etiqueta[it.clasificacion];
                const bloqueado = it.clasificacion === "igual";
                return (
                  <label
                    key={`${it.fila.nombre}-${i}`}
                    className={`flex items-start gap-3 rounded-lg border border-edge/10 p-2.5 text-sm ${bloqueado ? "opacity-50" : "cursor-pointer hover:bg-surface"}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-1 accent-[color:var(--accent)]"
                      checked={seleccion.has(i)}
                      disabled={bloqueado}
                      onChange={() => alternar(i)}
                      aria-label={it.clasificacion === "cambia_precio" ? `Actualizar el precio de ${it.fila.nombre}` : `Importar ${it.fila.nombre}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink">{it.fila.nombre}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.clase}`}>{badge.texto}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-ink/50">
                        {esEspecialidadPredefinida(it.fila.especialidad) ? it.fila.especialidad : `Sin clasificar (grupo: ${it.fila.especialidad})`}
                        {it.fila.duracionMinutos ? ` · ${it.fila.duracionMinutos} min` : ""}
                      </p>
                      {it.clasificacion === "posible_duplicado" && it.existente && (
                        <p className="mt-1 text-xs text-warning">
                          Se parece a «{it.existente.nombre}» ({formatCurrency(it.existente.costoPaciente)}), que ya tienes. Si lo marcas, se agrega como
                          otro tratamiento.
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      {it.clasificacion === "cambia_precio" && it.existente ? (
                        <>
                          <div className="text-[11px] text-ink/40 line-through">{formatCurrency(it.existente.costoPaciente)}</div>
                          <div className="font-semibold text-ink">{formatCurrency(it.fila.precio)}</div>
                        </>
                      ) : (
                        <div className="font-semibold text-ink">{formatCurrency(it.fila.precio)}</div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge/10 pt-3">
              <span className="text-xs text-ink/50">
                {cuentas.nuevos} nuevo(s)
                {cuentas.cambian > 0 ? ` · ${cuentas.cambian} con precio distinto` : ""}
                {cuentas.parecidos > 0 ? ` · ${cuentas.parecidos} parecido(s)` : ""}
                {cuentas.iguales > 0 ? ` · ${cuentas.iguales} igual(es)` : ""}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setError("");
                    setPaso("archivo");
                  }}
                  className="rounded-lg border border-edge/15 px-3 py-2 text-sm font-semibold text-ink/80 hover:bg-surface"
                >
                  Otro archivo
                </button>
                <button
                  onClick={importar}
                  disabled={aAgregar.length + aActualizar.length === 0}
                  className="rounded-lg border border-accent/60 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {aAgregar.length + aActualizar.length === 0
                    ? "Importar"
                    : `Importar (${[aAgregar.length > 0 ? `${aAgregar.length} nuevo(s)` : "", aActualizar.length > 0 ? `${aActualizar.length} precio(s)` : ""].filter(Boolean).join(" y ")})`}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink/70">
              Si ya tienes tu lista de precios en <strong className="text-ink">Excel</strong> o en <strong className="text-ink">Word</strong>, súbela tal cual:
              reconozco las columnas de tratamiento y precio sin importar el orden, y los títulos como «Ortodoncia» los uso como especialidad.
            </p>
            <input
              ref={inputArchivo}
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.xlsm,.docx,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv"
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                e.target.value = "";
                void elegirArchivo(archivo);
              }}
            />
            <button
              onClick={() => inputArchivo.current?.click()}
              disabled={leyendo}
              className="flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-accent/40 bg-accent/5 px-4 py-8 text-sm font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
            >
              {leyendo ? "Leyendo el documento…" : "Elegir documento (Excel, Word o CSV)"}
              <span className="text-xs font-normal text-ink/50">.xlsx · .xls · .docx · .csv — hasta 5 MB</span>
            </button>
            {error && <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}
            <p className="text-xs text-ink/40">
              Antes de guardar vas a ver todo lo que encontré. No se borra ni se cambia nada de lo que ya tienes sin que lo marques: lo nuevo se
              agrega, y el precio de lo que ya existe solo se actualiza si tú lo eliges.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
