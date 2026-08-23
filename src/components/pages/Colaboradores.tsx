"use client";

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import type { RolClinica, Recurso } from "@/lib/patientData";
import { manejarCambioNombre } from "@/lib/textoNombre";
import ConfirmarEliminar from "@/components/ConfirmarEliminar";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 21l1.4-4.2A8.5 8.5 0 1 1 8.3 20.5L3 21ZM8.5 8.3c.2-.5.4-.5.6-.5h.5c.2 0 .4 0 .5.3.2.4.6 1.4.7 1.5.1.1.1.3 0 .4-.1.2-.2.3-.3.4-.2.2-.3.3-.1.6.7 1.1 1.4 1.7 2.5 2.3.2.1.3.1.4-.1.2-.2.5-.6.7-.8.1-.2.3-.2.5-.1.5.2 1.3.6 1.5.7.2.1.3.1.4.3.1.2.1.9-.2 1.4-.3.5-1.1.9-1.6 1-.5 0-1.1.1-3.4-.9-2.4-1.1-3.9-3.5-4.1-3.7-.1-.2-1-1.3-1-2.5s.6-1.7.8-2Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mensaje con las instrucciones para que el invitado se registre con el
 * correo exacto de la invitación y la acepte — pensado para reenviar la
 * invitación por WhatsApp cuando el correo se pierde entre spam/promociones. */
function buildMensajeInvitacion(nombre: string, nombreClinica: string, email: string): string {
  const origen = typeof window !== "undefined" ? window.location.origin : "";
  return `Hola ${nombre}, te invité a colaborar conmigo en MO (nuestra plataforma de gestión odontológica) en "${nombreClinica || "mi clínica"}".

Para entrar:
1. Ve a ${origen}
2. Regístrate (o inicia sesión si ya tienes cuenta) con este correo exacto: ${email}
3. En cuanto entres, verás la invitación para unirte — solo acéptala.

Cualquier duda, aquí te ayudo.`;
}

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

function NombreCell({ valor, onGuardar }: { valor: string; onGuardar: (valor: string) => void }) {
  const [texto, setTexto] = useState(valor);

  return (
    <input
      type="text"
      value={texto}
      onChange={(e) => manejarCambioNombre(e, setTexto)}
      onBlur={() => {
        const limpio = texto.trim();
        if (limpio && limpio !== valor) onGuardar(limpio);
      }}
      placeholder="Nombre completo"
      className="w-36 rounded-md border border-edge/10 bg-field px-2 py-1 text-xs text-ink placeholder-ink/30 outline-none focus:border-accent/60"
    />
  );
}

/** Igual que WhatsappCell pero solo dispara onGuardar con un correo que al
 * menos "parece" correo — una invitación sin correo no puede detectarse
 * sola al iniciar sesión, así que vale la pena evitar guardar algo a medias
 * (ej. un nombre a medio escribir) que dé la falsa impresión de que ya
 * quedó completa. */
function CorreoCell({ valor, onGuardar }: { valor: string; onGuardar: (valor: string) => void }) {
  const [texto, setTexto] = useState(valor);

  return (
    <input
      type="email"
      value={texto}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={() => {
        const limpio = texto.trim();
        if (limpio && limpio !== valor && limpio.includes("@")) onGuardar(limpio);
      }}
      placeholder="Agregar correo…"
      className="w-44 rounded-md border border-accent/40 bg-field px-2 py-1 text-xs text-ink placeholder-ink/30 outline-none focus:border-accent/60"
    />
  );
}

/** Multi-selección compacta de a cuáles recursos (médicos/unidades) puede
 * ver este colaborador en la Agenda — "Ver todos" (sin restricción, por
 * default) o una lista específica, ej. solo la unidad "Almoloya". */
function RecursosVisiblesCell({
  recursos,
  seleccionados,
  onGuardar,
}: {
  recursos: Recurso[];
  seleccionados: string[] | undefined;
  onGuardar: (ids: string[] | null) => void;
}) {
  const restringido = (seleccionados?.length ?? 0) > 0;

  return (
    <details className="relative">
      <summary className="w-40 cursor-pointer list-none rounded-md border border-edge/10 bg-field px-2 py-1 text-xs text-ink outline-none hover:border-accent/40">
        {restringido ? `${seleccionados!.length} calendario(s)` : "Todos los calendarios"}
      </summary>
      <div className="absolute z-10 mt-1 w-56 space-y-1.5 rounded-lg border border-edge/10 bg-modal p-3 shadow-lg">
        <label className="flex items-center gap-2 border-b border-edge/10 pb-1.5 text-xs font-semibold text-ink">
          <input type="checkbox" checked={!restringido} onChange={() => onGuardar(null)} />
          Ver todos los calendarios
        </label>
        <div className="max-h-40 space-y-1 overflow-y-auto">
          {recursos.map((r) => {
            const marcado = seleccionados?.includes(r.id) ?? false;
            return (
              <label key={r.id} className="flex items-center gap-2 text-xs text-ink/80">
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() => {
                    const actuales = seleccionados ?? [];
                    const siguientes = marcado ? actuales.filter((id) => id !== r.id) : [...actuales, r.id];
                    onGuardar(siguientes);
                  }}
                />
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
                {r.nombre}
              </label>
            );
          })}
        </div>
      </div>
    </details>
  );
}

