"use client";

import { Chip, inputClass, labelClass } from "./NotaUI";
import CamposComunesProcedimiento from "./CamposComunesProcedimiento";
import type { NotaEvolucionV2 } from "@/lib/notasEvolucion";
import { plantillaCamposPorTipo, type CampoPlantilla, type DetalleGenerico } from "@/lib/procedimientoNotaPlantillas";

/** Un solo campo de la plantilla declarativa (prótesis/cirugía/valoración/
 * urgencia) — cada `tipo` de CampoPlantilla se renderiza distinto, pero
 * todos leen/escriben el mismo `camposAdicionales[key]: string`. "bool" solo
 * escribe la llave cuando está marcado (nunca "false" — un campo sin marcar
 * se trata igual que uno nunca tocado, consistente con narrarCamposPlantilla
 * y detalleProcedimientoFaltante, que ambos solo miran valores no vacíos).
 * "chips" guarda las opciones elegidas unidas por coma — es la única forma
 * de representar una selección múltiple dentro de `Record<string,string>`
 * sin cambiar ese tipo. */
function CampoPlantillaInput({
  campo,
  valor,
  onChange,
  onBlurTexto,
}: {
  campo: CampoPlantilla;
  valor: string;
  onChange: (valor: string) => void;
  onBlurTexto?: () => void;
}) {
  const faltante = campo.requerido && !valor.trim();

  if (campo.tipo === "textarea") {
    return (
      <div>
        <label className={labelClass}>
          {campo.label}
          {!campo.requerido && " (opcional)"}
        </label>
        <textarea className={inputClass} rows={2} value={valor} onChange={(e) => onChange(e.target.value)} onBlur={onBlurTexto} />
        {faltante && <p className="mt-1 text-xs text-warning">Completa {campo.label.toLowerCase()} antes de firmar.</p>}
      </div>
    );
  }

  if (campo.tipo === "select") {
    return (
      <div>
        <label className={labelClass}>{campo.label}</label>
        <select className={inputClass} value={valor} onChange={(e) => onChange(e.target.value)}>
          <option value="">{campo.requerido ? "Sin confirmar" : "Sin especificar"}</option>
          {(campo.opciones ?? []).map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
        {faltante && <p className="mt-1 text-xs text-warning">Confirma {campo.label.toLowerCase()} antes de firmar.</p>}
      </div>
    );
  }

  if (campo.tipo === "chips") {
    const seleccionadas = valor ? valor.split(", ") : [];
    function toggle(opcion: string) {
      const siguiente = seleccionadas.includes(opcion) ? seleccionadas.filter((o) => o !== opcion) : [...seleccionadas, opcion];
      onChange(siguiente.join(", "));
    }
    return (
      <div>
        <label className={labelClass}>
          {campo.label}
          {!campo.requerido && " (opcional)"}
        </label>
        <div className="flex flex-wrap gap-2">
          {(campo.opciones ?? []).map((op) => (
            <Chip key={op} seleccionado={seleccionadas.includes(op)} onClick={() => toggle(op)}>
              {op}
            </Chip>
          ))}
        </div>
        {faltante && <p className="mt-1 text-xs text-warning">Elige {campo.label.toLowerCase()} antes de firmar.</p>}
      </div>
    );
  }

  if (campo.tipo === "bool") {
    return (
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={valor === "true"} onChange={(e) => onChange(e.target.checked ? "true" : "")} />
        {campo.label}
      </label>
    );
  }

  // "texto"
  return (
    <div>
      <label className={labelClass}>
        {campo.label}
        {!campo.requerido && " (opcional)"}
      </label>
      <input className={inputClass} value={valor} onChange={(e) => onChange(e.target.value)} />
      {faltante && <p className="mt-1 text-xs text-warning">Completa {campo.label.toLowerCase()} antes de firmar.</p>}
    </div>
  );
}

export default function DetalleGenericoPlantillaForm({
  detalle,
  onChange,
  onBlurTexto,
}: {
  detalle: DetalleGenerico;
  onChange: (updater: (prev: NotaEvolucionV2) => NotaEvolucionV2, opts?: { inmediato?: boolean }) => void;
  onBlurTexto?: () => void;
}) {
  function set<K extends keyof DetalleGenerico>(key: K, value: DetalleGenerico[K]) {
    onChange((prev) => ({ ...prev, detalleProcedimiento: { ...detalle, [key]: value } }));
  }

  function setCampoAdicional(key: string, valor: string) {
    const actuales = detalle.camposAdicionales ?? {};
    set("camposAdicionales", { ...actuales, [key]: valor });
  }

  const campos = plantillaCamposPorTipo[detalle.tipo];

  return (
    <div className="space-y-3">
      <CamposComunesProcedimiento detalle={detalle} set={set} onBlurTexto={onBlurTexto} />

      {campos?.map((campo) => (
        <CampoPlantillaInput
          key={campo.key}
          campo={campo}
          valor={detalle.camposAdicionales?.[campo.key] ?? ""}
          onChange={(valor) => setCampoAdicional(campo.key, valor)}
          onBlurTexto={onBlurTexto}
        />
      ))}
    </div>
  );
}
