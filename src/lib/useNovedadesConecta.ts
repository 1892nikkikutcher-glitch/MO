"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useCalendariosCompartidos } from "./useCalendariosCompartidos";
import { novedadesConecta, type Novedad } from "./novedadesConecta";
import type { Interconsulta } from "./moConecta";

/** Novedades para quien envía casos y comparte calendarios (ver novedadesConecta.ts).
 * "Visto hasta" se guarda en la cuenta (users/{uid}/preferenciasConecta/avisos), así
 * marcarlas como vistas en el celular las quita también en la computadora. La primera
 * vez arranca en "ahora": no se avisa de cosas que pasaron antes de estrenar esto. */
export function useNovedadesConecta(
  uid: string,
  casosEnviados: Interconsulta[],
  directorio: { uid: string; nombreCompleto: string }[]
): { novedades: Novedad[]; marcarVistas: () => void } {
  const { mios } = useCalendariosCompartidos(!!uid);
  const [vistoHasta, setVistoHasta] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, `users/${uid}/preferenciasConecta/avisos`);
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setVistoHasta((snap.data() as { vistoHasta?: string }).vistoHasta ?? new Date().toISOString());
        } else {
          const ahora = new Date().toISOString();
          setVistoHasta(ahora);
          void setDoc(ref, { vistoHasta: ahora }).catch((e) => console.error("No se pudo iniciar los avisos", e));
        }
      },
      (err) => {
        console.error("No se pudieron leer los avisos de MO Conecta", err);
        setVistoHasta(new Date().toISOString());
      }
    );
  }, [uid]);

  const novedades = useMemo(
    () =>
      vistoHasta
        ? novedadesConecta({
            casosEnviados,
            calendariosMios: mios,
            uid,
            vistoHasta,
            nombreDeColega: (u) => directorio.find((p) => p.uid === u)?.nombreCompleto ?? "Tu colega",
          })
        : [],
    [vistoHasta, casosEnviados, mios, uid, directorio]
  );

  const marcarVistas = useCallback(() => {
    const ahora = new Date().toISOString();
    setVistoHasta(ahora);
    if (uid) {
      void setDoc(doc(db, `users/${uid}/preferenciasConecta/avisos`), { vistoHasta: ahora }).catch((e) =>
        console.error("No se pudieron marcar como vistas", e)
      );
    }
  }, [uid]);

  return { novedades, marcarVistas };
}
