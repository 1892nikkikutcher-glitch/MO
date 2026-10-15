"use client";

/** Nota rápida para una cita que no se atendió (Cancelada, Reagendada, No
 * Asistió) — alternativa al formulario guiado de 6 secciones de
 * `RegistrarAtencionHoy.tsx`, que no aplica cuando nunca hubo atención
 * clínica que documentar. Ver `RegistrarAtencionHoy.tsx` para cuándo se
 * muestra este componente en vez del formulario completo. */

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { formatFechaCita, type CitaAgenda } from "@/lib/patientData";
import { textoCancelacionDeCita, textoNoAsistioDeCita } from "@/lib/agendaHelpers";
import {
  estatusCitaDeMotivo,
  motivoNotaAdministrativaLabel,
  motivosNotaAdministrativa,
  notaAdministrativaInicial,
  type MotivoNotaAdministrativa,
  type PsoapOpcional,
} from "@/lib/notasEvolucion";
import {
  cancelacionTardia,
  estatusAdmiteMotivo,
  razonesNoAsistencia,
  razonNoAsistenciaLabel,
  type RazonNoAsistencia,
} from "@/lib/noAsistencia";
import { botonPrimario, Chip, inputClass, labelClass } from "./NotaUI";

function motivoSugeridoPorEstatus(estatus: CitaAgenda["estatus"]): MotivoNotaAdministrativa | null {
  switch (estatus) {
    case "No Asistió":
      return "no_asistio";
    case "Cancelada":
      return "cancela_paciente";
    case "Reagendada":
      return "reagenda_paciente";
    default:
      return null;
  }
}

const psoapCampos: { key: keyof PsoapOpcional; label: string; placeholder: string }[] = [
  { key: "presentacion", label: "Presentación", placeholder: "¿Cómo llegó / qué refirió?" },
  { key: "subjetivo", label: "Subjetivo", placeholder: "Lo que cuenta el paciente" },
  { key: "objetivo", label: "Objetivo", placeholder: "Lo que observaste tú" },
  { key: "analisis", label: "Análisis", placeholder: "Impresión clínica" },
  { key: "pronostico", label: "Pronóstico", placeholder: "Plan / siguiente paso" },
];
const psoapVacio: PsoapOpcional = { presentacion: "", subjetivo: "", objetivo: "", analisis: "", pronostico: "" };

