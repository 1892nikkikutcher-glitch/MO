"use client";

/** Formulario de 2 pasos para armar una "Comparativa de Rehabilitación":
 * elegir 2-4 presupuestos ya guardados del paciente, y calificar cada uno
 * en función/estética/conservación biológica (economía se calcula sola,
 * desde los totales reales — ver calcularEconomiaRelativa). Vista previa en
 * vivo con la misma gráfica de radar que se usa en pantalla, impresión y
 * (con barras en vez de radar) en el PDF de WhatsApp. */

import { useMemo, useState } from "react";
import RadarComparativa, { type OpcionRadar } from "@/components/RadarComparativa";
import {
  calcularEconomiaRelativa,
  etiquetaTratamiento,
  idComparativa,
  type ComparativaRehabilitacion,
  type NivelComparativa,
  type OpcionComparativa,
} from "@/lib/comparativaRehabilitacion";
import { formatCurrency, type SavedBudget } from "@/lib/patientData";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";
const botonPrimario =
  "rounded-lg border border-accent/60 bg-accent/15 px-4 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40";
const botonSecundario =
  "rounded-lg border border-edge/15 px-4 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface";

const COLORES = ["#4f8a75", "#bd8a3d", "#7a4b8c", "#3f6fa8"];
export const EJES_COMPARATIVA = ["Economía", "Función", "Estética", "Conservación biológica"];

type CalificacionBorrador = {
  funcion: NivelComparativa;
  estetica: NivelComparativa;
  conservacionBiologica: NivelComparativa;
  ventajas: string;
  desventajas: string;
};

function calificacionVacia(): CalificacionBorrador {
  return { funcion: 3, estetica: 3, conservacionBiologica: 3, ventajas: "", desventajas: "" };
}

