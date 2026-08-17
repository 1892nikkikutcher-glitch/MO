"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { promocionVigente, type Promocion } from "@/lib/catalogosVarios";
import { calcularEdadDetallada } from "@/lib/patientData";
import { capitalizarNombre } from "@/lib/textoNombre";
import ConfirmarEliminar from "@/components/ConfirmarEliminar";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

function hoyISO() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

function promocionVacia(): Omit<Promocion, "id"> {
  return { nombre: "", descripcion: "", descuento: "", vigenciaInicio: "", vigenciaFin: "", activa: true };
}

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 21l1.4-4.2A8.5 8.5 0 1 1 8.3 20.5L3 21ZM8.5 8.3c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .5.3.2.4.6 1.4.7 1.5.1.1.1.3 0 .4-.1.2-.2.3-.3.4-.2.2-.3.3-.1.6.7 1.1 1.4 1.7 2.5 2.3.2.1.3.1.4-.1.2-.2.5-.6.7-.8.1-.2.3-.2.5-.1.5.2 1.3.6 1.5.7.2.1.3.1.4.3.1.2.1.9-.2 1.4-.3.5-1.1.9-1.6 1-.5 0-1.1.1-3.4-.9-2.4-1.1-3.9-3.5-4.1-3.7-.1-.2-1-1.3-1-2.5s.6-1.7.8-2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CardShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-6">
      <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-ink/60">{title}</h2>
      {children}
    </div>
  );
}

