"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import {
  limpiarTelefono,
  buildMensajeCentroRadiodiagnostico,
  type CentroRadiodiagnostico,
} from "@/lib/centroRadiodiagnostico";
import ConfirmarEliminar from "@/components/ConfirmarEliminar";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function CardShell({ title, subtitle, action, children }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-ink/40">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
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

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6h14Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AgregarCentroDialog({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: Omit<CentroRadiodiagnostico, "id">) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");

  const puedeGuardar = nombre.trim().length > 0 && telefono.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">Agregar Centro de Radiodiagnóstico</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Nombre</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Centro de Diagnóstico por Imagen"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Dirección</label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Calle, número, colonia"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Teléfono (WhatsApp)
            </label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej. 7221234567"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Notas (estudios que realiza, horario, etc.)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Ej. Panorámicas, tomografías 3D"
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-edge/15 px-4 py-2 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Cancelar
          </button>
          <button
            onClick={() =>
              puedeGuardar &&
              onAdd({
                nombre: nombre.trim(),
                direccion: direccion.trim(),
                telefono: telefono.trim(),
                notas: notas.trim(),
              })
            }
            disabled={!puedeGuardar}
            className="rounded-lg border border-accent/60 bg-accent/15 px-5 py-2 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CentroRadiodiagnosticoPage() {
  const {
    centrosRadiodiagnostico,
    setCentrosRadiodiagnostico,
    clinicInfo,
    perfilDoctor,
  } = usePatientData();

  const [showCentro, setShowCentro] = useState(false);
  const [centroAEliminar, setCentroAEliminar] = useState<CentroRadiodiagnostico | null>(null);

  const clinicaNombre = clinicInfo?.nombre || perfilDoctor.nombre || "";

  const enviarWhatsApp = (centro: CentroRadiodiagnostico) => {
    const texto = buildMensajeCentroRadiodiagnostico(clinicaNombre, centro);
    window.open(
      `https://wa.me/${limpiarTelefono(centro.telefono)}?text=${encodeURIComponent(texto)}`,
      "_blank"
    );
  };

  return (
    <div className="space-y-6">
      <CardShell
        title="Centros de Radiodiagnóstico"
        subtitle="Centros cercanos al consultorio a los que refieres estudios de imagen."
        action={
          <button
            onClick={() => setShowCentro(true)}
            className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
            style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
          >
            + Agregar Centro
          </button>
        }
      >
        {centrosRadiodiagnostico.length === 0 ? (
          <div className="rounded-xl border border-dashed border-edge/15 p-8 text-center text-sm text-ink/30">
            Aún no hay centros de radiodiagnóstico registrados.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {centrosRadiodiagnostico.map((c) => (
              <div key={c.id} className="rounded-xl border border-edge/10 bg-inset p-4">
                <p className="text-sm font-semibold text-ink">{c.nombre}</p>
                <p className="mt-1 text-xs text-ink/50">{c.direccion || "Sin dirección"}</p>
                <p className="text-xs text-ink/50">{c.telefono}</p>
                {c.notas && <p className="mt-2 text-xs text-ink/40">{c.notas}</p>}
                <div className="mt-3 flex items-center gap-2 border-t border-edge/10 pt-3">
                  <button
                    onClick={() => enviarWhatsApp(c)}
                    className="flex items-center gap-1.5 rounded-lg border border-success/30 px-2.5 py-1.5 text-xs font-semibold text-success/80 transition-colors hover:border-success hover:text-success"
                  >
                    <WhatsAppIcon />
                    Contactar
                  </button>
                  <button
                    onClick={() => setCentroAEliminar(c)}
                    title="Eliminar"
                    className="ml-auto flex h-7 w-7 items-center justify-center rounded-full border border-danger/20 text-danger/50 transition-colors hover:border-danger/60 hover:text-danger"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardShell>

      {showCentro && (
        <AgregarCentroDialog
          onClose={() => setShowCentro(false)}
          onAdd={(data) => {
            const nuevo: CentroRadiodiagnostico = { id: `r${Date.now()}`, ...data };
            setCentrosRadiodiagnostico((prev) => [nuevo, ...prev]);
            setShowCentro(false);
          }}
        />
      )}

      {centroAEliminar && (
        <ConfirmarEliminar
          titulo="¿Eliminar este centro de radiodiagnóstico?"
          mensaje={`Vas a eliminar "${centroAEliminar.nombre}" del catálogo. Esta acción no se puede deshacer.`}
          onCancel={() => setCentroAEliminar(null)}
          onConfirm={() => {
            setCentrosRadiodiagnostico((prev) => prev.filter((x) => x.id !== centroAEliminar.id));
            setCentroAEliminar(null);
          }}
        />
      )}
    </div>
  );
}
