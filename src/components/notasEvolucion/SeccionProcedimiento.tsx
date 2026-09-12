"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { Chip, botonSecundario, inputClass, labelClass } from "./NotaUI";
import DetalleEndodonciaForm from "./DetalleEndodonciaForm";
import DetalleExtraccionForm from "./DetalleExtraccionForm";
import DetalleRestauracionForm from "./DetalleRestauracionForm";
import DetalleLimpiezaForm from "./DetalleLimpiezaForm";
import DetalleControlOrtodonciaForm from "./DetalleControlOrtodonciaForm";
import DetalleOdontopediatriaForm from "./DetalleOdontopediatriaForm";
import DetalleGenericoPlantillaForm from "./DetalleGenericoPlantillaForm";
import type { NotaEvolucionV2 } from "@/lib/notasEvolucion";
import {
  tiposProcedimientoNota,
  tipoProcedimientoNotaLabel,
  tipoProcedimientoNotaSugerido,
  type DetalleProcedimiento,
  type TipoProcedimientoNota,
} from "@/lib/procedimientoNotaPlantillas";

/** Sección 4 — "¿Qué hiciste hoy?" (Fase 3): un picker por tipo de
 * procedimiento, cada uno con su propia plantilla de revelado progresivo.
 * Ningún tipo se autoselecciona ni pre-confirma un valor clínico al abrirse
 * — solo el profesional decide qué tipo es y confirma cada dato (ver
 * procedimientoNotaPlantillas.ts). Cambiar de tipo una vez elegido exige
 * "Quitar procedimiento" primero — no hay conversión entre plantillas. */
function crearDetalleInicial(
  tipo: TipoProcedimientoNota,
  nombre: string | undefined,
  organosPorDefecto: number[]
): DetalleProcedimiento {
  const base = {
    procedimientoNombre: nombre ?? "",
    actividadRealizada: nombre ?? "",
    organosDentales: organosPorDefecto,
  };
  switch (tipo) {
    case "endodoncia":
      return { ...base, tipo };
    case "extraccion":
      return { ...base, tipo };
    case "resina":
      return { ...base, tipo };
    case "limpieza":
      return { ...base, tipo };
    case "control_ortodoncia":
      return { ...base, tipo };
    case "odontopediatria":
      return { ...base, tipo };
    case "valoracion":
    case "protesis":
    case "cirugia":
    case "urgencia":
    case "otro":
      return { ...base, tipo };
  }
}

export default function SeccionProcedimiento({
  detalle,
  justificacionSinProcedimiento,
  tratamientosSugeridos,
  organosPorDefecto,
  onChange,
  onBlurTexto,
}: {
  detalle: DetalleProcedimiento | undefined;
  justificacionSinProcedimiento: string | undefined;
  tratamientosSugeridos: string[];
  organosPorDefecto: number[];
  onChange: (updater: (prev: NotaEvolucionV2) => NotaEvolucionV2, opts?: { inmediato?: boolean }) => void;
  onBlurTexto?: () => void;
}) {
  const { procedimientos } = usePatientData();

  // Iniciar/quitar un procedimiento es una decisión estructural (§7.2.1) —
  // se persiste de inmediato.
  function iniciar(tipo: TipoProcedimientoNota, nombre?: string) {
    onChange(
      (prev) => ({
        ...prev,
        justificacionSinProcedimiento: undefined,
        detalleProcedimiento: crearDetalleInicial(tipo, nombre, organosPorDefecto),
      }),
      { inmediato: true }
    );
  }

  function marcarSinProcedimiento() {
    onChange((prev) => ({ ...prev, detalleProcedimiento: undefined, justificacionSinProcedimiento: prev.justificacionSinProcedimiento ?? "" }), { inmediato: true });
  }

  if (!detalle) {
    // Sugerencia visual únicamente — nunca se autoconfirma ni bloquea elegir
    // otro tipo (ver comentario de tipoProcedimientoNotaSugerido).
    const tipoSugerido = tratamientosSugeridos
      .map((t) => tipoProcedimientoNotaSugerido(t, procedimientos))
      .find((t): t is TipoProcedimientoNota => t !== undefined);

    return (
      <div className="space-y-4">
        {tratamientosSugeridos.length > 0 && (
          <div>
            <label className={labelClass}>Tratamiento agendado — reutilizar (puedes modificarlo después)</label>
            <div className="flex flex-wrap gap-2">
              {tratamientosSugeridos.map((t) => (
                <Chip key={t} seleccionado={false} onClick={() => iniciar(tipoProcedimientoNotaSugerido(t, procedimientos) ?? "otro", t)}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className={labelClass}>O elige el tipo de procedimiento directamente</label>
          <div className="flex flex-wrap gap-2">
            {tiposProcedimientoNota.map((tipo) => (
              <Chip key={tipo} seleccionado={tipo === tipoSugerido} onClick={() => iniciar(tipo)}>
                {tipoProcedimientoNotaLabel[tipo]}
                {tipo === tipoSugerido && " · Sugerido"}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <label className={labelClass}>O explica por qué no se realizó ningún procedimiento hoy</label>
          <input
            className={inputClass}
            value={justificacionSinProcedimiento ?? ""}
            onChange={(e) => onChange((prev) => ({ ...prev, justificacionSinProcedimiento: e.target.value }))}
            placeholder="Ej. Solo valoración, sin tratamiento en esta cita"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {(() => {
        switch (detalle.tipo) {
          case "endodoncia":
            return <DetalleEndodonciaForm detalle={detalle} onChange={onChange} onBlurTexto={onBlurTexto} />;
          case "extraccion":
            return <DetalleExtraccionForm detalle={detalle} onChange={onChange} onBlurTexto={onBlurTexto} />;
          case "resina":
            return <DetalleRestauracionForm detalle={detalle} onChange={onChange} onBlurTexto={onBlurTexto} />;
          case "limpieza":
            return <DetalleLimpiezaForm detalle={detalle} onChange={onChange} onBlurTexto={onBlurTexto} />;
          case "control_ortodoncia":
            return <DetalleControlOrtodonciaForm detalle={detalle} onChange={onChange} onBlurTexto={onBlurTexto} />;
          case "odontopediatria":
            return <DetalleOdontopediatriaForm detalle={detalle} onChange={onChange} onBlurTexto={onBlurTexto} />;
          default:
            return <DetalleGenericoPlantillaForm detalle={detalle} onChange={onChange} onBlurTexto={onBlurTexto} />;
        }
      })()}

      <button type="button" onClick={marcarSinProcedimiento} className={`${botonSecundario} block`}>
        Quitar procedimiento — no se realizó ninguno
      </button>
    </div>
  );
}
