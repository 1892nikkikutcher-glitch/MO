"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { escuelasOdontologiaComunes } from "@/lib/escuelasOdontologia";
import { archivoAImagenComprimida } from "@/lib/imagenLogo";
import FirmaCanvas from "@/components/FirmaCanvas";
import type { Recurso } from "@/lib/patientData";

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
        Dibuja la firma con el dedo o el mouse, o sube una foto/escaneo. Se agrega sobre la línea de
        &quot;Firma médico&quot; en las recetas que este médico envíe por WhatsApp o imprima en PDF.
      </p>
      {!valor && (
        <p className="mt-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs text-accent">
          La primera vez que agregues una firma, hazlo desde el celular del médico — dibujar con el
          dedo en la pantalla táctil da un resultado más natural que con el mouse en computadora.
        </p>
      )}

      {dibujando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-edge/10 bg-modal-solid p-6">
            <FirmaCanvas
              etiqueta="Firma"
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

type IdentidadMedicoForm = Required<
  Pick<
    Recurso,
    "cedulaProfesional" | "especialidad" | "correo" | "telefono" | "escuelaEgreso" | "logoEscuelaUrl" | "firmaDigitalUrl"
  >
>;

/** Formulario de identidad de receta de UN médico — se remonta por
 * completo al cambiar de médico (key={medico.id} en el padre), para que su
 * estado local nunca arrastre ediciones a medio hacer del médico anterior.
 * Mismo patrón que ya usa el diálogo de cita de Agenda con su propio
 * key. */
function FormularioMedico({
  medico,
  onGuardar,
}: {
  medico: Recurso;
  onGuardar: (datos: IdentidadMedicoForm) => void;
}) {
  const [form, setForm] = useState<IdentidadMedicoForm>({
    cedulaProfesional: medico.cedulaProfesional ?? "",
    especialidad: medico.especialidad ?? "",
    correo: medico.correo ?? "",
    telefono: medico.telefono ?? "",
    escuelaEgreso: medico.escuelaEgreso ?? "",
    logoEscuelaUrl: medico.logoEscuelaUrl ?? "",
    firmaDigitalUrl: medico.firmaDigitalUrl ?? "",
  });
  const [guardado, setGuardado] = useState(false);
  const [escuelaEsOtra, setEscuelaEsOtra] = useState(
    Boolean(form.escuelaEgreso) && !escuelasOdontologiaComunes.includes(form.escuelaEgreso)
  );

  const actualizar = (campo: keyof IdentidadMedicoForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [campo]: e.target.value }));
    setGuardado(false);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Identidad de receta — {medico.nombre}
        </h3>
        <p className="mt-1 text-xs text-ink/40">
          Estos datos aparecen en el membrete de cada receta que {medico.nombre} imprima o envíe. El
          nombre y el color se editan desde Agenda → Recursos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Cédula profesional">
          <input type="text" value={form.cedulaProfesional} onChange={actualizar("cedulaProfesional")} className={inputClass} />
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
            <option value="">Selecciona la escuela...</option>
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
              placeholder="Nombre de la escuela"
              className={inputClass}
            />
          </Field>
        )}
      </div>

      <LogoField
        label="Logo de su escuela (opcional)"
        ayuda="No generamos ni reproducimos escudos institucionales — sube la imagen del logo (debe tener derecho de uso). Se muestra en la esquina superior de las recetas de este médico."
        valor={form.logoEscuelaUrl}
        onCambiar={(dataUri) => {
          setForm((prev) => ({ ...prev, logoEscuelaUrl: dataUri }));
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

      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            onGuardar(form);
            setGuardado(true);
          }}
          className="rounded-lg border border-accent/60 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25"
        >
          Guardar identidad de {medico.nombre}
        </button>
        {guardado && <span className="text-sm text-success">Guardado</span>}
      </div>
    </div>
  );
}

export default function PerfilDoctor() {
  const { recursos, setRecursos, perfilDoctor, setPerfilDoctor } = usePatientData();
  const medicos = recursos.filter((r) => r.tipo === "medico");
  const [medicoSeleccionadoId, setMedicoSeleccionadoId] = useState(medicos[0]?.id ?? "");
  const medicoSeleccionado = medicos.find((m) => m.id === medicoSeleccionadoId) ?? medicos[0];

  const [formClinica, setFormClinica] = useState(perfilDoctor);
  const [guardadoClinica, setGuardadoClinica] = useState(false);

  const guardarIdentidadMedico = (datos: IdentidadMedicoForm) => {
    if (!medicoSeleccionado) return;
    setRecursos((prev) => prev.map((r) => (r.id === medicoSeleccionado.id ? { ...r, ...datos } : r)));
  };

  const handleGuardarClinica = () => {
    setPerfilDoctor(formClinica);
    setGuardadoClinica(true);
  };

  return (
    <div className="max-w-2xl space-y-6">
      {medicos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          Agrega un médico desde Agenda → Recursos para poder configurar su identidad de receta.
        </div>
      ) : (
        <>
          <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
            <Field label="Médico">
              <select
                value={medicoSeleccionado?.id ?? ""}
                onChange={(e) => setMedicoSeleccionadoId(e.target.value)}
                className={inputClass}
              >
                {medicos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {medicoSeleccionado && (
            <FormularioMedico key={medicoSeleccionado.id} medico={medicoSeleccionado} onGuardar={guardarIdentidadMedico} />
          )}
        </>
      )}

      <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Datos de la Clínica</h3>
          <p className="mt-1 text-xs text-ink/40">
            Estos datos son los mismos sin importar qué médico receta — se muestran junto a la
            identidad de cada médico en sus recetas.
          </p>
        </div>

        <LogoField
          label="Logo de la clínica o consultorio (opcional)"
          ayuda="Se muestra junto al logo de la escuela de cada médico en sus recetas."
          valor={formClinica.logoClinicaUrl}
          onCambiar={(dataUri) => {
            setFormClinica((prev) => ({ ...prev, logoClinicaUrl: dataUri }));
            setGuardadoClinica(false);
          }}
        />

        <Field label="Dirección de la clínica (aparece al pie de la receta)">
          <textarea
            value={formClinica.direccionClinica}
            onChange={(e) => {
              setFormClinica((prev) => ({ ...prev, direccionClinica: e.target.value }));
              setGuardadoClinica(false);
            }}
            rows={2}
            placeholder="Calle, número, colonia, municipio, estado, C.P."
            className={`${inputClass} resize-none`}
          />
        </Field>

        <Field label="Texto de vigencia de la receta">
          <input
            type="text"
            value={formClinica.textoValidezReceta}
            onChange={(e) => {
              setFormClinica((prev) => ({ ...prev, textoValidezReceta: e.target.value }));
              setGuardadoClinica(false);
            }}
            className={inputClass}
          />
        </Field>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGuardarClinica}
            className="rounded-lg border border-accent/60 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25"
          >
            Guardar Datos de la Clínica
          </button>
          {guardadoClinica && <span className="text-sm text-success">Guardado</span>}
        </div>
      </div>
    </div>
  );
}
