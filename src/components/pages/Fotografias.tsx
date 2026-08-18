"use client";

import { useRef, useState } from "react";
import ConfirmarEliminar from "@/components/ConfirmarEliminar";
import { usePatientData } from "@/context/PatientDataContext";
import { fotosVacias, type FotoPaciente } from "@/lib/patientData";
import { subirFotoPaciente, borrarFotoPaciente } from "@/lib/fotosPaciente";

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

function DownloadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 4v12M12 16 7 11M12 16l5-5M4 20h16"
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

/** Tarjeta de una sola foto (Foto de Perfil, INE Frente, INE Reverso) —
 * comparten el mismo patrón: círculo/recuadro de vista previa + subir o
 * cambiar + descargar. */
function SingleUploadCard({
  label,
  ayuda,
  redonda,
  foto,
  onUpload,
  onRemove,
}: {
  label: string;
  ayuda: string;
  redonda?: boolean;
  foto: FotoPaciente | null | undefined;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);

  const handleFile = async (file: File) => {
    setSubiendo(true);
    setError("");
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="flex-1 space-y-2">
      {label && <p className="text-xs font-medium text-ink/60">{label}</p>}
      <div className="flex items-center gap-4">
        <div
          className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden border border-edge/10 bg-inset ${
            redonda ? "rounded-full" : "rounded-xl"
          }`}
        >
          {foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={foto.url} alt={label} className="h-full w-full object-cover" />
          ) : (
            <span className="px-2 text-center text-xs text-ink/30">Sin foto</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={subiendo}
              className="flex items-center gap-2 rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
            >
              <UploadIcon />
              {subiendo ? "Subiendo…" : foto ? "Cambiar" : "Subir foto"}
            </button>
            {foto && (
              <>
                <a
                  href={foto.url}
                  download={foto.name}
                  className="flex items-center gap-2 rounded-lg border border-edge/15 px-3 py-1.5 text-xs font-semibold text-ink/70 transition-colors hover:bg-surface"
                >
                  <DownloadIcon />
                  Descargar
                </a>
                <button
                  onClick={() => setConfirmarEliminar(true)}
                  className="flex items-center gap-2 rounded-lg border border-edge/15 px-3 py-1.5 text-xs font-semibold text-danger/80 transition-colors hover:bg-danger/10"
                >
                  <TrashIcon />
                  Quitar
                </button>
              </>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) handleFile(file);
            }}
          />
          <p className="text-xs text-ink/30">{ayuda}</p>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>
      </div>

      {confirmarEliminar && (
        <ConfirmarEliminar
          titulo={label ? `¿Quitar ${label.toLowerCase()}?` : "¿Quitar esta foto?"}
          mensaje="Esta acción no se puede deshacer."
          onCancel={() => setConfirmarEliminar(false)}
          onConfirm={() => {
            onRemove();
            setConfirmarEliminar(false);
          }}
        />
      )}
    </div>
  );
}

function GalleryUploadCard({
  title,
  fotos,
  onAdd,
  onRemove,
}: {
  title: string;
  fotos: FotoPaciente[];
  onAdd: (files: File[]) => Promise<void>;
  onRemove: (foto: FotoPaciente) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fotoAEliminar, setFotoAEliminar] = useState<FotoPaciente | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">{title}</h3>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={subiendo}
          className="flex items-center gap-2 rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
        >
          <UploadIcon />
          {subiendo ? "Subiendo…" : "Subir fotografía"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={async (e) => {
            // input.files es la misma FileList en vivo, no una copia: si se
            // guarda la referencia y luego se limpia e.target.value (para
            // poder volver a elegir el mismo archivo después), esa misma
            // FileList queda vacía y "files" también — hay que copiarla a un
            // arreglo de File antes de limpiar el input.
            const files = e.target.files ? Array.from(e.target.files) : [];
            e.target.value = "";
            if (files.length === 0) return;
            setSubiendo(true);
            setError("");
            try {
              await onAdd(files);
            } catch (err) {
              setError(err instanceof Error ? err.message : "No se pudieron subir las fotos.");
            } finally {
              setSubiendo(false);
            }
          }}
        />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}

      {fotos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-edge/15 p-8 text-center text-sm text-ink/30">
          Aún no hay fotografías cargadas
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {fotos.map((foto) => (
            <div
              key={foto.id}
              className="group relative aspect-square overflow-hidden rounded-xl border border-edge/10 bg-inset"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.url} alt={foto.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 flex items-end justify-end gap-1.5 bg-gradient-to-t from-black/70 via-transparent to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <a
                  href={foto.url}
                  download={foto.name}
                  title="Descargar"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-edge/20 bg-inset text-ink/80 transition-colors hover:border-accent/60 hover:text-accent"
                >
                  <DownloadIcon />
                </a>
                <button
                  onClick={() => setFotoAEliminar(foto)}
                  title="Eliminar"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-edge/20 bg-inset text-ink/80 transition-colors hover:border-danger/60 hover:text-danger"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {fotoAEliminar && (
        <ConfirmarEliminar
          titulo="¿Eliminar esta fotografía?"
          mensaje="Esta acción no se puede deshacer."
          onCancel={() => setFotoAEliminar(null)}
          onConfirm={() => {
            onRemove(fotoAEliminar);
            setFotoAEliminar(null);
          }}
        />
      )}
    </div>
  );
}

export default function Fotografias({ patientId }: { patientId: string }) {
  const { clinicUid, fotosPorPaciente, setFotosPaciente } = usePatientData();
  const fotos = fotosPorPaciente[patientId] ?? fotosVacias;

  const subirYGuardar = async (
    carpeta: string,
    file: File,
    guardar: (foto: FotoPaciente) => void,
    opciones?: { maxLado?: number }
  ) => {
    if (!clinicUid) throw new Error("No se pudo identificar la clínica.");
    const foto = await subirFotoPaciente(clinicUid, patientId, carpeta, file, opciones);
    guardar(foto);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink/60">Foto de Perfil</h3>
        <SingleUploadCard
          label=""
          redonda
          foto={fotos.perfil}
          ayuda="JPG o PNG. Se usará como identificación visual del expediente."
          onUpload={(file) =>
            subirYGuardar("perfil", file, (foto) =>
              setFotosPaciente(patientId, (prev) => ({ ...prev, perfil: foto }))
            , { maxLado: 600 })
          }
          onRemove={() => {
            if (fotos.perfil) borrarFotoPaciente(fotos.perfil);
            setFotosPaciente(patientId, (prev) => ({ ...prev, perfil: null }));
          }}
        />
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <div className="mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Identificación Oficial (INE)</h3>
          <p className="mt-1 text-xs text-ink/40">
            Documento de identidad del paciente, para el expediente — captura ambos lados si es posible.
          </p>
        </div>
        <div className="flex flex-col gap-6 sm:flex-row">
          <SingleUploadCard
            label="Frente"
            foto={fotos.ineFrente}
            ayuda="Foto clara del anverso de la INE."
            onUpload={(file) =>
              subirYGuardar("ine", file, (foto) =>
                setFotosPaciente(patientId, (prev) => ({ ...prev, ineFrente: foto }))
              )
            }
            onRemove={() => {
              if (fotos.ineFrente) borrarFotoPaciente(fotos.ineFrente);
              setFotosPaciente(patientId, (prev) => ({ ...prev, ineFrente: null }));
            }}
          />
          <SingleUploadCard
            label="Reverso"
            foto={fotos.ineReverso}
            ayuda="Foto clara del reverso de la INE."
            onUpload={(file) =>
              subirYGuardar("ine", file, (foto) =>
                setFotosPaciente(patientId, (prev) => ({ ...prev, ineReverso: foto }))
              )
            }
            onRemove={() => {
              if (fotos.ineReverso) borrarFotoPaciente(fotos.ineReverso);
              setFotosPaciente(patientId, (prev) => ({ ...prev, ineReverso: null }));
            }}
          />
        </div>
      </div>

      <GalleryUploadCard
        title="Fotografías Extraorales"
        fotos={fotos.extraorales}
        onAdd={async (files) => {
          const nuevas = await Promise.all(
            files.map((file) => subirFotoPaciente(clinicUid!, patientId, "extraorales", file))
          );
          setFotosPaciente(patientId, (prev) => ({ ...prev, extraorales: [...prev.extraorales, ...nuevas] }));
        }}
        onRemove={(foto) => {
          borrarFotoPaciente(foto);
          setFotosPaciente(patientId, (prev) => ({
            ...prev,
            extraorales: prev.extraorales.filter((f) => f.id !== foto.id),
          }));
        }}
      />

      <GalleryUploadCard
        title="Fotografías Intraorales"
        fotos={fotos.intraorales}
        onAdd={async (files) => {
          const nuevas = await Promise.all(
            files.map((file) => subirFotoPaciente(clinicUid!, patientId, "intraorales", file))
          );
          setFotosPaciente(patientId, (prev) => ({ ...prev, intraorales: [...prev.intraorales, ...nuevas] }));
        }}
        onRemove={(foto) => {
          borrarFotoPaciente(foto);
          setFotosPaciente(patientId, (prev) => ({
            ...prev,
            intraorales: prev.intraorales.filter((f) => f.id !== foto.id),
          }));
        }}
      />
    </div>
  );
}
