import { useId } from "react";
import { calificacionDePaciente, detalleCalificacion, type CitaParaCalificar } from "@/lib/calificacionPaciente";

const ESTRELLA = "M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.4 6.1 20.6l1.3-6.6L2.5 9.4l6.6-.8L12 2.5Z";

/** Cinco estrellas junto al nombre del paciente: empiezan llenas y se van vaciando (de media en media)
 * conforme falta, cancela fuera de tiempo o mueve sus citas. Sin historial de citas se ven las 5 llenas
 * (o no se muestran, con `ocultarSinHistorial`, para listas largas donde sería ruido). */
export default function EstrellasPaciente({
  citas,
  className = "",
  tamano = 18,
  ocultarSinHistorial = false,
}: {
  citas: CitaParaCalificar[];
  className?: string;
  /** Alto y ancho de cada estrella, en px. */
  tamano?: number;
  ocultarSinHistorial?: boolean;
}) {
  const idBase = useId().replace(/:/g, "");
  const cal = calificacionDePaciente(citas);
  if (ocultarSinHistorial && !cal.tieneHistorial) return null;
  const detalle = detalleCalificacion(cal);
  const etiqueta = cal.tieneHistorial ? `Calificación de asistencia: ${cal.estrellas} de 5 — ${detalle}` : detalle;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 ${className}`}
      title={etiqueta}
      role="img"
      aria-label={etiqueta}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        // Cuánto de esta estrella está llena: 1, 0.5 o 0.
        const llena = Math.max(0, Math.min(1, cal.estrellas - i));
        const media = llena > 0 && llena < 1;
        return (
          <svg key={i} width={tamano} height={tamano} viewBox="0 0 24 24" aria-hidden>
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
        );
      })}
    </span>
  );
}
