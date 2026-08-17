"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import type { RolClinica } from "@/lib/patientData";
import { manejarCambioNombre } from "@/lib/textoNombre";
import ConfirmarEliminar from "@/components/ConfirmarEliminar";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function WhatsappCell({ valor, onGuardar }: { valor: string; onGuardar: (valor: string) => void }) {
  const [texto, setTexto] = useState(valor);

  return (
    <input
      type="text"
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => {
        if (texto.trim() !== valor) onGuardar(texto.trim());
      }}
      placeholder="Sin registrar"
      className="w-36 rounded-md border border-edge/10 bg-field px-2 py-1 text-xs text-ink placeholder-ink/30 outline-none focus:border-accent/60"
    />
  );
}

export default function Colaboradores() {
  const {
    miRol,
    clinicInfo,
    setClinicInfo,
    colaboradoresActivos,
    invitacionesPendientes,
    invitarColaborador,
    eliminarInvitacion,
    eliminarColaborador,
    actualizarRolColaborador,
    actualizarWhatsappColaborador,
  } = usePatientData();

  const [nombreClinica, setNombreClinica] = useState(clinicInfo?.nombre ?? "");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [rol, setRol] = useState<RolClinica>("colaborador");
  const [enviando, setEnviando] = useState(false);
  const [colaboradorAEliminar, setColaboradorAEliminar] = useState<{
    memberId: string;
    nombre: string;
    correo: string;
  } | null>(null);

  if (miRol !== "admin") {
    return (
      <div className="rounded-2xl border border-edge/10 bg-surface p-10 text-center text-sm text-ink/50">
        Solo el dueño de la clínica puede administrar colaboradores.
      </div>
    );
  }

  const puedeInvitar = nombre.trim().length > 0 && correo.trim().length > 0;

  const guardarNombreClinica = () => {
    if (!nombreClinica.trim()) return;
    setClinicInfo((prev) => ({ ...(prev ?? { ownerId: "", nombre: "" }), nombre: nombreClinica.trim() }));
  };

  const invitar = async () => {
    if (!puedeInvitar) return;
    setEnviando(true);
    await invitarColaborador({ nombre: nombre.trim(), correo: correo.trim(), whatsapp: whatsapp.trim(), rol });
    setNombre("");
    setCorreo("");
    setWhatsapp("");
    setRol("colaborador");
    setEnviando(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/60">
          Nombre de la clínica
        </h3>
        <p className="mb-3 text-xs text-ink/40">
          Así se identifica tu clínica cuando invitas a un colaborador.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={nombreClinica}
            onChange={(e) => manejarCambioNombre(e, setNombreClinica)}
            placeholder="Ej. Sonríe X Todos Dental"
            className={inputClass}
          />
          <button
            onClick={guardarNombreClinica}
            className="shrink-0 rounded-lg border border-accent/40 px-4 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
          >
            Guardar
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm text-accent">
        Los colaboradores con rol &quot;Colaborador&quot; pueden ver pacientes, agenda, recetas y
        presupuestos, pero <strong>no</strong> ven pagos ni cortes de caja — esa información queda
        reservada al dueño (rol &quot;Admin&quot;). Al agregar un correo aquí, esa persona debe
        registrarse en MO con ese mismo correo; en cuanto entre, verá una invitación para unirse.
      </div>

      <div className="space-y-3 rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
          Invitar Colaborador
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            type="text"
            value={nombre}
            onChange={(e) => manejarCambioNombre(e, setNombre)}
            placeholder="Nombre completo"
            className={inputClass}
          />
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="correo@ejemplo.com"
            className={inputClass}
          />
          <input
            type="text"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="Número de WhatsApp (opcional)"
            className={inputClass}
          />
          <select value={rol} onChange={(e) => setRol(e.target.value as RolClinica)} className={inputClass}>
            <option value="colaborador">Colaborador</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button
          onClick={invitar}
          disabled={!puedeInvitar || enviando}
          className="rounded-lg bg-gradient-to-r from-accent to-accent-2 px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {enviando ? "Enviando…" : "+ Invitar"}
        </button>
      </div>

      {invitacionesPendientes.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/60">
            Invitaciones Pendientes
          </h3>
          <div className="space-y-2">
            {invitacionesPendientes.map((inv) => (
              <div
                key={`${inv.clinicId}_${inv.email}`}
                className="flex items-center justify-between rounded-xl border border-edge/10 bg-surface p-3 text-sm"
              >
                <div>
                  <span className="font-medium text-ink">{inv.nombre}</span>{" "}
                  <span className="text-ink/50">· {inv.email}</span>{" "}
                  {inv.whatsapp && <span className="text-ink/50">· {inv.whatsapp}</span>}{" "}
                  <span className="capitalize text-ink/40">· {inv.role}</span>
                </div>
                <button
                  onClick={() => eliminarInvitacion(`${inv.clinicId}_${inv.email}`)}
                  className="text-xs font-semibold text-danger hover:text-danger"
                >
                  Cancelar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/60">
          Colaboradores Activos
        </h3>
        {colaboradoresActivos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
            No hay colaboradores registrados
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                  <th className="px-6 py-3 font-medium">Nombre</th>
                  <th className="px-6 py-3 font-medium">Correo</th>
                  <th className="px-6 py-3 font-medium">WhatsApp</th>
                  <th className="px-6 py-3 font-medium">Rol</th>
                  <th className="px-6 py-3 text-right font-medium">Quitar</th>
                </tr>
              </thead>
              <tbody>
                {colaboradoresActivos.map((c) => {
                  const memberId = `${c.clinicId}_${c.uid}`;
                  const esUnoMismo = c.clinicId === c.uid;
                  return (
                    <tr key={memberId} className="border-b border-edge/5 last:border-0">
                      <td className="px-6 py-3 text-ink">{c.nombre || "—"}</td>
                      <td className="px-6 py-3 text-ink/70">{c.correo}</td>
                      <td className="px-6 py-3">
                        <WhatsappCell
                          valor={c.whatsapp ?? ""}
                          onGuardar={(whatsapp) => actualizarWhatsappColaborador(memberId, whatsapp)}
                        />
                      </td>
                      <td className="px-6 py-3">
                        <select
                          value={c.role}
                          onChange={(e) => actualizarRolColaborador(memberId, e.target.value as RolClinica)}
                          disabled={esUnoMismo}
                          className="rounded-md border border-edge/10 bg-field px-2 py-1 text-xs text-ink disabled:opacity-40"
                        >
                          <option value="colaborador">Colaborador</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {!esUnoMismo && (
                          <button
                            onClick={() =>
                              setColaboradorAEliminar({ memberId, nombre: c.nombre || c.correo, correo: c.correo })
                            }
                            className="text-xs font-semibold text-danger hover:text-danger"
                          >
                            Eliminar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {colaboradorAEliminar && (
        <ConfirmarEliminar
          titulo="¿Quitar a este colaborador?"
          mensaje={`${colaboradorAEliminar.nombre} (${colaboradorAEliminar.correo}) perderá acceso a la clínica de inmediato. Esta acción no se puede deshacer.`}
          onCancel={() => setColaboradorAEliminar(null)}
          onConfirm={() => {
            eliminarColaborador(colaboradorAEliminar.memberId);
            setColaboradorAEliminar(null);
          }}
        />
      )}
    </div>
  );
}
