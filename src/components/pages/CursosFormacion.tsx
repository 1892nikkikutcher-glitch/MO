"use client";

import { useEffect, useRef, useState } from "react";
import ConfirmarEliminar from "@/components/ConfirmarEliminar";
import { redimensionarImagen } from "@/lib/laminas";
import {
  areasCurso,
  enlaceSeguro,
  modalidadesCurso,
  urlInscribirmeCurso,
  urlRecomendarCurso,
  type CursoEditable,
  type CursoPlataforma,
} from "@/lib/cursos";
import { crearCursoApi, editarCursoApi, eliminarCursoApi, listarCursosApi } from "@/lib/cursosApi";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

const CURSO_VACIO: CursoEditable = {
  nombre: "",
  institucion: "",
  area: areasCurso[0],
  modalidad: "Presencial",
  imparten: "",
  descripcion: "",
  contactoNombre: "",
  contactoTelefono: "",
  contactoCorreo: "",
  enlace: "",
  detalles: "",
  imagenUrl: "",
};

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink/60">{etiqueta}</label>
      {children}
    </div>
  );
}

function CursoDialog({
  curso,
  onClose,
  onSave,
}: {
  curso: CursoPlataforma | null;
  onClose: () => void;
  onSave: (data: CursoEditable) => Promise<void>;
}) {
  const [form, setForm] = useState<CursoEditable>(() => {
    if (!curso) return CURSO_VACIO;
    const { id: _id, creadoEn: _creadoEn, ...editable } = curso;
    void _id;
    void _creadoEn;
    return editable;
  });
  const [procesandoImagen, setProcesandoImagen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof CursoEditable>(campo: K, valor: CursoEditable[K]) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const puedeGuardar = form.nombre.trim().length > 0 && form.institucion.trim().length > 0 && !guardando;

  const manejarImagen = async (file: File) => {
    setError("");
    setProcesandoImagen(true);
    try {
      set("imagenUrl", await redimensionarImagen(file));
    } catch {
      setError("No se pudo procesar la imagen. Intenta con otro archivo.");
    } finally {
      setProcesandoImagen(false);
    }
  };

  const guardar = async () => {
    setError("");
    setGuardando(true);
    try {
      await onSave(form);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el curso.");
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-ink">{curso ? "Editar curso" : "Nuevo curso"}</h3>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <Campo etiqueta="Nombre del curso">
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              placeholder="Ej. Master Endodoncia México Brasil"
              className={inputClass}
            />
          </Campo>
          <Campo etiqueta="Escuela o instituto">
            <input
              type="text"
              value={form.institucion}
              onChange={(e) => set("institucion", e.target.value)}
              placeholder="Quién lo ofrece"
              className={inputClass}
            />
          </Campo>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo etiqueta="Área">
              <select value={form.area} onChange={(e) => set("area", e.target.value)} className={inputClass}>
                {!areasCurso.some((a) => a === form.area) && <option value={form.area}>{form.area}</option>}
                {areasCurso.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Modalidad">
              <select
                value={form.modalidad}
                onChange={(e) => set("modalidad", e.target.value as CursoEditable["modalidad"])}
                className={inputClass}
              >
                {modalidadesCurso.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <Campo etiqueta="Quién lo imparte">
            <input
              type="text"
              value={form.imparten}
              onChange={(e) => set("imparten", e.target.value)}
              placeholder="Ej. Dr. Jaffet B y Dra. Susy"
              className={inputClass}
            />
          </Campo>
          <Campo etiqueta="Descripción">
            <textarea
              value={form.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
              rows={4}
              placeholder="De qué trata, a quién va dirigido, qué incluye..."
              className={inputClass}
            />
          </Campo>
          <Campo etiqueta="Sede, fechas y costo (opcional)">
            <input
              type="text"
              value={form.detalles}
              onChange={(e) => set("detalles", e.target.value)}
              placeholder="Ej. Sede CDMX · inicia en marzo de 2027"
              className={inputClass}
            />
          </Campo>

          <div className="rounded-xl border border-edge/10 bg-surface p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/50">
              Contacto para inscripciones
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={form.contactoNombre}
                onChange={(e) => set("contactoNombre", e.target.value)}
                placeholder="Nombre de quien atiende"
                className={inputClass}
              />
              <input
                type="tel"
                value={form.contactoTelefono}
                onChange={(e) => set("contactoTelefono", e.target.value)}
                placeholder="WhatsApp, 10 dígitos"
                className={inputClass}
              />
              <input
                type="email"
                value={form.contactoCorreo}
                onChange={(e) => set("contactoCorreo", e.target.value)}
                placeholder="Correo (opcional)"
                className={inputClass}
              />
              <input
                type="text"
                value={form.enlace}
                onChange={(e) => set("enlace", e.target.value)}
                placeholder="Sitio web o página del curso (opcional)"
                className={inputClass}
              />
            </div>
          </div>

          <Campo etiqueta="Imagen o logo (opcional)">
            {form.imagenUrl && (
              <div className="mb-2 overflow-hidden rounded-lg border border-edge/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.imagenUrl} alt={form.nombre} className="max-h-48 w-full object-cover" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={procesandoImagen}
                className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/10 disabled:opacity-40"
              >
                {procesandoImagen ? "Procesando..." : form.imagenUrl ? "Cambiar imagen" : "Subir imagen"}
              </button>
              {form.imagenUrl && (
                <button
                  type="button"
                  onClick={() => set("imagenUrl", "")}
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
              className="sr-only"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  manejarImagen(e.target.files[0]);
                  e.target.value = "";
                }
              }}
            />
          </Campo>
          {error && <p className="text-xs text-danger">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-edge/15 px-4 py-2 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={!puedeGuardar}
            className="rounded-lg border border-accent/60 bg-accent/15 px-5 py-2 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:opacity-40"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

const botonAccion =
  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors";

export default function CursosFormacion({ esAdmin }: { esAdmin: boolean }) {
  const [cursos, setCursos] = useState<CursoPlataforma[] | null>(null);
  const [errorCarga, setErrorCarga] = useState("");
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [editando, setEditando] = useState<CursoPlataforma | null>(null);
  const [aEliminar, setAEliminar] = useState<CursoPlataforma | null>(null);
  const [errorAccion, setErrorAccion] = useState("");

  useEffect(() => {
    let vivo = true;
    listarCursosApi()
      .then((lista) => vivo && setCursos(lista))
      .catch(() => vivo && setErrorCarga("No se pudieron cargar los cursos. Revisa tu conexión e inténtalo de nuevo."));
    return () => {
      vivo = false;
    };
  }, []);

  const guardar = async (data: CursoEditable) => {
    if (editando) {
      const actualizado = await editarCursoApi(editando.id, data);
      setCursos((prev) => (prev ?? []).map((c) => (c.id === actualizado.id ? actualizado : c)));
    } else {
      const creado = await crearCursoApi(data);
      setCursos((prev) => [creado, ...(prev ?? [])]);
    }
    setDialogAbierto(false);
    setEditando(null);
  };

  const eliminar = async (curso: CursoPlataforma) => {
    setErrorAccion("");
    try {
      await eliminarCursoApi(curso.id);
      setCursos((prev) => (prev ?? []).filter((c) => c.id !== curso.id));
    } catch (e) {
      setErrorAccion(e instanceof Error ? e.message : "No se pudo eliminar el curso.");
    }
    setAEliminar(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
            Educación para el profesional de la salud
          </h3>
          <p className="mt-1 text-xs text-ink/40">
            Escuelas, cursos y posgrados de educación continua que MO recomienda. Inscríbete con el contacto de cada uno o recomiéndalo a un colega.
          </p>
        </div>
        {esAdmin && (
          <button
            onClick={() => {
              setEditando(null);
              setDialogAbierto(true);
            }}
            className="shrink-0 rounded-lg border border-accent/50 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
            style={{ boxShadow: "0 0 12px -2px rgb(var(--accent-rgb) / 0.5)" }}
          >
            + Nuevo curso
          </button>
        )}
      </div>

      {errorCarga && <p className="text-sm text-danger">{errorCarga}</p>}
      {errorAccion && <p className="text-sm text-danger">{errorAccion}</p>}

      {cursos === null && !errorCarga && <p className="text-sm text-ink/40">Cargando cursos...</p>}

      {cursos !== null && cursos.length === 0 && (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          {esAdmin
            ? "Aún no hay cursos. Agrega el primero con el botón \"+ Nuevo curso\"."
            : "Pronto verás aquí cursos y posgrados recomendados por MO."}
        </div>
      )}

      {cursos !== null && cursos.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cursos.map((curso) => {
            const inscripcion = urlInscribirmeCurso(curso);
            const sitio = enlaceSeguro(curso.enlace);
            return (
              <div
                key={curso.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-edge/10 bg-surface"
              >
                {curso.imagenUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={curso.imagenUrl} alt={curso.nombre} className="h-36 w-full object-cover" />
                )}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="w-fit rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                      {curso.area}
                    </span>
                    <span className="w-fit rounded-full bg-inset px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink/50">
                      {curso.modalidad}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-ink">{curso.nombre}</p>
                  <p className="text-xs font-medium text-ink/70">{curso.institucion}</p>
                  {curso.imparten && <p className="text-xs text-ink/50">Imparten: {curso.imparten}</p>}
                  {curso.descripcion && (
                    <p className="line-clamp-4 text-xs text-ink/50">{curso.descripcion}</p>
                  )}
                  {curso.detalles && <p className="text-xs text-ink/60">{curso.detalles}</p>}
                  {(curso.contactoNombre || curso.contactoTelefono || curso.contactoCorreo) && (
                    <p className="text-xs text-ink/50">
                      Inscripciones:{" "}
                      {[curso.contactoNombre, curso.contactoTelefono, curso.contactoCorreo]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-edge/10 pt-3">
                    {inscripcion && (
                      <a
                        href={inscripcion}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${botonAccion} border-success/40 text-success hover:bg-success/10`}
                      >
                        Quiero inscribirme
                      </a>
                    )}
                    <a
                      href={urlRecomendarCurso(curso)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${botonAccion} border-edge/15 text-ink/70 hover:border-accent/50 hover:text-accent`}
                    >
                      Recomendar por WhatsApp
                    </a>
                    {sitio && (
                      <a
                        href={sitio}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${botonAccion} border-edge/15 text-ink/70 hover:border-accent/50 hover:text-accent`}
                      >
                        Ver sitio
                      </a>
                    )}
                    {esAdmin && (
                      <>
                        <button
                          onClick={() => {
                            setEditando(curso);
                            setDialogAbierto(true);
                          }}
                          className={`${botonAccion} border-edge/15 text-ink/50 hover:border-accent/50 hover:text-accent`}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setAEliminar(curso)}
                          className={`${botonAccion} border-danger/20 text-danger/60 hover:border-danger/60 hover:text-danger`}
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dialogAbierto && (
        <CursoDialog
          curso={editando}
          onClose={() => {
            setDialogAbierto(false);
            setEditando(null);
          }}
          onSave={guardar}
        />
      )}

      {aEliminar && (
        <ConfirmarEliminar
          titulo="Eliminar curso"
          mensaje={
            <>
              Se quitará <strong>{aEliminar.nombre}</strong> del catálogo y dejará de aparecerle a todos los
              doctores. No se puede deshacer.
            </>
          }
          onCancel={() => setAEliminar(null)}
          onConfirm={() => eliminar(aEliminar)}
        />
      )}
    </div>
  );
}
