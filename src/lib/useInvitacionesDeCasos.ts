"use client";

import { useEffect, useState } from "react";
import { invitacionesDeCasosApi } from "./conectaApi";
import type { ResumenInvitacionDeCaso } from "./colegaDelCaso";

/** A quién se invitó en cada uno de estos casos (solo invitaciones propias).
 * Se le pasan los ids de los casos enviados que todavía no tienen colega
 * (destinatarioUid) — con lista vacía no hace ninguna llamada. */
export function useInvitacionesDeCasos(idsSinColega: string[]) {
  const clave = idsSinColega.join(",");
  const [invitaciones, setInvitaciones] = useState<Record<string, ResumenInvitacionDeCaso>>({});
  useEffect(() => {
    if (!clave) return;
    let cancelado = false;
    invitacionesDeCasosApi(clave.split(","))
      .then((r) => !cancelado && setInvitaciones(r))
      .catch((err) => console.error("No se pudo leer a quién se invitó", err));
    return () => {
      cancelado = true;
    };
  }, [clave]);
  return invitaciones;
}
