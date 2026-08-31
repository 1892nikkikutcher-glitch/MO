"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { manejarCambioNombre } from "@/lib/textoNombre";
import { escuelasOdontologiaComunes } from "@/lib/escuelasOdontologia";
import { archivoAImagenComprimida } from "@/lib/imagenLogo";
import FirmaCanvas from "@/components/FirmaCanvas";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink/60">{label}</label>
      {children}
    </div>
  );
}

function LogoField({
  label,
  ayuda,
  valor,
  onCambiar,
}: {
  label: string;
  ayuda: string;
  valor: string;
  onCambiar: (dataUri: string) => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  const handleArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSubiendo(true);
    setError("");
    try {
      const dataUri = await archivoAImagenComprimida(file);
      onCambiar(dataUri);
    } catch {
      setError("No se pudo cargar la imagen. Intenta con otro archivo.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div>
      <Field label={label}>
        <div className="flex items-center gap-3">
          {valor && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={valor}
              alt="Vista previa del logo"
              className="h-14 w-14 shrink-0 rounded-lg border border-edge/10 bg-white object-contain p-1"
            />
          )}
          <div className="flex-1 space-y-1">
            <input type="file" accept="image/*" onChange={handleArchivo} className="text-xs text-ink/60" />
            {subiendo && <p className="text-xs text-ink/40">Cargando imagen…</p>}
            {error && <p className="text-xs text-danger">{error}</p>}
            {valor && !subiendo && (
              <button
                type="button"
                onClick={() => onCambiar("")}
                className="text-xs font-semibold text-danger hover:text-danger"
              >
                Quitar logo
              </button>
            )}
          </div>
        </div>
      </Field>
      <p className="mt-1 text-xs text-ink/40">{ayuda}</p>
    </div>
  );
}

function FirmaField({
  valor,
  onCambiar,
}: {
  valor: string;
  onCambiar: (dataUri: string) => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const [dibujando, setDibujando] = useState(false);

  const handleArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setSubiendo(true);
    setError("");
    try {
      const dataUri = await archivoAImagenComprimida(file);
      onCambiar(dataUri);
    } catch {
      setError("No se pudo cargar la imagen. Intenta con otro archivo.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div>
      <Field label="Firma digital (opcional)">
        <div className="flex items-center gap-3">
          {valor && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={valor}
              alt="Vista previa de la firma"
              className="h-14 w-28 shrink-0 rounded-lg border border-edge/10 bg-white object-contain p-1"
            />
          )}
          <div className="flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setDibujando(true)}
                className="rounded-lg border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
              >
                Dibujar firma
              </button>
              <label className="cursor-pointer rounded-lg border border-edge/15 px-3 py-1.5 text-xs font-semibold text-ink/70 transition-colors hover:bg-surface">
                Subir foto
                <input type="file" accept="image/*" onChange={handleArchivo} className="hidden" />
              </label>
              {valor && !subiendo && (
                <button
                  type="button"
                  onClick={() => onCambiar("")}
                  className="text-xs font-semibold text-danger hover:text-danger"
                >
                  Quitar firma
                </button>
              )}
            </div>
            {subiendo && <p className="text-xs text-ink/40">Cargando imagen…</p>}
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>
        </div>
      </Field>
      <p className="mt-1 text-xs text-ink/40">
        Dibuja tu firma con el dedo o el mouse, o sube una foto/escaneo. Se agrega sobre la línea de
        &quot;Firma médico&quot; en las recetas que envíes por WhatsApp o imprimas en PDF.
      </p>
      {!valor && (
        <p className="mt-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
          La primera vez que agregues tu firma, hazlo desde tu celular — dibujar con el dedo en la
          pantalla táctil da un resultado más natural que con el mouse en computadora.
        </p>
      )}

      {dibujando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-edge/10 bg-modal-solid p-6">
            <FirmaCanvas
              etiqueta="Tu firma"
              onCancel={() => setDibujando(false)}
              onSave={(dataUrl) => {
                onCambiar(dataUrl);
                setDibujando(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function PerfilDoctor() {
  const { perfilDoctor, setPerfilDoctor } = usePatientData();
  const [form, setForm] = useState(perfilDoctor);
  const [guardado, setGuardado] = useState(false);
  const [escuelaEsOtra, setEscuelaEsOtra] = useState(
    Boolean(perfilDoctor.escuelaEgreso) && !escuelasOdontologiaComunes.includes(perfilDoctor.escuelaEgreso)
  );

  const actualizar = (campo: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [campo]: e.target.value }));
    setGuardado(false);
  };

  const handleGuardar = () => {
    setPerfilDoctor(form);
    setGuardado(true);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Perfil del Doctor</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre completo">
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => {
                manejarCambioNombre(e, (v) => setForm((prev) => ({ ...prev, nombre: v })));
                setGuardado(false);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Cédula profesional">
            <input
              type="text"
              value={form.cedulaProfesional}
              onChange={actualizar("cedulaProfesional")}
              className={inputClass}
            />
          </Field>
          <Field label="Especialidad">
            <input
              type="text"
              value={form.especialidad}
              onChange={actualizar("especialidad")}
              placeholder="Ej. Ortodoncia, Odontología general, Cirujano Dentista..."
              className={inputClass}
            />
          </Field>
          <Field label="Correo">
            <input type="email" value={form.correo} onChange={actualizar("correo")} className={inputClass} />
          </Field>
          <Field label="Teléfono">
            <input type="text" value={form.telefono} onChange={actualizar("telefono")} className={inputClass} />
          </Field>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Datos para Recetas</h3>
          <p className="mt-1 text-xs text-ink/40">
            Estos datos aparecen en el membrete de cada receta que imprimas o envíes.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Escuela de egreso">
            <select
              value={escuelaEsOtra ? "__otra__" : form.escuelaEgreso}
              onChange={(e) => {
                if (e.target.value === "__otra__") {
                  setEscuelaEsOtra(true);
                  setForm((prev) => ({ ...prev, escuelaEgreso: "" }));
                } else {
                  setEscuelaEsOtra(false);
                  setForm((prev) => ({ ...prev, escuelaEgreso: e.target.value }));
                }
                setGuardado(false);
              }}
              className={inputClass}
            >
              <option value="">Selecciona tu escuela...</option>
              {escuelasOdontologiaComunes.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
              <option value="__otra__">Otra...</option>
            </select>
          </Field>
          {escuelaEsOtra && (
            <Field label="¿Cuál escuela?">
              <input
                type="text"
                value={form.escuelaEgreso}
                onChange={actualizar("escuelaEgreso")}
                placeholder="Nombre de tu escuela"
                className={inputClass}
              />
            </Field>
          )}
        </div>

        <LogoField
          label="Logo de tu escuela (opcional)"
          ayuda="No generamos ni reproducimos escudos institucionales — sube tu propia imagen del logo (debes tener derecho de uso). Se muestra en la esquina superior izquierda de tus recetas."
          valor={form.logoEscuelaUrl}
          onCambiar={(dataUri) => {
            setForm((prev) => ({ ...prev, logoEscuelaUrl: dataUri }));
            setGuardado(false);
          }}
        />

        <LogoField
          label="Logo de tu clínica o consultorio (opcional)"
          ayuda="Se muestra junto al de la escuela en tus recetas, si tu clínica o consultorio tiene su propio logotipo."
          valor={form.logoClinicaUrl}
          onCambiar={(dataUri) => {
            setForm((prev) => ({ ...prev, logoClinicaUrl: dataUri }));
            setGuardado(false);
          }}
        />

        <FirmaField
          valor={form.firmaDigitalUrl}
          onCambiar={(dataUri) => {
            setForm((prev) => ({ ...prev, firmaDigitalUrl: dataUri }));
            setGuardado(false);
          }}
        />

        <Field label="Dirección de la clínica (aparece al pie de la receta)">
          <textarea
            value={form.direccionClinica}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, direccionClinica: e.target.value }));
              setGuardado(false);
            }}
            rows={2}
            placeholder="Calle, número, colonia, municipio, estado, C.P."
            className={`${inputClass} resize-none`}
          />
        </Field>

        <Field label="Texto de vigencia de la receta">
          <input
            type="text"
            value={form.textoValidezReceta}
            onChange={actualizar("textoValidezReceta")}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleGuardar}
          className="rounded-lg border border-accent/60 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25"
        >
          Guardar Cambios
        </button>
        {guardado && <span className="text-sm text-success">Perfil guardado</span>}
      </div>
    </div>
  );
}
