import type { CitaEstatus } from "@/lib/patientData";
import { CITA_ESTATUS_HEX, CITA_BORDE_NEUTRO, statusAlpha } from "@/lib/agendaHelpers";

/** Píldora de estatus reutilizada dentro de cada tarjeta de cita — mismo
 * patrón visual que las píldoras del encabezado y de CitaDialog. */
export default function AppointmentStatusBadge({ estatus }: { estatus: CitaEstatus }) {
  const hex = CITA_ESTATUS_HEX[estatus] ?? CITA_BORDE_NEUTRO;
  return (
    <span
      className="inline-block shrink-0 rounded-full px-1.5 py-[1px] text-[9px] font-bold uppercase leading-tight"
      style={{ color: hex, backgroundColor: statusAlpha(hex, 0.2) }}
    >
      {estatus}
    </span>
  );
}
