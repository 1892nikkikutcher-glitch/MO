"use client";

export type DashboardDetalleItem = {
  id: string;
  primary: string;
  secondary?: string;
  value?: string;
  onSelect?: () => void;
};

/** Panel genérico de detalle para las tarjetas clicables del Dashboard
 * Principal — mismo molde visual que `PresupuestosPendientesPanel.tsx` /
 * `LaboratoriosPendientesPanel.tsx`, pero reutilizable para cualquier
 * tarjeta con un simple listado (sin agrupar), para no crear un panel a
 * medida por cada una. */
export default function DashboardDetallePanel({
  title,
  items,
  emptyMessage,
  caveat,
  onClose,
}: {
  title: string;
  items: DashboardDetalleItem[];
  emptyMessage: string;
  caveat?: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">{title}</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>

        {caveat && (
          <p className="mb-4 rounded-lg border border-warning/20 bg-warning/10 p-3 text-xs text-warning">
            {caveat}
          </p>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-ink/40">{emptyMessage}</p>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const Wrapper = item.onSelect ? "button" : "div";
              return (
                <Wrapper
                  key={item.id}
                  onClick={item.onSelect}
                  className={`flex w-full items-center justify-between rounded-lg border border-edge/10 bg-surface px-3 py-2 text-left text-sm ${
                    item.onSelect ? "transition-colors hover:bg-surface2" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink">{item.primary}</div>
                    {item.secondary && <div className="truncate text-xs text-ink/40">{item.secondary}</div>}
                  </div>
                  {item.value && (
                    <div className="ml-3 shrink-0 text-sm font-semibold text-ink/70">{item.value}</div>
                  )}
                </Wrapper>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
