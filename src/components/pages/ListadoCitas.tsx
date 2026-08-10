"use client";

type Estado = "Confirmada" | "Pendiente" | "Atendida" | "Cancelada";

type Cita = {
  id: string;
  fechaHora: string;
  procedimiento: string;
  estado: Estado;
  medico: string;
  notas: string;
};

const citas: Cita[] = [
  {
    id: "1",
    fechaHora: "12/08/2026 · 10:00",
    procedimiento: "Limpieza dental",
    estado: "Confirmada",
    medico: "Dr. Nicolás Medina González",
    notas: "Paciente solicitó horario matutino.",
  },
  {
    id: "2",
    fechaHora: "28/08/2026 · 16:30",
    procedimiento: "Revisión de ortodoncia",
    estado: "Pendiente",
    medico: "Dra. Ana Paola Ríos Cervantes",
    notas: "Confirmar vía WhatsApp un día antes.",
  },
  {
    id: "3",
    fechaHora: "02/07/2026 · 09:00",
    procedimiento: "Consulta general",
    estado: "Atendida",
    medico: "Dr. Nicolás Medina González",
    notas: "Se detectó caries en OD 16, se agenda resina.",
  },
  {
    id: "4",
    fechaHora: "18/06/2026 · 11:30",
    procedimiento: "Extracción simple",
    estado: "Cancelada",
    medico: "Dra. Ana Paola Ríos Cervantes",
    notas: "Paciente reagendó por motivos laborales.",
  },
];

const estadoColor: Record<Estado, string> = {
  Confirmada: "bg-info/10 text-info",
  Pendiente: "bg-accent/10 text-accent",
  Atendida: "bg-success/10 text-success",
  Cancelada: "bg-danger/10 text-danger",
};

export default function ListadoCitas() {
  return (
    <div className="overflow-x-auto rounded-2xl border border-edge/10 bg-surface">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-edge/10 text-xs uppercase tracking-wide text-ink/40">
            <th className="px-6 py-3 font-medium">Fecha y hora</th>
            <th className="px-6 py-3 font-medium">Procedimiento</th>
            <th className="px-6 py-3 font-medium">Estatus</th>
            <th className="px-6 py-3 font-medium">Médico de atención</th>
            <th className="px-6 py-3 font-medium">Notas</th>
          </tr>
        </thead>
        <tbody>
          {citas.map((cita) => (
            <tr key={cita.id} className="border-b border-edge/5 last:border-0 hover:bg-surface">
              <td className="px-6 py-4 whitespace-nowrap text-ink/80">{cita.fechaHora}</td>
              <td className="px-6 py-4 text-ink/80">{cita.procedimiento}</td>
              <td className="px-6 py-4">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${estadoColor[cita.estado]}`}
                >
                  {cita.estado}
                </span>
              </td>
              <td className="px-6 py-4 text-ink/70">{cita.medico}</td>
              <td className="px-6 py-4 text-ink/50">{cita.notas}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
