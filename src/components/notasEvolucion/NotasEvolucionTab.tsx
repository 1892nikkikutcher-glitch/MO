"use client";

/** Punto de entrada de la pestaña "Notas de Evolución y Seguimiento" —
 * decide entre mostrar el historial (con el botón "Registrar atención de
 * hoy") o el formulario guiado activo. Reemplaza el montaje directo del
 * componente PSOAP legado (NotasEvolucion.tsx), que ahora solo vive como
 * renderer de tarjeta v1 dentro de HistorialNotas.tsx. */

import { useState } from "react";
import RegistrarAtencionHoy from "./RegistrarAtencionHoy";
import HistorialNotas from "./HistorialNotas";
import { botonPrimario } from "./NotaUI";

export default function NotasEvolucionTab({ patientId, citaId }: { patientId: string; citaId?: string }) {
  const [registrando, setRegistrando] = useState(!!citaId);

  if (registrando) {
    return (
      <RegistrarAtencionHoy
        patientId={patientId}
        citaId={citaId}
        onFirmada={() => setRegistrando(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setRegistrando(true)} className={botonPrimario}>
        + Registrar atención de hoy
      </button>
      <HistorialNotas patientId={patientId} onContinuarBorrador={() => setRegistrando(true)} />
    </div>
  );
}
