"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatCurrency } from "@/lib/patientData";
import { generarDevolucionesPdf } from "@/lib/generarDevolucionesPdf";
import { descargarBlob } from "@/lib/pdfDocumento";

const tipoEventoLabel: Record<string, string> = {
  devolucion_completada: "Devolución completada",
  devolucion_cancelada: "Borrador cancelado",
  devolucion_corregida: "Corrección registrada",
  firma_recepcion_agregada: "Firma de recepción agregada",
  comprobante_generado: "Comprobante generado",
  devolucion_creada: "Devolución creada",
};

export default function ReporteDevoluciones() {
  const { devolucionesLog, colaboradoresActivos, clinicInfo, perfilDoctor, clinicUid, userEmail } = usePatientData();
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [errorPdf, setErrorPdf] = useState("");

  const ordenados = [...devolucionesLog].sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
  const totalDevuelto = devolucionesLog
    .filter((e) => e.tipo === "devolucion_completada")
    .reduce((s, e) => s + (e.monto ?? 0), 0);

  const nombreDeUid = (u: string) => (u === clinicUid ? userEmail || "Tú" : colaboradoresActivos.find((c) => c.uid === u)?.nombre || colaboradoresActivos.find((c) => c.uid === u)?.correo || "");

  const descargarPdf = async () => {
    setGenerandoPdf(true);
    setErrorPdf("");
    try {
      const { blob, nombre } = await generarDevolucionesPdf({
        eventos: devolucionesLog,
        nombreDeUid,
        clinicaNombre: clinicInfo?.nombre || "",
        direccion: perfilDoctor.direccionClinica,
        logoUrl: perfilDoctor.logoClinicaUrl,
      });
      descargarBlob(blob, nombre);
    } catch {
      setErrorPdf("No se pudo generar el PDF. Intenta de nuevo.");
    } finally {
      setGenerandoPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Devoluciones</h3>
        <p className="mt-1 text-xs text-ink/40">
          Bitácora de auditoría de devoluciones de pago — cada movimiento queda registrado aquí, sin importar el
          expediente del paciente.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={descargarPdf}
            disabled={generandoPdf}
            title="Descargar la bitácora de devoluciones en PDF"
            className="rounded-lg border border-edge/30 bg-field px-3.5 py-2 text-sm font-semibold text-ink/90 transition-colors hover:bg-surface2 disabled:opacity-60"
          >
            {generandoPdf ? "Generando PDF…" : "Descargar PDF"}
          </button>
          {errorPdf && <span className="text-xs text-danger">{errorPdf}</span>}
        </div>
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-5">
        <div className="text-2xl font-bold text-danger">−{formatCurrency(totalDevuelto)}</div>
        <div className="mt-1 text-xs uppercase tracking-wide text-ink/40">Total devuelto (histórico)</div>
      </div>

      {ordenados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          No se ha registrado ninguna devolución.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                <th className="px-6 py-3 font-medium">Fecha</th>
                <th className="px-6 py-3 font-medium">Paciente</th>
                <th className="px-6 py-3 font-medium">Evento</th>
                <th className="px-6 py-3 text-right font-medium">Monto</th>
                <th className="px-6 py-3 font-medium">Motivo</th>
                <th className="px-6 py-3 font-medium">Registrado por</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((e) => (
                <tr key={e.id} className="border-b border-edge/5 last:border-0 align-top">
                  <td className="px-6 py-3 whitespace-nowrap text-ink/60">
                    {new Date(e.creadoEn).toLocaleString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-6 py-3 font-medium text-ink/80">{e.patientName || "—"}</td>
                  <td className="px-6 py-3 text-ink/70">{tipoEventoLabel[e.tipo] ?? e.tipo}</td>
                  <td className="px-6 py-3 text-right font-semibold text-danger">
                    {e.monto ? `−${formatCurrency(e.monto)}` : "—"}
                  </td>
                  <td className="px-6 py-3 text-ink/70">{e.motivo || "—"}</td>
                  <td className="px-6 py-3 text-ink/40">{e.uid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
