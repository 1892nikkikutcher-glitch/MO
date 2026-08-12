import type { CitaAgenda } from "./patientData";

/** Genera un archivo .ics (iCalendar) estándar con las citas dadas, para
 * importar en Google Calendar, Outlook o Apple Calendar — sin necesitar
 * conectar una cuenta de Google ni configurar credenciales de API. */

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function fechaHoraICS(fechaISO: string, horaHHMM: string): string {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  const [hora, minuto] = horaHHMM.split(":").map(Number);
  return `${anio}${pad(mes)}${pad(dia)}T${pad(hora)}${pad(minuto)}00`;
}

function escaparTexto(texto: string): string {
  return texto.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function marcaDeTiempoUTC(): string {
  const d = new Date();
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export function construirICS(citas: CitaAgenda[], nombreCalendario: string): string {
  const dtstamp = marcaDeTiempoUTC();
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MO Gestion Odontologica//Agenda//ES",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escaparTexto(nombreCalendario)}`,
  ];

  citas
    .filter((c) => c.estatus !== "Cancelada")
    .forEach((c) => {
      const resumen = [c.paciente, c.tratamientos.join(", ")].filter(Boolean).join(" — ");
      lineas.push(
        "BEGIN:VEVENT",
        `UID:${c.id}@mo-agenda`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${fechaHoraICS(c.fecha, c.horaInicio)}`,
        `DTEND:${fechaHoraICS(c.fecha, c.horaFin)}`,
        `SUMMARY:${escaparTexto(resumen || "Cita")}`,
        `DESCRIPTION:${escaparTexto(`Estatus: ${c.estatus}${c.comentarios ? `\n${c.comentarios}` : ""}`)}`,
        `STATUS:${c.estatus === "Confirmada" || c.estatus === "Atendida" ? "CONFIRMED" : "TENTATIVE"}`,
        "END:VEVENT"
      );
    });

  lineas.push("END:VCALENDAR");
  return lineas.join("\r\n");
}

export function descargarICS(citas: CitaAgenda[], nombreCalendario: string, nombreArchivo: string) {
  const contenido = construirICS(citas, nombreCalendario);
  const blob = new Blob([contenido], { type: "text/calendar;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
