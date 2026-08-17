"use client";

import { useRef, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import {
  categoriaLaminaOptions,
  redimensionarImagen,
  buildLaminaTexto,
  type Lamina,
} from "@/lib/laminas";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function UploadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 16V4M12 4 7 9M12 4l5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"
        stroke="currentColor"
        strokeWidth="1.8"
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

function LaminaDialog({
  lamina,
  onClose,
  onSave,
}: {
  lamina: Lamina | null;
  onClose: () => void;
  onSave: (data: Omit<Lamina, "id" | "creadoEn">) => void;
}) {
  const [titulo, setTitulo] = useState(lamina?.titulo ?? "");
  const [categoria, setCategoria] = useState(lamina?.categoria ?? categoriaLaminaOptions[0]);
  const [contenido, setContenido] = useState(lamina?.contenido ?? "");
  const [imagenUrl, setImagenUrl] = useState(lamina?.imagenUrl ?? "");
  const [procesandoImagen, setProcesandoImagen] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const puedeGuardar = titulo.trim().length > 0 && contenido.trim().length > 0;

  const manejarImagen = async (file: File) => {
    setError("");
    setProcesandoImagen(true);
    try {
      const dataUrl = await redimensionarImagen(file);
      setImagenUrl(dataUrl);
    } catch {
      setError("No se pudo procesar la imagen. Intenta con otro archivo.");
    } finally {
      setProcesandoImagen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">
            {lamina ? "Editar Lámina" : "Nueva Lámina"}
          </h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Cómo cepillarte correctamente"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Categoría</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className={inputClass}
            >
              {categoriaLaminaOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">
              Contenido / Indicaciones
            </label>
            <textarea
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              rows={6}
              placeholder="Escribe aquí la información que quieres compartir con tus pacientes..."
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Imagen (opcional)</label>
            {imagenUrl && (
              <div className="mb-2 overflow-hidden rounded-lg border border-edge/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagenUrl} alt={titulo} className="max-h-48 w-full object-cover" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={procesandoImagen}
                className="flex items-center gap-2 rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-40"
              >
                <UploadIcon />
                {procesandoImagen ? "Procesando..." : imagenUrl ? "Cambiar imagen" : "Subir imagen"}
              </button>
              {imagenUrl && (
                <button
                  type="button"
                  onClick={() => setImagenUrl("")}
                  className="text-xs font-medium text-danger/70 hover:text-danger"
                >
                  Quitar
                </button>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  manejarImagen(e.target.files[0]);
                  e.target.value = "";
                }
              }}
            />
            {error && <p className="mt-1 text-xs text-danger">{error}</p>}
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
              onSave({ titulo: titulo.trim(), categoria, contenido: contenido.trim(), imagenUrl })
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

export default function Educacion() {
  const { laminas, setLaminas } = usePatientData();
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [editando, setEditando] = useState<Lamina | null>(null);

  const guardarLamina = (data: Omit<Lamina, "id" | "creadoEn">) => {
    if (editando) {
      setLaminas((prev) => prev.map((l) => (l.id === editando.id ? { ...l, ...data } : l)));
    } else {
      const nueva: Lamina = { id: `l${Date.now()}`, creadoEn: new Date().toISOString(), ...data };
      setLaminas((prev) => [nueva, ...prev]);
    }
    setDialogAbierto(false);
    setEditando(null);
  };

  const enviarPorWhatsApp = (lamina: Lamina) => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(buildLaminaTexto(lamina))}`,
      "_blank"
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            Láminas de Atención Odontológica
          </h3>
          <p className="mt-1 text-xs text-ink/40">
            Material informativo para reforzar indicaciones y enviarlo a tus pacientes.
          </p>
        </div>
        <button
          onClick={() => {
            setEditando(null);
            setDialogAbierto(true);
          }}
          className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
          style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
        >
          + Nueva Lámina
        </button>
      </div>

      {laminas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          Aún no hay láminas creadas. Agrega la primera con el botón &quot;+ Nueva Lámina&quot;.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {laminas.map((lamina) => (
            <div
              key={lamina.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-edge/10 bg-surface"
            >
              {lamina.imagenUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lamina.imagenUrl} alt={lamina.titulo} className="h-36 w-full object-cover" />
              ) : (
                <div className="flex h-36 w-full items-center justify-center bg-inset text-ink/20">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M22 10 12 5 2 10l10 5 10-5ZM6 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
              <div className="flex flex-1 flex-col gap-2 p-4">
                <span className="w-fit rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                  {lamina.categoria}
                </span>
                <p className="text-sm font-semibold text-ink">{lamina.titulo}</p>
                <p className="line-clamp-3 flex-1 text-xs text-ink/50">{lamina.contenido}</p>
                <div className="mt-2 flex items-center gap-2 border-t border-edge/10 pt-3">
                  <button
                    onClick={() => enviarPorWhatsApp(lamina)}
                    title="Enviar por WhatsApp"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-success/30 text-success/70 transition-colors hover:border-success hover:text-success"
                  >
                    <WhatsAppIcon />
                  </button>
                  <button
                    onClick={() => {
                      setEditando(lamina);
                      setDialogAbierto(true);
                    }}
                    title="Editar"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-edge/15 text-ink/50 transition-colors hover:border-accent/50 hover:text-accent"
                  >
                    <PencilIcon />
                  </button>
                  <button
                    onClick={() => setLaminas((prev) => prev.filter((l) => l.id !== lamina.id))}
                    title="Eliminar"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-danger/20 text-danger/50 transition-colors hover:border-danger/60 hover:text-danger"
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {dialogAbierto && (
        <LaminaDialog
          lamina={editando}
          onClose={() => {
            setDialogAbierto(false);
            setEditando(null);
          }}
          onSave={guardarLamina}
        />
      )}
    </div>
  );
}
