"use client";

import { useState } from "react";

type Patient = {
  id: string;
  name: string;
  phone: string;
  birthDate: string;
};

const sexoOptions = ["Femenino", "Masculino", "Otro"];
const estadoCivilOptions = ["Soltero(a)", "Casado(a)", "Unión libre", "Divorciado(a)", "Viudo(a)"];
const escolaridadOptions = [
  "Ninguna",
  "Primaria",
  "Secundaria",
  "Preparatoria",
  "Licenciatura",
  "Posgrado",
];

const nivelSocioeconomicoOptions = ["A/B", "C+", "C", "C-", "D+", "D", "E"];
const ingresoFamiliarOptions = [
  "Menos de $8,000",
  "$8,000 – $15,000",
  "$15,001 – $25,000",
  "$25,001 – $40,000",
  "Más de $40,000",
];
const tipoViviendaOptions = ["Propia", "Rentada", "Familiar"];
const serviciosOptions = ["Agua potable", "Luz eléctrica", "Drenaje", "Internet", "Gas"];

const parentescoOptions = ["Madre", "Padre", "Cónyuge", "Hijo(a)", "Hermano(a)", "Otro"];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-ink/60">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function CardShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-2xl border border-edge/10 bg-surface p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">{title}</h3>
      {children}
    </div>
  );
}

