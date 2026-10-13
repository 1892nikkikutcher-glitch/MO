import { estadoCompartirDelCaso, etiquetaEstadoCompartir } from "@/lib/compartirExpedienteEstado";
import type { Interconsulta } from "@/lib/moConecta";

/** Línea chica para las listas de casos: si el expediente se comparte al día, es una foto fija o
 * se dejó de compartir. No muestra nada si nunca se compartió más que lo básico. */
export default function EtiquetaCompartirCaso({ caso }: { caso: Pick<Interconsulta, "compartirExpediente" | "expedienteCompartido"> }) {
  const e = estadoCompartirDelCaso(caso);
  if (e === "ninguno") return null;
  return (
    <p className={`truncate text-xs ${e === "vivo" ? "text-success" : "text-ink/40"}`}>
      {e === "vivo" && <span aria-hidden>● </span>}
      {etiquetaEstadoCompartir[e]}
    </p>
  );
}