function SelectorNivel({
  valor,
  onChange,
  etiqueta,
}: {
  valor: NivelComparativa;
  onChange: (v: NivelComparativa) => void;
  etiqueta: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink/60">{etiqueta}</label>
      <div className="flex gap-1.5">
        {([1, 2, 3, 4, 5] as NivelComparativa[]).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            title={`Nivel ${n} de 5`}
            className={`h-6 w-6 rounded-full border-2 transition-colors ${
              n <= valor ? "border-accent bg-accent" : "border-edge/25 bg-transparent hover:border-accent/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function NuevaComparativaRehabilitacion({
  presupuestos,
  initial,
  onCancel,
  onSave,
}: {
  patientId: string;
  presupuestos: SavedBudget[];
  initial?: ComparativaRehabilitacion;
  onCancel: () => void;
  onSave: (comparativa: ComparativaRehabilitacion) => void;
}) {
  const [paso, setPaso] = useState<"elegir" | "calificar">(initial ? "calificar" : "elegir");
  const [titulo, setTitulo] = useState(initial?.titulo ?? "");
  const [seleccionados, setSeleccionados] = useState<string[]>(initial?.opciones.map((o) => o.presupuestoId) ?? []);
  const [calificaciones, setCalificaciones] = useState<Record<string, CalificacionBorrador>>(() => {
    const inicial: Record<string, CalificacionBorrador> = {};
    initial?.opciones.forEach((o) => {
      inicial[o.presupuestoId] = {
        funcion: o.funcion,
        estetica: o.estetica,
        conservacionBiologica: o.conservacionBiologica,
        ventajas: o.ventajas ?? "",
        desventajas: o.desventajas ?? "",
      };
    });
    return inicial;
  });

  const toggleSeleccionado = (id: string) => {
    setSeleccionados((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  function continuarACalificar() {
    setCalificaciones((prev) => {
      const siguiente = { ...prev };
      seleccionados.forEach((id) => {
        if (!siguiente[id]) siguiente[id] = calificacionVacia();
      });
      return siguiente;
    });
    if (!titulo.trim()) {
      const primero = presupuestos.find((p) => p.id === seleccionados[0]);
      setTitulo(primero?.items[0]?.procedure ?? "Comparativa de tratamiento");
    }
    setPaso("calificar");
  }

  const presupuestosElegidos = seleccionados
    .map((id) => presupuestos.find((p) => p.id === id))
    .filter((p): p is SavedBudget => Boolean(p));

  const economias = useMemo(
    () => calcularEconomiaRelativa(presupuestosElegidos.map((p) => p.total)),
    [presupuestosElegidos]
  );

  const opcionesRadar: OpcionRadar[] = presupuestosElegidos.map((p, i) => {
    const cal = calificaciones[p.id] ?? calificacionVacia();
    return {
      id: p.id,
      color: COLORES[i % COLORES.length],
      etiqueta: etiquetaTratamiento(p),
      valores: [economias[i] ?? 3, cal.funcion, cal.estetica, cal.conservacionBiologica],
    };
  });

  function guardar() {
    const opciones: OpcionComparativa[] = presupuestosElegidos.map((p) => {
      const cal = calificaciones[p.id] ?? calificacionVacia();
      return {
        presupuestoId: p.id,
        funcion: cal.funcion,
        estetica: cal.estetica,
        conservacionBiologica: cal.conservacionBiologica,
        ventajas: cal.ventajas.trim() || undefined,
        desventajas: cal.desventajas.trim() || undefined,
      };
    });
    onSave({
      id: initial?.id ?? idComparativa(),
      titulo: titulo.trim() || "Comparativa de tratamiento",
      fecha: initial?.fecha ?? new Date().toISOString(),
      opciones,
    });
  }

  if (paso === "elegir") {
    return (
      <div className="space-y-4">
        <button onClick={onCancel} className="flex items-center gap-2 text-sm font-medium text-accent hover:text-accent">
          ← Volver a Presupuestos
        </button>
        <h2 className="text-xl font-semibold text-ink">Comparativa de Rehabilitación</h2>
        <p className="text-sm text-ink/50">Elige de 2 a 4 presupuestos de este paciente para compararlos.</p>
        {presupuestos.length < 2 ? (
          <p className="rounded-lg border border-dashed border-edge/15 p-6 text-center text-sm text-ink/40">
            Este paciente necesita al menos 2 presupuestos guardados para poder compararlos.
          </p>
        ) : (
          <div className="space-y-2">
            {presupuestos.map((p) => (
              <label
                key={p.id}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-colors ${
                  seleccionados.includes(p.id) ? "border-accent/60 bg-accent/10" : "border-edge/10 hover:bg-surface"
                }`}
              >
                <span className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={seleccionados.includes(p.id)}
                    onChange={() => toggleSeleccionado(p.id)}
                    className="accent-[color:var(--accent)]"
                  />
                  <span>
                    <span className="font-medium text-ink">Folio #{p.folio}</span>
                    <span className="ml-2 text-ink/50">
                      {p.items[0]?.procedure ?? "Sin procedimientos"}
                      {p.items.length > 1 ? ` +${p.items.length - 1}` : ""}
                    </span>
                  </span>
                </span>
                <span className="font-semibold text-accent">{formatCurrency(p.total)}</span>
              </label>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className={botonSecundario}>
            Cancelar
          </button>
          <button onClick={continuarACalificar} disabled={seleccionados.length < 2} className={botonPrimario}>
            Siguiente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={() => setPaso("elegir")} className="flex items-center gap-2 text-sm font-medium text-accent hover:text-accent">
        ← Cambiar presupuestos elegidos
      </button>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink/60">Título de la comparativa</label>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={inputClass} placeholder="Ej. Reemplazo OD 30" />
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <RadarComparativa ejes={EJES_COMPARATIVA} opciones={opcionesRadar} />
      </div>

      <div className="space-y-4">
        {presupuestosElegidos.map((p, i) => {
          const cal = calificaciones[p.id] ?? calificacionVacia();
          const actualizar = (cambios: Partial<CalificacionBorrador>) =>
            setCalificaciones((prev) => ({ ...prev, [p.id]: { ...(prev[p.id] ?? calificacionVacia()), ...cambios } }));
          return (
            <div
              key={p.id}
              className="rounded-2xl border border-edge/10 bg-surface p-5"
              style={{ borderTopWidth: 4, borderTopColor: COLORES[i % COLORES.length] }}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink">
                  {etiquetaTratamiento(p)} — {formatCurrency(p.total)}
                </h3>
                <span className="text-xs text-ink/40">Economía: {economias[i]}/5 (según el costo, automático)</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SelectorNivel etiqueta="Función" valor={cal.funcion} onChange={(v) => actualizar({ funcion: v })} />
                <SelectorNivel etiqueta="Estética" valor={cal.estetica} onChange={(v) => actualizar({ estetica: v })} />
                <SelectorNivel
                  etiqueta="Conservación biológica"
                  valor={cal.conservacionBiologica}
                  onChange={(v) => actualizar({ conservacionBiologica: v })}
                />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink/60">Ventajas (opcional)</label>
                  <textarea
                    value={cal.ventajas}
                    onChange={(e) => actualizar({ ventajas: e.target.value })}
                    rows={2}
                    className={`${inputClass} resize-none`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink/60">Desventajas (opcional)</label>
                  <textarea
                    value={cal.desventajas}
                    onChange={(e) => actualizar({ desventajas: e.target.value })}
                    rows={2}
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className={botonSecundario}>
          Cancelar
        </button>
        <button onClick={guardar} className={botonPrimario}>
          Guardar comparativa
        </button>
      </div>
    </div>
  );
}