export default function DatosPaciente({
  patient,
  formatDate,
  calculateAge,
}: {
  patient: Patient;
  formatDate: (date: string) => string;
  calculateAge: (date: string) => number | null;
}) {
  const [nombreCompleto, setNombreCompleto] = useState(patient.name);
  const [sexo, setSexo] = useState(sexoOptions[0]);
  const [estadoCivil, setEstadoCivil] = useState(estadoCivilOptions[0]);
  const [ocupacion, setOcupacion] = useState("");
  const [escolaridad, setEscolaridad] = useState(escolaridadOptions[0]);
  const [lugarNacimiento, setLugarNacimiento] = useState("");

  const [nivelSocioeconomico, setNivelSocioeconomico] = useState(nivelSocioeconomicoOptions[0]);
  const [ingresoFamiliar, setIngresoFamiliar] = useState(ingresoFamiliarOptions[0]);
  const [dependientes, setDependientes] = useState("");
  const [tipoVivienda, setTipoVivienda] = useState(tipoViviendaOptions[0]);
  const [servicios, setServicios] = useState<string[]>([]);
  const [responsablePago, setResponsablePago] = useState("");

  const [celular, setCelular] = useState(patient.phone);
  const [telefonoFijo, setTelefonoFijo] = useState("");
  const [correo, setCorreo] = useState("");
  const [direccion, setDireccion] = useState("");
  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoParentesco, setContactoParentesco] = useState(parentescoOptions[0]);
  const [contactoTelefono, setContactoTelefono] = useState("");

  const [saved, setSaved] = useState(false);

  const toggleServicio = (servicio: string) => {
    setServicios((prev) =>
      prev.includes(servicio) ? prev.filter((s) => s !== servicio) : [...prev, servicio]
    );
    setSaved(false);
  };

  return (
    <div className="space-y-6">
      <CardShell title="Ficha de Identificación">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nombre completo">
            <input
              type="text"
              value={nombreCompleto}
              onChange={(e) => {
                setNombreCompleto(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Fecha de nacimiento">
            <input
              type="text"
              readOnly
              value={
                calculateAge(patient.birthDate) !== null
                  ? `${formatDate(patient.birthDate)} (${calculateAge(patient.birthDate)} años)`
                  : formatDate(patient.birthDate)
              }
              className={`${inputClass} cursor-not-allowed text-ink/50`}
            />
          </Field>
          <Field label="Sexo">
            <select
              value={sexo}
              onChange={(e) => {
                setSexo(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            >
              {sexoOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estado civil">
            <select
              value={estadoCivil}
              onChange={(e) => {
                setEstadoCivil(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            >
              {estadoCivilOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ocupación">
            <input
              type="text"
              value={ocupacion}
              onChange={(e) => {
                setOcupacion(e.target.value);
                setSaved(false);
              }}
              placeholder="Ej. Docente, Comerciante..."
              className={inputClass}
            />
          </Field>
          <Field label="Escolaridad">
            <select
              value={escolaridad}
              onChange={(e) => {
                setEscolaridad(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            >
              {escolaridadOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Lugar de nacimiento">
            <input
              type="text"
              value={lugarNacimiento}
              onChange={(e) => {
                setLugarNacimiento(e.target.value);
                setSaved(false);
              }}
              placeholder="Ciudad, Estado"
              className={inputClass}
            />
          </Field>
        </div>
      </CardShell>

      <CardShell title="Estudio Socioeconómico">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nivel socioeconómico">
            <select
              value={nivelSocioeconomico}
              onChange={(e) => {
                setNivelSocioeconomico(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            >
              {nivelSocioeconomicoOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ingreso familiar mensual">
            <select
              value={ingresoFamiliar}
              onChange={(e) => {
                setIngresoFamiliar(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            >
              {ingresoFamiliarOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Dependientes económicos">
            <input
              type="number"
              min={0}
              value={dependientes}
              onChange={(e) => {
                setDependientes(e.target.value);
                setSaved(false);
              }}
              placeholder="0"
              className={inputClass}
            />
          </Field>
          <Field label="Tipo de vivienda">
            <select
              value={tipoVivienda}
              onChange={(e) => {
                setTipoVivienda(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            >
              {tipoViviendaOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Responsable del pago">
            <input
              type="text"
              value={responsablePago}
              onChange={(e) => {
                setResponsablePago(e.target.value);
                setSaved(false);
              }}
              placeholder="Nombre del responsable"
              className={inputClass}
            />
          </Field>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-ink/60">
            Servicios con los que cuenta
          </label>
          <div className="flex flex-wrap gap-2">
            {serviciosOptions.map((servicio) => {
              const isSelected = servicios.includes(servicio);
              return (
                <button
                  key={servicio}
                  type="button"
                  onClick={() => toggleServicio(servicio)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isSelected
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-edge/15 text-ink/50 hover:border-accent/40 hover:text-ink"
                  }`}
                >
                  {servicio}
                </button>
              );
            })}
          </div>
        </div>
      </CardShell>

      <CardShell title="Datos de Contacto">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Celular">
            <input
              type="text"
              value={celular}
              onChange={(e) => {
                setCelular(e.target.value);
                setSaved(false);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Teléfono fijo">
            <input
              type="text"
              value={telefonoFijo}
              onChange={(e) => {
                setTelefonoFijo(e.target.value);
                setSaved(false);
              }}
              placeholder="Opcional"
              className={inputClass}
            />
          </Field>
          <Field label="Correo electrónico">
            <input
              type="email"
              value={correo}
              onChange={(e) => {
                setCorreo(e.target.value);
                setSaved(false);
              }}
              placeholder="correo@ejemplo.com"
              className={inputClass}
            />
          </Field>
          <Field label="Dirección">
            <input
              type="text"
              value={direccion}
              onChange={(e) => {
                setDireccion(e.target.value);
                setSaved(false);
              }}
              placeholder="Calle, número, colonia"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="border-t border-edge/10 pt-4">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink/40">
            Contacto de emergencia
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Nombre">
              <input
                type="text"
                value={contactoNombre}
                onChange={(e) => {
                  setContactoNombre(e.target.value);
                  setSaved(false);
                }}
                className={inputClass}
              />
            </Field>
            <Field label="Parentesco">
              <select
                value={contactoParentesco}
                onChange={(e) => {
                  setContactoParentesco(e.target.value);
                  setSaved(false);
                }}
                className={inputClass}
              >
                {parentescoOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Teléfono">
              <input
                type="text"
                value={contactoTelefono}
                onChange={(e) => {
                  setContactoTelefono(e.target.value);
                  setSaved(false);
                }}
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      </CardShell>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setSaved(true)}
          className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Guardar Cambios
        </button>
        {saved && <span className="text-sm text-success">Cambios guardados</span>}
      </div>
    </div>
  );
}
