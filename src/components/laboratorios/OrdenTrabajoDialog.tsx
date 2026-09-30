"use client";

import { useEffect, useRef, useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatNombreConEdad, type SolicitudLaboratorio } from "@/lib/patientData";
import { manejarCambioNombre } from "@/lib/textoNombre";
import {
  limpiarTelefono,
  buildMensajeOrdenTrabajo,
  ENTREGA_OPCIONES,
  ETAPA_OPCIONES,
  type LaboratorioDental,
} from "@/lib/laboratorioDental";
import Odontograma from "@/components/pages/Odontograma";

const inputClass =
  "w-full rounded-lg border border-edge/10 bg-field px-3 py-2 text-sm text-ink placeholder-ink/30 outline-none focus:border-accent/60";

const chipClass = (activo: boolean) =>
  `rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
    activo
      ? "border-accent bg-accent/15 text-accent"
      : "border-edge/15 text-ink/50 hover:border-accent/40 hover:text-ink"
  }`;

function todayFormatted() {
  return new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

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

/** Diálogo compartido de "Orden de Trabajo" para un laboratorio dental —
 * mismo componente para los dos puntos de entrada de la app:
 * - Proveedores → Laboratorio Dental: pasa `laboratorio` fijo (ya se sabe
 *   cuál), pide elegir el paciente real (nunca texto libre).
 * - Expediente → pestaña Laboratorios: pasa `patientIdFijo` fijo (ya se
 *   sabe de quién), pide elegir el laboratorio del catálogo.
 * Al enviar, guarda la orden con `setLaboratoriosPaciente` (mismo setter
 * que ya usa la pestaña Laboratorios — hereda gratis estadísticas
 * pendientes, el panel de Dashboard y Reportes → OTs) y abre WhatsApp con
 * el mismo mensaje de siempre. Vive fuera de src/components/pages porque
 * ahora lo usan dos páginas distintas — importar una página completa
 * desde otra hubiera sido una dependencia cruzada innecesaria. */
export default function OrdenTrabajoDialog({
  laboratorio,
  patientIdFijo,
  clinicaNombre,
  onClose,
}: {
  laboratorio?: LaboratorioDental;
  patientIdFijo?: string;
  clinicaNombre: string;
  onClose: () => void;
}) {
  const { recursos, patients, laboratoriosDentales, setLaboratoriosPaciente } = usePatientData();
  const medicosDisponibles = recursos.filter((r) => r.tipo === "medico").map((r) => r.nombre);

  const [laboratorioElegidoId, setLaboratorioElegidoId] = useState(
    laboratorio ? "" : (laboratoriosDentales[0]?.id ?? "")
  );
  useEffect(() => {
    if (!laboratorio && !laboratorioElegidoId && laboratoriosDentales.length > 0) {
      setLaboratorioElegidoId(laboratoriosDentales[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laboratorio, laboratorioElegidoId, laboratoriosDentales.map((l) => l.id).join("|")]);
  const laboratorioResuelto = laboratorio ?? laboratoriosDentales.find((l) => l.id === laboratorioElegidoId) ?? null;

  // Buscador de paciente — mismo patrón que AgendaCitaDialog.tsx (texto +
  // coincidencias por nombre + chip al elegir), necesario para capturar un
  // patientId real: el nombre escrito nunca sustituye al id.
  const [patientId, setPatientId] = useState(patientIdFijo ?? "");
  const [searchText, setSearchText] = useState(() => {
    if (!patientIdFijo) return "";
    return patients.find((p) => p.id === patientIdFijo)?.name ?? "";
  });
  const coincidencias =
    !patientIdFijo && !patientId && searchText.trim().length > 0
      ? patients.filter((p) => p.name.toLowerCase().includes(searchText.trim().toLowerCase()))
      : [];
  const seleccionarPaciente = (id: string) => {
    const p = patients.find((pp) => pp.id === id);
    if (!p) return;
    setPatientId(id);
    setSearchText(p.name);
  };
  const cambiarPaciente = () => {
    setPatientId("");
    setSearchText("");
  };

  const [numeroOrden, setNumeroOrden] = useState("");
  const [fechaIngreso, setFechaIngreso] = useState(todayFormatted());
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [medico, setMedico] = useState(medicosDisponibles[0] ?? "");
  useEffect(() => {
    if (!medico && medicosDisponibles.length > 0) setMedico(medicosDisponibles[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medico, medicosDisponibles.join("|")]);
  const [trabajo, setTrabajo] = useState("");
  const [dientes, setDientes] = useState<number[]>([]);
  const [especificaciones, setEspecificaciones] = useState("");
  const [costo, setCosto] = useState("");
  const [entregaSeleccion, setEntregaSeleccion] = useState<string[]>([]);
  const [entregaOtroTexto, setEntregaOtroTexto] = useState("");
  const [etapaSeleccion, setEtapaSeleccion] = useState<string[]>([]);

  // Guarda el mensaje ya armado para poder reintentar abrir WhatsApp sin
  // volver a guardar la orden (ver handleEnviar) — nunca un segundo
  // registro por un popup bloqueado o un reintento del usuario.
  const [ordenGuardada, setOrdenGuardada] = useState<{ mensaje: string; telefono: string } | null>(null);
  const yaEnviado = useRef(false);

  const toggleDiente = (tooth: number) =>
    setDientes((prev) => (prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth]));
  const toggleEntrega = (op: string) =>
    setEntregaSeleccion((prev) => (prev.includes(op) ? prev.filter((x) => x !== op) : [...prev, op]));
  const toggleEtapa = (op: string) =>
    setEtapaSeleccion((prev) => (prev.includes(op) ? prev.filter((x) => x !== op) : [...prev, op]));

  const puedeEnviar =
    laboratorioResuelto !== null && patientId !== "" && trabajo.trim().length > 0 && medico !== "";

  const handleEnviar = () => {
    // Guard sincrónico contra doble clic/doble disparo — no depende de que
    // React ya haya vuelto a renderizar con el estado deshabilitado.
    if (yaEnviado.current || !puedeEnviar || !laboratorioResuelto) return;
    yaEnviado.current = true;

    const entregaFinal = entregaSeleccion.includes("Otro")
      ? [
          ...entregaSeleccion.filter((x) => x !== "Otro"),
          entregaOtroTexto.trim() ? `Otro (${entregaOtroTexto.trim()})` : "Otro",
        ]
      : entregaSeleccion;
    const nombrePaciente = patients.find((p) => p.id === patientId)?.name ?? searchText.trim();

    const nuevaSolicitud: SolicitudLaboratorio = {
      id: `l${Date.now()}`,
      tipo: "Dental",
      laboratorio: laboratorioResuelto.nombre,
      medico,
      trabajo: trabajo.trim(),
      dientes,
      fechaEnvio: todayFormatted(),
      fechaEntrega,
      costo: Number(costo) || 0,
      estatus: "Enviado",
      numeroOrden,
      fechaIngreso,
      especificaciones,
      entregaItems: entregaFinal,
      etapaItems: etapaSeleccion,
    };
    // Primero se guarda, después se abre WhatsApp — mismo orden que exige
    // el plan. setLaboratoriosPaciente (como todo setter de
    // PatientDataContext) es fire-and-forget: no hay una promesa que
    // esperar aquí ni un error que este diálogo pueda observar si la
    // escritura a Firestore fallara en segundo plano. El guard de arriba
    // (yaEnviado) es la protección real y alcanzable contra duplicados;
    // no se afirma una detección de fallo que la arquitectura actual no
    // permite.
    setLaboratoriosPaciente(patientId, (prev) => [...prev, nuevaSolicitud]);

    const texto = buildMensajeOrdenTrabajo(clinicaNombre, {
      numeroOrden,
      fechaIngreso,
      fechaEntrega,
      medico,
      paciente: nombrePaciente,
      trabajo: trabajo.trim(),
      dientes,
      especificaciones,
      entregaItems: entregaFinal,
      etapaItems: etapaSeleccion,
    });
    const telefono = limpiarTelefono(laboratorioResuelto.telefono);
    setOrdenGuardada({ mensaje: texto, telefono });
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`, "_blank");
  };

  const tituloLaboratorio = laboratorioResuelto?.nombre ?? "el laboratorio";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-edge/10 bg-modal p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Orden de Trabajo</h2>
            <p className="text-xs text-ink/40">Para {tituloLaboratorio}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink/50 hover:bg-surface hover:text-ink"
          >
            ✕
          </button>
        </div>

        {ordenGuardada ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-success">
              Orden guardada en el expediente. Se intentó abrir WhatsApp — si no se abrió (por ejemplo, si el
              navegador bloqueó la ventana), intenta de nuevo:
            </p>
            <button
              onClick={() =>
                window.open(
                  `https://wa.me/${ordenGuardada.telefono}?text=${encodeURIComponent(ordenGuardada.mensaje)}`,
                  "_blank"
                )
              }
              className="mx-auto flex items-center justify-center gap-1.5 rounded-lg border border-success/60 bg-success/15 px-5 py-2.5 text-sm font-semibold text-success transition-opacity hover:bg-success/25"
            >
              <WhatsAppIcon />
              Reintentar abrir WhatsApp
            </button>
            <button
              onClick={onClose}
              className="mx-auto block rounded-lg border border-edge/15 px-5 py-2 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {!laboratorio && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink/60">Laboratorio</label>
                  {laboratoriosDentales.length > 0 ? (
                    <select
                      value={laboratorioElegidoId}
                      onChange={(e) => setLaboratorioElegidoId(e.target.value)}
                      className={inputClass}
                    >
                      {laboratoriosDentales.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nombre}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                      No hay laboratorios registrados. Ve a Proveedores → Laboratorio Dental → Agregar Laboratorio.
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink/60">N° de orden</label>
                  <input
                    type="text"
                    value={numeroOrden}
                    onChange={(e) => setNumeroOrden(e.target.value)}
                    placeholder="Opcional"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink/60">Médico solicitante</label>
                  {medicosDisponibles.length > 0 ? (
                    <select value={medico} onChange={(e) => setMedico(e.target.value)} className={inputClass}>
                      {medicosDisponibles.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                      No hay médicos configurados. Ve a Agenda → Recursos → + para agregar uno.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink/60">Fecha de toma de impresión</label>
                  <input
                    type="text"
                    value={fechaIngreso}
                    onChange={(e) => setFechaIngreso(e.target.value)}
                    placeholder="dd/mm/aaaa"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink/60">Fecha de colocación</label>
                  <input
                    type="text"
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                    placeholder="dd/mm/aaaa"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Paciente</label>
                {patientIdFijo ? (
                  <div className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-ink">
                    {searchText || "—"}
                  </div>
                ) : patientId ? (
                  <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm">
                    <span className="text-ink">{searchText}</span>
                    <button onClick={cambiarPaciente} className="text-xs font-semibold text-success hover:text-success">
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={searchText}
                      onChange={(e) => manejarCambioNombre(e, setSearchText)}
                      placeholder="Buscar paciente por nombre..."
                      className={inputClass}
                    />
                    {coincidencias.length > 0 && (
                      <div className="mt-1.5 max-h-32 space-y-1 overflow-y-auto rounded-lg border border-edge/10 bg-field p-1.5">
                        {coincidencias.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => seleccionarPaciente(p.id)}
                            className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-ink/80 hover:bg-surface"
                          >
                            {formatNombreConEdad(p.name, p.birthDate)}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Trabajo a realizar</label>
                <textarea
                  value={trabajo}
                  onChange={(e) => setTrabajo(e.target.value)}
                  placeholder="Ej. Corona de zirconia OD 16"
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <Odontograma selectedTeeth={dientes} onToggleTooth={toggleDiente} title="Órgano(s) dental(es) a trabajar" />

              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">Especificaciones</label>
                <textarea
                  value={especificaciones}
                  onChange={(e) => setEspecificaciones(e.target.value)}
                  placeholder="Color, material, técnica, indicaciones especiales..."
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-ink/60">
                  Costo a pagar al laboratorio
                </label>
                <input
                  type="number"
                  min={0}
                  value={costo}
                  onChange={(e) => setCosto(e.target.value)}
                  placeholder="Opcional — si el laboratorio ya te lo confirmó"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-ink/60">Se entrega junto con el trabajo</label>
                <div className="flex flex-wrap gap-2">
                  {ENTREGA_OPCIONES.map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => toggleEntrega(op)}
                      className={chipClass(entregaSeleccion.includes(op))}
                    >
                      {op}
                    </button>
                  ))}
                </div>
                {entregaSeleccion.includes("Otro") && (
                  <input
                    type="text"
                    value={entregaOtroTexto}
                    onChange={(e) => setEntregaOtroTexto(e.target.value)}
                    placeholder="Especifica qué otro material se entrega"
                    className={`${inputClass} mt-2`}
                  />
                )}
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-ink/60">Etapa que se entrega o solicita</label>
                <div className="flex flex-wrap gap-2">
                  {ETAPA_OPCIONES.map((op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => toggleEtapa(op)}
                      className={chipClass(etapaSeleccion.includes(op))}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-edge/15 py-2.5 text-sm font-semibold text-ink/80 transition-colors hover:bg-surface"
              >
                Cerrar
              </button>
              <button
                onClick={handleEnviar}
                disabled={!puedeEnviar}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-success/60 bg-success/15 py-2.5 text-sm font-semibold text-success transition-opacity hover:bg-success/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <WhatsAppIcon />
                Enviar por WhatsApp
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
