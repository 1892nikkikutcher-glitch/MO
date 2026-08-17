"use client";

import { useRef, useState } from "react";
import ConfirmarEliminar from "@/components/ConfirmarEliminar";

type Foto = {
  id: string;
  url: string;
  name: string;
};

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

function GalleryUploadCard({
  title,
  fotos,
  onAdd,
  onRemove,
}: {
  title: string;
  fotos: Foto[];
  onAdd: (files: FileList) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fotoAEliminar, setFotoAEliminar] = useState<Foto | null>(null);

  return (
    <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">{title}</h3>
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
        >
          <UploadIcon />
          Subir fotografía
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onAdd(e.target.files);
              e.target.value = "";
            }
          }}
        />
      </div>

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
            onRemove(fotoAEliminar.id);
            setFotoAEliminar(null);
          }}
        />
      )}
    </div>
  );
}

export default function Fotografias() {
  const [perfil, setPerfil] = useState<Foto | null>(null);
  const [extraorales, setExtraorales] = useState<Foto[]>([]);
  const [intraorales, setIntraorales] = useState<Foto[]>([]);
  const perfilInputRef = useRef<HTMLInputElement>(null);

  const filesToFotos = (files: FileList): Foto[] =>
    Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      url: URL.createObjectURL(file),
      name: file.name,
    }));

  const handlePerfilChange = (files: FileList) => {
    if (files.length === 0) return;
    const [foto] = filesToFotos(files);
    setPerfil(foto);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-ink/60">
          Foto de Perfil
        </h3>
        <div className="flex items-center gap-6">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-edge/10 bg-inset">
            {perfil ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={perfil.url} alt="Perfil del paciente" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-ink/30">Sin foto</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => perfilInputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10"
              >
                <UploadIcon />
                {perfil ? "Cambiar foto" : "Subir foto"}
              </button>
              {perfil && (
                <a
                  href={perfil.url}
                  download={perfil.name}
                  className="flex items-center gap-2 rounded-lg border border-edge/15 px-3 py-1.5 text-xs font-semibold text-ink/70 transition-colors hover:bg-surface"
                >
                  <DownloadIcon />
                  Descargar
                </a>
              )}
            </div>
            <input
              ref={perfilInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  handlePerfilChange(e.target.files);
                  e.target.value = "";
                }
              }}
            />
            <p className="text-xs text-ink/30">JPG o PNG. Se usará como identificación visual del expediente.</p>
          </div>
        </div>
      </div>

      <GalleryUploadCard
        title="Fotografías Extraorales"
        fotos={extraorales}
        onAdd={(files) => {
          const nuevasFotos = filesToFotos(files);
          setExtraorales((prev) => [...prev, ...nuevasFotos]);
        }}
        onRemove={(id) => setExtraorales((prev) => prev.filter((f) => f.id !== id))}
      />

      <GalleryUploadCard
        title="Fotografías Intraorales"
        fotos={intraorales}
        onAdd={(files) => {
          const nuevasFotos = filesToFotos(files);
          setIntraorales((prev) => [...prev, ...nuevasFotos]);
        }}
        onRemove={(id) => setIntraorales((prev) => prev.filter((f) => f.id !== id))}
      />
    </div>
  );
}
