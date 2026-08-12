"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { limitesPorPlan, planesDisponibles, type RolClinica } from "@/lib/patientData";
import { manejarCambioNombre } from "@/lib/textoNombre";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

const rolLabel: Record<RolClinica, string> = {
  admin: "Admin",
  especialista: "Especialista",
  colaborador: "Colaborador",
};

function UsoCupo({ label, usados, limite }: { label: string; usados: number; limite: number | null }) {
  const lleno = limite !== null && usados >= limite;
  return (
    <div className="rounded-lg border border-edge/10 bg-inset px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-ink/40">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${lleno ? "text-danger" : "text-ink"}`}>
        {usados} {limite !== null ? `de ${limite}` : "· sin límite"}
      </div>
    </div>
  );
}

export default function Personal() {
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
    recursos,
    suscripcion,
  } = usePatientData();

  const [nombreClinica, setNombreClinica] = useState(clinicInfo?.nombre ?? "");
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState<RolClinica>("colaborador");
  const [enviando, setEnviando] = useState(false);

  if (miRol !== "admin") {
    return (
      <div className="rounded-2xl border border-edge/10 bg-surface p-10 text-center text-sm text-ink/50">
        Solo el dueño de la clínica puede administrar al personal.
      </div>
    );
  }

  const plan = planesDisponibles.find((p) => p.id === suscripcion.planActivo);
  const limites = limitesPorPlan[suscripcion.planActivo] ?? limitesPorPlan.prueba;

  const contarPorRol = (r: RolClinica) =>
    colaboradoresActivos.filter((c) => c.role === r).length +
    invitacionesPendientes.filter((i) => i.role === r).length;

  const colaboradoresUsados = contarPorRol("colaborador");
  const especialistasUsados = contarPorRol("especialista");
  const unidadesUsadas = recursos.filter((r) => r.tipo === "unidad").length;

  const cupoColaboradorLleno = limites.colaboradores !== null && colaboradoresUsados >= limites.colaboradores;

  const puedeInvitar =
    nombre.trim().length > 0 && correo.trim().length > 0 && !(rol === "colaborador" && cupoColaboradorLleno);

  const guardarNombreClinica = () => {
    if (!nombreClinica.trim()) return;
    setClinicInfo((prev) => ({ ...(prev ?? { ownerId: "", nombre: "" }), nombre: nombreClinica.trim() }));
  };

  const invitar = async () => {
    if (!puedeInvitar) return;
    setEnviando(true);
    await invitarColaborador({ nombre: nombre.trim(), correo: correo.trim(), rol });
    setNombre("");
    setCorreo("");
    setRol("colaborador");
    setEnviando(false);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/60">
          Nombre de la clínica
        </h3>
        <p className="mb-3 text-xs text-ink/40">Así se identifica tu clínica cuando invitas a alguien.</p>
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

      <div className="rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink/60">
          Cupo de tu plan — {plan?.nombre ?? suscripcion.planActivo}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <UsoCupo label="Unidades" usados={unidadesUsadas} limite={limites.unidades} />
          <UsoCupo label="Colaboradores" usados={colaboradoresUsados} limite={limites.colaboradores} />
          <UsoCupo label="Especialistas" usados={especialistasUsados} limite={null} />
        </div>
        {cupoColaboradorLleno && (
          <p className="mt-3 text-xs text-danger">
            Ya usaste todo tu cupo de colaboradores de este plan. Ve a{" "}
            <span className="font-semibold">Planes</span> para ampliarlo, o invita a esta persona como
            Especialista si aplica (sin límite).
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm text-accent">
        Los <strong>especialistas</strong> y <strong>colaboradores</strong> pueden ver pacientes, agenda,
        recetas y presupuestos, pero <strong>no</strong> ven pagos ni cortes de caja — eso queda reservado
        al dueño. Al agregar un correo aquí, esa persona debe registrarse en MO con ese mismo correo; en
        cuanto entre, verá una invitación para unirse.
      </div>

      <div className="space-y-3 rounded-2xl border border-edge/10 bg-surface p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Agregar Personal</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          <select value={rol} onChange={(e) => setRol(e.target.value as RolClinica)} className={inputClass}>
            <option value="colaborador">Colaborador</option>
            <option value="especialista">Especialista</option>
          </select>
        </div>
        <button
          onClick={invitar}
          disabled={!puedeInvitar || enviando}
          className="rounded-lg bg-gradient-to-r from-accent to-orange-500 px-4 py-2 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {enviando ? "Enviando…" : "+ Agregar"}
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
                  <span className="text-ink/40">· {rolLabel[inv.role]}</span>
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
          Personal Activo
        </h3>
        {colaboradoresActivos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
            No hay personal registrado todavía
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
                  <th className="px-6 py-3 font-medium">Nombre</th>
                  <th className="px-6 py-3 font-medium">Correo</th>
                  <th className="px-6 py-3 font-medium">Perfil</th>
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
                        {esUnoMismo ? (
                          <span className="text-xs text-ink/50">Dueño (Admin)</span>
                        ) : (
                          <select
                            value={c.role}
                            onChange={(e) =>
                              actualizarRolColaborador(memberId, e.target.value as RolClinica)
                            }
                            className="rounded-md border border-edge/10 bg-field px-2 py-1 text-xs text-ink"
                          >
                            <option value="colaborador">Colaborador</option>
                            <option value="especialista">Especialista</option>
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {!esUnoMismo && (
                          <button
                            onClick={() => eliminarColaborador(memberId)}
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
    </div>
  );
}
