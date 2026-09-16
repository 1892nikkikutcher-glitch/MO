"use client";

/** Representación en QR de un folio de paciente (arquitectura MO Conecta
 * v3, Fase 5) — puramente presentacional, nunca decide nada de
 * autorización (eso lo sigue haciendo el backend de Fase 3, sin cambios).
 * Todavía sin conectar a ninguna pantalla real: no existe hoy ninguna
 * pantalla de "buscar por folio" en la que mostrarlo. */

import { QRCodeSVG } from "qrcode.react";
import { construirPayloadFolioQr } from "@/lib/folioQr";

export function QrFolio({ folio, tamano = 200 }: { folio: string; tamano?: number }) {
  let payload: string;
  try {
    payload = construirPayloadFolioQr(folio);
  } catch {
    return <p className="text-xs text-danger">No se pudo generar el código QR — folio con formato inválido.</p>;
  }

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <QRCodeSVG value={payload} size={tamano} bgColor="transparent" fgColor="currentColor" />
      <span className="font-mono text-xs tracking-wider text-ink/60">{payload}</span>
    </div>
  );
}
