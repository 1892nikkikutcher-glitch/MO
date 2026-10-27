"use client";

/** Facturación: la sección está apartada en el menú pero todavía se está construyendo. Mientras tanto, un pago ya se puede
 * marcar como "Activo para facturar" al cobrarlo, para tenerlo identificado cuando esta sección esté lista. */
export default function Facturacion() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-accent/40 bg-surface px-6 py-14 text-center">
        <span className="rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-warning">En construcción</span>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2ZM14 2v6h6M8.5 15l2.2 2.2L15.5 12"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div>
          <p className="text-lg font-semibold text-ink">Facturación</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink/70">
            Estamos construyendo esta sección. Todavía no se pueden emitir facturas desde MO; el resto de la plataforma sigue funcionando con normalidad.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Lo que estamos preparando</h3>
        <ul className="mt-3 space-y-2 text-sm text-ink/80">
          <li>• Datos fiscales de cada paciente, guardados en su expediente.</li>
          <li>• Facturar un pago directo desde el cobro, sin volver a capturar nada.</li>
          <li>• Lista de pagos pendientes de facturar y de facturas emitidas.</li>
          <li>• Enviar la factura al paciente por correo o WhatsApp.</li>
        </ul>
        <p className="mt-4 rounded-lg border border-edge/10 bg-inset px-3 py-2 text-xs text-ink/70">
          Mientras tanto, al registrar un pago puedes marcar <span className="font-semibold">«Activo para facturar»</span>: así queda identificado el pago que el paciente va a necesitar facturado.
        </p>
      </div>
    </div>
  );
}