function PromocionDialog({
  inicial,
  onClose,
  onGuardar,
}: {
  inicial: Promocion | null;
  onClose: () => void;
  onGuardar: (data: Omit<Promocion, "id">) => void;
}) {
  const [form, setForm] = useState<Omit<Promocion, "id">>(inicial ?? promocionVacia());
  const puedeGuardar = form.nombre.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">{inicial ? "Editar Promoción" : "Nueva Promoción"}</h3>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink">
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Ej. Limpieza + revisión gratis"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
              rows={3}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Descuento</label>
            <input
              type="text"
              value={form.descuento}
              onChange={(e) => setForm((p) => ({ ...p, descuento: e.target.value }))}
              placeholder="Ej. 20% o $200"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Vigencia desde</label>
              <input
                type="date"
                value={form.vigenciaInicio}
                onChange={(e) => setForm((p) => ({ ...p, vigenciaInicio: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Vigencia hasta</label>
              <input
                type="date"
                value={form.vigenciaFin}
                onChange={(e) => setForm((p) => ({ ...p, vigenciaFin: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink/70">
            <input
              type="checkbox"
              checked={form.activa}
              onChange={(e) => setForm((p) => ({ ...p, activa: e.target.checked }))}
            />
            Promoción activa
          </label>
        </div>
        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface">
            Cancelar
          </button>
          <button
            onClick={() => puedeGuardar && onGuardar({ ...form, nombre: form.nombre.trim() })}
            disabled={!puedeGuardar}
            className="flex-1 rounded-lg border border-accent/60 bg-accent/15 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Marketing() {
  const { promociones, setPromociones, patients, irAExpediente } = usePatientData();
  const [editando, setEditando] = useState<Promocion | "nuevo" | null>(null);
  const [promocionAEliminar, setPromocionAEliminar] = useState<Promocion | null>(null);
  const hoy = new Date();
  const hoyIso = hoyISO();

  const guardar = (data: Omit<Promocion, "id">) => {
    if (editando && editando !== "nuevo") {
      setPromociones((prev) => prev.map((p) => (p.id === editando.id ? { ...p, ...data } : p)));
    } else {
      const nueva: Promocion = { id: `promo${Date.now()}`, ...data };
      setPromociones((prev) => [nueva, ...prev]);
    }
    setEditando(null);
  };

  const cumpleanerosDelMes = patients
    .filter((p) => p.birthDate)
    .map((p) => {
      const nacimiento = new Date(`${p.birthDate}T00:00:00`);
      return { patient: p, nacimiento };
    })
    .filter(({ nacimiento }) => nacimiento.getMonth() === hoy.getMonth())
    .sort((a, b) => a.nacimiento.getDate() - b.nacimiento.getDate());

  const enviarSaludo = (nombre: string, telefono: string) => {
    const texto = encodeURIComponent(
      `¡Feliz cumpleaños, ${nombre.split(" ")[0]}! 🎉 De parte de todo el equipo te deseamos un excelente día. Tienes un regalo/promoción especial esperándote en tu próxima visita.`
    );
    const tel = telefono.replace(/\D/g, "");
    window.open(`https://wa.me/${tel}?text=${texto}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-ink/40">Ofertas y descuentos que puedes mencionar a tus pacientes.</p>
          <button
            onClick={() => setEditando("nuevo")}
            className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
            style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
          >
            + Nueva Promoción
          </button>
        </div>

        {promociones.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
            Aún no hay promociones creadas.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {promociones.map((p) => {
              const vigente = promocionVigente(p, hoyIso);
              return (
                <div key={p.id} className="rounded-2xl border border-edge/10 bg-surface p-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">{p.nombre}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                        vigente ? "bg-success/10 text-success" : "bg-ink/10 text-ink/40"
                      }`}
                    >
                      {vigente ? "Vigente" : "No vigente"}
                    </span>
                  </div>
                  {p.descuento && <p className="mt-1 text-lg font-bold text-accent">{p.descuento}</p>}
                  {p.descripcion && <p className="mt-1 text-xs text-ink/50">{p.descripcion}</p>}
                  {(p.vigenciaInicio || p.vigenciaFin) && (
                    <p className="mt-2 text-[11px] text-ink/40">
                      {p.vigenciaInicio || "…"} — {p.vigenciaFin || "…"}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2 border-t border-edge/10 pt-3">
                    <button onClick={() => setEditando(p)} className="rounded-lg border border-edge/15 px-2.5 py-1 text-xs text-ink/70 hover:bg-surface2">
                      Editar
                    </button>
                    <button
                      onClick={() => setPromocionAEliminar(p)}
                      className="rounded-lg border border-danger/30 px-2.5 py-1 text-xs text-danger hover:bg-danger/10"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {editando && (
          <PromocionDialog
            inicial={editando === "nuevo" ? null : editando}
            onClose={() => setEditando(null)}
            onGuardar={guardar}
          />
        )}
      </div>

      <CardShell title={`Cumpleaños de ${MESES[hoy.getMonth()]}`}>
        {cumpleanerosDelMes.length === 0 ? (
          <p className="text-sm text-ink/40">Ningún paciente cumple años este mes.</p>
        ) : (
          <div className="space-y-2">
            {cumpleanerosDelMes.map(({ patient, nacimiento }) => {
              const esHoy = nacimiento.getDate() === hoy.getDate();
              const yaPaso = nacimiento.getDate() <= hoy.getDate();
              const edad = calcularEdadDetallada(patient.birthDate);
              const edadQueCumple = edad ? (yaPaso ? edad.years : edad.years + 1) : null;
              return (
                <div
                  key={patient.id}
                  className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
                    esHoy ? "border-accent/40 bg-accent/10" : "border-edge/10"
                  }`}
                >
                  <div>
                    <button
                      onClick={() => irAExpediente(patient.id)}
                      title="Ver expediente"
                      className="font-medium text-ink underline decoration-ink/20 underline-offset-2 hover:text-accent hover:decoration-accent/50"
                    >
                      {capitalizarNombre(patient.name)}
                    </button>
                    <span className="ml-2 text-ink/40">
                      {nacimiento.getDate()} de {MESES[nacimiento.getMonth()]}
                      {edadQueCumple !== null && ` · cumple ${edadQueCumple} años`}
                      {esHoy && " · ¡Hoy!"}
                    </span>
                  </div>
                  {patient.phone && (
                    <button
                      onClick={() => enviarSaludo(capitalizarNombre(patient.name), patient.phone)}
                      title="Enviar felicitación por WhatsApp"
                      className="flex items-center gap-1.5 rounded-lg border border-success/40 px-2.5 py-1.5 text-xs font-semibold text-success transition-colors hover:bg-success/10"
                    >
                      <WhatsAppIcon />
                      Felicitar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardShell>

      {promocionAEliminar && (
        <ConfirmarEliminar
          titulo="¿Eliminar esta promoción?"
          mensaje={`Vas a eliminar "${promocionAEliminar.nombre}". Esta acción no se puede deshacer.`}
          onCancel={() => setPromocionAEliminar(null)}
          onConfirm={() => {
            setPromociones((prev) => prev.filter((x) => x.id !== promocionAEliminar.id));
            setPromocionAEliminar(null);
          }}
        />
      )}
    </div>
  );
}
