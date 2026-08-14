"use client";

import { usePatientData } from "@/context/PatientDataContext";
import { renderPlantilla, formatFechaLarga, formatHora12 } from "@/lib/formatosWhatsapp";
import { formatFechaCita } from "@/lib/patientData";

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

function hoyISO() {
  const hoy = new Date();
  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

function enDias(dias: number) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}

export default function Recordatorios() {
  const { citas, patients, clinicInfo, formatosWhatsapp } = usePatientData();
  const desde = hoyISO();
  const hasta = enDias(7);

  const pendientes = citas
    .filter((c) => c.fecha >= desde && c.fecha <= hasta)
    .filter((c) => c.estatus === "Agendada" || c.estatus === "En espera")
    .sort((a, b) => (a.fecha + a.horaInicio < b.fecha + b.horaInicio ? -1 : 1));

  const enviar = (cita: (typeof citas)[number]) => {
    const patient = patients.find((p) => p.id === cita.patientId);
    const telefono = patient?.phone?.replace(/\D/g, "");
    if (!telefono) return;
    const texto = renderPlantilla(formatosWhatsapp.confirmacionCita, {
      clinica: clinicInfo?.nombre || "tu clínica",
      paciente: cita.paciente,
      fecha: formatFechaLarga(cita.fecha),
      hora: formatHora12(cita.horaInicio),
      procedimiento: cita.tratamientos.join(", ") || "su tratamiento",
      costo: cita.costo?.trim() || "por confirmar",
    });
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <p className="text-xs text-ink/40">
        Citas de los próximos 7 días que aún no están confirmadas — envíales un recordatorio antes
        de que se acerque la fecha.
      </p>

      {pendientes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-edge/15 bg-surface p-10 text-center text-sm text-ink/40">
          No hay citas próximas pendientes de confirmar. 🎉
        </div>
      ) : (
        <div className="space-y-3">
          {pendientes.map((c) => {
            const patient = patients.find((p) => p.id === c.patientId);
            const tieneTelefono = Boolean(patient?.phone);
            return (
              <div
                key={c.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-edge/10 bg-surface p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{c.paciente}</p>
                  <p className="text-xs text-ink/50">
                    {formatFechaCita(c.fecha)} · {c.horaInicio} — {c.tratamientos.join(", ") || "Sin procedimiento"}
                  </p>
                </div>
                <button
                  onClick={() => enviar(c)}
                  disabled={!tieneTelefono}
                  title={tieneTelefono ? "Enviar recordatorio" : "El paciente no tiene teléfono registrado"}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-success/30 px-3 py-2 text-xs font-semibold text-success/80 transition-colors hover:border-success hover:text-success disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <WhatsAppIcon />
                  Recordar
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
