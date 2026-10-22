"use client";

/** Página pública para descargar un recibo de pago: la abre el paciente desde la liga que le mandó la clínica por
 * WhatsApp. No pide cuenta. El PDF se dibuja aquí mismo, en el navegador, con los datos del recibo. */

import { use, useEffect, useState } from "react";
import { generarReciboPagoPdf } from "@/lib/generarReciboPagoPdf";
import { slugify } from "@/lib/textoNombre";
import type { ReciboPublico } from "@/lib/recibosCompartidos";
import type { Pago } from "@/lib/patientData";

const dinero = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Estado =
  | { tipo: "cargando" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "listo"; recibo: ReciboPublico; url: string; blob: Blob; nombre: string };

export default function ReciboPublicoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [estado, setEstado] = useState<Estado>({ tipo: "cargando" });

  useEffect(() => {
    let urlCreada: string | null = null;
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch(`/api/recibos/${token}`, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "No se pudo abrir el recibo.");
        const recibo = data as ReciboPublico;
        const pago: Pago = {
          id: recibo.pago.id,
          fecha: recibo.pago.fecha,
          medico: recibo.pago.medico,
          formaPago: recibo.pago.formaPago,
          total: recibo.pago.total,
          facturar: recibo.pago.facturar,
          firma: recibo.pago.firma,
          lineas: recibo.pago.lineas.map((l) => ({ id: l.id, tratamientoId: l.tratamientoId ?? null, folio: l.folio ?? null, label: l.label, monto: l.monto })),
        };
        const blob = await generarReciboPagoPdf({
          pago,
          pacienteNombre: recibo.pacienteNombre,
          clinicaNombre: recibo.clinicaNombre,
          perfilDoctor: { logoClinicaUrl: recibo.logoClinicaUrl, direccionClinica: recibo.direccionClinica },
          notaPie: recibo.notaPie,
        });
        if (cancelado) return;
        urlCreada = URL.createObjectURL(blob);
        setEstado({ tipo: "listo", recibo, url: urlCreada, blob, nombre: `Recibo_${slugify(recibo.pacienteNombre)}_${slugify(recibo.pago.fecha)}.pdf` });
      } catch (err) {
        if (!cancelado) setEstado({ tipo: "error", mensaje: err instanceof Error ? err.message : "No se pudo abrir el recibo." });
      }
    })();
    return () => {
      cancelado = true;
      if (urlCreada) URL.revokeObjectURL(urlCreada);
    };
  }, [token]);

  const descargar = () => {
    if (estado.tipo !== "listo") return;
    const a = document.createElement("a");
    a.href = estado.url;
    a.download = estado.nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-app px-4 py-10 text-ink">
      <div className="w-full max-w-md rounded-2xl border border-edge/10 bg-surface p-6 shadow-[var(--shadow-card)]">
        {estado.tipo === "cargando" && <p className="text-center text-sm text-ink/70">Preparando tu recibo…</p>}

        {estado.tipo === "error" && (
          <div className="text-center">
            <p className="text-base font-semibold text-ink">No pudimos abrir el recibo</p>
            <p className="mt-2 text-sm text-ink/70">{estado.mensaje}</p>
          </div>
        )}

        {estado.tipo === "listo" && (
          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/60">{estado.recibo.clinicaNombre || "Recibo de pago"}</p>
              <h1 className="mt-1 text-2xl font-semibold text-ink">Tu recibo de pago</h1>
              <p className="mt-1 text-sm text-ink/70">
                {estado.recibo.pacienteNombre} · {estado.recibo.pago.fecha}
              </p>
            </div>

            <ul className="divide-y divide-edge/10 rounded-xl border border-edge/10 bg-inset">
              {estado.recibo.pago.lineas.map((l) => (
                <li key={l.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="text-ink/80">{l.label}</span>
                  <span className="shrink-0 font-medium tabular-nums text-ink">{dinero(l.monto)}</span>
                </li>
              ))}
              <li className="flex items-center justify-between px-4 py-3 text-sm font-semibold">
                <span>Total pagado</span>
                <span className="text-lg tabular-nums text-success">{dinero(estado.recibo.pago.total)}</span>
              </li>
            </ul>
            <p className="text-xs text-ink/60">Forma de pago: {estado.recibo.pago.formaPago}</p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                onClick={descargar}
                className="rounded-lg border border-accent/60 bg-accent/15 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent/25"
              >
                Descargar recibo (PDF)
              </button>
              <a
                href={estado.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-edge/30 bg-field py-3 text-center text-sm font-semibold text-ink/90 transition-colors hover:bg-surface2"
              >
                Ver / imprimir
              </a>
            </div>
            <p className="text-center text-[11px] text-ink/50">Este enlace es personal: no lo compartas con otras personas.</p>
          </div>
        )}
      </div>
    </main>
  );
}