export default function NotaAdministrativaRapida({
  patientId,
  citaId,
  cita,
  notaLibreSugerida,
  motivoInicial,
  aplicarEstatusAlGuardar = false,
  onGuardado,
  onQuiereNotaCompleta,
}: {
  patientId: string;
  citaId: string;
  cita: CitaAgenda;
  /** Texto ya escrito en "¿Cómo llega hoy?" de un borrador del formulario
   * completo que se abandona a favor de esta nota rápida — para no hacer
   * que el usuario lo vuelva a escribir. */
  notaLibreSugerida?: string;
  /** Motivo ya elegido (ej. el chip "No llega" de "¿Cómo llega hoy?") — si no
   * viene, se sugiere según el estatus que ya tiene la cita. */
  motivoInicial?: MotivoNotaAdministrativa;
  /** true cuando se llegó aquí desde la propia nota (la cita sigue
   * Agendada/Confirmada/En espera): al guardar, la cita pasa al estatus que
   * corresponde al motivo elegido (ver estatusCitaDeMotivo). Nada cambia en
   * la cita mientras no se guarde — volver a la nota completa lo deja todo
   * como estaba. */
  aplicarEstatusAlGuardar?: boolean;
  onGuardado: () => void;
  onQuiereNotaCompleta: () => void;
}) {
  const { miUid, patients, crearNotaAdministrativa, marcarEstatusCita } = usePatientData();
  const paciente = patients.find((p) => p.id === patientId);
  const [motivo, setMotivo] = useState<MotivoNotaAdministrativa | null>(
    motivoInicial ?? motivoSugeridoPorEstatus(cita.estatus)
  );
  const [razon, setRazon] = useState<RazonNoAsistencia | null>(cita.razonNoAsistencia ?? null);
  // ¿Cancelación fuera de tiempo? Si la cita ya quedó marcada, se respeta; si todavía se va a cancelar
  // con esta nota, se calcula con la hora de fin de la cita. Se puede corregir con la casilla.
  const tardiaInicial = cita.estatus === "Cancelada" ? Boolean(cita.canceladaTarde) : cancelacionTardia(cita);
  const [canceloFueraDeTiempo, setCanceloFueraDeTiempo] = useState(tardiaInicial);
  const [notaLibre, setNotaLibre] = useState(() => {
    if (notaLibreSugerida) return notaLibreSugerida;
    // La leyenda ya viene puesta cuando fue una falta o una cancelación fuera de tiempo (se puede editar).
    const motivoIni = motivoInicial ?? motivoSugeridoPorEstatus(cita.estatus);
    if (motivoIni === "no_asistio") return textoNoAsistioDeCita(cita);
    if (motivoIni === "cancela_paciente" && tardiaInicial) return textoCancelacionDeCita(cita, true);
    return "";
  });
  const [mostrarPsoap, setMostrarPsoap] = useState(false);
  const [psoap, setPsoap] = useState<PsoapOpcional>(psoapVacio);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const leyendas = [textoNoAsistioDeCita(cita), textoCancelacionDeCita(cita, true), textoCancelacionDeCita(cita, false)];
  const elegirMotivo = (m: MotivoNotaAdministrativa) => {
    setMotivo(m);
    // Solo se reemplaza un texto vacío o una leyenda automática; lo que el médico escribió no se toca.
    if (notaLibre.trim() && !leyendas.includes(notaLibre.trim())) return;
    if (m === "no_asistio") setNotaLibre(textoNoAsistioDeCita(cita));
    else if (m === "cancela_paciente") setNotaLibre(canceloFueraDeTiempo ? textoCancelacionDeCita(cita, true) : "");
    else setNotaLibre("");
  };
  const cambiarFueraDeTiempo = (valor: boolean) => {
    setCanceloFueraDeTiempo(valor);
    if (!notaLibre.trim() || leyendas.includes(notaLibre.trim())) setNotaLibre(valor ? textoCancelacionDeCita(cita, true) : "");
  };

  const puedeGuardar = motivo !== null && (motivo !== "otro" || notaLibre.trim().length > 0);
  const estatusDestino = aplicarEstatusAlGuardar && motivo ? estatusCitaDeMotivo(motivo) : null;

  const psoapConContenido = Object.values(psoap).some((v) => v.trim());

  const guardar = async () => {
    if (!motivo || !puedeGuardar) return;
    setGuardando(true);
    setError("");
    try {
      await crearNotaAdministrativa(
        patientId,
        notaAdministrativaInicial({
          patientId,
          pacienteNombreSnapshot: paciente?.name ?? "",
          citaId,
          motivo,
          ...(razon ? { razon } : {}),
          notaLibre: notaLibre.trim() || undefined,
          psoap: psoapConContenido
            ? {
                presentacion: psoap.presentacion?.trim() || undefined,
                subjetivo: psoap.subjetivo?.trim() || undefined,
                objetivo: psoap.objetivo?.trim() || undefined,
                analisis: psoap.analisis?.trim() || undefined,
                pronostico: psoap.pronostico?.trim() || undefined,
              }
            : undefined,
          registradoPorUid: miUid,
        })
      );
      // Primero la nota, después el estatus: si guardar la nota falla, la
      // cita queda tal cual estaba en vez de cambiar sin dejar registro.
      // El motivo (razón) también queda en la propia cita, para verlo en
      // Agenda y reportes sin abrir la nota.
      const estatusFinal = estatusDestino ?? cita.estatus;
      // La marca de "canceló fuera de tiempo" solo aplica cuando el motivo es cancelación.
      const opcionesTardia = estatusFinal === "Cancelada" && motivo === "cancela_paciente" ? { canceladaTarde: canceloFueraDeTiempo } : undefined;
      const tardiaCambio = opcionesTardia !== undefined && opcionesTardia.canceladaTarde !== Boolean(cita.canceladaTarde);
      if (razon && estatusAdmiteMotivo(estatusFinal)) marcarEstatusCita(citaId, estatusFinal, { razon }, opcionesTardia);
      else if (estatusDestino || tardiaCambio) marcarEstatusCita(citaId, estatusDestino ?? estatusFinal, undefined, opcionesTardia);
      onGuardado();
    } catch (err) {
      console.error("No se pudo guardar la nota administrativa", err);
      setError("No se pudo guardar la nota. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-2xl border border-edge/10 bg-surface p-5">
      <h3 className="text-sm font-semibold text-ink">
        {aplicarEstatusAlGuardar ? "Esta cita no se va a atender" : "Esta cita no se atendió"}
      </h3>
      {aplicarEstatusAlGuardar ? (
        <p className="mt-1 text-xs text-ink/50">
          Cita del {formatFechaCita(cita.fecha)} a las {cita.horaInicio} hrs
          {cita.tratamientos.filter(Boolean).length > 0 && <> · {cita.tratamientos.filter(Boolean).join(", ")}</>}. En
          vez del formulario clínico completo, registra un motivo breve.{" "}
          {estatusDestino ? (
            <>
              Al guardar, la cita quedará como{" "}
              <span className="font-semibold text-ink/70">{estatusDestino}</span>.
            </>
          ) : (
            <>La cita conservará su estatus actual ({cita.estatus}).</>
          )}
        </p>
      ) : (
        <p className="mt-1 text-xs text-ink/50">
          Estatus actual: {cita.estatus}. En vez del formulario clínico completo, registra un motivo breve.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {motivosNotaAdministrativa.map((m) => (
          <Chip key={m} seleccionado={motivo === m} onClick={() => elegirMotivo(m)}>
            {motivoNotaAdministrativaLabel[m]}
          </Chip>
        ))}
      </div>

      <div className="mt-4">
        <label className={labelClass}>¿Por qué? (opcional, ayuda a ver por qué se pierden citas)</label>
        <div className="flex flex-wrap gap-2">
          {razonesNoAsistencia.map((r) => (
            <Chip key={r} seleccionado={razon === r} onClick={() => setRazon(razon === r ? null : r)}>
              {razonNoAsistenciaLabel[r]}
            </Chip>
          ))}
        </div>
      </div>

      {motivo === "cancela_paciente" && (
        <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-ink/80">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={canceloFueraDeTiempo}
            onChange={(e) => cambiarFueraDeTiempo(e.target.checked)}
          />
          <span>
            Canceló fuera de tiempo (ya se había agotado el tiempo de la cita)
            <span className="block text-xs text-ink/50">
              Queda anotado en la nota y cuenta casi como una falta en las estrellas del paciente.
            </span>
          </span>
        </label>
      )}

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <label className={labelClass}>
            {motivo === "otro" ? "Describe brevemente el motivo" : "Nota adicional (opcional)"}
          </label>
          {(motivo === "no_asistio" || motivo === "cancela_paciente") && (
            <button
              type="button"
              onClick={() =>
                setNotaLibre(
                  motivo === "no_asistio" ? textoNoAsistioDeCita(cita) : textoCancelacionDeCita(cita, canceloFueraDeTiempo)
                )
              }
              className="mb-1 shrink-0 text-xs font-medium text-accent hover:underline"
              title="Llena el texto con el día, hora y procedimiento de esta cita"
            >
              Llenar con día, hora y procedimiento
            </button>
          )}
        </div>
        <textarea
          value={notaLibre}
          onChange={(e) => setNotaLibre(e.target.value)}
          rows={2}
          className={inputClass}
          placeholder={motivo === "otro" ? "Ej. Paciente se comunicó por WhatsApp para avisar…" : ""}
        />
      </div>

      <div className="mt-4 border-t border-edge/10 pt-4">
        {!mostrarPsoap ? (
          <button
            type="button"
            onClick={() => setMostrarPsoap(true)}
            className="text-xs font-medium text-accent hover:underline"
          >
            + Agregar notas clínicas (PSOAP) — opcional
          </button>
        ) : (
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-ink/60">
                Notas clínicas (PSOAP) — opcional, ningún campo es obligatorio
              </p>
              <button
                type="button"
                onClick={() => {
                  setMostrarPsoap(false);
                  setPsoap(psoapVacio);
                }}
                className="text-xs text-ink/40 hover:text-danger"
              >
                Quitar
              </button>
            </div>
            <div className="mt-3 space-y-3">
              {psoapCampos.map((campo) => (
                <div key={campo.key}>
                  <label className={labelClass}>{campo.label}</label>
                  <textarea
                    value={psoap[campo.key] ?? ""}
                    onChange={(e) => setPsoap((prev) => ({ ...prev, [campo.key]: e.target.value }))}
                    rows={2}
                    className={inputClass}
                    placeholder={campo.placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button onClick={guardar} disabled={!puedeGuardar || guardando} className={botonPrimario}>
          {guardando ? "Guardando…" : "Guardar nota"}
        </button>
        <button
          type="button"
          onClick={onQuiereNotaCompleta}
          className="text-xs font-medium text-ink/40 hover:text-accent"
        >
          {aplicarEstatusAlGuardar
            ? "← Volver a la nota clínica completa"
            : "Necesito registrar una nota clínica completa en su lugar →"}
        </button>
      </div>
    </div>
  );
}
