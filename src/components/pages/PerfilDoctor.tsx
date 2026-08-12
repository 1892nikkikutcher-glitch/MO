"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { manejarCambioNombre } from "@/lib/textoNombre";
import { escuelasOdontologiaComunes } from "@/lib/escuelasOdontologia";

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

        <div>
          <Field label="URL del logo de tu escuela (opcional)">
            <input
              type="text"
              value={form.logoEscuelaUrl}
              onChange={actualizar("logoEscuelaUrl")}
              placeholder="https://... — un link a una imagen que tengas derecho de usar"
              className={inputClass}
            />
          </Field>
          <p className="mt-1 text-xs text-ink/40">
            No generamos ni reproducimos escudos institucionales — pega aquí el link a tu propio logo
            (por ejemplo, súbelo a Google Drive o Imgur y comparte el link directo a la imagen).
          </p>
          {form.logoEscuelaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.logoEscuelaUrl}
              alt="Vista previa del logo"
              className="mt-2 h-16 w-16 rounded-lg border border-edge/10 bg-white object-contain p-1"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
          )}
        </div>

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
          className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Guardar Cambios
        </button>
        {guardado && <span className="text-sm text-success">Perfil guardado</span>}
      </div>
    </div>
  );
}