export default function Colaboradores() {
  const {
    miRol,
    clinicInfo,
    setClinicInfo,
    colaboradoresActivos,
    invitacionesPendientes,
    recursos,
    actualizarRecursosVisiblesColaborador,
    invitarColaborador,
    eliminarInvitacion,
    actualizarWhatsappInvitacion,
    actualizarCorreoInvitacion,
    eliminarColaborador,
    actualizarRolColaborador,
    actualizarWhatsappColaborador,
    actualizarNombreColaborador,
    actualizarCorreoColaborador,
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

  const puedeInvitar = nombre.trim().length > 0 && (correo.trim().length > 0 || whatsapp.trim().length > 0);

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
        <p>
          Los colaboradores con rol &quot;Colaborador&quot; pueden ver pacientes, agenda, recetas y
          presupuestos, pero <strong>no</strong> ven pagos ni cortes de caja — esa información queda
          reservada al dueño (rol &quot;Admin&quot;).
        </p>
        <p className="mt-2">
          Puedes invitar con correo, con WhatsApp, o con ambos. <strong>Ojo:</strong> MO solo inicia
          sesión por correo — si invitas nada más con WhatsApp, esa persona igual necesitará
          registrarse con algún correo, y la invitación no se le mostrará sola hasta que captures ese
          correo aquí (puedes agregarlo después, en la fila de la invitación pendiente).
        </p>
        <p className="mt-2">
          En &quot;Calendarios que ve&quot; controlas qué recursos (médicos/unidades) de la Agenda
          puede ver cada colaborador — por default ve todos; puedes limitarlo a solo uno o algunos
          (ej. solo la unidad de otro consultorio).
        </p>
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
            placeholder="Número de WhatsApp"
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
          className="rounded-lg border border-accent/60 bg-accent/15 px-4 py-2 text-sm font-semibold text-accent transition-opacity hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-40"
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
            {invitacionesPendientes.map((inv) => {
              const inviteId = inv.id ?? `${inv.clinicId}_${inv.email}`;
              const telefonoLimpio = (inv.whatsapp ?? "").replace(/\D/g, "");
              return (
                <div
                  key={inviteId}
                  className="flex flex-col gap-3 rounded-xl border border-edge/10 bg-surface p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <span className="font-medium text-ink">{inv.nombre}</span>{" "}
                    <span className="capitalize text-ink/40">· {inv.role}</span>
                    {!inv.email && (
                      <span className="ml-2 font-semibold text-danger">Sin correo — no se detectará sola</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CorreoCell
                      valor={inv.email}
                      onGuardar={(correo) => actualizarCorreoInvitacion(inviteId, correo)}
                    />
                    <WhatsappCell
                      valor={inv.whatsapp ?? ""}
                      onGuardar={(whatsapp) => actualizarWhatsappInvitacion(inviteId, whatsapp)}
                    />
                    <button
                      onClick={() =>
                        window.open(
                          `https://wa.me/${telefonoLimpio}?text=${encodeURIComponent(
                            buildMensajeInvitacion(inv.nombre, inv.nombreClinica, inv.email)
                          )}`,
                          "_blank"
                        )
                      }
                      disabled={!telefonoLimpio}
                      title={
                        telefonoLimpio
                          ? "Enviar/reenviar la invitación por WhatsApp"
                          : "Agrega un número de WhatsApp para poder enviarla por aquí"
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-success/30 px-2.5 py-1.5 text-xs font-semibold text-success/80 transition-colors hover:border-success hover:text-success disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-success/30 disabled:hover:text-success/80"
                    >
                      <WhatsAppIcon />
                      Enviar por WhatsApp
                    </button>
                    <button
                      onClick={() => eliminarInvitacion(inviteId)}
                      className="text-xs font-semibold text-danger hover:text-danger"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              );
            })}
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
                  <th className="px-6 py-3 font-medium">Calendarios que ve</th>
                  <th className="px-6 py-3 text-right font-medium">Quitar</th>
                </tr>
              </thead>
              <tbody>
                {colaboradoresActivos.map((c) => {
                  const memberId = `${c.clinicId}_${c.uid}`;
                  const esUnoMismo = c.clinicId === c.uid;
                  return (
                    <tr key={memberId} className="border-b border-edge/5 last:border-0">
                      <td className="px-6 py-3">
                        <NombreCell
                          valor={c.nombre}
                          onGuardar={(nombre) => actualizarNombreColaborador(memberId, nombre)}
                        />
                      </td>
                      <td className="px-6 py-3">
                        <CorreoCell
                          valor={c.correo}
                          onGuardar={(correo) => actualizarCorreoColaborador(memberId, correo)}
                        />
                      </td>
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
                      <td className="px-6 py-3">
                        {esUnoMismo ? (
                          <span className="text-xs text-ink/40">Todos (eres el dueño)</span>
                        ) : (
                          <RecursosVisiblesCell
                            recursos={recursos}
                            seleccionados={c.recursosVisibles}
                            onGuardar={(ids) => actualizarRecursosVisiblesColaborador(memberId, ids)}
                          />
                        )}
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
