import { useId } from "react";
import {
  calificacionDePaciente,
  calificacionManualValida,
  detalleCalificacion,
  estrellasVisibles,
  type CitaParaCalificar,
} from "@/lib/calificacionPaciente";

const ESTRELLA = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.4 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8L12 2.5Z";

/** Cinco estrellas junto al nombre del paciente: empiezan llenas y se van vaciando (de media en media)
 * conforme falta, cancela fuera de tiempo o mueve sus citas. Sin historial de citas se ven las 5 llenas
 * (o no se muestran, con `ocultarSinHistorial`, para listas largas donde sería ruido).
 *
 * El doctor puede ponerlas a mano (`manual`): entonces mandan sobre las de las citas. Con `onCambiar` las
 * estrellas se vuelven editables — cada mitad de estrella es un toque (media estrella o estrella completa);
 * tocar la calificación ya puesta la quita, y "Auto" regresa a la que sale de las citas. */
export default function EstrellasPaciente({
  citas,
  className = "",
  tamano = 18,
  ocultarSinHistorial = false,
  manual,
  onCambiar,
}: {
  citas: CitaParaCalificar[];
  className?: string;
  /** Alto y ancho de cada estrella, en px. */
  tamano?: number;
  ocultarSinHistorial?: boolean;
  /** Calificación puesta a mano (0 a 5); ausente = la automática. */
  manual?: number | null;
  /** Si viene, las estrellas se pueden cambiar; recibe el valor nuevo o `null` para volver a la automática. */
  onCambiar?: (valor: number | null) => void;
}) {
  const idBase = useId().replace(/:/g, "");
  const cal = calificacionDePaciente(citas);
  const manualValida = calificacionManualValida(manual);
  const editable = Boolean(onCambiar);
  if (ocultarSinHistorial && !cal.tieneHistorial && manualValida === undefined) return null;
  const estrellas = estrellasVisibles(cal, manualValida);
  const detalle = detalleCalificacion(cal);
  const etiqueta =
    manualValida !== undefined
      ? `Calificación puesta por ti: ${manualValida} de 5${cal.tieneHistorial ? ` (por sus citas sería ${cal.estrellas}: ${detalle})` : ""}`
      : cal.tieneHistorial
        ? `Calificación de asistencia: ${cal.estrellas} de 5 — ${detalle}`
        : detalle;

  const elegir = (valor: number) => onCambiar?.(valor === manualValida ? null : valor);

  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 ${className}`}>
      <span
        className="inline-flex items-center gap-0.5"
        title={editable ? `${etiqueta}. Toca una estrella para cambiarla.` : etiqueta}
        {...(editable ? { role: "group", "aria-label": `Calificación del paciente: ${etiqueta}` } : { role: "img", "aria-label": etiqueta })}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          // Cuánto de esta estrella está llena: 1, 0.5 o 0.
          const llena = Math.max(0, Math.min(1, estrellas - i));
          const media = llena > 0 && llena < 1;
          return (
            <span key={i} className="relative inline-flex" style={{ width: tamano, height: tamano }}>
              <svg width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden>
                {media && (
                  <defs>
                    <clipPath id={`${idBase}-${i}`}>
                      <rect x="0" y="0" width={24 * llena} height="24" />
                    </clipPath>
                  </defs>
                )}
                <path d={ESTRELLA} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" className="text-ink/30" />
                {llena > 0 && (
                  <path
                    d={ESTRELLA}
                    fill="currentColor"
                    {...(media ? { clipPath: `url(#${idBase}-${i})` } : {})}
                    className="text-accent"
                  />
                )}
              </svg>
              {editable && (
                <>
                  <button
                    type="button"
                    onClick={() => elegir(i + 0.5)}
                    aria-label={`${i + 0.5} estrellas`}
                    className="absolute inset-y-0 left-0 w-1/2 cursor-pointer rounded-l focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
                  />
                  <button
                    type="button"
                    onClick={() => elegir(i + 1)}
                    aria-label={`${i + 1} ${i === 0 ? "estrella" : "estrellas"}`}
                    className="absolute inset-y-0 right-0 w-1/2 cursor-pointer rounded-r focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
                  />
                </>
              )}
            </span>
          );
        })}
      </span>
      {editable && manualValida !== undefined && (
        <button
          type="button"
          onClick={() => onCambiar?.(null)}
          title="Volver a la calificación que sale de sus citas"
          className="rounded border border-edge/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink/50 transition-colors hover:border-accent/50 hover:text-accent"
        >
          Auto
        </button>
      )}
    </span>
  );
}
