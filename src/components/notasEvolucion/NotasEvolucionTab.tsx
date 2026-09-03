"use client";

/** Punto de entrada de la pestaña "Notas de Evolución y Seguimiento" —
 * decide entre mostrar el historial (con el botón "Registrar atención de
 * hoy") o el formulario guiado activo. Reemplaza el montaje directo del
 * componente PSOAP legado (NotasEvolucion.tsx), que ahora solo vive como
 * renderer de tarjeta v1 dentro de HistorialNotas.tsx. */

import { useState } from "react";
import { usePatientData } from "@/context/PatientDataContext";
import { citaIdDeNota } from "@/lib/notasEvolucion";
import RegistrarAtencionHoy from "./RegistrarAtencionHoy";
import HistorialNotas from "./HistorialNotas";
import { botonPrimario } from "./NotaUI";

const ESTATUS_CITA_SIN_ATENDER = ["Cancelada", "Reagendada", "No Asistió"] as const;

function toIsoHoy(): string {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

export default function NotasEvolucionTab({ patientId, citaId }: { patientId: string; citaId?: string }) {
  const { citas, notasEvolucionPorPaciente } = usePatientData();
  const [registrando, setRegistrando] = useState(!!citaId);
  // citaId "activo" para el formulario — separado de la prop `citaId`
  // porque "+ Registrar atención de hoy" puede auto-ligarse a la cita de
  // hoy sin atender (ver abajo), pero "Continuar borrador" NUNCA debe
  // heredar ese citaId por accidente: RegistrarAtencionHoy busca el
  // borrador correcto filtrando por citaId, así que pasarle uno ajeno
  // rompería esa búsqueda.
  const [citaIdActivo, setCitaIdActivo] = useState(citaId);

  // Si esta pestaña se abrió SIN una cita puntual (ej. desde el tab del
  // expediente, no desde el ícono de notas de una cita en Agenda) pero el
  // paciente tiene una cita de HOY que quedó Cancelada/Reagendada/No
  // Asistió y todavía no tiene ninguna nota, "+ Registrar atención de hoy"
  // debe ofrecer la nota rápida de esa cita en vez del formulario clínico
  // en blanco — sin esto, el botón genérico nunca sabe que esa cita existe
  // y siempre cae al formulario completo (ver RegistrarAtencionHoy.tsx).
  const notasPaciente = notasEvolucionPorPaciente[patientId] ?? [];
  const citaHoySinAtenderSinNota = citaId
    ? undefined
    : citas.find(
        (c) =>
          c.patientId === patientId &&
          c.fecha === toIsoHoy() &&
          (ESTATUS_CITA_SIN_ATENDER as readonly string[]).includes(c.estatus) &&
          !notasPaciente.some((n) => citaIdDeNota(n) === c.id)
      );

  if (registrando) {
    return (
      <RegistrarAtencionHoy
        patientId={patientId}
        citaId={citaIdActivo}
        onFirmada={() => setRegistrando(false)}
        onGuardado={() => setRegistrando(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => {
          setCitaIdActivo(citaId ?? citaHoySinAtenderSinNota?.id);
          setRegistrando(true);
        }}
        className={botonPrimario}
      >
        + Registrar atención de hoy
      </button>
      <HistorialNotas
        patientId={patientId}
        onContinuarBorrador={() => {
          setCitaIdActivo(citaId);
          setRegistrando(true);
        }}
      />
    </div>
  );
}
