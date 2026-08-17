"use client";

import { useEffect, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { manejarCambioNombre } from "@/lib/textoNombre";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink outline-none focus:border-accent/60";

export default function Consultorio() {
  const { clinicInfo, setClinicInfo, horario, setHorario, miRol } = usePatientData();
  const [nombre, setNombre] = useState(clinicInfo?.nombre ?? "");
  const [direccion, setDireccion] = useState(clinicInfo?.direccion ?? "");
  const [telefono, setTelefono] = useState(clinicInfo?.telefono ?? "");
  const [correoContacto, setCorreoContacto] = useState(clinicInfo?.correoContacto ?? "");
  const [rfc, setRfc] = useState(clinicInfo?.rfc ?? "");
  const [responsableSanitario, setResponsableSanitario] = useState(clinicInfo?.responsableSanitario ?? "");
  const [cedulaResponsableSanitario, setCedulaResponsableSanitario] = useState(
    clinicInfo?.cedulaResponsableSanitario ?? ""
  );
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    setNombre(clinicInfo?.nombre ?? "");
    setDireccion(clinicInfo?.direccion ?? "");
    setTelefono(clinicInfo?.telefono ?? "");
    setCorreoContacto(clinicInfo?.correoContacto ?? "");
    setRfc(clinicInfo?.rfc ?? "");
    setResponsableSanitario(clinicInfo?.responsableSanitario ?? "");
    setCedulaResponsableSanitario(clinicInfo?.cedulaResponsableSanitario ?? "");
  }, [clinicInfo]);

  const soloLectura = miRol !== "admin";

  const guardar = () => {
    setClinicInfo((prev) => ({
      ...prev,
      nombre: nombre.trim(),
      direccion: direccion.trim(),
      telefono: telefono.trim(),
      correoContacto: correoContacto.trim(),
      rfc: rfc.trim(),
      responsableSanitario: responsableSanitario.trim(),
      cedulaResponsableSanitario: cedulaResponsableSanitario.trim(),
    }));
    setGuardado(true);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Datos del Consultorio
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-ink/60">Nombre del consultorio</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setGuardado(false);
              }}
              disabled={soloLectura}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-ink/60">Dirección</label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => {
                setDireccion(e.target.value);
                setGuardado(false);
              }}
              placeholder="Calle, número, colonia, ciudad"
              disabled={soloLectura}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Teléfono</label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => {
                setTelefono(e.target.value);
                setGuardado(false);
              }}
              disabled={soloLectura}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Correo de contacto</label>
            <input
              type="email"
              value={correoContacto}
              onChange={(e) => {
                setCorreoContacto(e.target.value);
                setGuardado(false);
              }}
              placeholder="contacto@tuconsultorio.com"
              disabled={soloLectura}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">RFC</label>
            <input
              type="text"
              value={rfc}
              onChange={(e) => {
                setRfc(e.target.value.toUpperCase());
                setGuardado(false);
              }}
              placeholder="Para facturación"
              disabled={soloLectura}
              className={inputClass}
            />
          </div>
        </div>

        <div className="mt-6 border-t border-edge/10 pt-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink/40">
            Responsable Sanitario
          </h4>
          <p className="mt-1 text-xs text-ink/40">
            Persona registrada ante COFEPRIS/COPRISEM como responsable sanitario del consultorio
            — no siempre es quien atiende a los pacientes.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Nombre</label>
              <input
                type="text"
                value={responsableSanitario}
                onChange={(e) =>
                  manejarCambioNombre(e, (v) => {
                    setResponsableSanitario(v);
                    setGuardado(false);
                  })
                }
                disabled={soloLectura}
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink/60">Cédula profesional</label>
              <input
                type="text"
                value={cedulaResponsableSanitario}
                onChange={(e) => {
                  setCedulaResponsableSanitario(e.target.value);
                  setGuardado(false);
                }}
                disabled={soloLectura}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {!soloLectura && (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={guardar}
              className="rounded-lg border border-accent/60 bg-accent/15 px-5 py-2.5 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25"
            >
              Guardar Cambios
            </button>
            {guardado && <span className="text-sm text-success">Cambios guardados</span>}
          </div>
        )}
        {soloLectura && (
          <p className="mt-4 text-xs text-ink/40">Solo el dueño de la clínica puede editar estos datos.</p>
        )}
      </div>

      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Horario de Atención
        </h3>
        <p className="mt-1 text-xs text-ink/40">
          Este horario es el mismo que se usa para dibujar la Agenda.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Hora de apertura</label>
            <input
              type="time"
              value={horario.apertura}
              onChange={(e) => setHorario((prev) => ({ ...prev, apertura: e.target.value }))}
              disabled={soloLectura}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Comida (de)</label>
            <input
              type="time"
              value={horario.comidaInicio}
              onChange={(e) => setHorario((prev) => ({ ...prev, comidaInicio: e.target.value }))}
              disabled={soloLectura}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Comida (a)</label>
            <input
              type="time"
              value={horario.comidaFin}
              onChange={(e) => setHorario((prev) => ({ ...prev, comidaFin: e.target.value }))}
              disabled={soloLectura}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/60">Hora de cierre</label>
            <input
              type="time"
              value={horario.cierre}
              onChange={(e) => setHorario((prev) => ({ ...prev, cierre: e.target.value }))}
              disabled={soloLectura}
              className={inputClass}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
