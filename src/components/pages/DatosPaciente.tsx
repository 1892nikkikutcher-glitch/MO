"use client";

import { useEffect, useState } from "react";
import { calcularEdadDetallada, formatEdad, type Patient } from "@/lib/patientData";
import { manejarCambioNombre } from "@/lib/textoNombre";
import { sugerirNivelSocioeconomico } from "@/lib/nivelSocioeconomico";
import { usePatientData } from "@/context/PatientDataContext";

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
}: {
  patient: Patient;
  formatDate: (date: string) => string;
}) {
  const { updatePatient, setCambiosSinGuardar, citas } = usePatientData();

  const [nombreCompleto, setNombreCompleto] = useState(patient.name);
  const [birthDate, setBirthDate] = useState(patient.birthDate ?? "");
  const [sexo, setSexo] = useState(patient.sexo ?? sexoOptions[0]);
  const [estadoCivil, setEstadoCivil] = useState(patient.estadoCivil ?? estadoCivilOptions[0]);
  const [ocupacion, setOcupacion] = useState(patient.ocupacion ?? "");
  const [escolaridad, setEscolaridad] = useState(patient.escolaridad ?? escolaridadOptions[0]);
  const [lugarNacimiento, setLugarNacimiento] = useState(patient.lugarNacimiento ?? "");
  const [nombreTutor, setNombreTutor] = useState(patient.nombreTutor ?? "");

  const [nivelSocioeconomico, setNivelSocioeconomico] = useState(
    patient.nivelSocioeconomico ?? nivelSocioeconomicoOptions[0]
  );
  const [ingresoFamiliar, setIngresoFamiliar] = useState(
    patient.ingresoFamiliar ?? ingresoFamiliarOptions[0]
  );
  const [dependientes, setDependientes] = useState(patient.dependientes ?? "");
  const [tipoVivienda, setTipoVivienda] = useState(patient.tipoVivienda ?? tipoViviendaOptions[0]);
  const [servicios, setServicios] = useState<string[]>(patient.servicios ?? []);
  const [responsablePago, setResponsablePago] = useState(patient.responsablePago ?? "");

  const [celular, setCelular] = useState(patient.phone);
  const [telefonoFijo, setTelefonoFijo] = useState(patient.telefonoFijo ?? "");
  const [correo, setCorreo] = useState(patient.email ?? "");
  const [direccion, setDireccion] = useState(patient.direccion ?? "");
  const [codigoPostal, setCodigoPostal] = useState(patient.codigoPostal ?? "");
  const [contactoNombre, setContactoNombre] = useState(patient.contactoNombre ?? "");
  const [contactoParentesco, setContactoParentesco] = useState(
    patient.contactoParentesco ?? parentescoOptions[0]
  );
  const [contactoTelefono, setContactoTelefono] = useState(patient.contactoTelefono ?? "");
  const [recordatorioPrevencion, setRecordatorioPrevencion] = useState(
    patient.recordatorioPrevencion ?? true
  );
  const [comportamientoFrankl, setComportamientoFrankl] = useState(patient.comportamientoFrankl ?? 0);
  const [comportamientoEstrellas, setComportamientoEstrellas] = useState(
    patient.comportamientoEstrellas ?? 0
  );

  const [saved, setSaved] = useState(false);
  // "Tocado desde la última carga/guardado" — a diferencia de `saved` (que
  // solo controla el mensaje "Cambios guardados"), esto es lo que decide si
  // hay que avisar antes de salir sin guardar.
  const [tocado, setTocado] = useState(false);
  const marcarSinGuardar = () => {
    setSaved(false);
    setTocado(true);
  };

  useEffect(() => {
    setCambiosSinGuardar(tocado ? "Datos del Paciente tiene cambios sin guardar." : null);
    return () => setCambiosSinGuardar(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tocado]);

  // Al cambiar de paciente (navegar a otro expediente), recargar el
  // formulario con los datos de ese paciente en vez de arrastrar los del
  // paciente anterior.
  useEffect(() => {
    setNombreCompleto(patient.name);
    setBirthDate(patient.birthDate ?? "");
    setSexo(patient.sexo ?? sexoOptions[0]);
    setEstadoCivil(patient.estadoCivil ?? estadoCivilOptions[0]);
    setOcupacion(patient.ocupacion ?? "");
    setEscolaridad(patient.escolaridad ?? escolaridadOptions[0]);
    setLugarNacimiento(patient.lugarNacimiento ?? "");
    setNombreTutor(patient.nombreTutor ?? "");
    setNivelSocioeconomico(patient.nivelSocioeconomico ?? nivelSocioeconomicoOptions[0]);
    setIngresoFamiliar(patient.ingresoFamiliar ?? ingresoFamiliarOptions[0]);
    setDependientes(patient.dependientes ?? "");
    setTipoVivienda(patient.tipoVivienda ?? tipoViviendaOptions[0]);
    setServicios(patient.servicios ?? []);
    setResponsablePago(patient.responsablePago ?? "");
    setCelular(patient.phone);
    setTelefonoFijo(patient.telefonoFijo ?? "");
    setCorreo(patient.email ?? "");
    setDireccion(patient.direccion ?? "");
    setCodigoPostal(patient.codigoPostal ?? "");
    setContactoNombre(patient.contactoNombre ?? "");
    setContactoParentesco(patient.contactoParentesco ?? parentescoOptions[0]);
    setContactoTelefono(patient.contactoTelefono ?? "");
    setRecordatorioPrevencion(patient.recordatorioPrevencion ?? true);
    setComportamientoFrankl(patient.comportamientoFrankl ?? 0);
    setComportamientoEstrellas(patient.comportamientoEstrellas ?? 0);
    setSaved(false);
    setTocado(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id]);

  const esMenorDeEdad = (calcularEdadDetallada(birthDate)?.years ?? 18) < 18;

  // Confiabilidad de asistencia — se calcula sola a partir del historial de
  // citas, no se captura a mano. "Resueltas" son las citas que ya tuvieron
  // un desenlace claro (Atendida, Cancelada o No Asistió); Agendada/
  // Confirmada/En espera todavía están pendientes y no cuentan. Reagendada
  // se muestra aparte porque no es un desenlace final, pero sí es una señal
  // de comportamiento (paciente que mueve su cita seguido).
  const citasPaciente = citas.filter((c) => c.patientId === patient.id);
  const citasAtendidas = citasPaciente.filter((c) => c.estatus === "Atendida").length;
  const citasCanceladas = citasPaciente.filter((c) => c.estatus === "Cancelada").length;
  const citasReagendadas = citasPaciente.filter((c) => c.estatus === "Reagendada").length;
  const citasNoAsistio = citasPaciente.filter((c) => c.estatus === "No Asistió").length;
  const citasResueltas = citasAtendidas + citasCanceladas + citasNoAsistio;
  const pctCumplida = citasResueltas > 0 ? Math.round((citasAtendidas / citasResueltas) * 100) : null;
  const incidencias = citasCanceladas + citasReagendadas + citasNoAsistio;
  const asistenciaLabel =
    citasResueltas === 0 && citasReagendadas === 0
      ? null
      : incidencias === 0
        ? { texto: "Muy cumplido", color: "text-success" }
        : incidencias / Math.max(citasResueltas + citasReagendadas, 1) > 0.3 || citasReagendadas > 2
          ? { texto: "Cancela o reagenda seguido", color: "text-danger" }
          : { texto: "Asistencia regular", color: "text-ink/60" };

  const nivelSugerido = sugerirNivelSocioeconomico({
    ingresoFamiliar,
    escolaridad,
    tipoVivienda,
    servicios,
    ocupacion,
  });

  const toggleServicio = (servicio: string) => {
    setServicios((prev) =>
      prev.includes(servicio) ? prev.filter((s) => s !== servicio) : [...prev, servicio]
    );
    marcarSinGuardar();
  };

  const guardarCambios = () => {
    updatePatient(patient.id, {
      name: nombreCompleto.trim(),
      birthDate,
      phone: celular,
      sexo,
      estadoCivil,
      ocupacion,
      escolaridad,
      lugarNacimiento,
      nombreTutor: nombreTutor.trim(),
      nivelSocioeconomico,
      ingresoFamiliar,
      dependientes,
      tipoVivienda,
      servicios,
      responsablePago,
      telefonoFijo,
      email: correo,
      direccion,
      codigoPostal,
      contactoNombre,
      contactoParentesco,
      contactoTelefono,
      recordatorioPrevencion,
      comportamientoFrankl,
      comportamientoEstrellas,
    });
    setSaved(true);
    setTocado(false);
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
                manejarCambioNombre(e, setNombreCompleto);
                marcarSinGuardar();
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Fecha de nacimiento">
            <input
              type="date"
              value={birthDate}
              onChange={(e) => {
                setBirthDate(e.target.value);
                marcarSinGuardar();
              }}
              className={inputClass}
            />
            {birthDate && <p className="mt-1 text-xs text-ink/40">{formatEdad(birthDate)}</p>}
          </Field>
          {esMenorDeEdad && (
            <Field label="Nombre del padre, madre o tutor">
              <input
                type="text"
                value={nombreTutor}
                onChange={(e) => {
                  manejarCambioNombre(e, setNombreTutor);
                  marcarSinGuardar();
                }}
                placeholder="Nombre completo"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-accent/70">Paciente menor de edad</p>
            </Field>
          )}
          <Field label="Sexo">
            <select
              value={sexo}
              onChange={(e) => {
                setSexo(e.target.value);
                marcarSinGuardar();
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
                marcarSinGuardar();
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
                marcarSinGuardar();
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
                marcarSinGuardar();
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
                marcarSinGuardar();
              }}
              placeholder="Ciudad, Estado"
              className={inputClass}
            />
          </Field>
        </div>
      </CardShell>

      <CardShell title="Comportamiento">
        {esMenorDeEdad ? (
          <div>
            <label className="mb-2 block text-xs font-medium text-ink/60">
              Escala de Frankl (comportamiento en el sillón dental)
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  [1, "Definitivamente negativo"],
                  [2, "Negativo"],
                  [3, "Positivo"],
                  [4, "Definitivamente positivo"],
                ] as const
              ).map(([valor, etiqueta]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => {
                    setComportamientoFrankl(comportamientoFrankl === valor ? 0 : valor);
                    marcarSinGuardar();
                  }}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    comportamientoFrankl === valor
                      ? "border-accent bg-accent/15"
                      : "border-edge/15 hover:border-accent/40"
                  }`}
                >
                  <div
                    className={`text-lg font-bold ${
                      comportamientoFrankl === valor ? "text-accent" : "text-ink"
                    }`}
                  >
                    {valor}
                  </div>
                  <div className="text-[11px] leading-tight text-ink/50">{etiqueta}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <label className="mb-2 block text-xs font-medium text-ink/60">
              Calificación de comportamiento / cooperación
            </label>
            <div className="flex gap-1">
              {([1, 2, 3, 4, 5] as const).map((valor) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => {
                    setComportamientoEstrellas(comportamientoEstrellas === valor ? 0 : valor);
                    marcarSinGuardar();
                  }}
                  title={`${valor} de 5`}
                  className="p-0.5 text-2xl leading-none transition-transform hover:scale-110"
                >
                  <span className={valor <= comportamientoEstrellas ? "text-accent" : "text-ink/20"}>
                    ★
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-edge/10 pt-4">
          <label className="mb-1 block text-xs font-medium text-ink/60">
            Asistencia (calculado del historial de citas)
          </label>
          {citasPaciente.length === 0 ? (
            <p className="text-xs text-ink/40">Aún no tiene citas registradas.</p>
          ) : citasResueltas === 0 && citasReagendadas === 0 ? (
            <p className="text-xs text-ink/40">
              Aún no hay citas con un resultado (Atendida, Cancelada, etc.) para calcularlo.
            </p>
          ) : (
            <>
              <p className="text-sm text-ink/70">
                {citasResueltas > 0 && (
                  <>
                    <span className="font-semibold text-ink">{pctCumplida}%</span> de citas cumplidas
                    ({citasAtendidas} de {citasResueltas}){" "}
                  </>
                )}
                {citasCanceladas > 0 && <>· {citasCanceladas} cancelada(s) </>}
                {citasReagendadas > 0 && <>· {citasReagendadas} reagendada(s) </>}
                {citasNoAsistio > 0 && <>· {citasNoAsistio} no asistió/asistieron </>}
              </p>
              {asistenciaLabel && (
                <p className={`mt-1 text-xs font-semibold ${asistenciaLabel.color}`}>
                  {asistenciaLabel.texto}
                </p>
              )}
            </>
          )}
        </div>
      </CardShell>

      <CardShell title="Estudio Socioeconómico">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nivel socioeconómico">
            <select
              value={nivelSocioeconomico}
              onChange={(e) => {
                setNivelSocioeconomico(e.target.value);
                marcarSinGuardar();
              }}
              className={inputClass}
            >
              {nivelSocioeconomicoOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
            {nivelSugerido !== nivelSocioeconomico && (
              <p className="mt-1 text-xs text-ink/40">
                Sugerido según ingreso, escolaridad, vivienda y servicios:{" "}
                <span className="font-semibold text-accent">{nivelSugerido}</span>{" "}
                <button
                  type="button"
                  onClick={() => {
                    setNivelSocioeconomico(nivelSugerido);
                    marcarSinGuardar();
                  }}
                  className="font-semibold text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
                >
                  Usar sugerencia
                </button>
              </p>
            )}
          </Field>
          <Field label="Ingreso familiar mensual">
            <select
              value={ingresoFamiliar}
              onChange={(e) => {
                setIngresoFamiliar(e.target.value);
                marcarSinGuardar();
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
                marcarSinGuardar();
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
                marcarSinGuardar();
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
                manejarCambioNombre(e, setResponsablePago);
                marcarSinGuardar();
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
                marcarSinGuardar();
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
                marcarSinGuardar();
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
                marcarSinGuardar();
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
                marcarSinGuardar();
              }}
              placeholder="Calle, número, colonia"
              className={inputClass}
            />
          </Field>
          <Field label="Código postal">
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={codigoPostal}
              onChange={(e) => {
                setCodigoPostal(e.target.value.replace(/\D/g, "").slice(0, 5));
                marcarSinGuardar();
              }}
              placeholder="Ej. 50000"
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
                  manejarCambioNombre(e, setContactoNombre);
                  marcarSinGuardar();
                }}
                className={inputClass}
              />
            </Field>
            <Field label="Parentesco">
              <select
                value={contactoParentesco}
                onChange={(e) => {
                  setContactoParentesco(e.target.value);
                  marcarSinGuardar();
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
                  marcarSinGuardar();
                }}
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      </CardShell>

      <CardShell title="Prevención">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={recordatorioPrevencion}
            onChange={(e) => {
              setRecordatorioPrevencion(e.target.checked);
              marcarSinGuardar();
            }}
            className="mt-0.5 h-4 w-4 rounded border-edge/30 accent-accent"
          />
          <span className="text-sm text-ink/80">
            Sugerir cita de prevención cada 6 meses
            <span className="mt-1 block text-xs font-normal text-ink/40">
              Si está activo, el expediente sugiere agendar una limpieza de prevención 6 meses
              después de la última cita del paciente (mientras no tenga ya una cita próxima
              agendada). Desactívalo para pacientes a quienes prefieres atender solo cuando lo
              soliciten.
            </span>
          </span>
        </label>
      </CardShell>

      <div className="flex items-center gap-3">
        <button
          onClick={guardarCambios}
          className="rounded-lg bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
        >
          Guardar Cambios
        </button>
        {saved && <span className="text-sm text-success">Cambios guardados</span>}
      </div>
    </div>
  );
}
