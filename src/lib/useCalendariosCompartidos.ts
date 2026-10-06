"use client";

import { useCallback, useEffect, useState } from "react";
import { listarCalendariosApi } from "./conectaApi";
import type { CalendarioCompartidoDoc } from "./calendarioOcupacion";

/** Calendarios que comparto y los que comparten conmigo. Se vuelve a leer cada
 * minuto y con `refrescar()` (después de compartir o dejar de compartir). */
export function useCalendariosCompartidos(activo = true) {
  const [datos, setDatos] = useState<{ mios: CalendarioCompartidoDoc[]; conmigo: CalendarioCompartidoDoc[] }>({
    mios: [],
    conmigo: [],
  });
  const [cargando, setCargando] = useState(true);

  const refrescar = useCallback(async () => {
    try {
      setDatos(await listarCalendariosApi());
    } catch (err) {
      console.error("No se pudieron leer los calendarios compartidos", err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (!activo) return;
    void refrescar();
    const t = setInterval(() => void refrescar(), 60_000);
    return () => clearInterval(t);
  }, [activo, refrescar]);

  return { ...datos, cargando, refrescar };
}
