"use client";

import { useCallback, useEffect, useState } from "react";
import {
  LADO_NAVEGACION_INICIAL,
  claveLadoNavegacion,
  normalizarLadoNavegacion,
  type LadoNavegacion,
} from "./ladoNavegacion";

/** El lado elegido por este usuario para la barra lateral. Arranca en el de siempre (derecha) y
 * lee lo guardado al montar — así el servidor y el cliente pintan lo mismo al principio. Si el
 * almacenamiento no está disponible (modo privado, bloqueado) simplemente no se recuerda. */
export function useLadoNavegacion(uid: string) {
  const [lado, setLadoState] = useState<LadoNavegacion>(LADO_NAVEGACION_INICIAL);

  useEffect(() => {
    if (!uid) return;
    try {
      setLadoState(normalizarLadoNavegacion(window.localStorage.getItem(claveLadoNavegacion(uid))));
    } catch {
      /* sin almacenamiento: se queda el lado de siempre */
    }
  }, [uid]);

  const setLado = useCallback(
    (nuevo: LadoNavegacion) => {
      setLadoState(nuevo);
      if (!uid) return;
      try {
        window.localStorage.setItem(claveLadoNavegacion(uid), nuevo);
      } catch {
        /* no se pudo recordar; el cambio sigue valiendo en esta sesión */
      }
    },
    [uid]
  );

  return [lado, setLado] as const;
}
